"use client";

import { useEffect, useRef, useState } from "react";

const BUCKETS = 32;
const SAMPLE_INTERVAL_MS = 200;

const CHANNEL_COLOR = {
  r: "rgb(255,70,70)",
  g: "rgb(70,255,110)",
  b: "rgb(80,130,255)",
} as const;

type Levels = { r: number[]; g: number[]; b: number[] };

// A live RGB histogram, sampled from the same canvas the viewfinder
// already renders to -- so it reflects the actual filtered/exposed image,
// not the raw sensor feed. Draws the (already-filtered) canvas down onto a
// tiny hidden 2D canvas every ~200ms and buckets that handful of pixels
// per channel; same trick components/PresetThumb.tsx's source uses, just
// repeated on a timer instead of once. The three channels are drawn as
// overlapping bars with mix-blend-mode: screen -- the standard photo-editor
// histogram look, where overlap between channels reads as brighter/white
// instead of muddying into gray.
//
// Takes the ref object itself, not canvasRef.current: the canvas is still
// null on this component's first render (refs attach after commit, and
// attaching one never triggers a re-render), so reading .current only
// inside the effect below -- which runs after the whole tree, including
// the canvas, has mounted -- is what actually finds it.
export default function Histogram({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  const [levels, setLevels] = useState<Levels | null>(null);
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

    const normalize = (buckets: number[]) => {
      const max = Math.max(...buckets, 1);
      return buckets.map((v) => v / max);
    };

    let raf: number;
    let lastSample = 0;
    const loop = (t: number) => {
      if (t - lastSample > SAMPLE_INTERVAL_MS) {
        lastSample = t;
        try {
          ctx.drawImage(sourceCanvas, 0, 0, sample.width, sample.height);
          const { data } = ctx.getImageData(0, 0, sample.width, sample.height);
          const rBuckets = new Array(BUCKETS).fill(0);
          const gBuckets = new Array(BUCKETS).fill(0);
          const bBuckets = new Array(BUCKETS).fill(0);
          for (let i = 0; i < data.length; i += 4) {
            rBuckets[Math.min(BUCKETS - 1, Math.floor((data[i] / 255) * BUCKETS))]++;
            gBuckets[Math.min(BUCKETS - 1, Math.floor((data[i + 1] / 255) * BUCKETS))]++;
            bBuckets[Math.min(BUCKETS - 1, Math.floor((data[i + 2] / 255) * BUCKETS))]++;
          }
          setLevels({ r: normalize(rBuckets), g: normalize(gBuckets), b: normalize(bBuckets) });
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
    <div className="pointer-events-none relative h-9 w-32 overflow-hidden rounded-md bg-black/60 backdrop-blur">
      {(["r", "g", "b"] as const).map((ch) => (
        <div key={ch} className="absolute inset-x-1.5 inset-y-1 flex items-end gap-px mix-blend-screen">
          {levels[ch].map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-[1px]"
              style={{ height: `${Math.max(3, v * 100)}%`, backgroundColor: CHANNEL_COLOR[ch] }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
