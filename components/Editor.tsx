"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GLRenderer } from "@/lib/gl/renderer";
import { exportPhoto } from "@/lib/export";
import { uploadPhoto } from "@/lib/storage";
import { Adjustments, NEUTRAL_ADJUSTMENTS } from "@/lib/types";
import { PRESETS } from "@/lib/presets";
import AdjustSlider from "./AdjustSlider";
import {
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
  const [tab, setTab] = useState<"styles" | "adjust">("styles");
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

      <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden bg-black">
        <div className="relative" style={{ aspectRatio: `${previewSize.width} / ${previewSize.height}`, maxWidth: "100%", maxHeight: "100%" }}>
          <canvas ref={originalCanvasRef} className="absolute inset-0 h-full w-full object-contain" />
          <canvas
            ref={editedCanvasRef}
            className="absolute inset-0 h-full w-full object-contain transition-opacity"
            style={{ opacity: comparing ? 0 : 1 }}
          />
        </div>

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
        <div className="flex">
          <button
            onClick={() => setTab("styles")}
            className={`flex-1 py-2.5 text-sm font-medium ${tab === "styles" ? "text-white border-b-2 border-white" : "text-white/40"}`}
          >
            Styles
          </button>
          <button
            onClick={() => setTab("adjust")}
            className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 ${
              tab === "adjust" ? "text-white border-b-2 border-white" : "text-white/40"
            }`}
          >
            <SlidersIcon className="w-4 h-4" /> Réglages
          </button>
        </div>

        {tab === "styles" ? (
          <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => applyPreset(null)}
              className={`shrink-0 rounded-2xl border px-3 py-2 text-left ${
                presetId === null ? "border-white bg-white/10" : "border-white/15"
              }`}
            >
              <div className="text-xs font-semibold">Naturel</div>
              <div className="text-[11px] text-white/40">Sans style</div>
            </button>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={`shrink-0 w-36 rounded-2xl border px-3 py-2 text-left ${
                  presetId === p.id ? "border-white bg-white/10" : "border-white/15"
                }`}
              >
                <div className="text-xs font-semibold">{p.label}</div>
                <div className="text-[11px] text-white/40 line-clamp-1">{p.blurb}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="max-h-[42dvh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
            <SliderSection title="Lumière">
              <AdjustSlider label="Exposition" value={adjustments.exposure} onChange={(v) => setField("exposure", v)} />
              <AdjustSlider label="Contraste" value={adjustments.contrast} onChange={(v) => setField("contrast", v)} />
              <AdjustSlider label="Hautes lumières" value={adjustments.highlights} onChange={(v) => setField("highlights", v)} />
              <AdjustSlider label="Ombres" value={adjustments.shadows} onChange={(v) => setField("shadows", v)} />
            </SliderSection>
            <SliderSection title="Couleur">
              <AdjustSlider label="Saturation" value={adjustments.saturation} onChange={(v) => setField("saturation", v)} />
              <AdjustSlider label="Température" value={adjustments.temperature} onChange={(v) => setField("temperature", v)} />
              <AdjustSlider label="Teinte" value={adjustments.tint} onChange={(v) => setField("tint", v)} />
              <AdjustSlider label="Noir & blanc" value={adjustments.monochrome} min={0} onChange={(v) => setField("monochrome", v)} />
              <AdjustSlider label="Virage couleur" value={adjustments.tintStrength} min={0} onChange={(v) => setField("tintStrength", v)} />
            </SliderSection>
            <SliderSection title="Netteté">
              <AdjustSlider label="Netteté" value={adjustments.sharpen} min={0} onChange={(v) => setField("sharpen", v)} />
              <AdjustSlider label="Réduction de bruit" value={adjustments.denoise} min={0} onChange={(v) => setField("denoise", v)} />
            </SliderSection>
            <SliderSection title="Effets pellicule">
              <AdjustSlider label="Vignettage" value={adjustments.vignette} min={0} onChange={(v) => setField("vignette", v)} />
              <AdjustSlider label="Grain" value={adjustments.grain} min={0} onChange={(v) => setField("grain", v)} />
              <AdjustSlider label="Délavé" value={adjustments.fade} min={0} onChange={(v) => setField("fade", v)} />
              <AdjustSlider label="Aberration chromatique" value={adjustments.chromaticAberration} min={0} onChange={(v) => setField("chromaticAberration", v)} />
              <AdjustSlider label="Fuite de lumière" value={adjustments.lightLeak} min={0} onChange={(v) => setField("lightLeak", v)} />
              <AdjustSlider label="Lignes de balayage" value={adjustments.scanlines} min={0} onChange={(v) => setField("scanlines", v)} />
            </SliderSection>
          </div>
        )}

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
    </div>
  );
}

function SliderSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pt-2">
      <div className="px-4 pt-2 text-[11px] font-medium uppercase tracking-wide text-white/30">{title}</div>
      {children}
    </div>
  );
}
