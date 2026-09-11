// Pure math for the electronic stabilizer's crop-and-shift trick, pulled
// out of the render loop (components/Viewfinder.tsx) and the Pose longue
// frame accumulation (both need the exact same computation) so it can be
// unit tested without a browser/WebGL context.

// Turns a raw tilt-delta-from-baseline (in degrees, from useStabilizer) into
// a normalized shake amount in [-1, 1], saturating at `deadzoneDeg` — the
// caller picks the deadzone, since "Stabilisateur" and "Ultra-stabilisateur"
// saturate at different tilt amounts (the stronger mode reacts to smaller
// shakes).
export function shakeAxis(deltaDeg: number, deadzoneDeg: number): number {
  return Math.max(-1, Math.min(1, deltaDeg / deadzoneDeg));
}

export type StabilizedCrop = { cropX: number; cropY: number; cropW: number; cropH: number };

// `totalZoom` is however much of the frame the caller is discarding for
// zoom + stabilization margin combined (>= 1, a no-op crop at exactly 1).
// `marginZoom` is the slice of that attributable to stabilization alone
// (e.g. 1.12 for the base stabilizer, more for the stronger one) — the
// shift below only ever draws on that slice, never on top of a deliberate
// digital zoom past it, so a zoomed-in shot stays centered on what was
// framed instead of drifting with hand-shake. shakeX/shakeY are each in
// [-1, 1] (see shakeAxis).
export function computeStabilizedCrop(
  sourceWidth: number,
  sourceHeight: number,
  totalZoom: number,
  marginZoom: number,
  shakeX: number,
  shakeY: number
): StabilizedCrop {
  const cropW = sourceWidth / totalZoom;
  const cropH = sourceHeight / totalZoom;
  const marginX = marginZoom > 1 ? (sourceWidth - sourceWidth / marginZoom) / 2 : 0;
  const marginY = marginZoom > 1 ? (sourceHeight - sourceHeight / marginZoom) / 2 : 0;
  return {
    cropX: (sourceWidth - cropW) / 2 + shakeX * marginX,
    cropY: (sourceHeight - cropH) / 2 + shakeY * marginY,
    cropW,
    cropH,
  };
}
