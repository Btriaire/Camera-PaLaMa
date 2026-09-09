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
