"use client";

import React from "react";

export type VintageViewfinderMode =
  | "none"
  | "slr-prism"
  | "tlr-6x6"
  | "lens-circle"
  | "film-sprockets"
  | "linhof-4x5"
  | "contax-t2"
  | "mamiya-67"
  | "nikon-f3"
  | "holga-lomo"
  | "olympus-pen";

export const VINTAGE_VIEWFINDER_MODES: { id: VintageViewfinderMode; label: string; shortLabel: string; blurb: string }[] = [
  { id: "none", label: "Désactivé", shortLabel: "OFF", blurb: "Vue standard sans masque optique" },
  { id: "slr-prism", label: "Reflex SLR 35mm (Stigmomètre)", shortLabel: "SLR", blurb: "Viseur dépoli 1970 avec cercle de microprismes et stigmomètre" },
  { id: "tlr-6x6", label: "Rolleiflex 6×6 (Capuchon Dépoli)", shortLabel: "TLR", blurb: "Visée par le dessus avec dépoli carroyé rouge et volets métalliques" },
  { id: "linhof-4x5", label: "Linhof 4×5 Grand Format (Chambre)", shortLabel: "4×5", blurb: "Dépoli en verre gravé à quadrillage millimétrique pour chambre grand format" },
  { id: "contax-t2", label: "Contax T2 Titane (Télémètre Carl Zeiss)", shortLabel: "T2", blurb: "Viseur télémétrique clair à cadre lumineux et LED vert émeraude" },
  { id: "mamiya-67", label: "Mamiya RB67 Pro (6×7 Moyen Format)", shortLabel: "6×7", blurb: "Dépoli studio géant avec repères rotatifs horizontaux et verticaux" },
  { id: "nikon-f3", label: "Nikon F3 HP NASA (High-Eyepoint)", shortLabel: "F3", blurb: "Viseur pro 100% avec cellule intégrée et repères rouges iconiques" },
  { id: "holga-lomo", label: "Holga 120N Toy Camera (Lomographie)", shortLabel: "HOLGA", blurb: "Visée brute à lentille plastique avec vignetage organique prononcé" },
  { id: "olympus-pen", label: "Olympus Pen F (Demi-Format 18×24)", shortLabel: "PEN F", blurb: "Viseur demi-trame vertical 72 poses au prisme en titane" },
  { id: "lens-circle", label: "Lentille Circulaire & Barillet", shortLabel: "LENTILLE", blurb: "Hublot circulaire optique cerclé par la bague des diaphragmes" },
  { id: "film-sprockets", label: "Négatif 35mm Perforé", shortLabel: "35MM", blurb: "Cadrage dans la bande argentique avec perforations réelles" },
];

export default function VintageViewfinderMask({
  mode,
  evBias = 0,
  iso = 400,
  shotCount = 1,
}: {
  mode: VintageViewfinderMode;
  evBias?: number;
  iso?: number;
  shotCount?: number;
}) {
  if (mode === "none") return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-15 flex items-center justify-center select-none overflow-hidden">
      {/* 1. Viseur Reflex SLR 35mm (Stigmomètre & Microprismes) */}
      {mode === "slr-prism" && (
        <div className="relative w-full h-full flex items-center justify-center p-3 sm:p-6">
          <div className="relative w-full h-full max-w-4xl max-h-[92vh] rounded-[24px] sm:rounded-[36px] border-[10px] sm:border-[18px] border-zinc-950 shadow-[0_0_0_9999px_rgba(5,5,5,0.88)] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.45)_100%)] pointer-events-none" />
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div />
            </div>

            <div className="relative flex items-center justify-center">
              <div className="relative h-44 w-44 sm:h-56 sm:w-56 rounded-full border-2 border-amber-300/40 bg-amber-400/5 backdrop-blur-[0.5px] shadow-[0_0_20px_rgba(251,191,36,0.15)] flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full opacity-40 animate-[spin_60s_linear_infinite]" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 2" className="text-amber-200" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1 1.5" className="text-amber-300" />
                </svg>
                <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full border-2 border-amber-400/80 bg-black/10 overflow-hidden flex items-center justify-center shadow-inner">
                  <div className="absolute w-full h-[1.5px] bg-amber-400/90 shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
                  <div className="absolute top-1 text-[8px] font-mono font-bold text-amber-300/70">SPLIT</div>
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                </div>
              </div>
              <div className="absolute -left-12 sm:-left-20 w-8 sm:w-14 h-[1.5px] bg-amber-300/60" />
              <div className="absolute -right-12 sm:-right-20 w-8 sm:w-14 h-[1.5px] bg-amber-300/60" />
              <div className="absolute -top-12 sm:-top-20 h-8 sm:h-14 w-[1.5px] bg-amber-300/60" />
              <div className="absolute -bottom-12 sm:-bottom-20 h-8 sm:h-14 w-[1.5px] bg-amber-300/60" />
            </div>

            <div className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 rounded bg-black/70 px-1.5 py-3 border border-white/20 backdrop-blur-sm">
              <span className="text-[10px] font-mono font-black text-emerald-400">+</span>
              <div className="relative h-24 w-2 bg-zinc-800 rounded-full overflow-hidden flex items-center justify-center">
                <div
                  className="absolute w-3 h-1 bg-amber-400 rounded-full shadow-[0_0_6px_rgba(251,191,36,0.9)] transition-all duration-300"
                  style={{ top: `${Math.max(10, Math.min(90, 50 - evBias * 20))}%` }}
                />
              </div>
              <span className="text-[10px] font-mono font-black text-amber-400">●</span>
              <span className="text-[10px] font-mono font-black text-red-400">−</span>
            </div>

            <div className="absolute top-3 left-4 flex items-center gap-2 text-[10px] font-mono text-white/70 bg-black/60 px-2 py-0.5 rounded border border-white/10">
              <span className="font-bold text-amber-300">SLR PRISM 1970</span>
              <span>·</span>
              <span>ISO {iso}</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Viseur Rolleiflex TLR 6×6 (Capuchon Dépoli) */}
      {mode === "tlr-6x6" && (
        <div className="relative w-full h-full flex items-center justify-center p-3 sm:p-6">
          <div className="relative w-full max-w-[85vh] aspect-square rounded-sm border-[14px] sm:border-[24px] border-zinc-900 shadow-[0_0_0_9999px_rgba(4,4,4,0.92)] flex items-center justify-center overflow-hidden bg-black/10">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/10 pointer-events-none" />
            <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none opacity-40">
              {[...Array(16)].map((_, i) => (
                <div key={`tlr-grid-${i}`} className="border border-red-500/60" />
              ))}
            </div>
            <div className="relative flex items-center justify-center">
              <div className="h-32 w-32 sm:h-44 sm:w-44 rounded-full border-2 border-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.2)] flex items-center justify-center">
                <div className="h-12 w-12 rounded-full border border-red-400/80 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                </div>
              </div>
            </div>
            <div className="absolute top-2 left-1/2 -translate-x-1/2 rounded bg-zinc-950 px-3 py-1 border border-zinc-700 shadow-md flex items-center gap-2">
              <span className="font-serif font-black tracking-widest text-[11px] uppercase text-zinc-300">
                ROLLEIFLEX
              </span>
              <span className="text-[9px] font-mono text-red-400 font-bold">6×6 DÉPOLI</span>
            </div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/80 px-2.5 py-0.5 border border-white/20 text-[10px] font-mono text-white/80">
              VUE {shotCount} / 12 · HEIDOSMAT 1:2.8
            </div>
          </div>
        </div>
      )}

      {/* 3. Linhof Master Technika 4×5 Grand Format */}
      {mode === "linhof-4x5" && (
        <div className="relative w-full h-full flex items-center justify-center p-3 sm:p-6">
          <div className="relative w-full max-w-5xl aspect-[5/4] border-[16px] sm:border-[24px] border-zinc-900 shadow-[0_0_0_9999px_rgba(3,3,3,0.94)] flex items-center justify-center overflow-hidden bg-black/20">
            {/* Precision Etched Millimeter Ground Glass */}
            <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 pointer-events-none opacity-25">
              {[...Array(48)].map((_, i) => (
                <div key={`linhof-grid-${i}`} className="border border-white/60" />
              ))}
            </div>
            {/* Center Cross and Format crop brackets */}
            <div className="absolute inset-8 border border-white/40 pointer-events-none flex items-center justify-center">
              <div className="w-16 h-16 border-2 border-white/70 flex items-center justify-center">
                <div className="w-full h-px bg-white/80" />
                <div className="absolute h-full w-px bg-white/80" />
              </div>
            </div>
            <div className="absolute top-2 left-3 flex items-center gap-2 rounded bg-zinc-950/80 px-2.5 py-0.5 border border-zinc-700 text-[10px] font-mono text-amber-300">
              <span className="font-bold">LINHOF 4×5 TECHNIKA</span>
              <span>·</span>
              <span>SCHNEIDER SYMMAR 150mm</span>
            </div>
            <div className="absolute bottom-2 right-3 text-[10px] font-mono text-white/60 bg-black/70 px-2 py-0.5 rounded border border-white/10">
              PLAN FILM 4×5 INCH · EXP {shotCount}
            </div>
          </div>
        </div>
      )}

      {/* 4. Contax T2 / T3 Titane */}
      {mode === "contax-t2" && (
        <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-8">
          <div className="relative w-full max-w-4xl aspect-[3/2] rounded-2xl border-[12px] sm:border-[20px] border-zinc-900 shadow-[0_0_0_9999px_rgba(2,2,2,0.9)] flex items-center justify-center overflow-hidden bg-black/10">
            {/* Bright Frame Lines with Parallax Marks */}
            <div className="absolute inset-6 sm:inset-10 border-2 border-white/50 pointer-events-none">
              <div className="absolute -top-1 left-4 w-4 h-1 bg-white/70" />
              <div className="absolute -top-1 right-4 w-4 h-1 bg-white/70" />
              {/* Close focus parallax ticks */}
              <div className="absolute top-4 left-0 right-0 border-t border-dashed border-white/40" />
            </div>
            {/* Center Autofocus Reticle */}
            <div className="relative flex items-center justify-center">
              <div className="h-10 w-16 border border-emerald-400/80 rounded-xs flex items-center justify-center shadow-[0_0_8px_rgba(52,211,153,0.4)]">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </div>
            </div>
            {/* Bottom Titanium Green LED Shutter / Aperture Display */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-4 px-3 py-1 rounded-full bg-black/90 border border-emerald-500/40 text-[11px] font-mono font-bold text-emerald-400 tracking-wider shadow-lg">
              <span>[● AF]</span>
              <span>1/500</span>
              <span>F2.8</span>
              <span className="text-white/60">CARL ZEISS T*</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Mamiya RB67 Pro 6×7 Moyen Format */}
      {mode === "mamiya-67" && (
        <div className="relative w-full h-full flex items-center justify-center p-3 sm:p-6">
          <div className="relative w-full max-w-4xl aspect-[7/6] border-[16px] sm:border-[24px] border-zinc-950 shadow-[0_0_0_9999px_rgba(2,2,2,0.92)] flex items-center justify-center overflow-hidden bg-black/15">
            {/* Rotating Back Horizontal / Vertical Golden Guidelines */}
            <div className="absolute inset-4 border border-amber-400/40 pointer-events-none">
              <div className="absolute inset-x-0 top-1/4 bottom-1/4 border-y border-dashed border-amber-400/30" />
              <div className="absolute inset-y-0 left-1/4 right-1/4 border-x border-dashed border-amber-400/30" />
            </div>
            {/* Central Ground Glass Red Ring */}
            <div className="relative flex items-center justify-center">
              <div className="h-28 w-28 rounded-full border border-red-500/60 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full border border-red-400" />
              </div>
            </div>
            <div className="absolute top-2 left-3 flex items-center gap-2 rounded bg-black/80 px-2 py-0.5 border border-white/20 text-[10px] font-mono text-amber-300 font-bold">
              <span>MAMIYA RB67 PRO SD</span>
              <span>·</span>
              <span>SEKOR C 90mm F3.8</span>
            </div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-mono text-white/80 bg-zinc-900/90 px-3 py-0.5 rounded border border-zinc-700">
              DOS ROTATIF 6×7 · VUE {shotCount}/10
            </div>
          </div>
        </div>
      )}

      {/* 6. Nikon F3 HP NASA / Titane */}
      {mode === "nikon-f3" && (
        <div className="relative w-full h-full flex items-center justify-center p-3 sm:p-6">
          <div className="relative w-full max-w-4xl aspect-[3/2] rounded-3xl border-[14px] sm:border-[22px] border-zinc-950 shadow-[0_0_0_9999px_rgba(2,2,2,0.9)] flex items-center justify-center overflow-hidden bg-black/15">
            {/* Red Tally Eyepoint Illumination */}
            <div className="absolute top-3 left-4 flex items-center gap-2 text-[11px] font-mono text-red-500 font-black">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
              <span>NIKON F3 HP NASA</span>
            </div>
            {/* 12mm 80/20 Center-Weighted Metering Circle */}
            <div className="relative flex items-center justify-center">
              <div className="h-36 w-36 rounded-full border-2 border-white/40 flex items-center justify-center">
                <div className="h-16 w-16 rounded-full border border-dashed border-red-500/60 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                </div>
              </div>
            </div>
            {/* Top LCD Shutter Speed / Aperture Direct Optical Readout */}
            <div className="absolute top-3 right-4 px-2 py-0.5 bg-black/80 rounded border border-white/20 text-[10px] font-mono text-white/90">
              <span className="text-amber-400 font-bold">M2000</span> · F1.4 NIKKOR
            </div>
          </div>
        </div>
      )}

      {/* 7. Holga 120N Toy Camera (Lomographie) */}
      {mode === "holga-lomo" && (
        <div className="relative w-full h-full flex items-center justify-center p-3 sm:p-6">
          <div className="relative w-full max-w-[85vh] aspect-square rounded-2xl border-[16px] sm:border-[28px] border-zinc-950 shadow-[0_0_0_9999px_rgba(5,5,5,0.96)] flex items-center justify-center overflow-hidden bg-black/40">
            {/* Plastic Optical Vignette & Light Leak Tint */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-600/15 rounded-full blur-2xl pointer-events-none" />
            {/* Simple Plastic Wireframe Reticle */}
            <div className="relative flex items-center justify-center opacity-60">
              <div className="h-24 w-24 border-2 border-white/60 rounded-xs flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-white/70" />
              </div>
            </div>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded bg-black/90 px-3 py-1 border border-white/20 text-[10px] font-mono font-bold text-yellow-300">
              HOLGA 120N OPTICAL LENS 60mm
            </div>
          </div>
        </div>
      )}

      {/* 8. Olympus Pen F Demi-Format 18×24 */}
      {mode === "olympus-pen" && (
        <div className="relative w-full h-full flex items-center justify-center p-3 sm:p-6">
          <div className="relative w-full max-w-md aspect-[3/4] rounded-2xl border-[14px] sm:border-[22px] border-zinc-950 shadow-[0_0_0_9999px_rgba(2,2,2,0.92)] flex items-center justify-center overflow-hidden bg-black/15">
            {/* Vertical Half-Frame Framelines */}
            <div className="absolute inset-4 border border-white/40 flex items-center justify-center">
              <div className="w-8 h-8 border border-white/60 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
              </div>
            </div>
            <div className="absolute top-2 left-3 flex items-center gap-1.5 text-[10px] font-mono text-zinc-300 bg-black/80 px-2 py-0.5 rounded border border-white/20">
              <span className="font-serif italic font-bold">Pen F</span>
              <span>18×24mm DEMI-CADRE</span>
            </div>
            <div className="absolute bottom-2 right-3 text-[10px] font-mono text-amber-300 bg-black/80 px-2 py-0.5 rounded border border-white/20">
              POSE {shotCount * 2}/72
            </div>
          </div>
        </div>
      )}

      {/* 9. Viseur Objectif & Lentille Circulaire Rétro */}
      {mode === "lens-circle" && (
        <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-8">
          <div className="relative h-[82vw] w-[82vw] max-h-[82vh] max-w-[82vh] rounded-full border-[16px] sm:border-[28px] border-zinc-950 shadow-[0_0_0_9999px_rgba(2,2,2,0.92)] flex items-center justify-center overflow-hidden">
            <div className="pointer-events-none absolute inset-0 rounded-full border-4 border-zinc-700/80 shadow-[inset_0_0_25px_rgba(0,0,0,0.8)]" />
            <div className="pointer-events-none absolute -top-1/4 -left-1/4 h-[90%] w-[90%] rounded-full bg-gradient-to-br from-cyan-400/15 via-white/5 to-transparent blur-sm" />
            <div className="relative flex items-center justify-center opacity-70">
              <div className="h-28 w-28 rounded-full border border-white/40 flex items-center justify-center">
                <div className="h-full w-[1px] bg-white/30" />
                <div className="absolute w-full h-[1px] bg-white/30" />
                <div className="h-4 w-4 rounded-full border border-cyan-300" />
              </div>
            </div>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-3 py-1 border border-white/20 text-[10px] font-mono font-bold text-cyan-300 flex items-center gap-2 shadow-lg backdrop-blur">
              <span>f=50mm</span>
              <span>·</span>
              <span>1:1.4</span>
              <span>·</span>
              <span className="text-white">F/2.8</span>
            </div>
          </div>
        </div>
      )}

      {/* 10. Cadre Négatif 35mm avec Perforations Réelles */}
      {mode === "film-sprockets" && (
        <div className="relative w-full h-full flex flex-col justify-between p-2 sm:p-4">
          <div className="relative h-14 sm:h-18 w-full bg-zinc-950 border-b-2 border-zinc-800 flex flex-col justify-between px-2 py-1.5 shadow-2xl">
            <div className="flex items-center justify-between">
              {[...Array(12)].map((_, i) => (
                <div
                  key={`top-sprocket-${i}`}
                  className="h-4 w-6 sm:h-5 sm:w-8 rounded-[4px] bg-black/90 border border-zinc-700 shadow-inner"
                />
              ))}
            </div>
            <div className="flex items-center justify-between px-2 text-[9px] sm:text-[10px] font-mono font-bold text-amber-400/80">
              <span>SAFETY FILM 35mm</span>
              <span>► {shotCount}A</span>
              <span>DX {iso}</span>
              <span>KODAK EXP 36</span>
            </div>
          </div>

          <div className="relative flex-1 border-x-[12px] sm:border-x-[20px] border-zinc-950 flex items-center justify-center shadow-inner">
            <div className="w-full h-full border border-amber-400/20" />
          </div>

          <div className="relative h-14 sm:h-18 w-full bg-zinc-950 border-t-2 border-zinc-800 flex flex-col justify-between px-2 py-1.5 shadow-2xl">
            <div className="flex items-center justify-between px-2 text-[9px] sm:text-[10px] font-mono font-bold text-amber-400/80">
              <span>FRAME {shotCount}</span>
              <span>PROCESS C-41</span>
              <span>135-36</span>
              <span>EMULSION 2026</span>
            </div>
            <div className="flex items-center justify-between">
              {[...Array(12)].map((_, i) => (
                <div
                  key={`bot-sprocket-${i}`}
                  className="h-4 w-6 sm:h-5 sm:w-8 rounded-[4px] bg-black/90 border border-zinc-700 shadow-inner"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
