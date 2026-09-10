"use client";

import { useEffect, useState } from "react";
import { GLRenderer, ImageSource } from "./gl/renderer";
import { PRESETS } from "./presets";
import { NEUTRAL_ADJUSTMENTS } from "./types";

// Key used for the "Naturel" (no preset) entry in the returned map —
// presets are keyed by their real id, which is never this string.
export const NATURAL_KEY = "__natural__";

function sourceDims(source: ImageSource): { width: number; height: number } {
  if (source instanceof HTMLVideoElement) return { width: source.videoWidth, height: source.videoHeight };
  if (typeof HTMLImageElement !== "undefined" && source instanceof HTMLImageElement) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  return { width: source.width, height: source.height };
}

// Renders one small thumbnail per camera/preset from a single real
// source -- the live viewfinder frame while shooting, or an actual
// captured photo when reused elsewhere (the editor's picker) -- using
// the same GLRenderer as the live preview and the final export, so every
// thumbnail shows what THIS scene/shot would really look like with that
// film/filter, not a generic stock photo or a decorative color swatch.
// One texture upload, then one cheap draw call per preset reusing it,
// each read back via toDataURL (preserveDrawingBuffer is on).
export function usePresetThumbnails(source: ImageSource | null) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!source) return;
    const { width: sw, height: sh } = sourceDims(source);
    if (!sw || !sh) return;
    const canvas = document.createElement("canvas");
    let renderer: GLRenderer;
    try {
      renderer = new GLRenderer(canvas);
    } catch {
      return;
    }

    const scale = Math.min(1, 160 / Math.max(sw, sh));
    const w = Math.round(sw * scale);
    const h = Math.round(sh * scale);
    renderer.uploadSource(source, w, h);

    const next: Record<string, string> = {};
    renderer.render(NEUTRAL_ADJUSTMENTS, 0);
    next[NATURAL_KEY] = canvas.toDataURL("image/jpeg", 0.75);
    for (const p of PRESETS) {
      renderer.render({ ...NEUTRAL_ADJUSTMENTS, ...p.adjustments }, 0);
      next[p.id] = canvas.toDataURL("image/jpeg", 0.75);
    }
    setThumbs(next);
    renderer.dispose();
  }, [source]);

  return thumbs;
}
