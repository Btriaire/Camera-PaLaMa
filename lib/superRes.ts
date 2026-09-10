// Real AI super-resolution, running fully on-device: a pretrained ESRGAN
// network (via UpscalerJS/TensorFlow.js) doubles the photo's pixel
// dimensions, synthesizing detail rather than just interpolating pixels
// like a resize would. The photo itself is never sent anywhere — inference
// runs in the browser's WebGL backend.
//
// Both the library (~1MB gzipped, TensorFlow.js included) and the model
// weights (~900KB, served from our own public/models/ rather than
// UpscalerJS's default jsdelivr/unpkg CDN fallback) are pulled in with a
// dynamic import, so nothing about this feature costs a byte until someone
// actually taps the button.
//
// Inference is tiled ("patches") so it never has to hold a multi-megapixel
// image as one GPU pass — patch-by-patch is genuinely fast. What isn't
// tiled is the last step, stitching every patch back into one image and
// reading the whole thing back from the GPU to encode it: that cost scales
// with total output pixels and dominates the running time on a weak GPU,
// so the input's long edge is capped well below the sensor's native
// resolution to keep that final readback bounded on modest phones. A very
// high-resolution capture gets downscaled before upscaling as a result —
// the AI result can end up smaller than the plain export. Callers should
// compare dimensions rather than assume "super resolution" always means
// "bigger than the original."
const MAX_INPUT_EDGE = 1200; // px, long edge, before the 2x pass
export const SUPER_RES_SCALE = 2;

export type SuperResResult = { blob: Blob; width: number; height: number };

// Given a photo's native size, what the AI pass will actually output —
// used to show the real numbers in the UI before anyone commits to the
// (slow) operation, per the project's habit of never overclaiming.
export function superResOutputSize(width: number, height: number) {
  const scale = Math.min(1, MAX_INPUT_EDGE / Math.max(width, height));
  return {
    width: Math.round(width * scale) * SUPER_RES_SCALE,
    height: Math.round(height * scale) * SUPER_RES_SCALE,
  };
}

export async function superResolve(source: Blob, onProgress?: (fraction: number) => void): Promise<SuperResResult> {
  const [{ default: Upscaler }, { default: model }] = await Promise.all([
    import("upscaler"),
    import("@upscalerjs/esrgan-slim/2x"),
  ]);
  // Without an explicit `path`, UpscalerJS resolves model weights from a
  // public CDN (jsdelivr, then unpkg) at runtime — an extra third-party
  // dependency and network round-trip this app doesn't need, since the
  // weights are tiny (~900KB) and can just ship from our own public/.
  const localModel = { ...model, path: "/models/esrgan-slim-x2/model.json" };

  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, MAX_INPUT_EDGE / Math.max(bitmap.width, bitmap.height));
  const inWidth = Math.max(1, Math.round(bitmap.width * scale));
  const inHeight = Math.max(1, Math.round(bitmap.height * scale));

  const inputCanvas = document.createElement("canvas");
  inputCanvas.width = inWidth;
  inputCanvas.height = inHeight;
  const inputCtx = inputCanvas.getContext("2d");
  if (!inputCtx) throw new Error("Contexte 2D indisponible");
  inputCtx.drawImage(bitmap, 0, 0, inWidth, inHeight);
  bitmap.close();

  const upscaler = new Upscaler({ model: localModel });
  try {
    const resultBase64 = await upscaler.upscale(inputCanvas, {
      patchSize: 256,
      padding: 4,
      // Without this, all patches run back-to-back in one synchronous
      // stretch: the progress overlay never actually updates on screen,
      // and the tab looks hung until the whole photo is done.
      awaitNextFrame: true,
      progress: (amount: number) => onProgress?.(amount),
    });

    const outImage = await loadImage(resultBase64);
    const outCanvas = document.createElement("canvas");
    outCanvas.width = outImage.naturalWidth;
    outCanvas.height = outImage.naturalHeight;
    const outCtx = outCanvas.getContext("2d");
    if (!outCtx) throw new Error("Contexte 2D indisponible");
    outCtx.drawImage(outImage, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => outCanvas.toBlob(resolve, "image/jpeg", 0.95));
    if (!blob) throw new Error("Échec de l'export de la photo améliorée");
    return { blob, width: outCanvas.width, height: outCanvas.height };
  } finally {
    await upscaler.dispose();
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Échec du décodage du résultat IA"));
    img.src = src;
  });
}
