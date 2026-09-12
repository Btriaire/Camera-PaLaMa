"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GLRenderer } from "@/lib/gl/renderer";
import { exportPhoto, exportPhotoForAI, restyleAfterAI } from "@/lib/export";
import { shareOrDownloadPhoto } from "@/lib/sharePhoto";
import { uploadPhoto } from "@/lib/storage";
import { aiDenoise, aiDenoiseOutputSize, superResolve, superResOutputSize } from "@/lib/superRes";
import { Adjustments, NEUTRAL_ADJUSTMENTS, SavedPhotoMeta } from "@/lib/types";
import { PRESETS } from "@/lib/presets";
import Dial from "./Dial";
import CameraPicker from "./CameraPicker";
import {
  ApertureIcon,
  BackIcon,
  CheckIcon,
  CloudUploadIcon,
  CompareIcon,
  RedoIcon,
  ShareIcon,
  SparkleIcon,
  UndoIcon,
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
  initialSuperRes = false,
  initialDenoiseAI = false,
  onClose,
  onSaved,
}: {
  photo: CapturedPhoto;
  initialPresetId?: string | null;
  initialAdjustments?: Adjustments;
  // Carries the viewfinder's "Super-résolution IA"/"Débruitage IA" toggles
  // over so they stay armed for this photo without flipping them again here.
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
  // Undo/redo history: one entry per *committed* change — a preset tap, or
  // a dial drag's final value on release — never one per onChange tick
  // during a drag, or every pixel of movement would be its own undo step.
  const [history, setHistory] = useState<Adjustments[]>(() => [computeInitial()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [busy, setBusy] = useState<"save" | "download" | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Real AI upscaling (lib/superRes.ts) is a one-shot, resolution-changing
  // operation, not a reversible slider — it lives outside Adjustments/
  // history on purpose, as an opt-in step applied right before export.
  const [superRes, setSuperRes] = useState(initialSuperRes);
  const [superResProgress, setSuperResProgress] = useState<number | null>(null);
  const superResSize = useMemo(() => superResOutputSize(photo.width, photo.height), [photo.width, photo.height]);
  // Débruitage IA (lib/superRes.ts) is the same kind of one-shot AI step,
  // reusing the same network — see aiDenoise's own comment for why this
  // isn't a separately-trained denoising model.
  const [denoiseAI, setDenoiseAI] = useState(initialDenoiseAI);
  const [denoiseProgress, setDenoiseProgress] = useState<number | null>(null);
  const denoiseSize = useMemo(() => aiDenoiseOutputSize(photo.width, photo.height), [photo.width, photo.height]);

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

  // Edited canvas: create the WebGL context once per source photo and
  // dispose it in this same effect — under React Strict Mode's dev-only
  // mount/cleanup/remount cycle, creating and disposing in two separate
  // effects (as this used to) lets the disposal from one outlive the
  // renderer reference the other still uses, so a StrictMode remount ends
  // up rendering through an already-deleted GL texture/program: draws
  // silently no-op (GL_INVALID_OPERATION) and the edited preview goes
  // blank instead of showing the new adjustments.
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

  // Re-renders from the source on every adjustment change, without
  // touching the renderer's lifecycle (owned by the effect above).
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
    setPresetId(null); // any manual tweak makes it a custom look, not "the preset"
    setAdjustments((prev) => ({ ...prev, [key]: value }));
  };

  const commitField = <K extends keyof Adjustments>(key: K, value: Adjustments[K]) => {
    commitHistory({ ...adjustments, [key]: value });
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

  // Renders through the shader at full resolution, then chains whichever
  // AI toggles are on — denoise before super-res, since cleaning up noise
  // before synthesizing extra detail from it makes more sense than the
  // reverse. Returns the final dimensions alongside the blob since either
  // step can change them.
  //
  // When either AI step runs, the initial render strips grain/scanlines/
  // chromatic aberration first (exportPhotoForAI) and reapplies them
  // afterward at the AI's own resolution (restyleAfterAI) — see those
  // functions' own comments for why: baking film grain in before the AI
  // pass swamped its (already subtle) contribution on every vintage
  // preset, which is most of them, making the toggle look like a no-op.
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

  const handleDownload = async () => {
    setBusy("download");
    try {
      const { blob } = await runExport();
      await shareOrDownloadPhoto(blob, `photo-${Date.now()}.jpg`);
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
      } else {
        // uploadPhoto resolves { ok: false } on any non-OK response rather
        // than throwing — silently doing nothing here would look identical
        // to a successful save that just isn't showing its checkmark yet.
        // result.error is the server's own message when it has one (e.g.
        // "no Vercel Blob store connected"), not just a generic guess.
        setSaveError(result.error);
      }
    } catch {
      setSaveError("Échec de l'enregistrement — réessayez.");
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
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1 text-white/70">
            <BackIcon />
          </button>
          <button onClick={undo} disabled={historyIndex === 0} aria-label="Annuler" className="p-1 text-white/70 disabled:opacity-30">
            <UndoIcon className="w-5 h-5" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            aria-label="Rétablir"
            className="p-1 text-white/70 disabled:opacity-30"
          >
            <RedoIcon className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={busy !== null}
          className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-black disabled:opacity-50"
        >
          {saved ? <CheckIcon className="w-4 h-4" /> : <CloudUploadIcon className="w-4 h-4" />}
          {busy === "save" ? "Envoi…" : saved ? "Enregistré" : "Enregistrer"}
        </button>
      </div>

      {saveError && (
        <div className="mx-4 mb-2 rounded-xl border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs text-red-200">
          {saveError}
        </div>
      )}

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

        {denoiseProgress !== null && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm">
            <SparkleIcon className="w-8 h-8 animate-pulse text-cyan-300" />
            <p className="text-sm text-white/80">
              {denoiseProgress < 0.99 ? `Débruitage IA… ${Math.round(denoiseProgress * 100)}%` : "Finalisation…"}
            </p>
          </div>
        )}

        {superResProgress !== null && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm">
            <SparkleIcon className="w-8 h-8 animate-pulse text-cyan-300" />
            <p className="text-sm text-white/80">
              {/* The model reports progress per patch, not for the final
                  stitch+encode step that follows — which can itself take a
                  while, so once patches are done the label stops claiming
                  a percentage it doesn't have and says so instead. */}
              {superResProgress < 0.99 ? `Super-résolution IA… ${Math.round(superResProgress * 100)}%` : "Finalisation…"}
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 bg-zinc-950">
        <div className="flex flex-col gap-1.5 px-4 py-2">
          <button
            onClick={() => setPickerOpen(true)}
            className="flex w-fit items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 text-xs font-medium"
          >
            <ApertureIcon className="w-4 h-4" />
            {PRESETS.find((p) => p.id === presetId)?.label ?? "Naturel"}
          </button>

          <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setDenoiseAI((v) => !v)}
              aria-pressed={denoiseAI}
              disabled={busy !== null}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                denoiseAI ? "border-cyan-400/70 bg-cyan-400/15 text-cyan-300" : "border-white/25 text-white/60"
              }`}
            >
              <SparkleIcon className="w-3.5 h-3.5" />
              Débruitage IA
            </button>
            <button
              onClick={() => setSuperRes((v) => !v)}
              aria-pressed={superRes}
              disabled={busy !== null}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                superRes ? "border-cyan-400/70 bg-cyan-400/15 text-cyan-300" : "border-white/25 text-white/60"
              }`}
            >
              <SparkleIcon className="w-3.5 h-3.5" />
              Super-résolution IA
            </button>
          </div>
          {denoiseAI && (
            <p className="text-[10px] text-white/40">
              Réutilise le réseau ESRGAN local (aucun envoi) — pas un modèle entraîné pour débruiter, mais
              reconstruire puis rééchantillonner atténue le bruit en passant. → {denoiseSize.width}×
              {denoiseSize.height}px
              {(denoiseSize.width < photo.width || denoiseSize.height < photo.height) && (
                <span className="text-amber-400">
                  {" "}
                  — plus petit que l&apos;original ({photo.width}×{photo.height}px), la photo dépasse ce que
                  l&apos;IA traite d&apos;un coup.
                </span>
              )}
              .
            </p>
          )}
          {superRes && (
            <p className="text-[10px] text-white/40">
              Réseau ESRGAN local (aucun envoi), ×2 → {superResSize.width}×{superResSize.height}px
              {(superResSize.width < photo.width || superResSize.height < photo.height) && (
                <span className="text-amber-400">
                  {" "}
                  — plus petit que l&apos;original ({photo.width}×{photo.height}px) : moins net qu&apos;un export
                  classique, pas plus.
                </span>
              )}
              . Le temps de traitement dépend de l&apos;appareil, au moment d&apos;enregistrer.
            </p>
          )}
        </div>

        {/*
          Snapseed-style tool strip: every dial sits in one horizontally
          scrollable row instead of a tall vertical grid, so the strip's
          height stays fixed (roughly one dial + label) no matter how many
          adjustments exist, leaving the preview above free to dominate the
          screen. Swiping sideways moves between tool groups instead of
          scrolling down through them.
        */}
        <div className="overflow-x-auto pb-[max(0.75rem,env(safe-area-inset-bottom))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-start gap-4 px-4 pt-3">
            <DialGroup title="Lumière" accent="#fbbf24">
              <Dial label="Exposition" value={adjustments.exposure} accent="#fbbf24" onChange={(v) => setField("exposure", v)} onCommit={(v) => commitField("exposure", v)} />
              <Dial label="Contraste" value={adjustments.contrast} accent="#fbbf24" onChange={(v) => setField("contrast", v)} onCommit={(v) => commitField("contrast", v)} />
              <Dial label="Hautes lumières" value={adjustments.highlights} accent="#fbbf24" onChange={(v) => setField("highlights", v)} onCommit={(v) => commitField("highlights", v)} />
              <Dial label="Ombres" value={adjustments.shadows} accent="#fbbf24" onChange={(v) => setField("shadows", v)} onCommit={(v) => commitField("shadows", v)} />
            </DialGroup>
            <Divider />
            <DialGroup title="Couleur" accent="#f472b6">
              <Dial label="Saturation" value={adjustments.saturation} accent="#f472b6" onChange={(v) => setField("saturation", v)} onCommit={(v) => commitField("saturation", v)} />
              <Dial label="Température" value={adjustments.temperature} accent="#f472b6" onChange={(v) => setField("temperature", v)} onCommit={(v) => commitField("temperature", v)} />
              <Dial label="Teinte" value={adjustments.tint} accent="#f472b6" onChange={(v) => setField("tint", v)} onCommit={(v) => commitField("tint", v)} />
              <Dial label="Noir & blanc" value={adjustments.monochrome} min={0} accent="#f472b6" onChange={(v) => setField("monochrome", v)} onCommit={(v) => commitField("monochrome", v)} />
              <Dial label="Virage couleur" value={adjustments.tintStrength} min={0} accent="#f472b6" onChange={(v) => setField("tintStrength", v)} onCommit={(v) => commitField("tintStrength", v)} />
            </DialGroup>
            <Divider />
            <DialGroup title="Netteté" accent="#22d3ee">
              <Dial label="Netteté" value={adjustments.sharpen} min={0} accent="#22d3ee" onChange={(v) => setField("sharpen", v)} onCommit={(v) => commitField("sharpen", v)} />
              <Dial label="Super Contraste" value={adjustments.superContrast} min={0} accent="#22d3ee" onChange={(v) => setField("superContrast", v)} onCommit={(v) => commitField("superContrast", v)} />
              <Dial label="Réduction de bruit" value={adjustments.denoise} min={0} accent="#22d3ee" onChange={(v) => setField("denoise", v)} onCommit={(v) => commitField("denoise", v)} />
            </DialGroup>
            <Divider />
            <DialGroup title="Effets pellicule" accent="#a78bfa">
              <Dial label="Vignettage" value={adjustments.vignette} min={0} accent="#a78bfa" onChange={(v) => setField("vignette", v)} onCommit={(v) => commitField("vignette", v)} />
              <Dial label="Grain" value={adjustments.grain} min={0} accent="#a78bfa" onChange={(v) => setField("grain", v)} onCommit={(v) => commitField("grain", v)} />
              <Dial label="Délavé" value={adjustments.fade} min={0} accent="#a78bfa" onChange={(v) => setField("fade", v)} onCommit={(v) => commitField("fade", v)} />
              <Dial label="Aberration chromatique" value={adjustments.chromaticAberration} min={0} accent="#a78bfa" onChange={(v) => setField("chromaticAberration", v)} onCommit={(v) => commitField("chromaticAberration", v)} />
              <Dial label="Fuite de lumière" value={adjustments.lightLeak} min={0} accent="#a78bfa" onChange={(v) => setField("lightLeak", v)} onCommit={(v) => commitField("lightLeak", v)} />
              <Dial label="Lignes de balayage" value={adjustments.scanlines} min={0} accent="#a78bfa" onChange={(v) => setField("scanlines", v)} onCommit={(v) => commitField("scanlines", v)} />
            </DialGroup>
          </div>
        </div>

        <div className="flex justify-center gap-6 border-t border-white/10 px-4 py-2">
          <button onClick={() => applyPreset(null)} className="text-sm text-white/50">
            Réinitialiser
          </button>
          <button
            onClick={handleDownload}
            disabled={busy !== null}
            className="flex items-center gap-1.5 text-sm text-white/80 disabled:opacity-50"
          >
            <ShareIcon className="w-4 h-4" />
            {busy === "download" ? "Export…" : "Enregistrer dans Photos"}
          </button>
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

// One tool group in the horizontal strip below the preview — a title chip
// stacked over its dials, laid out inline so the whole group scrolls past
// as a unit rather than wrapping onto a new line.
function DialGroup({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-shrink-0 flex-col gap-2">
      <div className="flex items-center gap-1.5 pl-1">
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: accent }} />
        <span className="whitespace-nowrap text-[11px] font-medium uppercase tracking-wide text-white/40">
          {title}
        </span>
      </div>
      <div className="flex items-start gap-3">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="mt-6 h-10 w-px flex-shrink-0 self-start bg-white/10" />;
}
