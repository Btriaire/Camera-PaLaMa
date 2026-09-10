"use client";

import { useEffect, useState } from "react";
import Viewfinder from "@/components/Viewfinder";
import Editor from "@/components/Editor";
import Gallery from "@/components/Gallery";
import IntroScreen from "@/components/IntroScreen";
import { useCamera } from "@/lib/useCamera";
import { exportPhoto } from "@/lib/export";
import { aiDenoise, superResolve } from "@/lib/superRes";
import { getSettings, hasSeenIntro, markIntroSeen } from "@/lib/settings";
import { listPhotos, photoUrl, uploadPhoto } from "@/lib/storage";
import { Adjustments, SavedPhotoMeta } from "@/lib/types";

// Cap on how many recent shots the viewfinder's filmstrip (and the corner
// peek) keep around in memory -- plenty for a shooting session, no reason
// to grow forever.
const MAX_RECENT_PHOTOS = 30;

type CapturedPhoto = { bitmap: ImageBitmap; width: number; height: number };
type Mode = "shoot" | "edit" | "gallery";

// The camera stream is acquired once, here, and never torn down while this
// page is open — Editor/Gallery/the camera picker are all overlays on top
// of a Viewfinder that stays mounted underneath. Unmounting/remounting the
// <video> element on every screen switch was the cause of two real bugs:
// getUserMedia (and its permission prompt) firing over and over, and a
// freshly-remounted <video> silently missing its srcObject — which is
// exactly why picking a preset used to freeze the preview.
export default function CameraApp() {
  const camera = useCamera(false); // never auto-starts; see the intro effect below
  const [mode, setMode] = useState<Mode>("shoot");
  const [presetId, setPresetId] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  // Recent saved shots, most recent first — the corner "last photo" peek
  // is just recentPhotos[0]; when "stay on viewfinder" is on, the whole
  // array feeds the filmstrip. Seeded from the library on mount, then
  // updated instantly on each save (no refetch).
  const [recentPhotos, setRecentPhotos] = useState<SavedPhotoMeta[]>([]);

  // Applied after mount, not as a lazy useState initializer, so server and
  // client agree on the very first render (localStorage doesn't exist on
  // the server) — this only ever runs client-side, once. A returning
  // visitor (intro already seen) starts the camera immediately; a first
  // visitor sees IntroScreen instead, which starts it on "Activer".
  useEffect(() => {
    const stored = getSettings().defaultPresetId;
    if (stored) setPresetId(stored);
    if (hasSeenIntro()) camera.requestAccess();
    else setShowIntro(true);
    listPhotos().then((items) => setRecentPhotos(items.slice(0, MAX_RECENT_PHOTOS)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleIntroContinue = () => {
    markIntroSeen();
    setShowIntro(false);
    camera.requestAccess();
  };

  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [initialAdjustments, setInitialAdjustments] = useState<Adjustments | undefined>(undefined);
  const [initialSuperRes, setInitialSuperRes] = useState(false);
  const [initialDenoiseAI, setInitialDenoiseAI] = useState(false);
  // How many "stay on viewfinder" saves are currently exporting/uploading —
  // export (GPU-bound, fast) then upload (network-bound, can genuinely take
  // a couple of seconds) both happen with zero visible feedback otherwise,
  // which reads as "nothing happened" if you don't sit and watch the
  // filmstrip. Drives a pulsing placeholder tile there instead.
  const [pendingSaves, setPendingSaves] = useState(0);

  const handleCapture = (
    bitmap: ImageBitmap,
    width: number,
    height: number,
    adjustments: Adjustments,
    aiOptions: { superRes: boolean; denoise: boolean }
  ) => {
    if (getSettings().stayOnCapture) {
      // Save with exactly the live style/ISO/K that took the shot and stay
      // on the viewfinder — same export pipeline the editor's own "Save"
      // uses, just triggered immediately instead of after manual edits.
      // The viewfinder's Débruitage IA/Super-résolution IA toggles arm the
      // same AI passes the editor offers, applied here before upload since
      // there's no editor screen in this flow to trigger them from.
      setPendingSaves((n) => n + 1);
      exportPhoto(bitmap, width, height, adjustments, Math.random() * 1000)
        .then((blob) => ({ blob, width, height }))
        .then((result) => (aiOptions.denoise ? aiDenoise(result.blob) : result))
        .then((result) => (aiOptions.superRes ? superResolve(result.blob) : result))
        .then((result) => uploadPhoto(result.blob, { width: result.width, height: result.height, presetId, adjustments }))
        .then((meta) => meta && handlePhotoSaved(meta))
        .finally(() => setPendingSaves((n) => Math.max(0, n - 1)));
      return;
    }
    setPhoto({ bitmap, width, height });
    setInitialAdjustments(adjustments);
    setInitialSuperRes(aiOptions.superRes);
    setInitialDenoiseAI(aiOptions.denoise);
    setMode("edit");
  };

  const handleReopen = (reopened: CapturedPhoto, meta: SavedPhotoMeta) => {
    setPhoto(reopened);
    setPresetId(meta.presetId);
    setInitialAdjustments(meta.adjustments);
    setInitialSuperRes(false); // reopening an already-saved photo, not a fresh capture
    setInitialDenoiseAI(false);
    setMode("edit");
  };

  // Tapping a shot in the viewfinder's filmstrip reopens that exact photo
  // in the editor — same fetch-then-reopen path the gallery uses.
  const handleOpenRecentPhoto = async (meta: SavedPhotoMeta) => {
    const res = await fetch(photoUrl(meta.id));
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    handleReopen({ bitmap, width: meta.width || bitmap.width, height: meta.height || bitmap.height }, meta);
  };

  const handleEditorClose = () => {
    setPhoto(null);
    setMode("shoot");
  };

  const handlePhotoSaved = (meta: SavedPhotoMeta) => {
    setRecentPhotos((prev) => [meta, ...prev.filter((p) => p.id !== meta.id)].slice(0, MAX_RECENT_PHOTOS));
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <Viewfinder
        camera={camera}
        active={mode === "shoot"}
        presetId={presetId}
        onSelectPreset={setPresetId}
        onCapture={handleCapture}
        onOpenGallery={() => setMode("gallery")}
        recentPhotos={recentPhotos}
        pendingSaves={pendingSaves}
        onOpenPhoto={handleOpenRecentPhoto}
        onBurstSaved={handlePhotoSaved}
      />

      {mode === "gallery" && (
        <div className="fixed inset-0 z-50">
          <Gallery onClose={() => setMode("shoot")} onEdit={handleReopen} />
        </div>
      )}

      {mode === "edit" && photo && (
        <div className="fixed inset-0 z-50">
          <Editor
            photo={photo}
            initialPresetId={presetId}
            initialAdjustments={initialAdjustments}
            initialSuperRes={initialSuperRes}
            initialDenoiseAI={initialDenoiseAI}
            onClose={handleEditorClose}
            onSaved={handlePhotoSaved}
          />
        </div>
      )}

      {showIntro && (
        <div className="fixed inset-0 z-[60]">
          <IntroScreen onContinue={handleIntroContinue} />
        </div>
      )}
    </div>
  );
}
