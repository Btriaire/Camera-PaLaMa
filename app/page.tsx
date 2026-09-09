"use client";

import { useState } from "react";
import Viewfinder from "@/components/Viewfinder";
import Editor from "@/components/Editor";
import Gallery from "@/components/Gallery";
import { Adjustments, SavedPhotoMeta } from "@/lib/types";

type CapturedPhoto = { bitmap: ImageBitmap; width: number; height: number };
type Mode = "shoot" | "edit" | "gallery";

export default function CameraApp() {
  const [mode, setMode] = useState<Mode>("shoot");
  const [presetId, setPresetId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [initialAdjustments, setInitialAdjustments] = useState<Adjustments | undefined>(undefined);

  const handleCapture = (bitmap: ImageBitmap, width: number, height: number) => {
    setPhoto({ bitmap, width, height });
    setInitialAdjustments(undefined);
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

  if (mode === "gallery") {
    return <Gallery onClose={() => setMode("shoot")} onEdit={handleReopen} />;
  }

  if (mode === "edit" && photo) {
    return (
      <Editor
        photo={photo}
        initialPresetId={presetId}
        initialAdjustments={initialAdjustments}
        onClose={handleEditorClose}
        onSaved={() => {}}
      />
    );
  }

  return (
    <Viewfinder
      presetId={presetId}
      onSelectPreset={setPresetId}
      onCapture={handleCapture}
      onOpenGallery={() => setMode("gallery")}
    />
  );
}
