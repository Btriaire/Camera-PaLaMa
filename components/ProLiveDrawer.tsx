"use client";

import {
  AnamorphicIcon,
  CheckIcon,
  ContrastIcon,
  DroHdrIcon,
  FalseColorIcon,
  FocusPeakingIcon,
  GridIcon,
  HistogramIcon,
  MacroFlowerIcon,
  MonochromeAssistIcon,
  ProBadgeIcon,
  RatioFramingIcon,
  UltraZoomIcon,
  VintageViewfinderIcon,
  WaveformIcon,
  ZebraIcon,
} from "./Icons";
import { ScopeMode } from "./ProScopesMonitor";
import { VintageViewfinderMode, VINTAGE_VIEWFINDER_MODES } from "./VintageViewfinderMask";
import AutofocusControls, { FocusMode } from "./AutofocusControls";

export default function ProLiveDrawer({
  isOpen,
  onClose,
  falseColorOn,
  setFalseColorOn,
  liveDroOn,
  setLiveDroOn,
  monoAssistOn,
  setMonoAssistOn,
  showHistogram,
  setShowHistogram,
  scopeMode,
  setScopeMode,
  focusPeakingEnabled,
  setFocusPeakingEnabled,
  peakingColor,
  setPeakingColor,
  zebraEnabled,
  setZebraEnabled,
  zebraThreshold,
  setZebraThreshold,
  anamorphicDesqueeze,
  setAnamorphicDesqueeze,
  liveAspectMask,
  setLiveAspectMask,
  vintageMask,
  setVintageMask,
  macroModeOn,
  toggleMacroMode,
  showGrid,
  setShowGrid,
  kelvinValue,
  onSelectKelvin,
  ultraZoomMode = false,
  setUltraZoomMode,
  focusMode = "auto",
  setFocusMode,
  aperture = 1.8,
  setAperture,
  focusDistance = 30,
  setFocusDistance,
  dofBlur = 75,
  setDofBlur,
}: {
  isOpen: boolean;
  onClose: () => void;
  falseColorOn: boolean;
  setFalseColorOn: React.Dispatch<React.SetStateAction<boolean>>;
  liveDroOn: boolean;
  setLiveDroOn: React.Dispatch<React.SetStateAction<boolean>>;
  monoAssistOn: boolean;
  setMonoAssistOn: React.Dispatch<React.SetStateAction<boolean>>;
  showHistogram: boolean;
  setShowHistogram: React.Dispatch<React.SetStateAction<boolean>>;
  scopeMode: ScopeMode;
  setScopeMode: React.Dispatch<React.SetStateAction<ScopeMode>>;
  focusPeakingEnabled: boolean;
  setFocusPeakingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  peakingColor: number;
  setPeakingColor: React.Dispatch<React.SetStateAction<number>>;
  zebraEnabled: boolean;
  setZebraEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  zebraThreshold: number;
  setZebraThreshold: React.Dispatch<React.SetStateAction<number>>;
  anamorphicDesqueeze: number;
  setAnamorphicDesqueeze: React.Dispatch<React.SetStateAction<number>>;
  liveAspectMask: "none" | "1:1" | "4:5" | "16:9" | "3:2" | "65:24";
  setLiveAspectMask: (m: "none" | "1:1" | "4:5" | "16:9" | "3:2" | "65:24") => void;
  vintageMask: VintageViewfinderMode;
  setVintageMask: (m: VintageViewfinderMode) => void;
  macroModeOn: boolean;
  toggleMacroMode: () => void;
  showGrid: boolean;
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>;
  kelvinValue: number;
  onSelectKelvin: (k: number) => void;
  ultraZoomMode?: boolean;
  setUltraZoomMode?: React.Dispatch<React.SetStateAction<boolean>>;
  focusMode?: FocusMode;
  setFocusMode?: (mode: FocusMode) => void;
  aperture?: number;
  setAperture?: (f: number) => void;
  focusDistance?: number;
  setFocusDistance?: (d: number) => void;
  dofBlur?: number;
  setDofBlur?: (b: number) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto">
      {/* Backdrop */}
      <button
        onClick={onClose}
        aria-label="Fermer le panneau outils pro"
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Bottom Sheet Modal */}
      <div
        className="relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-t border-amber-400/40 bg-zinc-950/95 px-4 pt-3 pb-8 backdrop-blur-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        {/* Handle Bar */}
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-black">
              <ProBadgeIcon className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-bold text-amber-300 uppercase tracking-wider">
                Outils Pro Live &amp; Traitement
              </h2>
              <p className="text-[10px] text-white/50">Assistances professionnelles de prise de vue</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 active:scale-95 transition-all hover:bg-white/20"
          >
            Fermer
          </button>
        </div>

        {/* Section 1: Quick Pro Toggles (2x2 Grid) */}
        <div className="mb-4">
          <span className="text-[11px] font-mono font-bold text-white/70 uppercase tracking-wider mb-2 block">
            1. Contrôle d&apos;Exposition &amp; Dynamique
          </span>
          <div className="grid grid-cols-2 gap-2">
            {/* False Color */}
            <button
              onClick={() => setFalseColorOn((v) => !v)}
              className={`flex flex-col items-start gap-1 rounded-2xl p-3 border text-left transition-all ${
                falseColorOn
                  ? "border-red-400 bg-red-950/50 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.35)] font-bold"
                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <FalseColorIcon className="w-5 h-5 text-red-400" />
                <span className={`text-[9.5px] font-mono font-black px-1.5 py-0.5 rounded ${falseColorOn ? "bg-red-500 text-white" : "bg-white/10 text-white/60"}`}>
                  {falseColorOn ? "ACTIF" : "OFF"}
                </span>
              </div>
              <span className="text-xs font-bold text-white mt-1">False Color IRE</span>
              <span className="text-[10px] leading-tight text-white/50">Carte thermique d&apos;exposition Arri/Atomos</span>
            </button>

            {/* DRO HDR Boost */}
            <button
              onClick={() => setLiveDroOn((v) => !v)}
              className={`flex flex-col items-start gap-1 rounded-2xl p-3 border text-left transition-all ${
                liveDroOn
                  ? "border-amber-400 bg-amber-950/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.35)] font-bold"
                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <DroHdrIcon className="w-5 h-5 text-amber-400" />
                <span className={`text-[9.5px] font-mono font-black px-1.5 py-0.5 rounded ${liveDroOn ? "bg-amber-400 text-black" : "bg-white/10 text-white/60"}`}>
                  {liveDroOn ? "ACTIF" : "OFF"}
                </span>
              </div>
              <span className="text-xs font-bold text-white mt-1">DRO HDR Live</span>
              <span className="text-[10px] leading-tight text-white/50">Débouchage temps réel des ombres sombres</span>
            </button>

            {/* Monochrome Assist */}
            <button
              onClick={() => setMonoAssistOn((v) => !v)}
              className={`flex flex-col items-start gap-1 rounded-2xl p-3 border text-left transition-all ${
                monoAssistOn
                  ? "border-cyan-400 bg-cyan-950/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.35)] font-bold"
                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <MonochromeAssistIcon className="w-5 h-5 text-cyan-400" />
                <span className={`text-[9.5px] font-mono font-black px-1.5 py-0.5 rounded ${monoAssistOn ? "bg-cyan-400 text-black" : "bg-white/10 text-white/60"}`}>
                  {monoAssistOn ? "ACTIF" : "OFF"}
                </span>
              </div>
              <span className="text-xs font-bold text-white mt-1">Aide N&amp;B Viseur</span>
              <span className="text-[10px] leading-tight text-white/50">Évalue les contrastes et formes sans couleur</span>
            </button>

            {/* Pro Scopes */}
            <button
              onClick={() => {
                if (!showHistogram) setShowHistogram(true);
                else setScopeMode((m) => (m === "histogram" ? "waveform" : m === "waveform" ? "vectorscope" : "histogram"));
              }}
              className={`flex flex-col items-start gap-1 rounded-2xl p-3 border text-left transition-all ${
                showHistogram
                  ? "border-cyan-400 bg-cyan-950/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.35)] font-bold"
                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <WaveformIcon className="w-5 h-5 text-cyan-400" />
                <span className="text-[9.5px] font-mono font-black px-1.5 py-0.5 rounded bg-cyan-400 text-black uppercase">
                  {showHistogram ? scopeMode : "OFF"}
                </span>
              </div>
              <span className="text-xs font-bold text-white mt-1">Oscilloscopes Live</span>
              <span className="text-[10px] leading-tight text-white/50">Histogramme / Waveform Parade / Vectorscope</span>
            </button>

            {/* Ultra-Zoom 100x */}
            <button
              onClick={() => setUltraZoomMode?.((v) => !v)}
              className={`flex flex-col items-start gap-1 rounded-2xl p-3 border text-left transition-all col-span-2 ${
                ultraZoomMode
                  ? "border-fuchsia-400 bg-fuchsia-950/50 text-fuchsia-300 shadow-[0_0_15px_rgba(217,70,239,0.35)] font-bold"
                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <UltraZoomIcon className="w-5 h-5 text-fuchsia-400" />
                  <span className="text-xs font-bold text-white">Ultra-Zoom 100× &amp; Téléobjectif Spatial</span>
                </div>
                <span className={`text-[9.5px] font-mono font-black px-1.5 py-0.5 rounded ${ultraZoomMode ? "bg-fuchsia-500 text-white" : "bg-white/10 text-white/60"}`}>
                  {ultraZoomMode ? "ACTIVÉ (100×)" : "DÉSACTIVÉ"}
                </span>
              </div>
              <span className="text-[10px] leading-tight text-white/50">
                Radar PiP de cadrage, analyse de détails MTF en direct et stabilisation OIS renforcée
              </span>
            </button>
          </div>
        </div>

        {/* Section 2: Autofocus & Profondeur de Champ */}
        {setFocusMode && setAperture && setFocusDistance && setDofBlur && (
          <div className="mb-4">
            <AutofocusControls
              focusMode={focusMode}
              onChangeFocusMode={setFocusMode}
              aperture={aperture}
              onChangeAperture={setAperture}
              focusDistance={focusDistance}
              onChangeFocusDistance={setFocusDistance}
              dofBlur={dofBlur}
              onChangeDofBlur={setDofBlur}
              focusPeaking={focusPeakingEnabled}
              onToggleFocusPeaking={() => setFocusPeakingEnabled((v) => !v)}
            />
          </div>
        )}

        {/* Section 3: Focus Peaking (Couleur & Activation) */}
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <FocusPeakingIcon className="w-4 h-4 text-emerald-400" /> Focus Peaking (Aide à la mise au point)
            </span>
            <button
              onClick={() => setFocusPeakingEnabled((v) => !v)}
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                focusPeakingEnabled ? "bg-emerald-400 text-black" : "bg-white/10 text-white/60"
              }`}
            >
              {focusPeakingEnabled ? "ACTIVÉ" : "DÉSACTIVÉ"}
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 0, label: "Vert Néon", bg: "bg-[#00ff59]" },
              { id: 1, label: "Rouge", bg: "bg-[#ff2640]" },
              { id: 2, label: "Cyan", bg: "bg-[#00d9ff]" },
              { id: 3, label: "Jaune", bg: "bg-[#ffea00]" },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setPeakingColor(c.id);
                  setFocusPeakingEnabled(true);
                }}
                className={`flex flex-col items-center gap-1 rounded-xl p-2 border transition-all ${
                  peakingColor === c.id && focusPeakingEnabled
                    ? "border-emerald-400 bg-emerald-400/20 text-white font-bold"
                    : "border-transparent bg-black/40 text-white/70 hover:bg-white/10"
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-full ${c.bg} shadow-sm`} />
                <span className="text-[10px] font-medium">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Zébrures d'Exposition (Paliers Sélectifs) */}
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <ZebraIcon className="w-4 h-4 text-amber-400" /> Zébrures de Surexposition
            </span>
            <button
              onClick={() => setZebraEnabled((v) => !v)}
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                zebraEnabled ? "bg-amber-400 text-black" : "bg-white/10 text-white/60"
              }`}
            >
              {zebraEnabled ? "ACTIVÉ" : "DÉSACTIVÉ"}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 0.70, label: "70% Peau", desc: "Visages & Tonalités chair" },
              { val: 0.90, label: "90% Ciel", desc: "Hautes lumières vives" },
              { val: 0.98, label: "98% Clip", desc: "Écrêtage pur des blancs" },
            ].map((z) => (
              <button
                key={z.val}
                onClick={() => {
                  setZebraThreshold(z.val);
                  setZebraEnabled(true);
                }}
                className={`flex flex-col items-center gap-0.5 rounded-xl p-2 border text-center transition-all ${
                  Math.abs(zebraThreshold - z.val) < 0.02 && zebraEnabled
                    ? "border-amber-400 bg-amber-400/25 text-amber-300 font-bold"
                    : "border-transparent bg-black/40 text-white/70 hover:bg-white/10"
                }`}
              >
                <span className="text-xs font-bold font-mono">{z.label}</span>
                <span className="text-[9px] text-white/45">{z.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Section 4: Cadrage, Ratios & Anamorphique */}
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-3">
          <span className="text-xs font-bold text-white block mb-2">Ratios de Cadrage &amp; Décompression Anamorphique</span>
          <div className="grid grid-cols-6 gap-1.5 mb-2.5">
            {[
              { id: "none", label: "Plein" },
              { id: "1:1", label: "1:1" },
              { id: "4:5", label: "4:5" },
              { id: "16:9", label: "16:9" },
              { id: "3:2", label: "3:2" },
              { id: "65:24", label: "XPAN" },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setLiveAspectMask(r.id as any)}
                className={`py-1.5 text-center rounded-lg border font-mono text-[11px] font-bold transition-all ${
                  liveAspectMask === r.id
                    ? "border-amber-400 bg-amber-400 text-black shadow-sm"
                    : "border-transparent bg-black/40 text-white/70 hover:bg-white/10"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-white/10">
            {[
              { val: 1.0, label: "1.0× Normal" },
              { val: 1.33, label: "1.33× Anamor." },
              { val: 1.55, label: "1.55× Ultra" },
              { val: 2.0, label: "2.0× Cinema" },
            ].map((a) => (
              <button
                key={a.val}
                onClick={() => setAnamorphicDesqueeze(a.val)}
                className={`py-1.5 text-center rounded-lg border font-mono text-[10.5px] font-bold transition-all ${
                  Math.abs(anamorphicDesqueeze - a.val) < 0.02
                    ? "border-amber-400 bg-amber-400 text-black shadow-sm"
                    : "border-transparent bg-black/40 text-white/70 hover:bg-white/10"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section 5: Presets Balance des Blancs */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <span className="block text-xs font-bold text-white mb-2">Température de Couleur (Presets Kelvin)</span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { k: 2200, label: "Bougie", desc: "2200K Chaud" },
              { k: 3200, label: "Tungstène", desc: "3200K Studio" },
              { k: 4000, label: "Fluo", desc: "4000K Bureau" },
              { k: 5500, label: "Soleil", desc: "5500K Plein jour" },
              { k: 6500, label: "Nuageux", desc: "6500K Ciel couvert" },
              { k: 7500, label: "Ombre", desc: "7500K Ombre fraîche" },
            ].map((wb) => (
              <button
                key={wb.k}
                onClick={() => onSelectKelvin(wb.k)}
                className={`flex flex-col items-center gap-0.5 rounded-xl p-2 border transition-all ${
                  Math.abs(kelvinValue - wb.k) < 300
                    ? "border-amber-400 bg-amber-400/25 text-amber-300 font-bold shadow-sm"
                    : "border-transparent bg-black/40 text-white/70 hover:bg-white/10"
                }`}
              >
                <span className="text-xs font-bold font-mono">{wb.label}</span>
                <span className="text-[9px] text-white/50">{wb.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
