"use client";

import { useEffect, useRef } from "react";
import { playLevelLock } from "@/lib/audio";

// Professional Electronic Dual-Axis Horizon Level Gauge.
// Used by Sony Alpha, Canon EOS, Hasselblad and Leica pro camera viewfinders.
// Turns vibrant luminous amber/green once level within 1.0°.
export default function LevelIndicator({
  tiltDeg,
  className = "",
}: {
  tiltDeg: number | null;
  className?: string;
}) {
  const wasLevelRef = useRef(false);

  if (tiltDeg === null) return null;
  const clamped = Math.max(-45, Math.min(45, tiltDeg));
  const isLevel = Math.abs(tiltDeg) < 0.8;

  useEffect(() => {
    if (isLevel && !wasLevelRef.current) {
      playLevelLock();
    }
    wasLevelRef.current = isLevel;
  }, [isLevel]);

  return (
    <div className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none z-20 ${className}`}>
      {/* Fixed Reference Center Crosshair */}
      <div className="relative flex items-center justify-center">
        {/* Fixed Center Point */}
        <div className="h-1.5 w-1.5 rounded-full border border-white/60 bg-white/20" />

        {/* Fixed Left/Right Baseline Brackets */}
        <div className="absolute left-[-56px] top-0 h-1.5 w-6 border-l-2 border-t border-white/40" />
        <div className="absolute right-[-56px] top-0 h-1.5 w-6 border-r-2 border-t border-white/40" />

        {/* Rotating Electronic Horizon Line */}
        <div
          className="absolute flex items-center justify-between w-36 transition-transform duration-75 ease-out"
          style={{ transform: `rotate(${-clamped}deg)` }}
        >
          {/* Left Horizon Arm */}
          <div
            className={`h-0.5 w-14 rounded-full transition-colors shadow-sm ${
              isLevel
                ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                : "bg-white/85 shadow-[0_0_4px_rgba(255,255,255,0.4)]"
            }`}
          />

          {/* Central Gap */}
          <div className="w-8" />

          {/* Right Horizon Arm */}
          <div
            className={`h-0.5 w-14 rounded-full transition-colors shadow-sm ${
              isLevel
                ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                : "bg-white/85 shadow-[0_0_4px_rgba(255,255,255,0.4)]"
            }`}
          />
        </div>

        {/* Tilt Degree Readout */}
        <div
          className={`absolute top-5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider backdrop-blur-xs transition-colors ${
            isLevel
              ? "bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-[0_0_10px_rgba(251,191,36,0.3)]"
              : "bg-black/40 text-white/70 border border-white/10"
          }`}
        >
          <span>{Math.abs(tiltDeg) < 0.1 ? "0.0°" : `${tiltDeg > 0 ? `+${tiltDeg.toFixed(1)}` : tiltDeg.toFixed(1)}°`}</span>
          {isLevel && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />}
        </div>
      </div>
    </div>
  );
}
