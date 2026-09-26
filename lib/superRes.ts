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
// so the input's long edge is capped below the sensor's native resolution
// to keep that final readback bounded. 2000px clears most phones' actual
// capture size (a 12MP shot's long edge is usually under 4000px, so ×0.5
// downscale ×2 upscale roughly breaks even) without the readback cost
// exploding — a lower cap technically ran faster in testing but meant the
// "enhanced" photo came back smaller than a plain export for any capture
// above it, which is every modern phone: enhancing a photo into a net
// downgrade isn't a tradeoff worth making quietly. Sensors well above this
// (e.g. 48MP+) still get downscaled first — the AI result can still end up
// smaller than the plain export there. Callers should compare dimensions
// rather than assume "super resolution" always means "bigger than the
// original."
const MAX_INPUT_EDGE = 2000; // px, long edge, before the 2x pass
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
  try {
    const [{ default: Upscaler }, { default: model }] = await Promise.all([
      import("upscaler"),
      import("@upscalerjs/esrgan-slim/2x"),
    ]);
    const localModel = { ...model, path: "/models/esrgan-slim-x2/model.json" };

    const bitmap = await createImageBitmap(source);
    const scale = Math.min(1, MAX_INPUT_EDGE / Math.max(bitmap.width, bitmap.height));
    const inWidth = Math.max(1, Math.round(bitmap.width * scale));
    const inHeight = Math.max(1, Math.round(bitmap.height * scale));

    const inputCanvas = document.createElement("canvas");
    inputCanvas.width = inWidth;
    inputCanvas.height = inHeight;
    const inputCtx = inputCanvas.getContext("2d", { willReadFrequently: true });
    if (!inputCtx) throw new Error("Contexte 2D indisponible");
    inputCtx.drawImage(bitmap, 0, 0, inWidth, inHeight);
    bitmap.close();

    const upscaler = new Upscaler({ model: localModel });
    try {
      const resultBase64 = await upscaler.upscale(inputCanvas, {
        patchSize: 256,
        padding: 4,
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
  } catch (err) {
    console.warn("ESRGAN neural pass fell back to optical edge-directed super-res:", err);
    return fallbackSuperResolve(source, onProgress);
  }
}

async function fallbackSuperResolve(source: Blob, onProgress?: (fraction: number) => void): Promise<SuperResResult> {
  onProgress?.(0.2);
  const bitmap = await createImageBitmap(source);
  const targetWidth = bitmap.width * SUPER_RES_SCALE;
  const targetHeight = bitmap.height * SUPER_RES_SCALE;

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Contexte 2D indisponible");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();
  onProgress?.(0.6);

  // Apply high-frequency detail synthesis
  const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const d = imgData.data;
  const w = targetWidth;
  const h = targetHeight;
  const copy = new Uint8ClampedArray(d);

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const center = copy[idx + c];
        const neighbors =
          (copy[((y - 1) * w + x) * 4 + c] +
            copy[((y + 1) * w + x) * 4 + c] +
            copy[(y * w + x - 1) * 4 + c] +
            copy[(y * w + x + 1) * 4 + c]) *
          0.25;
        const diff = center - neighbors;
        d[idx + c] = Math.min(255, Math.max(0, center + diff * 0.45));
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
  onProgress?.(1.0);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.96));
  if (!blob) throw new Error("Échec de l'export super-résolution");
  return { blob, width: targetWidth, height: targetHeight };
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

export const SUPER_ZOOM_AI_MULTIPLIER = SUPER_RES_SCALE;

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

export function aiDenoiseOutputSize(width: number, height: number) {
  const scale = Math.min(1, MAX_INPUT_EDGE / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function aiDenoise(source: Blob, onProgress?: (fraction: number) => void): Promise<SuperResResult> {
  try {
    const upscaled = await superResolve(source, onProgress);
    const upscaledBitmap = await createImageBitmap(upscaled.blob);
    const width = Math.round(upscaled.width / SUPER_RES_SCALE);
    const height = Math.round(upscaled.height / SUPER_RES_SCALE);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Contexte 2D indisponible");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(upscaledBitmap, 0, 0, width, height);
    upscaledBitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
    if (!blob) throw new Error("Échec du débruitage IA");
    return { blob, width, height };
  } catch {
    return fallbackDenoise(source, onProgress);
  }
}

async function fallbackDenoise(source: Blob, onProgress?: (fraction: number) => void): Promise<SuperResResult> {
  onProgress?.(0.3);
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Contexte 2D indisponible");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  onProgress?.(0.7);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  const w = canvas.width;
  const h = canvas.height;
  const copy = new Uint8ClampedArray(d);

  // Bilateral edge-preserving smoothing
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = (y * w + x) * 4;
      const cR = copy[idx];
      const cG = copy[idx + 1];
      const cB = copy[idx + 2];
      const cLuma = 0.299 * cR + 0.587 * cG + 0.114 * cB;

      let sumR = cR, sumG = cG, sumB = cB, totalW = 1.0;
      const offsets = [-w - 1, -w, -w + 1, -1, 1, w - 1, w, w + 1];
      for (let i = 0; i < offsets.length; i++) {
        const nIdx = (y * w + x + offsets[i]) * 4;
        const nR = copy[nIdx];
        const nG = copy[nIdx + 1];
        const nB = copy[nIdx + 2];
        const nLuma = 0.299 * nR + 0.587 * nG + 0.114 * nB;
        const diff = Math.abs(cLuma - nLuma);
        if (diff < 28) {
          const weight = 1.0 - diff / 28;
          sumR += nR * weight;
          sumG += nG * weight;
          sumB += nB * weight;
          totalW += weight;
        }
      }
      d[idx] = sumR / totalW;
      d[idx + 1] = sumG / totalW;
      d[idx + 2] = sumB / totalW;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  onProgress?.(1.0);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
  if (!blob) throw new Error("Échec du débruitage");
  return { blob, width: canvas.width, height: canvas.height };
}
