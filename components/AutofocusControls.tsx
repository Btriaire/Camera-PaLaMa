"use client";

import { useState } from "react";
import { ApertureIcon, AutofocusTargetIcon, BokehDepthIcon, CheckIcon, FocusPeakingIcon } from "./Icons";

export type FocusMode = "auto" | "foreground" | "background" | "point" | "manual";

export const APERTURE_STOPS = [1.2, 1.4, 1.8, 2.8, 4.0, 5.6, 8.0, 16.0] as const;

export default function AutofocusControls({
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
  onClose,
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
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-black/90 p-3.5 backdrop-blur-xl shadow-2xl text-white font-sans">
      {/* Header with Mode Tabs */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <AutofocusTargetIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              AUTOFOCUS &amp; PROFONDEUR DE CHAMP
            </h3>
            <p className="text-[10px] text-white/50">
              Plan de netteté &amp; Bokeh optique
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleFocusPeaking}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all border ${
              focusPeaking
                ? "bg-emerald-500 text-black border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
            }`}
          >
            <FocusPeakingIcon className="w-3 h-3" />
            PEAKING
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Quick Focus Plane Presets */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Preset 1: Avant-Plan Net / Arrière-Plan Flou */}
        <button
          type="button"
          onClick={() => {
            onChangeFocusMode("foreground");
            onChangeAperture(1.4);
            onChangeDofBlur(75);
          }}
          className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all ${
            focusMode === "foreground"
              ? "bg-emerald-500/15 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
              : "bg-white/5 border-white/10 hover:bg-white/10"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-mono font-bold text-emerald-400">AVANT-PLAN NET</span>
            {focusMode === "foreground" && <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />}
          </div>
          <span className="text-[11px] font-semibold text-white">Bokeh Fond</span>
          <span className="text-[9px] text-white/50">Sujet proche net, fond flou f/1.4</span>
        </button>

        {/* Preset 2: Arrière-Plan Net / Avant-Plan Flou */}
        <button
          type="button"
          onClick={() => {
            onChangeFocusMode("background");
            onChangeAperture(1.4);
            onChangeDofBlur(75);
          }}
          className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all ${
            focusMode === "background"
              ? "bg-cyan-500/15 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
              : "bg-white/5 border-white/10 hover:bg-white/10"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-mono font-bold text-cyan-400">ARRIÈRE-PLAN NET</span>
            {focusMode === "background" && <CheckIcon className="w-3.5 h-3.5 text-cyan-400" />}
          </div>
          <span className="text-[11px] font-semibold text-white">Flou 1er Plan</span>
          <span className="text-[9px] text-white/50">Fond net, objet devant flou</span>
        </button>

        {/* Preset 3: AF Tactile (Tap-to-focus) */}
        <button
          type="button"
          onClick={() => {
            onChangeFocusMode("point");
            onChangeDofBlur(60);
          }}
          className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all ${
            focusMode === "point"
              ? "bg-amber-500/15 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
              : "bg-white/5 border-white/10 hover:bg-white/10"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-mono font-bold text-amber-400">AF TACTILE</span>
            {focusMode === "point" && <CheckIcon className="w-3.5 h-3.5 text-amber-400" />}
          </div>
          <span className="text-[11px] font-semibold text-white">Toucher l'Écran</span>
          <span className="text-[9px] text-white/50">Ciblez n'importe quel objet</span>
        </button>

        {/* Preset 4: Manuel (Tout Net / Réglable) */}
        <button
          type="button"
          onClick={() => {
            onChangeFocusMode("manual");
          }}
          className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all ${
            focusMode === "manual"
              ? "bg-purple-500/15 border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
              : "bg-white/5 border-white/10 hover:bg-white/10"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-mono font-bold text-purple-400">MF MANUEL</span>
            {focusMode === "manual" && <CheckIcon className="w-3.5 h-3.5 text-purple-400" />}
          </div>
          <span className="text-[11px] font-semibold text-white">Bague Focus</span>
          <span className="text-[9px] text-white/50">Réglage fin 0.1m à l'Infini ∞</span>
        </button>
      </div>

      {/* Aperture F-Stop Selector Bar */}
      <div className="flex flex-col gap-1.5 bg-white/5 p-2.5 rounded-xl border border-white/5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 font-bold text-white/80">
            <ApertureIcon className="w-3.5 h-3.5 text-amber-400" />
            OUVERTURE DU DIAPHRAGME (F-STOP)
          </span>
          <span className="font-mono font-bold text-amber-400">
            f/{aperture.toFixed(1)} {aperture <= 1.8 ? "(Ultra Bokeh)" : aperture >= 8.0 ? "(Grande Net.)" : ""}
          </span>
        </div>

        <div className="flex items-center justify-between gap-1 overflow-x-auto py-1 scrollbar-none">
          {APERTURE_STOPS.map((f) => {
            const isSelected = Math.abs(aperture - f) < 0.1;
            return (
              <button
                key={f}
                type="button"
                onClick={() => onChangeAperture(f)}
                className={`flex-1 min-w-[38px] py-1.5 rounded-lg text-center font-mono text-[11px] font-bold transition-all border ${
                  isSelected
                    ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.5)] scale-105"
                    : "bg-white/5 text-white/70 border-white/5 hover:bg-white/10"
                }`}
              >
                f/{f}
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual Focus Distance Ring (when in MF or fine-tuning) */}
      <div className="flex flex-col gap-1.5 bg-white/5 p-2.5 rounded-xl border border-white/5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 font-bold text-white/80">
            <BokehDepthIcon className="w-3.5 h-3.5 text-cyan-400" />
            PLAN DE MISE AU POINT
          </span>
          <span className="font-mono font-bold text-cyan-400">
            {focusDistance < 25 ? "0.15m (Macro / Proche)" : focusDistance < 60 ? "1.50m (Portrait)" : "∞ (Infini / Fond)"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-white/40">Macro</span>
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
            className="flex-1 accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
          />
          <span className="font-mono text-[10px] text-white/40">Infini ∞</span>
        </div>
      </div>

      {/* Intensity of Bokeh Blur */}
      <div className="flex items-center justify-between gap-3 px-1 pt-1">
        <span className="text-[11px] text-white/60">Intensité du Flou Bokeh :</span>
        <div className="flex items-center gap-2 flex-1 max-w-[180px]">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={dofBlur}
            onChange={(e) => onChangeDofBlur(Number(e.target.value))}
            className="w-full accent-emerald-400 h-1 bg-white/10 rounded-lg cursor-pointer"
          />
          <span className="font-mono text-[11px] font-bold text-emerald-400 w-8 text-right">
            {dofBlur}%
          </span>
        </div>
      </div>
    </div>
  );
}
