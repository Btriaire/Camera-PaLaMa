"use client";

import React from "react";

export type VintageViewfinderMode = "none" | "slr-prism" | "tlr-6x6" | "lens-circle" | "film-sprockets";

export const VINTAGE_VIEWFINDER_MODES: { id: VintageViewfinderMode; label: string; shortLabel: string; blurb: string }[] = [
  { id: "none", label: "Désactivé", shortLabel: "OFF", blurb: "Vue standard sans masque optique" },
  { id: "slr-prism", label: "Reflex SLR 35mm (Stigmomètre)", shortLabel: "SLR", blurb: "Viseur dépoli 1970 avec cercle de microprismes et stigmomètre" },
  { id: "tlr-6x6", label: "Rolleiflex 6×6 (Capuchon Dépoli)", shortLabel: "TLR", blurb: "Visée par le dessus avec dépoli carroyé rouge et volets métalliques" },
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
          {/* Outer Dark Optical Rubber Eyepiece Shroud */}
          <div className="relative w-full h-full max-w-4xl max-h-[92vh] rounded-[24px] sm:rounded-[36px] border-[10px] sm:border-[18px] border-zinc-950 shadow-[0_0_0_9999px_rgba(5,5,5,0.88)] flex items-center justify-center overflow-hidden">
            {/* Ground Glass Matte Grain Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.45)_100%)] pointer-events-none" />

            {/* Subtle Etched Viewfinder Grid Lines */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-white" />
              <div className="border-r border-white" />
              <div />
            </div>

            {/* Central Rangefinder Stigmometer Collar & Micro-Prisms */}
            <div className="relative flex items-center justify-center">
              {/* Outer Micro-Prism Textured Collar Ring */}
              <div className="relative h-44 w-44 sm:h-56 sm:w-56 rounded-full border-2 border-amber-300/40 bg-amber-400/5 backdrop-blur-[0.5px] shadow-[0_0_20px_rgba(251,191,36,0.15)] flex items-center justify-center">
                {/* Micro-Prism Radiating Hashmarks */}
                <svg className="absolute inset-0 w-full h-full opacity-40 animate-[spin_60s_linear_infinite]" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 2" className="text-amber-200" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1 1.5" className="text-amber-300" />
                </svg>

                {/* Inner Split-Image Stigmometer (Stigmomètre horizontal divisé) */}
                <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full border-2 border-amber-400/80 bg-black/10 overflow-hidden flex items-center justify-center shadow-inner">
                  {/* Split Line */}
                  <div className="absolute w-full h-[1.5px] bg-amber-400/90 shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
                  {/* Top Semicircle Shift Indicator */}
                  <div className="absolute top-1 text-[8px] font-mono font-bold text-amber-300/70">SPLIT</div>
                  {/* Central Dot */}
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                </div>
              </div>

              {/* Crosshair Framing Ticks */}
              <div className="absolute -left-12 sm:-left-20 w-8 sm:w-14 h-[1.5px] bg-amber-300/60" />
              <div className="absolute -right-12 sm:-right-20 w-8 sm:w-14 h-[1.5px] bg-amber-300/60" />
              <div className="absolute -top-12 sm:-top-20 h-8 sm:h-14 w-[1.5px] bg-amber-300/60" />
              <div className="absolute -bottom-12 sm:-bottom-20 h-8 sm:h-14 w-[1.5px] bg-amber-300/60" />
            </div>

            {/* Right-Side Analog Viewfinder Galvanometer Exposure Needle */}
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

            {/* Top Viewfinder Stamp */}
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
          {/* Square 1:1 Ground Glass with Black Shading Hood Frame */}
          <div className="relative w-full max-w-[85vh] aspect-square rounded-sm border-[14px] sm:border-[24px] border-zinc-900 shadow-[0_0_0_9999px_rgba(4,4,4,0.92)] flex items-center justify-center overflow-hidden bg-black/10">
            {/* Ground Glass Surface Glare */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/10 pointer-events-none" />

            {/* Iconic Red TLR Grid (Carroyage rouge classique 6x6) */}
            <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none opacity-40">
              {[...Array(16)].map((_, i) => (
                <div key={`tlr-grid-${i}`} className="border border-red-500/60" />
              ))}
            </div>

            {/* Central TLR Focusing Target Circle */}
            <div className="relative flex items-center justify-center">
              <div className="h-32 w-32 sm:h-44 sm:w-44 rounded-full border-2 border-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.2)] flex items-center justify-center">
                <div className="h-12 w-12 rounded-full border border-red-400/80 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                </div>
              </div>
            </div>

            {/* Top Rolleiflex Stamped Plaque Header */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 rounded bg-zinc-950 px-3 py-1 border border-zinc-700 shadow-md flex items-center gap-2">
              <span className="font-serif font-black tracking-widest text-[11px] uppercase text-zinc-300">
                ROLLEIFLEX
              </span>
              <span className="text-[9px] font-mono text-red-400 font-bold">6×6 DÉPOLI</span>
            </div>

            {/* Bottom Frame Counter */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/80 px-2.5 py-0.5 border border-white/20 text-[10px] font-mono text-white/80">
              VUE {shotCount} / 12 · HEIDOSMAT 1:2.8
            </div>
          </div>
        </div>
      )}

      {/* 3. Viseur Objectif & Lentille Circulaire Rétro */}
      {mode === "lens-circle" && (
        <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-8">
          {/* Circular Optical Lens Portal */}
          <div className="relative h-[82vw] w-[82vw] max-h-[82vh] max-w-[82vh] rounded-full border-[16px] sm:border-[28px] border-zinc-950 shadow-[0_0_0_9999px_rgba(2,2,2,0.92)] flex items-center justify-center overflow-hidden">
            {/* Metallic Aperture Barrel Ring Inside the Bezel */}
            <div className="pointer-events-none absolute inset-0 rounded-full border-4 border-zinc-700/80 shadow-[inset_0_0_25px_rgba(0,0,0,0.8)]" />

            {/* Glass Curvature Reflection Arc */}
            <div className="pointer-events-none absolute -top-1/4 -left-1/4 h-[90%] w-[90%] rounded-full bg-gradient-to-br from-cyan-400/15 via-white/5 to-transparent blur-sm" />

            {/* Central Optical Reticle */}
            <div className="relative flex items-center justify-center opacity-70">
              <div className="h-28 w-28 rounded-full border border-white/40 flex items-center justify-center">
                <div className="h-full w-[1px] bg-white/30" />
                <div className="absolute w-full h-[1px] bg-white/30" />
                <div className="h-4 w-4 rounded-full border border-cyan-300" />
              </div>
            </div>

            {/* Engraved Lens Aperture & Focal Length markings on perimeter */}
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

      {/* 4. Cadre Négatif 35mm avec Perforations Réelles */}
      {mode === "film-sprockets" && (
        <div className="relative w-full h-full flex flex-col justify-between p-2 sm:p-4">
          {/* Top 35mm Perforated Sprocket Film Border */}
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

          {/* Central 35mm Frame Crop Border */}
          <div className="relative flex-1 border-x-[12px] sm:border-x-[20px] border-zinc-950 flex items-center justify-center shadow-inner">
            <div className="w-full h-full border border-amber-400/20" />
          </div>

          {/* Bottom 35mm Perforated Sprocket Film Border */}
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
