"use client";

import { PRESETS, CURIOUS_PRESETS } from "@/lib/presets";
import { HudSkin } from "@/lib/types";
import { useCamera } from "@/lib/useCamera";
import { NATURAL_KEY, usePresetThumbnails } from "@/lib/usePresetThumbnails";
import { BackIcon, CheckIcon } from "@/components/Icons";
import PresetThumb, { NATURAL_GRADIENT, PresetBeforeAfter, swatchGradient } from "@/components/PresetThumb";

const HUD_LABEL: Record<HudSkin, string> = {
  film: "Pellicule",
  cinema: "Cinéma numérique",
  camcorder: "Caméscope",
  cctv: "Vidéosurveillance",
  modern: "Moderne",
  dashcam: "Dashcam",
  doorbell: "Caméra connectée",
  webcam: "Webcam",
  leica: "Télémètre Leica",
  hasselblad: "Moyen Format 6×6",
  digicam: "Digicam CCD Y2K",
  xpan: "Panoramique XPan",
  pro: "Visée Pro Mirrorless",
  thermal: "Vision Thermique FLIR",
  nvg: "Vision Nocturne PVS-14",
  glitch: "Signal VHS Glitch",
};

export default function CameraPicker({
  camera,
  photoSource,
  activePresetId,
  onSelect,
  onClose,
}: {
  camera?: ReturnType<typeof useCamera>;
  photoSource?: ImageBitmap | null;
  activePresetId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) {
  const vintage = PRESETS.filter((p) => p.category === "vintage");
  const curious = CURIOUS_PRESETS;
  const modern = PRESETS.filter((p) => p.category === "modern");
  const thumbs = usePresetThumbnails(camera?.videoRef.current ?? photoSource ?? null);

  return (
    <div className="flex flex-col h-dvh bg-zinc-950 text-white">
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-white/10"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button onClick={onClose} className="p-1 text-white/70 hover:text-white transition-colors">
          <BackIcon />
        </button>
        <div>
          <h1 className="text-base font-semibold">Pellicules &amp; Effets Spéciaux</h1>
          <p className="text-[11px] text-white/50">{PRESETS.length} émulsions &amp; optiques uniques</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Card active={activePresetId === null} onClick={() => onSelect(null)} className="mb-4">
          <div className="relative">
            <PresetThumb src={thumbs[NATURAL_KEY]} gradient={NATURAL_GRADIENT} className="h-28 w-full" />
            {activePresetId === null && <ActiveBadge />}
          </div>
          <div className="p-3">
            <div className="text-sm font-semibold">Capteur Neutre (RAW)</div>
            <div className="text-xs text-white/40">Aucun traitement, l&apos;image brute du capteur</div>
          </div>
        </Card>

        {/* Section 1: Pellicules Authentiques & Boîtiers Vintage */}
        <Section title="Pellicules Authentiques &amp; Boîtiers">
          {vintage.map((p) => (
            <Card key={p.id} active={activePresetId === p.id} onClick={() => onSelect(p.id)}>
              <div className="relative">
                <PresetBeforeAfter
                  beforeSrc={thumbs[NATURAL_KEY]}
                  afterSrc={thumbs[p.id]}
                  gradient={swatchGradient(p)}
                  className="h-28 w-full"
                />
                {activePresetId === p.id && <ActiveBadge />}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{p.label}</div>
                  {p.brand && <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">{p.brand}</span>}
                </div>
                <div className="mt-0.5 text-xs text-white/50">{p.blurb}</div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-white/60">
                  <Tag>{HUD_LABEL[p.hud]}</Tag>
                  {p.era && <Tag>{p.era}</Tag>}
                  {p.iso && <Tag>ISO {p.iso}</Tag>}
                  {p.kelvin && <Tag>{p.kelvin}K</Tag>}
                </div>
              </div>
            </Card>
          ))}
        </Section>

        {/* Section 2: Filtres Curieux & Bizarres */}
        <Section title="Filtres Curieux &amp; Bizarres (Expérimental)">
          {curious.map((p) => (
            <Card key={p.id} active={activePresetId === p.id} onClick={() => onSelect(p.id)}>
              <div className="relative">
                <PresetBeforeAfter
                  beforeSrc={thumbs[NATURAL_KEY]}
                  afterSrc={thumbs[p.id]}
                  gradient={swatchGradient(p)}
                  className="h-28 w-full"
                />
                {activePresetId === p.id && <ActiveBadge />}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-amber-300">{p.label}</div>
                  <span className="text-[10px] font-mono text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">EXPÉRIMENTAL</span>
                </div>
                <div className="mt-0.5 text-xs text-white/60">{p.blurb}</div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-white/60">
                  <Tag>{HUD_LABEL[p.hud]}</Tag>
                  {p.era && <Tag>{p.era}</Tag>}
                  {p.iso && <Tag>ISO {p.iso}</Tag>}
                </div>
              </div>
            </Card>
          ))}
        </Section>

        {/* Section 3: Filtres Modernes */}
        <Section title="Filtres Modernes Pro">
          {modern.map((p) => (
            <Card key={p.id} active={activePresetId === p.id} onClick={() => onSelect(p.id)}>
              <div className="relative">
                <PresetBeforeAfter
                  beforeSrc={thumbs[NATURAL_KEY]}
                  afterSrc={thumbs[p.id]}
                  gradient={swatchGradient(p)}
                  className="h-28 w-full"
                />
                {activePresetId === p.id && <ActiveBadge />}
              </div>
              <div className="p-3">
                <div className="text-sm font-semibold">{p.label}</div>
                <div className="mt-0.5 text-xs text-white/50">{p.blurb}</div>
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
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-400/80">{title}</div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Card({
  active,
  onClick,
  className = "",
  children,
}: {
  active: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`overflow-hidden rounded-2xl border text-left transition-all ${
        active
          ? "border-amber-400 ring-2 ring-amber-400/30 bg-white/10"
          : "border-white/15 bg-white/5 hover:border-white/30"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function ActiveBadge() {
  return (
    <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-black shadow-md">
      <CheckIcon className="h-4 w-4" />
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono">{children}</span>;
}
