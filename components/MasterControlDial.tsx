"use client";

import { useRef, useState, useCallback } from "react";
import { playDialTick } from "@/lib/audio";

export type DialParameter = "aperture" | "focus" | "bokeh" | "exposure" | "kelvin" | "petzval";

interface MasterControlDialProps {
  activeParam: DialParameter;
  onSelectParam: (param: DialParameter) => void;
  aperture: number;
  onChangeAperture: (f: number) => void;
  focusDistance: number;
  onChangeFocusDistance: (dist: number) => void;
  dofBlur: number;
  onChangeDofBlur: (blur: number) => void;
  exposure: number;
  onChangeExposure: (ev: number) => void;
  temperature: number;
  onChangeTemperature: (k: number) => void;
  petzvalSwirl: number;
  onChangePetzvalSwirl: (swirl: number) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

const PARAMS: { id: DialParameter; label: string; unit: string; color: string }[] = [
  { id: "aperture", label: "DIAPH", unit: "f/", color: "#fbbf24" },
  { id: "focus", label: "FOCUS", unit: "m", color: "#22d3ee" },
  { id: "bokeh", label: "BOKEH", unit: "%", color: "#e879f9" },
  { id: "petzval", label: "SWIRL", unit: "%", color: "#34d399" },
  { id: "exposure", label: "EXP", unit: "EV", color: "#f87171" },
  { id: "kelvin", label: "TEMP", unit: "K", color: "#60a5fa" },
];

export default function MasterControlDial({
  activeParam,
  onSelectParam,
  aperture,
  onChangeAperture,
  focusDistance,
  onChangeFocusDistance,
  dofBlur,
  onChangeDofBlur,
  exposure,
  onChangeExposure,
  temperature,
  onChangeTemperature,
  petzvalSwirl,
  onChangePetzvalSwirl,
  isOpen,
  onToggleOpen,
}: MasterControlDialProps) {
  const dialRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startY: number; startVal: number; lastTickVal: number } | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);

  // Get current parameter state & limits
  const getParamInfo = useCallback(() => {
    switch (activeParam) {
      case "aperture":
        return {
          val: aperture,
          min: 0.95,
          max: 16.0,
          step: 0.1,
          display: `f/${aperture.toFixed(1)}`,
          update: onChangeAperture,
          color: "#fbbf24",
        };
      case "focus":
        return {
          val: focusDistance,
          min: 0,
          max: 100,
          step: 1,
          display: focusDistance < 20 ? "Macro" : focusDistance > 80 ? "Infini" : `${focusDistance}%`,
          update: onChangeFocusDistance,
          color: "#22d3ee",
        };
      case "bokeh":
        return {
          val: dofBlur,
          min: 0,
          max: 100,
          step: 1,
          display: `${dofBlur}%`,
          update: onChangeDofBlur,
          color: "#e879f9",
        };
      case "petzval":
        return {
          val: petzvalSwirl,
          min: 0,
          max: 100,
          step: 1,
          display: `${petzvalSwirl}%`,
          update: onChangePetzvalSwirl,
          color: "#34d399",
        };
      case "exposure":
        return {
          val: exposure,
          min: -50,
          max: 50,
          step: 1,
          display: `${exposure > 0 ? "+" : ""}${(exposure / 10).toFixed(1)} EV`,
          update: onChangeExposure,
          color: "#f87171",
        };
      case "kelvin":
        return {
          val: temperature,
          min: -100,
          max: 100,
          step: 1,
          display: `${temperature > 0 ? "+" : ""}${temperature}`,
          update: onChangeTemperature,
          color: "#60a5fa",
        };
    }
  }, [
    activeParam,
    aperture,
    focusDistance,
    dofBlur,
    petzvalSwirl,
    exposure,
    temperature,
    onChangeAperture,
    onChangeFocusDistance,
    onChangeDofBlur,
    onChangePetzvalSwirl,
    onChangeExposure,
    onChangeTemperature,
  ]);

  const paramInfo = getParamInfo();

  const handlePointerDown = (e: React.PointerEvent) => {
    dialRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = {
      startY: e.clientY,
      startVal: paramInfo.val,
      lastTickVal: paramInfo.val,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dy = dragRef.current.startY - e.clientY;
    const range = paramInfo.max - paramInfo.min;
    const sensitivity = 220; // Pixels for full range
    const deltaVal = (dy / sensitivity) * range;
    const nextVal = Math.min(paramInfo.max, Math.max(paramInfo.min, dragRef.current.startVal + deltaVal));

    // Dial tick audio triggers on incremental step
    const stepThreshold = range / 30;
    if (Math.abs(nextVal - dragRef.current.lastTickVal) >= stepThreshold) {
      playDialTick();
      dragRef.current.lastTickVal = nextVal;
    }

    setRotationAngle((prev) => prev + (dy > 0 ? 3 : -3));
    paramInfo.update(Math.round(nextVal * 10) / 10);
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="pointer-events-auto flex flex-col items-center">
      {/* Expanded Dial Panel */}
      {isOpen && (
        <div className="flex flex-col items-center gap-2.5 p-3 rounded-2xl bg-black/90 border border-white/15 backdrop-blur-2xl shadow-2xl animate-in fade-in slide-in-from-right-4 duration-200 mb-2">
          {/* Parameter Picker Tabs */}
          <div className="grid grid-cols-3 gap-1 w-full max-w-[240px]">
            {PARAMS.map((p) => {
              const isSel = activeParam === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onSelectParam(p.id);
                    playDialTick();
                  }}
                  className={`py-1 px-1.5 rounded-lg text-[9px] font-mono font-bold uppercase transition-all flex flex-col items-center border ${
                    isSel
                      ? "bg-white/20 border-white text-white shadow-md scale-105"
                      : "bg-white/5 border-white/5 text-white/50 hover:text-white/80"
                  }`}
                  style={{ borderColor: isSel ? p.color : undefined }}
                >
                  <span style={{ color: p.color }}>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Master Physical Rotary Dial Wheel */}
          <div
            ref={dialRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative w-28 h-28 rounded-full border-4 border-white/20 bg-neutral-900 cursor-grab active:cursor-grabbing flex items-center justify-center select-none shadow-[inset_0_2px_10px_rgba(0,0,0,0.8),0_0_20px_rgba(0,0,0,0.6)] touch-none"
            style={{
              boxShadow: `inset 0 0 15px rgba(0,0,0,0.9), 0 0 15px ${paramInfo.color}33`,
            }}
          >
            {/* Knurled Metal Outer Ring Ticks */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none transition-transform duration-75"
              viewBox="0 0 100 100"
              style={{ transform: `rotate(${rotationAngle}deg)` }}
            >
              {Array.from({ length: 24 }).map((_, i) => {
                const rot = i * 15;
                return (
                  <line
                    key={i}
                    x1="50"
                    y1="4"
                    x2="50"
                    y2={i % 2 === 0 ? "10" : "7"}
                    stroke={i % 2 === 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)"}
                    strokeWidth={i % 2 === 0 ? "1.5" : "1"}
                    transform={`rotate(${rot} 50 50)`}
                  />
                );
              })}
            </svg>

            {/* Inner Core Display */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center">
              <span className="text-[8.5px] font-mono tracking-widest uppercase text-white/50">
                {activeParam.toUpperCase()}
              </span>
              <span
                className="text-sm font-mono font-black tracking-tight"
                style={{ color: paramInfo.color }}
              >
                {paramInfo.display}
              </span>
              <span className="text-[7.5px] font-mono text-white/40">GLISSER</span>
            </div>
          </div>

          <div className="flex items-center justify-between w-full text-[9px] font-mono text-white/40 px-1">
            <span>MIN</span>
            <span>ROTATION MOLETTE</span>
            <span>MAX</span>
          </div>
        </div>
      )}

      {/* Floating Pill Trigger */}
      <button
        type="button"
        onClick={() => {
          onToggleOpen();
          playDialTick();
        }}
        aria-label="Molette de contrôle Master"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono font-bold backdrop-blur-xl transition-all ${
          isOpen
            ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.6)]"
            : "bg-black/70 border-white/20 text-white/90 hover:bg-black/90 shadow-lg"
        }`}
      >
        <span
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: paramInfo.color }}
        />
        <span>DIAL : {paramInfo.display}</span>
      </button>
    </div>
  );
}
