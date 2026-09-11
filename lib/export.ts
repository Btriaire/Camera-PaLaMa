import { Adjustments } from "./types";
import { GLRenderer } from "./gl/renderer";

// Renders the source bitmap through the same shader as the live preview, at
// its full original resolution, and encodes the result — this is the one
// place "maximum resolution" actually gets enforced: the canvas is always
// sized to the capture's native width/height, never the on-screen preview's.
export async function exportPhoto(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  adjustments: Adjustments,
  seed: number,
  format: "jpeg" | "png" = "jpeg",
  quality = 0.95
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const renderer = new GLRenderer(canvas);
  try {
    renderer.uploadSource(bitmap, width, height);
    renderer.render(adjustments, seed);
  } finally {
    // Read the pixels out before disposing the GL context.
  }
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, format === "png" ? "image/png" : "image/jpeg", quality)
  );
  renderer.dispose();
  if (!blob) throw new Error("Échec de l'export de la photo");
  return blob;
}

// Adjustments whose visual effect is high-frequency, per-pixel texture
// (film grain, scanlines, the RGB-channel split of chromatic aberration)
// rather than a broad tonal/color change. Baking these in BEFORE the AI
// super-res/denoise pass (lib/superRes.ts) swamps the — already subtle —
// detail a tiny on-device ESRGAN model can add: that noise is exactly the
// kind of high-frequency signal super-resolution tries to reconstruct, so
// the network spends its whole capacity reproducing grain instead of real
// texture and the result looks identical to a plain export. Since every
// vintage preset in this app leans on grain, this made the AI passes read
// as doing nothing on virtually any real capture. Stripping these for the
// AI's input, then reapplying them afterward (see restyleAfterAI) on the
// AI's own higher-resolution output, keeps the vintage look while letting
// the network's actual contribution survive to the final image.
function stripNoiseAdjustments(adjustments: Adjustments): Adjustments {
  return { ...adjustments, grain: 0, scanlines: 0, chromaticAberration: 0 };
}

// The "clean" render fed into the AI pass — same as exportPhoto but with
// the noise-family adjustments neutralized, see stripNoiseAdjustments.
export function exportPhotoForAI(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  adjustments: Adjustments,
  seed: number
): Promise<Blob> {
  return exportPhoto(bitmap, width, height, stripNoiseAdjustments(adjustments), seed);
}

// Re-applies the full adjustment stack (grain included) on top of the AI
// pass's own output, at the AI's own (larger) resolution — run once more
// through the same shader used everywhere else, so the vintage look never
// drifts between a plain export and an AI-enhanced one.
export async function restyleAfterAI(
  aiBlob: Blob,
  width: number,
  height: number,
  adjustments: Adjustments,
  seed: number
): Promise<Blob> {
  const bitmap = await createImageBitmap(aiBlob);
  try {
    return await exportPhoto(bitmap, width, height, adjustments, seed);
  } finally {
    bitmap.close();
  }
}
