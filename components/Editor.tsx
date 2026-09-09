"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GLRenderer } from "@/lib/gl/renderer";
import { exportPhoto } from "@/lib/export";
import { uploadPhoto } from "@/lib/storage";
import { Adjustments, NEUTRAL_ADJUSTMENTS } from "@/lib/types";
import { PRESETS } from "@/lib/presets";
import Dial from "./Dial";
import CameraPicker from "./CameraPicker";
import {
  ApertureIcon,
  BackIcon,
  CheckIcon,
  CloudUploadIcon,
  CompareIcon,
  DownloadIcon,
  SlidersIcon,
} from "@/components/Icons";

type CapturedPhoto = { bitmap: ImageBitmap; width: number; height: number };

// Non-destructive by construction: `adjustments` is the only mutable state.
// Every render — live preview or final export — starts back from the
// untouched source bitmap and reapplies the full stack, so nothing is ever
// baked in early and undone edits cost nothing.
export default function Editor({
  photo,
  initialPresetId = null,
  initialAdjustments,
  onClose,
  onSaved,
}: {
  photo: CapturedPhoto;
  initialPresetId?: string | null;
  initialAdjustments?: Adjustments;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [presetId, setPresetId] = useState<string | null>(initialPresetId);
  const [adjustments, setAdjustments] = useState<Adjustments>(
    () =>
      initialAdjustments ?? {
        ...NEUTRAL_ADJUSTMENTS,
        ...PRESETS.find((p) => p.id === initialPresetId)?.adjustments,
      }
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [busy, setBusy] = useState<"save" | "download" | null>(null);
  const [saved, setSaved] = useState(false);

  const editedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const editedRenderer = useRef<GLRenderer | null>(null);
  const originalRenderer = useRef<GLRenderer | null>(null);
  // Lazy initializer, not a bare `useRef(Math.random())` call, so the
  // random seed is only ever computed once instead of on every render.
  const [seed] = useState(() => Math.random() * 1000);

  const previewSize = useMemo(() => {
    const scale = Math.min(1, 1600 / Math.max(photo.width, photo.height));
    return { width: Math.round(photo.width * scale), height: Math.round(photo.height * scale) };
  }, [photo.width, photo.height]);

  // Original (unfiltered) preview, rendered once — sits under the edited
  // canvas for the press-and-hold compare view.
  useEffect(() => {
    const canvas = originalCanvasRef.current;
    if (!canvas) return;
    try {
      const renderer = new GLRenderer(canvas);
      originalRenderer.current = renderer;
      renderer.uploadSource(photo.bitmap, previewSize.width, previewSize.height);
      renderer.render(NEUTRAL_ADJUSTMENTS, 0);
    } catch {
      // WebGL unavailable — the compare view just won't show anything underneath.
    }
    return () => {
      originalRenderer.current?.dispose();
      originalRenderer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo.bitmap]);

  // Edited preview, re-rendered from the source on every adjustment change.
  useEffect(() => {
    const canvas = editedCanvasRef.current;
    if (!canvas) return;
    if (!editedRenderer.current) {
      try {
        editedRenderer.current = new GLRenderer(canvas);
      } catch {
        return;
      }
    }
    editedRenderer.current.uploadSource(photo.bitmap, previewSize.width, previewSize.height);
    editedRenderer.current.render(adjustments, seed);
  }, [adjustments, photo.bitmap, previewSize, seed]);

  useEffect(() => () => editedRenderer.current?.dispose(), []);

  const applyPreset = (id: string | null) => {
    setPresetId(id);
    const preset = PRESETS.find((p) => p.id === id);
    setAdjustments({ ...NEUTRAL_ADJUSTMENTS, ...preset?.adjustments });
  };

  const setField = <K extends keyof Adjustments>(key: K, value: Adjustments[K]) => {
    setPresetId(null); // any manual tweak makes it a custom look, not "the preset"
    setAdjustments((prev) => ({ ...prev, [key]: value }));
  };

  const runExport = () => exportPhoto(photo.bitmap, photo.width, photo.height, adjustments, seed);

  const handleDownload = async () => {
    setBusy("download");
    try {
      const blob = await runExport();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `photo-${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async () => {
    setBusy("save");
    try {
      const blob = await runExport();
      const result = await uploadPhoto(blob, {
        width: photo.width,
        height: photo.height,
        presetId,
        adjustments,
      });
      if (result) {
        setSaved(true);
        onSaved?.();
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col h-dvh bg-zinc-950 text-white">
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button onClick={onClose} className="p-1 text-white/70">
          <BackIcon />
        </button>
        <h1 className="text-sm font-medium text-white/70">Éditeur</h1>
        <button
          onClick={handleSave}
          disabled={busy !== null}
          className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-black disabled:opacity-50"
        >
          {saved ? <CheckIcon className="w-4 h-4" /> : <CloudUploadIcon className="w-4 h-4" />}
          {busy === "save" ? "Envoi…" : saved ? "Enregistré" : "Enregistrer"}
        </button>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden bg-black">
        {/*
          No aspect-ratio wrapper here on purpose: a div sized only by
          aspect-ratio + max-width/height, with no in-flow content, has
          nothing to compute its size FROM once its children are
          `absolute` (those don't contribute to a parent's intrinsic
          size) — it collapses to 0x0, and inset-0 canvases inside a
          0x0 positioned ancestor render at zero size. object-contain on
          the canvases themselves (using their own width/height
          attributes as the intrinsic ratio) does the letterboxing
          correctly against this div's real, flex-driven h-full/w-full.
        */}
        <canvas ref={originalCanvasRef} className="absolute inset-0 h-full w-full object-contain" />
        <canvas
          ref={editedCanvasRef}
          className="absolute inset-0 h-full w-full object-contain transition-opacity"
          style={{ opacity: comparing ? 0 : 1 }}
        />

        <button
          onPointerDown={() => setComparing(true)}
          onPointerUp={() => setComparing(false)}
          onPointerLeave={() => setComparing(false)}
          aria-label="Comparer avec l'original"
          className="absolute bottom-3 right-3 rounded-full bg-black/50 p-2.5 text-white backdrop-blur"
        >
          <CompareIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="border-t border-white/10 bg-zinc-950">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 text-xs font-medium"
          >
            <ApertureIcon className="w-4 h-4" />
            {PRESETS.find((p) => p.id === presetId)?.label ?? "Naturel"}
          </button>
          <span className="flex items-center gap-1.5 text-[11px] text-white/40">
            <SlidersIcon className="w-3.5 h-3.5" /> Réglages
          </span>
        </div>

        <div className="max-h-[48dvh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
            <DialSection title="Lumière" accent="#fbbf24">
              <Dial label="Exposition" value={adjustments.exposure} accent="#fbbf24" onChange={(v) => setField("exposure", v)} />
              <Dial label="Contraste" value={adjustments.contrast} accent="#fbbf24" onChange={(v) => setField("contrast", v)} />
              <Dial label="Hautes lumières" value={adjustments.highlights} accent="#fbbf24" onChange={(v) => setField("highlights", v)} />
              <Dial label="Ombres" value={adjustments.shadows} accent="#fbbf24" onChange={(v) => setField("shadows", v)} />
            </DialSection>
            <DialSection title="Couleur" accent="#f472b6">
              <Dial label="Saturation" value={adjustments.saturation} accent="#f472b6" onChange={(v) => setField("saturation", v)} />
              <Dial label="Température" value={adjustments.temperature} accent="#f472b6" onChange={(v) => setField("temperature", v)} />
              <Dial label="Teinte" value={adjustments.tint} accent="#f472b6" onChange={(v) => setField("tint", v)} />
              <Dial label="Noir & blanc" value={adjustments.monochrome} min={0} accent="#f472b6" onChange={(v) => setField("monochrome", v)} />
              <Dial label="Virage couleur" value={adjustments.tintStrength} min={0} accent="#f472b6" onChange={(v) => setField("tintStrength", v)} />
            </DialSection>
            <DialSection title="Netteté" accent="#22d3ee">
              <Dial label="Netteté" value={adjustments.sharpen} min={0} accent="#22d3ee" onChange={(v) => setField("sharpen", v)} />
              <Dial label="Réduction de bruit" value={adjustments.denoise} min={0} accent="#22d3ee" onChange={(v) => setField("denoise", v)} />
            </DialSection>
            <DialSection title="Effets pellicule" accent="#a78bfa">
              <Dial label="Vignettage" value={adjustments.vignette} min={0} accent="#a78bfa" onChange={(v) => setField("vignette", v)} />
              <Dial label="Grain" value={adjustments.grain} min={0} accent="#a78bfa" onChange={(v) => setField("grain", v)} />
              <Dial label="Délavé" value={adjustments.fade} min={0} accent="#a78bfa" onChange={(v) => setField("fade", v)} />
              <Dial label="Aberration chromatique" value={adjustments.chromaticAberration} min={0} accent="#a78bfa" onChange={(v) => setField("chromaticAberration", v)} />
              <Dial label="Fuite de lumière" value={adjustments.lightLeak} min={0} accent="#a78bfa" onChange={(v) => setField("lightLeak", v)} />
              <Dial label="Lignes de balayage" value={adjustments.scanlines} min={0} accent="#a78bfa" onChange={(v) => setField("scanlines", v)} />
            </DialSection>
        </div>

        <div className="flex justify-center gap-6 border-t border-white/10 px-4 py-3">
          <button onClick={() => applyPreset(null)} className="text-sm text-white/50">
            Réinitialiser
          </button>
          <button
            onClick={handleDownload}
            disabled={busy !== null}
            className="flex items-center gap-1.5 text-sm text-white/80 disabled:opacity-50"
          >
            <DownloadIcon className="w-4 h-4" />
            {busy === "download" ? "Export…" : "Télécharger"}
          </button>
        </div>
      </div>

      {pickerOpen && (
        <div className="fixed inset-0 z-50">
          <CameraPicker
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

function DialSection({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pt-3">
      <div className="flex items-center gap-1.5 px-4 pb-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
        <span className="text-[11px] font-medium uppercase tracking-wide text-white/40">{title}</span>
      </div>
      <div className="grid grid-cols-4 gap-y-4 px-2 pb-1">{children}</div>
    </div>
  );
}
