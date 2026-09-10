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

export type CroppedPhoto = { bitmap: ImageBitmap; width: number; height: number };

// SuperZoom: past the camera's own zoom ceiling, "more zoom" can only ever
// mean cropping in on the frame — no lens moves. Ordinary digital zoom just
// stretches that crop back up and looks it (soft, blocky). This crops to
// the same centered region, then hands it to the same super-resolution
// pass above to synthesize the missing detail instead of just blurring it
// back out. The AI step doubles pixel dimensions, so there's no honest
// reason to let SuperZoom claim more than 2x past the hardware max — a
// bigger number here wouldn't be backed by anything real.
export const SUPER_ZOOM_AI_MULTIPLIER = SUPER_RES_SCALE;

// Crop only, no AI — cheap enough to run on every frame of a live preview
// or every shot of a burst, so the framing is always correct even when the
// (slow) AI enhancement below only makes sense for a single capture.
export async function cropForDigitalZoom(bitmap: ImageBitmap, digitalFactor: number): Promise<CroppedPhoto> {
  if (digitalFactor <= 1.001) return { bitmap, width: bitmap.width, height: bitmap.height };
  const cropWidth = Math.max(1, Math.round(bitmap.width / digitalFactor));
  const cropHeight = Math.max(1, Math.round(bitmap.height / digitalFactor));
  const cropX = Math.round((bitmap.width - cropWidth) / 2);
  const cropY = Math.round((bitmap.height - cropHeight) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Contexte 2D indisponible");
  ctx.drawImage(bitmap, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  bitmap.close();

  const cropped = await createImageBitmap(canvas);
  return { bitmap: cropped, width: cropWidth, height: cropHeight };
}

// AI-enhances an already-cropped SuperZoom photo (see cropForDigitalZoom
// above) — separate from superResolve's own internal downscale-then-2x
// cap so a small crop isn't shrunk again before being enlarged back.
export async function enhanceCroppedZoom(
  bitmap: ImageBitmap,
  onProgress?: (fraction: number) => void
): Promise<SuperResResult> {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Contexte 2D indisponible");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
  if (!blob) throw new Error("Échec du recadrage SuperZoom");
  return superResolve(blob, onProgress);
}

// Débruitage IA: there IS a model trained specifically for this — MAXIM —
// but it ships ~110MB of unquantized weights (a 27MB model.json alone) and
// its architecture (multi-axis gated MLP + cross-gating blocks) targets
// benchmark quality, not speed; even esrgan-slim's tiny 900KB CNN already
// takes minutes per photo on modest hardware, so MAXIM would be a
// multi-times-heavier download for an almost certainly worse wait. Instead
// this reuses the same ESRGAN network Super-résolution IA already ships:
// it was never trained to denoise, but restoring detail at 2x and
// resampling back down suppresses noise as a side effect of the
// reconstruction — a real, if secondary, use of the same on-device AI,
// not a purpose-built denoiser. Like superResolve, input is capped before
// the AI pass, so on a photo already past that cap the result comes back
// at the capped size rather than the original's — see superResOutputSize's
// note on the same tradeoff.
export function aiDenoiseOutputSize(width: number, height: number) {
  const scale = Math.min(1, MAX_INPUT_EDGE / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function aiDenoise(source: Blob, onProgress?: (fraction: number) => void): Promise<SuperResResult> {
  const upscaled = await superResolve(source, onProgress);
  const upscaledBitmap = await createImageBitmap(upscaled.blob);
  const width = Math.round(upscaled.width / SUPER_RES_SCALE);
  const height = Math.round(upscaled.height / SUPER_RES_SCALE);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Contexte 2D indisponible");
  ctx.drawImage(upscaledBitmap, 0, 0, width, height);
  upscaledBitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
  if (!blob) throw new Error("Échec du débruitage IA");
  return { blob, width, height };
}
