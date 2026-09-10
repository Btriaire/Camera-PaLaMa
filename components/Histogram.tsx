"use client";

import { useEffect, useRef, useState } from "react";

const BUCKETS = 32;
const SAMPLE_INTERVAL_MS = 200;

// A live luminance histogram, sampled from the same canvas the viewfinder
// already renders to -- so it reflects the actual filtered/exposed image,
// not the raw sensor feed. Draws the (already-filtered) canvas down onto a
// tiny hidden 2D canvas every ~200ms and buckets that handful of pixels;
// same trick components/PresetThumb.tsx's source uses, just repeated on a
// timer instead of once.
//
// Takes the ref object itself, not canvasRef.current: the canvas is still
// null on this component's first render (refs attach after commit, and
// attaching one never triggers a re-render), so reading .current only
// inside the effect below -- which runs after the whole tree, including
// the canvas, has mounted -- is what actually finds it.
export default function Histogram({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  const [levels, setLevels] = useState<number[] | null>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const sourceCanvas = canvasRef.current;
    if (!sourceCanvas) return;
    if (!sampleCanvasRef.current) sampleCanvasRef.current = document.createElement("canvas");
    const sample = sampleCanvasRef.current;
    sample.width = 64;
    sample.height = 36;
    const ctx = sample.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let raf: number;
    let lastSample = 0;
    const loop = (t: number) => {
      if (t - lastSample > SAMPLE_INTERVAL_MS) {
        lastSample = t;
        try {
          ctx.drawImage(sourceCanvas, 0, 0, sample.width, sample.height);
          const { data } = ctx.getImageData(0, 0, sample.width, sample.height);
          const buckets = new Array(BUCKETS).fill(0);
          for (let i = 0; i < data.length; i += 4) {
            const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            buckets[Math.min(BUCKETS - 1, Math.floor((lum / 255) * BUCKETS))]++;
          }
          const max = Math.max(...buckets, 1);
          setLevels(buckets.map((v) => v / max));
        } catch {
          // Source canvas has no content yet (e.g. not ready) -- skip this tick.
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [canvasRef]);

  if (!levels) return null;

  return (
    <div className="pointer-events-none flex h-9 w-32 items-end gap-px rounded-md bg-black/35 px-1.5 py-1 backdrop-blur">
      {levels.map((v, i) => (
        <div key={i} className="flex-1 rounded-[1px] bg-white/75" style={{ height: `${Math.max(4, v * 100)}%` }} />
      ))}
    </div>
  );
}
