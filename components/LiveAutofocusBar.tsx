"use client";

import { useState } from "react";
import { ApertureIcon, AutofocusTargetIcon, BokehDepthIcon, CheckIcon, FocusPeakingIcon } from "./Icons";
import { FocusMode, APERTURE_STOPS } from "./AutofocusControls";

export default function LiveAutofocusBar({
  focusMode,
  onChangeFocusMode,
  aperture,
  onChangeAperture,
  focusDistance,
  onChangeFocusDistance,
  dofBlur,
  onChangeDofBlur,
  focusPeaking,
  onToggleFocusPeaking,
  isOpen,
  onToggleOpen,
}: {
  focusMode: FocusMode;
  onChangeFocusMode: (mode: FocusMode) => void;
  aperture: number;
  onChangeAperture: (f: number) => void;
  focusDistance: number;
  onChangeFocusDistance: (dist: number) => void;
  dofBlur: number;
  onChangeDofBlur: (blur: number) => void;
  focusPeaking: boolean;
  onToggleFocusPeaking: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}) {
  const [subTool, setSubTool] = useState<"mode" | "aperture" | "distance" | "bokeh">("mode");

  const modeLabel =
    focusMode === "foreground"
      ? "Avant-Plan Net"
      : focusMode === "background"
      ? "Arrière-Plan Net"
      : focusMode === "point"
      ? "AF Tactile"
      : focusMode === "manual"
      ? "MF Bague"
      : "Auto";

  const isDofActive = focusMode !== "auto";

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-1.5 w-full max-w-lg mx-auto px-3 transition-all duration-300">
      {/* Expanded Live Tuning Dock (Non-intrusive bottom glass panel over viewfinder) */}
      {isOpen && (
        <div className="w-full flex flex-col gap-2 rounded-2xl border border-emerald-500/30 bg-black/85 p-3 backdrop-blur-2xl shadow-[0_4px_25px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* Top Bar: Sub-Tool Selector & Peaking */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSubTool("mode")}
                className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold uppercase transition-all ${
                  subTool === "mode"
                    ? "bg-emerald-500 text-black shadow-sm"
                    : "bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                1. Mode Focus
              </button>
              <button
                type="button"
                onClick={() => setSubTool("aperture")}
                className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold uppercase transition-all ${
                  subTool === "aperture"
                    ? "bg-amber-400 text-black shadow-sm"
                    : "bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                2. Diaphragme f/{aperture.toFixed(1)}
              </button>
              <button
                type="button"
                onClick={() => setSubTool("distance")}
                className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold uppercase transition-all ${
                  subTool === "distance"
                    ? "bg-cyan-400 text-black shadow-sm"
                    : "bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                3. Bague MF
              </button>
              <button
                type="button"
                onClick={() => setSubTool("bokeh")}
                className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold uppercase transition-all ${
                  subTool === "bokeh"
                    ? "bg-fuchsia-400 text-black shadow-sm"
                    : "bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                4. Flou ({dofBlur}%)
              </button>
            </div>

            <button
              type="button"
              onClick={onToggleFocusPeaking}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-mono text-[10px] font-bold transition-all border ${
                focusPeaking
                  ? "bg-emerald-500 text-black border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  : "bg-white/5 text-white/70 border-white/10"
              }`}
            >
              <FocusPeakingIcon className="w-3 h-3" />
              PEAK
            </button>
          </div>

          {/* Sub-tool 1: Mode Selection Pills */}
          {subTool === "mode" && (
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 pt-1">
              <button
                type="button"
                onClick={() => {
                  onChangeFocusMode("foreground");
                  onChangeAperture(1.4);
                  onChangeDofBlur(80);
                }}
                className={`flex flex-col items-start p-2 rounded-xl border text-left transition-all ${
                  focusMode === "foreground"
                    ? "bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)] font-bold"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-mono font-black text-emerald-400">AVANT-PLAN NET</span>
                  {focusMode === "foreground" && <CheckIcon className="w-3 h-3 text-emerald-400" />}
                </div>
                <span className="text-[10px] text-white/90">Objet devant net</span>
                <span className="text-[8.5px] text-white/40">Fond flouté f/1.4</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onChangeFocusMode("background");
                  onChangeAperture(1.4);
                  onChangeDofBlur(80);
                }}
                className={`flex flex-col items-start p-2 rounded-xl border text-left transition-all ${
                  focusMode === "background"
                    ? "bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)] font-bold"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-mono font-black text-cyan-400">ARRIÈRE-PLAN NET</span>
                  {focusMode === "background" && <CheckIcon className="w-3 h-3 text-cyan-400" />}
                </div>
                <span className="text-[10px] text-white/90">Fond / Paysage net</span>
                <span className="text-[8.5px] text-white/40">1er plan flouté</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onChangeFocusMode("point");
                  onChangeDofBlur(70);
                }}
                className={`flex flex-col items-start p-2 rounded-xl border text-left transition-all ${
                  focusMode === "point"
                    ? "bg-amber-500/20 border-amber-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.3)] font-bold"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-mono font-black text-amber-400">AF TACTILE</span>
                  {focusMode === "point" && <CheckIcon className="w-3 h-3 text-amber-400" />}
                </div>
                <span className="text-[10px] text-white/90">Toucher l&apos;écran</span>
                <span className="text-[8.5px] text-white/40">Ciblez au doigt</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeFocusMode("auto")}
                className={`flex flex-col items-start p-2 rounded-xl border text-left transition-all ${
                  focusMode === "auto"
                    ? "bg-white/20 border-white text-white font-bold"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-mono font-black text-white/90">AUTO (NORMAL)</span>
                  {focusMode === "auto" && <CheckIcon className="w-3 h-3 text-white" />}
                </div>
                <span className="text-[10px] text-white/90">Capteur classique</span>
                <span className="text-[8.5px] text-white/40">Pas de bokeh forcé</span>
              </button>
            </div>
          )}

          {/* Sub-tool 2: Aperture F-Stop Wheel */}
          {subTool === "aperture" && (
            <div className="flex flex-col gap-1 py-1">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-white/60">Grande Ouverture (Bokeh)</span>
                <span className="font-bold text-amber-400">f/{aperture.toFixed(1)}</span>
                <span className="text-white/60">Fermé (Grande Netteté)</span>
              </div>
              <div className="flex items-center justify-between gap-1 overflow-x-auto py-1 [scrollbar-width:none]">
                {APERTURE_STOPS.map((f) => {
                  const isSel = Math.abs(aperture - f) < 0.1;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => onChangeAperture(f)}
                      className={`flex-1 min-w-[40px] py-1.5 rounded-lg text-center font-mono text-[11px] font-bold transition-all border ${
                        isSel
                          ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.6)] scale-105"
                          : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      f/{f}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub-tool 3: Manual Focus Ring Slider */}
          {subTool === "distance" && (
            <div className="flex flex-col gap-1.5 py-1">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-cyan-300">0.10m Macro</span>
                <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded">
                  {focusDistance < 25 ? "Macro / Proche (0.15m)" : focusDistance < 60 ? "Mi-distance (1.20m)" : "Infini ∞ (Arrière-plan)"}
                </span>
                <span className="text-cyan-300">Infini ∞</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={focusDistance}
                onChange={(e) => {
                  onChangeFocusDistance(Number(e.target.value));
                  if (focusMode !== "manual" && focusMode !== "point") onChangeFocusMode("manual");
                }}
                className="w-full accent-cyan-400 h-2 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>
          )}

          {/* Sub-tool 4: Bokeh Blur Intensity Slider */}
          {subTool === "bokeh" && (
            <div className="flex flex-col gap-1.5 py-1">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-fuchsia-300">Flou Doux (0%)</span>
                <span className="font-bold text-fuchsia-400 bg-fuchsia-950/60 px-2 py-0.5 rounded border border-fuchsia-500/30">
                  {dofBlur}% Bokeh
                </span>
                <span className="text-fuchsia-300">Ultra-Crémeux (100%)</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={dofBlur}
                onChange={(e) => onChangeDofBlur(Number(e.target.value))}
                className="w-full accent-fuchsia-400 h-2 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>
          )}
        </div>
      )}

      {/* Floating Live AF Status Capsule Bar */}
      <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-black/80 p-1 backdrop-blur-xl shadow-xl">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-label="Ouvrir le panneau de contrôle Autofocus et Profondeur de champ"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all ${
            isDofActive || isOpen
              ? "bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)]"
              : "bg-white/10 text-white/90 hover:bg-white/20"
          }`}
        >
          <AutofocusTargetIcon className="w-4 h-4" />
          <span>AF : {modeLabel.toUpperCase()}</span>
          {isDofActive && <span className="text-[10px] opacity-80">· f/{aperture.toFixed(1)}</span>}
        </button>

        {/* Quick Mode Toggle buttons directly in the bar */}
        <button
          type="button"
          onClick={() => {
            onChangeFocusMode("foreground");
            onChangeAperture(1.4);
            onChangeDofBlur(80);
          }}
          className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition-all ${
            focusMode === "foreground"
              ? "bg-emerald-500 text-black font-black"
              : "text-white/70 hover:bg-white/10"
          }`}
        >
          Avant
        </button>

        <button
          type="button"
          onClick={() => {
            onChangeFocusMode("background");
            onChangeAperture(1.4);
            onChangeDofBlur(80);
          }}
          className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition-all ${
            focusMode === "background"
              ? "bg-cyan-400 text-black font-black"
              : "text-white/70 hover:bg-white/10"
          }`}
        >
          Fond
        </button>

        <button
          type="button"
          onClick={() => {
            onChangeFocusMode(focusMode === "point" ? "auto" : "point");
            if (focusMode !== "point") onChangeDofBlur(70);
          }}
          className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition-all ${
            focusMode === "point"
              ? "bg-amber-400 text-black font-black"
              : "text-white/70 hover:bg-white/10"
          }`}
        >
          Tactile
        </button>
      </div>
    </div>
  );
}
