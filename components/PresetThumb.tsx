"use client";

import { Preset } from "@/lib/types";

type RGB = [number, number, number];
const lerp = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

// A quick decorative approximation of each preset's color character —
// shown instantly, then swapped for a real thumbnail (see PresetThumb
// below) once one's ready. Never a real render of the shader itself.
export function swatchGradient(p: Preset): string {
  const adj = p.adjustments;
  const temp = (adj.temperature ?? 0) / 100;
  const warm: RGB = [255, 180, 120];
  const cool: RGB = [140, 190, 255];
  const neutral: RGB = [190, 190, 190];
  const base = temp > 0 ? lerp(neutral, warm, temp) : lerp(neutral, cool, -temp);
  const tinted = lerp(base, adj.tintColor ?? neutral, (adj.tintStrength ?? 0) / 100);
  const gray = (tinted[0] + tinted[1] + tinted[2]) / 3;
  const final = lerp(tinted, [gray, gray, gray], (adj.monochrome ?? 0) / 100);
  const c1 = `rgb(${final.map((v) => Math.round(v)).join(",")})`;
  const c2 = `rgb(${final.map((v) => Math.round(v * 0.55)).join(",")})`;
  return `linear-gradient(135deg, ${c1}, ${c2})`;
}

export const NATURAL_GRADIENT = "linear-gradient(135deg, #c9c9c9, #6e6e6e)";

// A large before/after preview for a camera/filter picker card: the same
// real frame shown raw on the left and with that preset's look applied on
// the right, split down the middle — so picking a style is judged against
// the actual shot, not a name and a tiny 44px swatch. Falls back to the
// plain color gradient (see swatchGradient) while the real thumbnails are
// still rendering (see usePresetThumbnails), or if either failed to load.
export function PresetBeforeAfter({
  beforeSrc,
  afterSrc,
  gradient,
  className = "h-32 w-full",
}: {
  beforeSrc?: string;
  afterSrc?: string;
  gradient: string;
  className?: string;
}) {
  const both = Boolean(beforeSrc && afterSrc);
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ backgroundImage: gradient }}>
      {beforeSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={beforeSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {afterSrc && (
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: "inset(0 0 0 50%)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={afterSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      )}
      {both && (
        <>
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/80" />
          <span className="absolute bottom-1.5 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/85">
            Avant
          </span>
          <span className="absolute bottom-1.5 right-2 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/85">
            Après
          </span>
        </>
      )}
    </div>
  );
}

// The color-swatch gradient shows instantly; once usePresetThumbnails
// finishes its one-time render pass, the real photo fades in on top of it.
export default function PresetThumb({
  src,
  gradient,
  className = "h-11 w-11 rounded-xl",
}: {
  src?: string;
  gradient: string;
  className?: string;
}) {
  return (
    <div className={`relative shrink-0 overflow-hidden ${className}`} style={{ backgroundImage: gradient }}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
    </div>
  );
}
