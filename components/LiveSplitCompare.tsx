"use client";

import { useRef, useState } from "react";
import { playDialTick } from "@/lib/audio";

interface LiveSplitCompareProps {
  isActive: boolean;
  onToggleActive: () => void;
  splitPosition: number; // 0 to 100 percentage
  onChangeSplitPosition: (pos: number) => void;
  presetName: string;
}

export default function LiveSplitCompare({
  isActive,
  onToggleActive,
  splitPosition,
  onChangeSplitPosition,
  presetName,
}: LiveSplitCompareProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    containerRef.current?.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.min(95, Math.max(5, (x / rect.width) * 100));
    onChangeSplitPosition(Math.round(pct));
  };

  const handlePointerUp = () => {
    setDragging(false);
  };

  return (
    <>
      {/* Split Overlay on Viewfinder Screen */}
      {isActive && (
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 z-20 pointer-events-auto touch-none select-none"
        >
          {/* Vertical Split Divider Bar */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.9),0_0_4px_rgba(255,255,255,0.8)] z-30 flex items-center justify-center cursor-ew-resize"
            style={{ left: `${splitPosition}%` }}
            onPointerDown={handlePointerDown}
          >
            {/* Draggable Handle Puck */}
            <div className="w-7 h-7 rounded-full bg-white text-black font-black text-[9px] flex items-center justify-center shadow-2xl border-2 border-black/80 hover:scale-110 active:scale-95 transition-transform">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />
              </svg>
            </div>
          </div>

          {/* Left Label: CAPTEUR BRUT */}
          <div className="absolute top-3 left-3 bg-black/75 border border-white/20 text-white/80 px-2 py-0.5 rounded text-[9.5px] font-mono font-bold tracking-wider backdrop-blur-md z-20 shadow-md">
            BRUT (SANS EFFET)
          </div>

          {/* Right Label: ACTIVE EMULSION */}
          <div className="absolute top-3 right-3 bg-amber-500/80 border border-amber-300/40 text-black px-2 py-0.5 rounded text-[9.5px] font-mono font-black tracking-wider backdrop-blur-md z-20 shadow-md">
            {presetName.toUpperCase()}
          </div>
        </div>
      )}

      {/* Floating Toggle Pill */}
      <button
        type="button"
        onClick={() => {
          onToggleActive();
          playDialTick();
        }}
        aria-label="Comparer Avant / Après en temps réel"
        className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono font-bold backdrop-blur-xl transition-all ${
          isActive
            ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.5)]"
            : "bg-black/70 border-white/20 text-white/90 hover:bg-black/90 shadow-lg"
        }`}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v18M3 12h18M3 3h18v18H3z" />
        </svg>
        <span>SPLIT : {isActive ? "ON" : "OFF"}</span>
      </button>
    </>
  );
}
