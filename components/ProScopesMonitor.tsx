"use client";

import { useEffect, useRef, useState } from "react";

export type ScopeMode = "histogram" | "waveform" | "vectorscope";

const BUCKETS = 64;
const SAMPLE_INTERVAL_MS = 150;

const CHANNEL_COLOR = {
  r: "rgb(255, 70, 70)",
  g: "rgb(70, 255, 110)",
  b: "rgb(80, 130, 255)",
} as const;

export default function ProScopesMonitor({
  canvasRef,
  mode = "histogram",
  onCycleMode,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  mode: ScopeMode;
  onCycleMode?: () => void;
}) {
  const [levels, setLevels] = useState<{ r: number[]; g: number[]; b: number[] } | null>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);

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

          if (mode === "histogram") {
            const rBuckets = new Array(BUCKETS).fill(0);
            const gBuckets = new Array(BUCKETS).fill(0);
            const bBuckets = new Array(BUCKETS).fill(0);
            for (let i = 0; i < data.length; i += 4) {
              rBuckets[Math.min(BUCKETS - 1, Math.floor((data[i] / 255) * BUCKETS))]++;
              gBuckets[Math.min(BUCKETS - 1, Math.floor((data[i + 1] / 255) * BUCKETS))]++;
              bBuckets[Math.min(BUCKETS - 1, Math.floor((data[i + 2] / 255) * BUCKETS))]++;
            }
            setLevels({ r: normalize(rBuckets), g: normalize(gBuckets), b: normalize(bBuckets) });
          } else if (mode === "waveform" && scopeCanvasRef.current) {
            const sc = scopeCanvasRef.current;
            const sctx = sc.getContext("2d");
            if (sctx) {
              sctx.fillStyle = "rgba(0, 0, 0, 0.85)";
              sctx.fillRect(0, 0, sc.width, sc.height);

              // Grid lines (0, 50, 100 IRE)
              sctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
              sctx.lineWidth = 1;
              sctx.beginPath();
              sctx.moveTo(0, sc.height * 0.1);
              sctx.lineTo(sc.width, sc.height * 0.1);
              sctx.moveTo(0, sc.height * 0.5);
              sctx.lineTo(sc.width, sc.height * 0.5);
              sctx.moveTo(0, sc.height * 0.9);
              sctx.lineTo(sc.width, sc.height * 0.9);
              sctx.stroke();

              // RGB Parade columns: R (left), G (center), B (right)
              const colW = sc.width / 3;
              for (let y = 0; y < sample.height; y++) {
                for (let x = 0; x < sample.width; x++) {
                  const idx = (y * sample.width + x) * 4;
                  const r = data[idx];
                  const g = data[idx + 1];
                  const b = data[idx + 2];

                  const xFrac = x / sample.width;
                  // R
                  const rx = xFrac * (colW - 4);
                  const ry = sc.height * 0.9 - (r / 255) * (sc.height * 0.8);
                  sctx.fillStyle = "rgba(255, 60, 60, 0.45)";
                  sctx.fillRect(rx, ry, 1.5, 1.5);

                  // G
                  const gx = colW + xFrac * (colW - 4);
                  const gy = sc.height * 0.9 - (g / 255) * (sc.height * 0.8);
                  sctx.fillStyle = "rgba(60, 255, 90, 0.45)";
                  sctx.fillRect(gx, gy, 1.5, 1.5);

                  // B
                  const bx = colW * 2 + xFrac * (colW - 4);
                  const by = sc.height * 0.9 - (b / 255) * (sc.height * 0.8);
                  sctx.fillStyle = "rgba(80, 150, 255, 0.45)";
                  sctx.fillRect(bx, by, 1.5, 1.5);
                }
              }
            }
          } else if (mode === "vectorscope" && scopeCanvasRef.current) {
            const sc = scopeCanvasRef.current;
            const sctx = sc.getContext("2d");
            if (sctx) {
              sctx.fillStyle = "rgba(0, 0, 0, 0.85)";
              sctx.fillRect(0, 0, sc.width, sc.height);

              const cx = sc.width / 2;
              const cy = sc.height / 2;
              const radius = Math.min(cx, cy) - 6;

              // Reticle circle & Skin Tone line
              sctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
              sctx.beginPath();
              sctx.arc(cx, cy, radius, 0, Math.PI * 2);
              sctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
              sctx.moveTo(cx - radius, cy);
              sctx.lineTo(cx + radius, cy);
              sctx.moveTo(cx, cy - radius);
              sctx.lineTo(cx, cy + radius);
              sctx.stroke();

              // Skin Tone Line
              sctx.strokeStyle = "rgba(251, 191, 36, 0.6)";
              sctx.beginPath();
              sctx.moveTo(cx, cy);
              sctx.lineTo(cx - radius * 0.75, cy - radius * 0.75);
              sctx.stroke();

              // Plot U/V chrominance points
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i] / 255;
                const g = data[i + 1] / 255;
                const b = data[i + 2] / 255;
                const u = -0.14713 * r - 0.28886 * g + 0.436 * b;
                const v = 0.615 * r - 0.51499 * g - 0.10001 * b;

                const px = cx + u * radius * 3.5;
                const py = cy - v * radius * 3.5;

                sctx.fillStyle = "rgba(34, 211, 238, 0.45)";
                sctx.fillRect(px, py, 1.5, 1.5);
              }
            }
          }
        } catch {
          // Canvas not ready
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [canvasRef, mode]);

  return (
    <div
      onClick={onCycleMode}
      className="pointer-events-auto cursor-pointer relative h-12 w-52 overflow-hidden rounded-xl border border-white/25 bg-black/85 backdrop-blur-md shadow-2xl transition-transform active:scale-95"
      title="Cliquer pour basculer : Histogramme / Waveform Parade / Vectorscope"
    >
      <div className="absolute top-1 left-2 flex items-center gap-1.5 z-10 pointer-events-none">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-300">
          {mode === "histogram" ? "Histogramme RGB" : mode === "waveform" ? "Waveform RGB Parade" : "Vectorscope (Skin)"}
        </span>
      </div>

      {mode === "histogram" && levels && (
        <div className="absolute inset-0 pt-4 px-2 pb-1 flex items-end">
          {(["r", "g", "b"] as const).map((ch) => (
            <div key={ch} className="absolute inset-x-2 inset-y-1.5 flex items-end mix-blend-screen">
              {levels[ch].map((v, i) => (
                <div
                  key={i}
                  className="flex-1"
                  style={{ height: `${Math.max(2, v * 90)}%`, backgroundColor: CHANNEL_COLOR[ch] }}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {(mode === "waveform" || mode === "vectorscope") && (
        <canvas ref={scopeCanvasRef} width={208} height={48} className="h-full w-full object-cover" />
      )}
    </div>
  );
}
