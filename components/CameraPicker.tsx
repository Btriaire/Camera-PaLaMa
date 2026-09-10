"use client";

import { useEffect, useState } from "react";
import { GLRenderer, ImageSource } from "@/lib/gl/renderer";
import { PRESETS } from "@/lib/presets";
import { HudSkin, NEUTRAL_ADJUSTMENTS, Preset } from "@/lib/types";
import { useCamera } from "@/lib/useCamera";
import { BackIcon, CheckIcon } from "@/components/Icons";

type RGB = [number, number, number];
const lerp = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

// A quick decorative approximation of each preset's color character —
// shown as soon as the picker opens, then swapped for a real thumbnail
// (see below) once one's ready. Never a real render of the shader itself.
function swatchGradient(p: Preset): string {
  const adj = p.adjustments;
  const temp = (adj.temperature ?? 0) / 100;
  const warm: RGB = [255, 180, 120];
  const cool: RGB = [140, 190, 255];
  const neutral: RGB = [190, 190, 190];
  const base = temp > 0 ? lerp(neutral, warm, temp) : lerp(neutral, cool, -temp);
  const tinted = lerp(base, adj.tintColor ?? neutral, (adj.tintStrength ?? 0) / 100);
  const gray = (tinted[0] + tinted[1] + tinted[2]) / 3;
  const final = lerp(tinted, [gray, gray, gray], (adj.monochrome ?? 0) / 100);
  const c1 = `rgb(${final.map((v) => Math.round(v)).join(",")})`;
  const c2 = `rgb(${final.map((v) => Math.round(v * 0.55)).join(",")})`;
  return `linear-gradient(135deg, ${c1}, ${c2})`;
}

// Key used for the "Naturel" (no preset) entry in the thumbnails map —
// presets are keyed by their real id, which is never this string.
const NATURAL_KEY = "__natural__";

function sourceDims(source: ImageSource): { width: number; height: number } {
  if (source instanceof HTMLVideoElement) return { width: source.videoWidth, height: source.videoHeight };
  if (typeof HTMLImageElement !== "undefined" && source instanceof HTMLImageElement) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  return { width: source.width, height: source.height };
}

// Renders one small thumbnail per camera/preset from a single real
// source -- the live viewfinder frame while shooting, or the actual
// photo being edited when this picker is reopened from the editor --
// using the same GLRenderer as the live preview and the final export, so
// every card shows what THIS scene/shot would actually look like with
// that film/filter, not a generic stock photo or the abstract color
// swatch above. One texture upload, then one cheap draw call per preset
// reusing it, each read back via toDataURL (preserveDrawingBuffer is
// already on for the shared GLRenderer).
function usePresetThumbnails(source: ImageSource | null) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!source) return;
    const { width: sw, height: sh } = sourceDims(source);
    if (!sw || !sh) return;
    const canvas = document.createElement("canvas");
    let renderer: GLRenderer;
    try {
      renderer = new GLRenderer(canvas);
    } catch {
      return;
    }

    const scale = Math.min(1, 160 / Math.max(sw, sh));
    const w = Math.round(sw * scale);
    const h = Math.round(sh * scale);
    renderer.uploadSource(source, w, h);

    const next: Record<string, string> = {};
    renderer.render(NEUTRAL_ADJUSTMENTS, 0);
    next[NATURAL_KEY] = canvas.toDataURL("image/jpeg", 0.75);
    for (const p of PRESETS) {
      renderer.render({ ...NEUTRAL_ADJUSTMENTS, ...p.adjustments }, 0);
      next[p.id] = canvas.toDataURL("image/jpeg", 0.75);
    }
    setThumbs(next);
    renderer.dispose();
  }, [source]);

  return thumbs;
}

const HUD_LABEL: Record<HudSkin, string> = {
  film: "Pellicule",
  cinema: "Cinéma numérique",
  camcorder: "Caméscope",
  cctv: "Vidéosurveillance",
  modern: "Moderne",
};

// Full-screen browser for "which camera am I shooting with" — distinct from
// the quick chip strip on the viewfinder itself. Picking a card here sets
// the active preset (and, for vintage ones, the HUD skin that goes with it)
// so the on-screen readouts and the resulting image match the camera you
// picked, not just a filter name.
export default function CameraPicker({
  camera,
  photoSource,
  activePresetId,
  onSelect,
  onClose,
}: {
  // Pass `camera` when shooting (thumbnails come from the live feed), or
  // `photoSource` when reopening this picker from the editor (thumbnails
  // come from the actual photo being edited). Neither is required so both
  // callers only pass the one they have.
  camera?: ReturnType<typeof useCamera>;
  photoSource?: ImageBitmap | null;
  activePresetId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) {
  const vintage = PRESETS.filter((p) => p.category === "vintage");
  const modern = PRESETS.filter((p) => p.category === "modern");
  const thumbs = usePresetThumbnails(camera?.videoRef.current ?? photoSource ?? null);

  return (
    <div className="flex flex-col h-dvh bg-zinc-950 text-white">
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button onClick={onClose} className="p-1 text-white/70">
          <BackIcon />
        </button>
        <h1 className="text-lg font-semibold">Choisir un appareil</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => onSelect(null)}
          className={`mb-4 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left ${
            activePresetId === null ? "border-white bg-white/10" : "border-white/15"
          }`}
        >
          <Thumb src={thumbs[NATURAL_KEY]} gradient="linear-gradient(135deg, #c9c9c9, #6e6e6e)" />
          <div className="flex-1 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Naturel</div>
              <div className="text-xs text-white/40">Aucun style, l&apos;image brute</div>
            </div>
            {activePresetId === null && <CheckIcon />}
          </div>
        </button>

        <Section title="Pellicule &amp; caméras">
          {vintage.map((p) => (
            <Card key={p.id} active={activePresetId === p.id} onClick={() => onSelect(p.id)}>
              <Thumb src={thumbs[p.id]} gradient={swatchGradient(p)} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{p.label}</div>
                  {activePresetId === p.id && <CheckIcon className="w-4 h-4" />}
                </div>
                <div className="mt-0.5 text-xs text-white/40">{p.blurb}</div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-white/50">
                  <Tag>{HUD_LABEL[p.hud]}</Tag>
                  {p.era && <Tag>{p.era}</Tag>}
                  {p.iso && <Tag>ISO {p.iso}</Tag>}
                  {p.kelvin && <Tag>{p.kelvin}K</Tag>}
                </div>
              </div>
            </Card>
          ))}
        </Section>

        <Section title="Filtres modernes">
          {modern.map((p) => (
            <Card key={p.id} active={activePresetId === p.id} onClick={() => onSelect(p.id)}>
              <Thumb src={thumbs[p.id]} gradient={swatchGradient(p)} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{p.label}</div>
                  {activePresetId === p.id && <CheckIcon className="w-4 h-4" />}
                </div>
                <div className="mt-0.5 text-xs text-white/40">{p.blurb}</div>
              </div>
            </Card>
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-white/30">{title}</div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Card({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left ${
        active ? "border-white bg-white/10" : "border-white/15"
      }`}
    >
      {children}
    </button>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-white/10 px-2 py-0.5">{children}</span>;
}

// The color-swatch gradient shows instantly; once useCameraThumbnails
// finishes its one-time render pass, the real photo fades in on top of it.
function Thumb({ src, gradient }: { src?: string; gradient: string }) {
  return (
    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl" style={{ backgroundImage: gradient }}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
    </div>
  );
}
