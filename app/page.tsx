"use client";

import { useEffect, useState } from "react";
import Viewfinder from "@/components/Viewfinder";
import Editor from "@/components/Editor";
import Gallery from "@/components/Gallery";
import IntroScreen from "@/components/IntroScreen";
import { useCamera } from "@/lib/useCamera";
import { getSettings, hasSeenIntro, markIntroSeen } from "@/lib/settings";
import { listPhotos } from "@/lib/storage";
import { Adjustments, SavedPhotoMeta } from "@/lib/types";

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
  // The last saved shot's thumbnail, shown small in a corner of the
  // viewfinder while shooting — like a camera roll peek. Seeded from the
  // library on mount, then updated instantly on each save (no refetch).
  const [lastPhoto, setLastPhoto] = useState<SavedPhotoMeta | null>(null);

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
    listPhotos().then((items) => setLastPhoto(items[0] ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleIntroContinue = () => {
    markIntroSeen();
    setShowIntro(false);
    camera.requestAccess();
  };

  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [initialAdjustments, setInitialAdjustments] = useState<Adjustments | undefined>(undefined);

  const handleCapture = (bitmap: ImageBitmap, width: number, height: number, adjustments: Adjustments) => {
    setPhoto({ bitmap, width, height });
    setInitialAdjustments(adjustments);
    setMode("edit");
  };

  const handleReopen = (reopened: CapturedPhoto, meta: SavedPhotoMeta) => {
    setPhoto(reopened);
    setPresetId(meta.presetId);
    setInitialAdjustments(meta.adjustments);
    setMode("edit");
  };

  const handleEditorClose = () => {
    setPhoto(null);
    setMode("shoot");
  };

  const handlePhotoSaved = (meta: SavedPhotoMeta) => {
    setLastPhoto(meta);
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
        lastPhoto={lastPhoto}
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
