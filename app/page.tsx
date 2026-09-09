"use client";

import { useState } from "react";
import Viewfinder from "@/components/Viewfinder";
import Editor from "@/components/Editor";
import Gallery from "@/components/Gallery";
import { useCamera } from "@/lib/useCamera";
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
  const camera = useCamera();
  const [mode, setMode] = useState<Mode>("shoot");
  const [presetId, setPresetId] = useState<string | null>(null);
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

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <Viewfinder
        camera={camera}
        active={mode === "shoot"}
        presetId={presetId}
        onSelectPreset={setPresetId}
        onCapture={handleCapture}
        onOpenGallery={() => setMode("gallery")}
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
            onSaved={() => {}}
          />
        </div>
      )}
    </div>
  );
}
