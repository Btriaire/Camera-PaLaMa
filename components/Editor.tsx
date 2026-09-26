"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GLRenderer } from "@/lib/gl/renderer";
import { exportPhoto, exportPhotoForAI, restyleAfterAI } from "@/lib/export";
import { shareOrDownloadPhoto } from "@/lib/sharePhoto";
import { uploadPhoto } from "@/lib/storage";
import { aiDenoise, aiDenoiseOutputSize, superResolve, superResOutputSize } from "@/lib/superRes";
import { Adjustments, NEUTRAL_ADJUSTMENTS, SavedPhotoMeta } from "@/lib/types";
import { PRESETS } from "@/lib/presets";
import CameraPicker from "./CameraPicker";
import HorizontalSlider from "./HorizontalSlider";
import { FilmCanisterBadge, FILM_STYLES } from "./FilmCanister";
import {
  ApertureIcon,
  BackIcon,
  CheckIcon,
  CloudUploadIcon,
  ColorIcon,
  CompareIcon,
  ContrastIcon,
  RedoIcon,
  ResetIcon,
  ShareIcon,
  SparkleIcon,
  SunIcon,
  UndoIcon,
  WandIcon,
} from "@/components/Icons";

type CapturedPhoto = { bitmap: ImageBitmap; width: number; height: number };

type ToolCategory = "light" | "color" | "detail" | "effects" | "curious";

interface ToolDef {
  key: keyof Adjustments;
  label: string;
  category: ToolCategory;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  accent: string;
  format?: (val: number) => string;
}

const TOOL_DEFINITIONS: ToolDef[] = [
  // Lumière
  {
    key: "exposure",
    label: "Exposition",
    category: "light",
    min: -2,
    max: 2,
    step: 0.05,
    defaultValue: 0,
    accent: "#fbbf24",
    format: (v) => `${v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2)} EV`,
  },
  {
    key: "contrast",
    label: "Contraste",
    category: "light",
    min: -100,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#fbbf24",
    format: (v) => `${v > 0 ? `+${Math.round(v)}` : Math.round(v)}%`,
  },
  {
    key: "highlights",
    label: "Hautes lumières",
    category: "light",
    min: -100,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#fbbf24",
    format: (v) => `${v > 0 ? `+${Math.round(v)}` : Math.round(v)}`,
  },
  {
    key: "shadows",
    label: "Ombres",
    category: "light",
    min: -100,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#fbbf24",
    format: (v) => `${v > 0 ? `+${Math.round(v)}` : Math.round(v)}`,
  },
  {
    key: "toneCurve",
    label: "Courbe S-Curve Log",
    category: "light",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#f59e0b",
    format: (v) => `${Math.round(v)}% S-Log`,
  },

  // Couleur
  {
    key: "saturation",
    label: "Saturation",
    category: "color",
    min: -100,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#f472b6",
    format: (v) => `${v > 0 ? `+${Math.round(v)}` : Math.round(v)}%`,
  },
  {
    key: "temperature",
    label: "Température",
    category: "color",
    min: -100,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#f472b6",
    format: (v) => `${v > 0 ? `+${Math.round(v)}` : Math.round(v)}`,
  },
  {
    key: "tint",
    label: "Teinte",
    category: "color",
    min: -100,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#f472b6",
    format: (v) => `${v > 0 ? `+${Math.round(v)}` : Math.round(v)}`,
  },
  {
    key: "shadowTint",
    label: "Virage Ombres Teal",
    category: "color",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#06b6d4",
    format: (v) => `${Math.round(v)}% Teal`,
  },
  {
    key: "highlightTint",
    label: "Virage Hautes Lum. Ambre",
    category: "color",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#f59e0b",
    format: (v) => `${Math.round(v)}% Ambre`,
  },
  {
    key: "monochrome",
    label: "Noir & Blanc",
    category: "color",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#94a3b8",
    format: (v) => `${Math.round(v)}%`,
  },
  {
    key: "tintStrength",
    label: "Virage couleur",
    category: "color",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#f472b6",
    format: (v) => `${Math.round(v)}%`,
  },

  // Détails & Netteté
  {
    key: "sharpen",
    label: "Netteté",
    category: "detail",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#22d3ee",
    format: (v) => `${Math.round(v)}%`,
  },
  {
    key: "superContrast",
    label: "Super Contraste",
    category: "detail",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#22d3ee",
    format: (v) => `${Math.round(v)}%`,
  },
  {
    key: "dehaze",
    label: "Débrumage Clarté",
    category: "detail",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#0ea5e9",
    format: (v) => `${Math.round(v)}%`,
  },
  {
    key: "skinSmooth",
    label: "Lissage Peau Portrait",
    category: "detail",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#fda4af",
    format: (v) => `${Math.round(v)}% Melanin`,
  },
  {
    key: "denoise",
    label: "Réduct. Bruit",
    category: "detail",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#22d3ee",
    format: (v) => `${Math.round(v)}%`,
  },

  // Effets Vintage & Cinéma
  {
    key: "anamorphicFlare",
    label: "Flare Anamorphique Bleu",
    category: "effects",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#38bdf8",
    format: (v) => `${Math.round(v)}% Scope`,
  },
  {
    key: "halation",
    label: "Halation rouge",
    category: "effects",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#f87171",
    format: (v) => `${Math.round(v)}%`,
  },
  {
    key: "bloom",
    label: "Bloom Pro-Mist",
    category: "effects",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#fbbf24",
    format: (v) => `${Math.round(v)}%`,
  },
  {
    key: "vignette",
    label: "Vignettage",
    category: "effects",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#a78bfa",
    format: (v) => `${Math.round(v)}%`,
  },
  {
    key: "grain",
    label: "Grain argentique",
    category: "effects",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#a78bfa",
    format: (v) => `${Math.round(v)}%`,
  },
  {
    key: "fade",
    label: "Délavé mat",
    category: "effects",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#a78bfa",
    format: (v) => `${Math.round(v)}%`,
  },
  {
    key: "chromaticAberration",
    label: "Aberration chrom.",
    category: "effects",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#a78bfa",
    format: (v) => `${Math.round(v)}%`,
  },
  {
    key: "lightLeak",
    label: "Fuite de lumière",
    category: "effects",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#a78bfa",
    format: (v) => `${Math.round(v)}%`,
  },
  {
    key: "scanlines",
    label: "Lignes TV / Scan",
    category: "effects",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#a78bfa",
    format: (v) => `${Math.round(v)}%`,
  },

  // Filtres Curieux & Bizarres
  {
    key: "infrared",
    label: "Aerochrome EIR",
    category: "curious",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#ef4444",
    format: (v) => `${Math.round(v)}% IR`,
  },
  {
    key: "thermal",
    label: "FLIR Thermique",
    category: "curious",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#f97316",
    format: (v) => `${Math.round(v)}% Heat`,
  },
  {
    key: "nightVision",
    label: "Vision Nocturne",
    category: "curious",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#10b981",
    format: (v) => `${Math.round(v)}% NVG`,
  },
  {
    key: "glitch",
    label: "VHS Glitch",
    category: "curious",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#06b6d4",
    format: (v) => `${Math.round(v)}% VCR`,
  },
  {
    key: "kaleidoscope",
    label: "Kaléidoscope",
    category: "curious",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#8b5cf6",
    format: (v) => `${Math.round(v)}% Prisme`,
  },
  {
    key: "solarize",
    label: "Solarisation",
    category: "curious",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#ec4899",
    format: (v) => `${Math.round(v)}% Sabattier`,
  },
  {
    key: "cyanotype",
    label: "Cyanotype",
    category: "curious",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#3b82f6",
    format: (v) => `${Math.round(v)}% Blueprint`,
  },
  {
    key: "dither",
    label: "Dither Rétro",
    category: "curious",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#84cc16",
    format: (v) => `${Math.round(v)}% 1-Bit`,
  },
  {
    key: "lomochrome",
    label: "Lomo Turquoise",
    category: "curious",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#06b6d4",
    format: (v) => `${Math.round(v)}% Turq`,
  },
  {
    key: "crossProcess",
    label: "Cross-Process E-6",
    category: "curious",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#eab308",
    format: (v) => `${Math.round(v)}% Cross`,
  },
  {
    key: "tiltShift",
    label: "Tilt-Shift Maquette",
    category: "curious",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#a855f7",
    format: (v) => `${Math.round(v)}% Diorama`,
  },
  {
    key: "macroBoost",
    label: "Micro-Reliefs Macro",
    category: "detail",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    accent: "#10b981",
    format: (v) => `${Math.round(v)}% Macro`,
  },
];

const CATEGORIES: { id: ToolCategory; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: "light", label: "Lumière", icon: SunIcon },
  { id: "color", label: "Couleur", icon: ColorIcon },
  { id: "detail", label: "Détails", icon: ContrastIcon },
  { id: "effects", label: "Effets", icon: WandIcon },
  { id: "curious", label: "Curieux", icon: SparkleIcon },
];

export default function Editor({
  photo,
  initialPresetId = null,
  initialAdjustments,
  initialSuperRes = false,
  initialDenoiseAI = false,
  onClose,
  onSaved,
}: {
  photo: CapturedPhoto;
  initialPresetId?: string | null;
  initialAdjustments?: Adjustments;
  initialSuperRes?: boolean;
  initialDenoiseAI?: boolean;
  onClose: () => void;
  onSaved?: (meta: SavedPhotoMeta) => void;
}) {
  const computeInitial = (): Adjustments =>
    initialAdjustments ?? {
      ...NEUTRAL_ADJUSTMENTS,
      ...PRESETS.find((p) => p.id === initialPresetId)?.adjustments,
    };
  const [presetId, setPresetId] = useState<string | null>(initialPresetId);
  const [adjustments, setAdjustments] = useState<Adjustments>(computeInitial);
  const [history, setHistory] = useState<Adjustments[]>(() => [computeInitial()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [busy, setBusy] = useState<"save" | "download" | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Active studio tool state
  const [activeCategory, setActiveCategory] = useState<ToolCategory>("light");
  const [activeToolKey, setActiveToolKey] = useState<keyof Adjustments>("exposure");

  // AI states
  const [superRes, setSuperRes] = useState(initialSuperRes);
  const [superResProgress, setSuperResProgress] = useState<number | null>(null);
  const superResSize = useMemo(() => superResOutputSize(photo.width, photo.height), [photo.width, photo.height]);

  const [denoiseAI, setDenoiseAI] = useState(initialDenoiseAI);
  const [denoiseProgress, setDenoiseProgress] = useState<number | null>(null);
  const denoiseSize = useMemo(() => aiDenoiseOutputSize(photo.width, photo.height), [photo.width, photo.height]);

  const editedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const editedRenderer = useRef<GLRenderer | null>(null);
  const originalRenderer = useRef<GLRenderer | null>(null);
  const [seed] = useState(() => Math.random() * 1000);

  const previewSize = useMemo(() => {
    const scale = Math.min(1, 1600 / Math.max(photo.width, photo.height));
    return { width: Math.round(photo.width * scale), height: Math.round(photo.height * scale) };
  }, [photo.width, photo.height]);

  useEffect(() => {
    const canvas = originalCanvasRef.current;
    if (!canvas) return;
    try {
      const renderer = new GLRenderer(canvas);
      originalRenderer.current = renderer;
      renderer.uploadSource(photo.bitmap, previewSize.width, previewSize.height);
      renderer.render(NEUTRAL_ADJUSTMENTS, 0);
    } catch {
      // ignore
    }
    return () => {
      originalRenderer.current?.dispose();
      originalRenderer.current = null;
    };
  }, [photo.bitmap, previewSize]);

  useEffect(() => {
    const canvas = editedCanvasRef.current;
    if (!canvas) return;
    try {
      editedRenderer.current = new GLRenderer(canvas);
    } catch {
      return;
    }
    return () => {
      editedRenderer.current?.dispose();
      editedRenderer.current = null;
    };
  }, [photo.bitmap]);

  useEffect(() => {
    const renderer = editedRenderer.current;
    if (!renderer) return;
    renderer.uploadSource(photo.bitmap, previewSize.width, previewSize.height);
    renderer.render(adjustments, seed);
  }, [adjustments, photo.bitmap, previewSize, seed]);

  const commitHistory = (next: Adjustments) => {
    setHistory((h) => [...h.slice(0, historyIndex + 1), next]);
    setHistoryIndex((i) => i + 1);
  };

  const applyPreset = (id: string | null) => {
    setPresetId(id);
    const preset = PRESETS.find((p) => p.id === id);
    const next = { ...NEUTRAL_ADJUSTMENTS, ...preset?.adjustments };
    setAdjustments(next);
    commitHistory(next);
  };

  const setField = <K extends keyof Adjustments>(key: K, value: Adjustments[K]) => {
    setPresetId(null);
    setAdjustments((prev) => ({ ...prev, [key]: value }));
  };

  const commitField = <K extends keyof Adjustments>(key: K, value: Adjustments[K]) => {
    commitHistory({ ...adjustments, [key]: value });
  };

  const resetField = (key: keyof Adjustments) => {
    const def = TOOL_DEFINITIONS.find((t) => t.key === key);
    if (!def) return;
    setField(key, def.defaultValue as Adjustments[typeof key]);
    commitField(key, def.defaultValue as Adjustments[typeof key]);
  };

  const resetAll = () => {
    applyPreset(null);
  };

  const undo = () => {
    if (historyIndex === 0) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    setAdjustments(history[nextIndex]);
    setPresetId(null);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    setAdjustments(history[nextIndex]);
    setPresetId(null);
  };

  const runExport = async (): Promise<{ blob: Blob; width: number; height: number }> => {
    const needsAI = denoiseAI || superRes;
    let result: { blob: Blob; width: number; height: number } = {
      blob: needsAI
        ? await exportPhotoForAI(photo.bitmap, photo.width, photo.height, adjustments, seed)
        : await exportPhoto(photo.bitmap, photo.width, photo.height, adjustments, seed),
      width: photo.width,
      height: photo.height,
    };
    if (denoiseAI) {
      setDenoiseProgress(0);
      try {
        result = await aiDenoise(result.blob, (fraction) => setDenoiseProgress(fraction));
      } finally {
        setDenoiseProgress(null);
      }
    }
    if (superRes) {
      setSuperResProgress(0);
      try {
        result = await superResolve(result.blob, (fraction) => setSuperResProgress(fraction));
      } finally {
        setSuperResProgress(null);
      }
    }
    if (needsAI) {
      result = { ...result, blob: await restyleAfterAI(result.blob, result.width, result.height, adjustments, seed) };
    }
    return result;
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDownload = async () => {
    setBusy("download");
    try {
      const { blob } = await runExport();
      await shareOrDownloadPhoto(blob, `camera-palama-${Date.now()}.jpg`);
      showToast("Photo exportée vers la pellicule");
    } catch {
      showToast("Échec de l'export — réessayez");
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async () => {
    setBusy("save");
    setSaveError(null);
    try {
      const { blob, width, height } = await runExport();
      const result = await uploadPhoto(blob, {
        width,
        height,
        presetId,
        adjustments,
      });
      if (result.ok) {
        setSaved(true);
        onSaved?.(result.item);
        showToast("Photo enregistrée dans la Galerie");
      } else {
        setSaveError(result.error);
        showToast(result.error);
      }
    } catch {
      setSaveError("Échec de l'enregistrement — réessayez.");
      showToast("Échec de l'enregistrement");
    } finally {
      setBusy(null);
    }
  };

  // Find active tool definition
  const currentTool = useMemo(
    () => TOOL_DEFINITIONS.find((t) => t.key === activeToolKey) ?? TOOL_DEFINITIONS[0],
    [activeToolKey]
  );

  const currentValue = (adjustments[currentTool.key] as number) ?? currentTool.defaultValue;
  const isToolModified = Math.abs(currentValue - currentTool.defaultValue) > 0.001;

  const categoryTools = useMemo(
    () => TOOL_DEFINITIONS.filter((t) => t.category === activeCategory),
    [activeCategory]
  );

  const stepValue = (direction: 1 | -1) => {
    const nextVal = Math.min(
      currentTool.max,
      Math.max(currentTool.min, currentValue + direction * currentTool.step)
    );
    setField(currentTool.key, nextVal as Adjustments[typeof currentTool.key]);
    commitField(currentTool.key, nextVal as Adjustments[typeof currentTool.key]);
  };

  return (
    <div className="flex flex-col h-dvh bg-zinc-950 text-white select-none">
      {/* Top Header Bar */}
      <div
        className="flex items-center justify-between px-3 py-2.5 z-20 border-b border-white/10 bg-zinc-950/80 backdrop-blur"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-1.5">
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white transition-all active:scale-95"
          >
            <BackIcon className="w-5 h-5" />
          </button>
          <div className="h-4 w-px bg-white/15 mx-0.5" />
          <button
            onClick={undo}
            disabled={historyIndex === 0}
            aria-label="Annuler"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 disabled:opacity-25 transition-all active:scale-95"
          >
            <UndoIcon className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            aria-label="Rétablir"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 disabled:opacity-25 transition-all active:scale-95"
          >
            <RedoIcon className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Center: Preset Selector */}
        <button
          onClick={() => setPickerOpen(true)}
          aria-label="Changer de style photographique"
          className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-black/60 p-1 hover:border-amber-400 active:scale-95 transition-all shadow-sm"
        >
          <FilmCanisterBadge
            preset={PRESETS.find((p) => p.id === presetId) ?? null}
            showIso={false}
            className="!bg-transparent !border-0 !p-0"
          />
        </button>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDownload}
            disabled={busy !== null}
            aria-label="Exporter l'image"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-30 transition-all active:scale-95"
          >
            <ShareIcon className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={handleSave}
            disabled={busy !== null}
            className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-black hover:bg-zinc-200 active:scale-95 disabled:opacity-50 transition-all shadow-md"
          >
            {saved ? <CheckIcon className="w-3.5 h-3.5" /> : <CloudUploadIcon className="w-3.5 h-3.5" />}
            {busy === "save" ? "Envoi…" : saved ? "Enregistré" : "Enregistrer"}
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 rounded-full border border-white/20 bg-zinc-900/90 px-4 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in duration-200">
          <CheckIcon className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {saveError && (
        <div className="mx-4 mt-2 rounded-xl border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs text-red-200">
          {saveError}
        </div>
      )}

      {/* Main Image Viewport with interactive comparison */}
      <div className="relative flex-1 min-h-0 overflow-hidden bg-black flex items-center justify-center">
        <canvas ref={originalCanvasRef} className="absolute inset-0 h-full w-full object-contain" />
        <canvas
          ref={editedCanvasRef}
          className="absolute inset-0 h-full w-full object-contain transition-opacity duration-75"
          style={{ opacity: comparing ? 0 : 1 }}
        />

        {/* Press-and-Hold Compare Button */}
        <button
          onPointerDown={() => setComparing(true)}
          onPointerUp={() => setComparing(false)}
          onPointerLeave={() => setComparing(false)}
          aria-label="Maintenir pour comparer avec l'original"
          className="absolute bottom-3 right-3 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
        >
          <CompareIcon className="w-4 h-4" />
          <span>{comparing ? "Original" : "Comparer"}</span>
        </button>

        {/* Quick Reset All on bottom left */}
        <button
          onClick={resetAll}
          className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-md hover:text-white shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
        >
          <ResetIcon className="w-3.5 h-3.5" />
          <span>Réinitialiser</span>
        </button>

        {/* AI Progress Overlays */}
        {denoiseProgress !== null && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/75 backdrop-blur-md">
            <SparkleIcon className="w-8 h-8 animate-pulse text-cyan-300" />
            <p className="text-sm font-medium text-white/90">
              {denoiseProgress < 0.99 ? `Débruitage IA en cours… ${Math.round(denoiseProgress * 100)}%` : "Finalisation…"}
            </p>
          </div>
        )}

        {superResProgress !== null && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/75 backdrop-blur-md">
            <SparkleIcon className="w-8 h-8 animate-pulse text-cyan-300" />
            <p className="text-sm font-medium text-white/90">
              {superResProgress < 0.99 ? `Super-résolution IA… ${Math.round(superResProgress * 100)}%` : "Reconstruction finale…"}
            </p>
          </div>
        )}
      </div>

      {/* Studio Control Dock */}
      <div className="border-t border-white/10 bg-zinc-950 flex flex-col">
        {/* AI Quick Enhancements Strip */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDenoiseAI((v) => !v)}
              aria-pressed={denoiseAI}
              disabled={busy !== null}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-all ${
                denoiseAI
                  ? "border-cyan-400 bg-cyan-400/20 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.25)]"
                  : "border-white/15 text-white/60 hover:border-white/30"
              }`}
            >
              <SparkleIcon className="w-3.5 h-3.5" />
              Débruitage IA
            </button>
            <button
              onClick={() => setSuperRes((v) => !v)}
              aria-pressed={superRes}
              disabled={busy !== null}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-all ${
                superRes
                  ? "border-cyan-400 bg-cyan-400/20 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.25)]"
                  : "border-white/15 text-white/60 hover:border-white/30"
              }`}
            >
              <SparkleIcon className="w-3.5 h-3.5" />
              Super-résolution IA
            </button>
          </div>
          {(denoiseAI || superRes) && (
            <span className="text-[10px] font-mono text-cyan-400/80">
              {superRes ? `×2 (${superResSize.width}×${superResSize.height})` : `(${denoiseSize.width}×${denoiseSize.height})`}
            </span>
          )}
        </div>

        {/* Film Quick Bar */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto px-4 py-2 border-b border-white/5 bg-zinc-900/20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <button
            onClick={() => applyPreset(null)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all border ${
              presetId === null
                ? "border-amber-400 bg-amber-400/20 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.25)]"
                : "border-white/10 bg-white/5 text-white/60 hover:text-white"
            }`}
          >
            <span>Neutre</span>
          </button>
          {PRESETS.map((p) => {
            const isSelected = presetId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all border ${
                  isSelected
                    ? "border-amber-400 bg-amber-400/20 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.25)]"
                    : "border-white/10 bg-white/5 text-white/60 hover:text-white"
                }`}
              >
                <span className="h-2 w-2 rounded-full shadow-[0_0_4px_currentColor]" style={{ backgroundColor: FILM_STYLES[p.id]?.accentColor ?? "#fbbf24", color: FILM_STYLES[p.id]?.accentColor ?? "#fbbf24" }} />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Hero Active Tool Slider (Large, tactile, high-precision) */}
        <div className="px-4 pt-3 pb-2 bg-gradient-to-b from-zinc-900/60 to-zinc-950 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full shadow-[0_0_6px_currentColor]"
                style={{ backgroundColor: currentTool.accent, color: currentTool.accent }}
              />
              <span className="text-xs font-bold text-white tracking-wide">{currentTool.label}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-white tabular-nums">
                {currentTool.format ? currentTool.format(currentValue) : currentValue}
              </span>
              {isToolModified && (
                <button
                  onClick={() => resetField(currentTool.key)}
                  aria-label="Réinitialiser ce paramètre"
                  className="flex items-center gap-1 text-[10px] font-medium text-white/50 hover:text-white transition-colors"
                >
                  <ResetIcon className="w-3 h-3" />
                  Zéro
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => stepValue(-1)}
              aria-label="Diminuer"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm font-bold text-white/80 hover:bg-white/15 active:scale-90 transition-all"
            >
              −
            </button>
            <div className="flex-1">
              <HorizontalSlider
                ariaLabel={currentTool.label}
                min={currentTool.min}
                max={currentTool.max}
                step={currentTool.step}
                value={currentValue}
                onChange={(val) => {
                  setField(currentTool.key, val as Adjustments[typeof currentTool.key]);
                  commitField(currentTool.key, val as Adjustments[typeof currentTool.key]);
                }}
              />
            </div>
            <button
              onClick={() => stepValue(1)}
              aria-label="Augmenter"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm font-bold text-white/80 hover:bg-white/15 active:scale-90 transition-all"
            >
              +
            </button>
          </div>
        </div>

        {/* Tools Sub-carousel for Active Category */}
        <div
          className="flex items-center gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-t border-white/5"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {categoryTools.map((tool) => {
            const val = (adjustments[tool.key] as number) ?? tool.defaultValue;
            const modified = Math.abs(val - tool.defaultValue) > 0.001;
            const isSelected = activeToolKey === tool.key;

            return (
              <button
                key={tool.key}
                onClick={() => setActiveToolKey(tool.key)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 transition-all text-left ${
                  isSelected
                    ? "bg-white/15 border border-white/30 text-white shadow-sm"
                    : "bg-white/5 border border-transparent text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: tool.accent }}
                />
                <span className="text-xs font-medium">{tool.label}</span>
                {modified && (
                  <span
                    className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-white/10"
                    style={{ color: tool.accent }}
                  >
                    {tool.format ? tool.format(val) : val}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Category Tabs Bottom Dock */}
        <div
          className="flex items-center justify-around border-t border-white/10 bg-zinc-950 px-2 py-2"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            const Icon = cat.icon;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  const firstInCat = TOOL_DEFINITIONS.find((t) => t.category === cat.id);
                  if (firstInCat) setActiveToolKey(firstInCat.key);
                }}
                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
                  isSelected ? "text-white font-bold scale-105" : "text-white/50 hover:text-white/80"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    isSelected ? "bg-white text-black shadow-md" : "bg-transparent text-current"
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] tracking-tight">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {pickerOpen && (
        <div className="fixed inset-0 z-50">
          <CameraPicker
            photoSource={photo.bitmap}
            activePresetId={presetId}
            onSelect={(id) => {
              applyPreset(id);
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

