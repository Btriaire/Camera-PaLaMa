"use client";

import { useMemo } from "react";
import { OisLockIcon, RadarScopeIcon, SparkleIcon, UltraZoomIcon } from "@/components/Icons";

export const ULTRA_ZOOM_STEPS = [0.5, 1, 2, 5, 10, 30, 50, 100] as const;

export function getFocalEquivalent(zoom: number): number {
  return Math.round(24 * zoom);
}

export default function UltraZoomHUD({
  zoom,
  hardwareMax = 1,
  oisLocked,
  onToggleOisLock,
  onSelectZoom,
  stabilityPercent = 98.5,
  tremorRate = 0.2,
  cropFraction = 1,
}: {
  zoom: number;
  hardwareMax?: number;
  oisLocked: boolean;
  onToggleOisLock: () => void;
  onSelectZoom: (z: number) => void;
  stabilityPercent?: number;
  tremorRate?: number;
  cropFraction?: number;
}) {
  const focalMm = getFocalEquivalent(zoom);
  const isExtreme = zoom >= 10;
  const isSuper = zoom >= 30;

  // Real-time estimated MTF detail score based on zoom and stability
  const detailScore = useMemo(() => {
    const baseScore = Math.max(35, 98 - Math.log2(Math.max(1, zoom)) * 9.5);
    const stabPenalty = (100 - stabilityPercent) * 0.8;
    return Math.round(Math.max(20, Math.min(99, baseScore - stabPenalty)));
  }, [zoom, stabilityPercent]);

  // PiP Radar box dimensions
  const radarW = 76;
  const radarH = 50;
  const boxW = Math.max(6, Math.min(radarW, Math.round(radarW / zoom)));
  const boxH = Math.max(4, Math.min(radarH, Math.round(radarH / zoom)));
  const boxX = Math.round((radarW - boxW) / 2);
  const boxY = Math.round((radarH - boxH) / 2);

  return (
    <div className="pointer-events-none select-none">
      {/* Top Right: Telephoto PiP Radar Viewfinder & Focal Length Readout */}
      <div
        className="pointer-events-auto absolute right-3 flex flex-col items-end gap-1.5 z-20"
        style={{ top: "calc(max(0.75rem, env(safe-area-inset-top)) + 3.8rem)" }}
      >
        {/* Telephoto PiP Mini-Map */}
        {zoom >= 3 && (
          <div className="relative rounded-lg border border-amber-400/50 bg-black/80 p-1 backdrop-blur shadow-2xl transition-all">
            <div className="relative overflow-hidden rounded border border-white/20 bg-zinc-950" style={{ width: radarW, height: radarH }}>
              {/* Radar Grid Overlay */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="border border-white/40" />
                ))}
              </div>
              {/* Center Crosshair in Global Frame */}
              <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white" />
                <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-white" />
              </div>
              {/* Active Cropped Field of View Box */}
              <div
                className={`absolute border transition-all duration-75 ${
                  oisLocked ? "border-emerald-400 bg-emerald-400/25 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "border-amber-400 bg-amber-400/15"
                }`}
                style={{
                  width: boxW,
                  height: boxH,
                  left: boxX,
                  top: boxY,
                }}
              >
                {/* Target Corners */}
                <div className="absolute -left-0.5 -top-0.5 h-1 w-1 border-l border-t border-amber-300" />
                <div className="absolute -right-0.5 -top-0.5 h-1 w-1 border-r border-t border-amber-300" />
                <div className="absolute -left-0.5 -bottom-0.5 h-1 w-1 border-l border-b border-amber-300" />
                <div className="absolute -right-0.5 -bottom-0.5 h-1 w-1 border-r border-b border-amber-300" />
              </div>
            </div>
            <div className="flex items-center justify-between px-1 pt-0.5 text-[9px] font-mono font-bold text-amber-300">
              <span>RADAR PiP</span>
              <span>{zoom.toFixed(1)}×</span>
            </div>
          </div>
        )}

        {/* Optical Telephoto Spec Badge */}
        <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/75 px-2.5 py-1 text-[11px] font-mono font-bold backdrop-blur shadow-lg">
          <span className={isSuper ? "text-fuchsia-400 animate-pulse" : isExtreme ? "text-amber-400" : "text-cyan-300"}>
            {focalMm}mm EQ
          </span>
          <span className="text-white/40">•</span>
          <span className="text-white/80">{zoom.toFixed(1)}×</span>
          {isSuper && <span className="rounded bg-fuchsia-500/20 px-1 text-[9px] text-fuchsia-300 border border-fuchsia-500/40">SPACE</span>}
        </div>
      </div>

      {/* Top Left: Detail Analysis & Gyro Stabilization Metrics */}
      <div
        className="pointer-events-auto absolute left-3 flex flex-col gap-1.5 z-20"
        style={{ top: "calc(max(0.75rem, env(safe-area-inset-top)) + 3.8rem)" }}
      >
        {/* MTF & Detail Analysis Box */}
        <div className="rounded-xl border border-white/15 bg-black/80 px-2.5 py-1.5 backdrop-blur shadow-xl text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-cyan-300 font-bold mb-0.5">
            <UltraZoomIcon className="w-3.5 h-3.5" />
            <span>ANALYSE DÉTAILS</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-white/80">
            <span>Score MTF:</span>
            <span className="font-bold text-white">{detailScore}%</span>
          </div>
          {/* Detail Bar */}
          <div className="my-1 h-1 w-28 overflow-hidden rounded-full bg-white/15">
            <div
              className={`h-full transition-all duration-200 ${
                detailScore > 75 ? "bg-emerald-400" : detailScore > 45 ? "bg-amber-400" : "bg-cyan-400"
              }`}
              style={{ width: `${detailScore}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-4 text-white/70">
            <span>Stabilité OIS:</span>
            <span className={`font-bold ${stabilityPercent > 95 ? "text-emerald-400" : "text-amber-300"}`}>
              {stabilityPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* OIS Target Lock Button */}
        <button
          onClick={onToggleOisLock}
          aria-pressed={oisLocked}
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono font-bold backdrop-blur shadow-md active:scale-95 transition-all ${
            oisLocked
              ? "border-emerald-400 bg-emerald-400/25 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.5)]"
              : "border-white/20 bg-black/65 text-white/80 hover:bg-white/10"
          }`}
        >
          <OisLockIcon className="w-3.5 h-3.5" />
          <span>{oisLocked ? "OIS VERROUILLÉ" : "VERROU CIBLE"}</span>
        </button>
      </div>

      {/* Center Reticle for High Zoom Targets */}
      {zoom >= 5 && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className={`relative h-20 w-20 transition-all ${oisLocked ? "text-emerald-400" : "text-amber-400"}`}>
            {/* Precision Optical Telephoto Crosshair */}
            <svg viewBox="0 0 80 80" className="h-full w-full stroke-current fill-none" strokeWidth="1.2">
              <circle cx="40" cy="40" r="28" strokeDasharray="3 3" opacity="0.6" />
              <line x1="40" y1="6" x2="40" y2="24" />
              <line x1="40" y1="56" x2="40" y2="74" />
              <line x1="6" y1="40" x2="24" y2="40" />
              <line x1="56" y1="40" x2="74" y2="40" />
              <circle cx="40" cy="40" r="3" fill="currentColor" opacity="0.7" />
            </svg>
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-mono font-bold text-amber-300 border border-amber-400/30">
              {zoom.toFixed(1)}× // {focalMm}mm
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
