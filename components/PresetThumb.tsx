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

// The color-swatch gradient shows instantly; once usePresetThumbnails
// finishes its one-time render pass, the real photo fades in on top of it.
export default function PresetThumb({
  src,
  gradient,
  className = "h-11 w-11",
}: {
  src?: string;
  gradient: string;
  className?: string;
}) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-xl ${className}`} style={{ backgroundImage: gradient }}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
    </div>
  );
}
