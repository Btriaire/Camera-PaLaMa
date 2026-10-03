"use client";

import { useEffect, useState } from "react";

export type ReticleData = {
  x: number; // clientX pixel
  y: number; // clientY pixel
  fx: number; // normalized 0..1
  fy: number; // normalized 0..1
  aperture: number;
  distanceMeters: string;
  timestamp: number;
};

export default function AutofocusReticle({
  reticle,
}: {
  reticle: ReticleData | null;
}) {
  const [visible, setVisible] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!reticle) {
      setVisible(false);
      setLocked(false);
      return;
    }

    setVisible(true);
    setLocked(false);

    // Lock animation after 180ms
    const lockTimer = setTimeout(() => {
      setLocked(true);
    }, 180);

    // Fade out after 3.5s
    const fadeTimer = setTimeout(() => {
      setVisible(false);
    }, 3500);

    return () => {
      clearTimeout(lockTimer);
      clearTimeout(fadeTimer);
    };
  }, [reticle?.timestamp]);

  if (!visible || !reticle) return null;

  return (
    <div
      className="pointer-events-none absolute z-30 transition-all duration-200"
      style={{
        left: reticle.x,
        top: reticle.y,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Outer Bracket Reticle */}
      <div
        className={`relative flex items-center justify-center transition-all duration-300 ${
          locked
            ? "w-20 h-20 scale-100 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"
            : "w-28 h-28 scale-110 text-amber-400/80 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]"
        }`}
      >
        {/* Top-Left Corner */}
        <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-current rounded-tl-xs" />
        {/* Top-Right Corner */}
        <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-current rounded-tr-xs" />
        {/* Bottom-Left Corner */}
        <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-current rounded-bl-xs" />
        {/* Bottom-Right Corner */}
        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-current rounded-br-xs" />

        {/* Center Crosshair / Point */}
        <div className="flex items-center justify-center">
          <div className={`w-1.5 h-1.5 rounded-full transition-all ${locked ? "bg-emerald-400 scale-125" : "bg-amber-400"}`} />
        </div>

        {/* AF Lock Badge & Distance Readout */}
        <div
          className={`absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold tracking-wider uppercase border backdrop-blur-md transition-all duration-200 ${
            locked
              ? "bg-black/85 text-emerald-300 border-emerald-500/50"
              : "bg-black/85 text-amber-300 border-amber-500/50"
          }`}
        >
          <span>{locked ? "AF-LOCK" : "AF-SEARCH"}</span>
          <span className="text-white/40">|</span>
          <span>{reticle.distanceMeters}</span>
          <span className="text-white/40">|</span>
          <span className="text-amber-400">f/{reticle.aperture.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
