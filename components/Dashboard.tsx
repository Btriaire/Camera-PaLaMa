"use client";

import { useEffect, useState } from "react";
import { listPhotos } from "@/lib/storage";
import { PRESETS } from "@/lib/presets";
import { getSettings, saveSettings, Settings } from "@/lib/settings";
import { useCamera } from "@/lib/useCamera";
import { NATURAL_KEY, usePresetThumbnails } from "@/lib/usePresetThumbnails";
import { BackIcon, CheckIcon, GalleryGridIcon } from "@/components/Icons";
import PresetThumb, { NATURAL_GRADIENT, swatchGradient } from "@/components/PresetThumb";

// A small dashboard, not a settings dump: what you have (photo count, style
// count) and the few things worth defaulting (grid on at launch, which
// camera the viewfinder opens with) — everything here is a real, applied
// preference, stored in localStorage since there's no account/server side
// to this app.
export default function Dashboard({
  camera,
  onClose,
  onOpenGallery,
  onSettingsChange,
}: {
  camera: ReturnType<typeof useCamera>;
  onClose: () => void;
  onOpenGallery: () => void;
  onSettingsChange: (settings: Settings) => void;
}) {
  const [settings, setSettings] = useState<Settings>(() => getSettings());
  const [photoCount, setPhotoCount] = useState<number | null>(null);
  const thumbs = usePresetThumbnails(camera.videoRef.current);

  useEffect(() => {
    listPhotos().then((items) => setPhotoCount(items.length));
  }, []);

  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
    onSettingsChange(next);
  };

  return (
    <div className="flex flex-col h-dvh bg-zinc-950 text-white">
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button onClick={onClose} className="p-1 text-white/70">
          <BackIcon />
        </button>
        <h1 className="text-lg font-semibold">Tableau de bord</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-5 grid grid-cols-2 gap-2">
          <Stat value={photoCount === null ? "…" : String(photoCount)} label="Photos enregistrées" />
          <Stat value={String(PRESETS.length)} label="Styles disponibles" />
        </div>

        <button
          onClick={onOpenGallery}
          className="mb-5 flex w-full items-center justify-between rounded-2xl border border-white/15 px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <GalleryGridIcon className="w-4 h-4" /> Bibliothèque
          </span>
          <span className="text-xs text-white/40">Voir tout</span>
        </button>

        <Section title="Prise de vue">
          <Toggle
            label="Rester sur le viseur après une photo"
            description="La photo est enregistrée directement ; retrouvez-la dans le film en bas de l'écran."
            checked={settings.stayOnCapture}
            onChange={(v) => update({ stayOnCapture: v })}
          />
        </Section>

        <Section title="Au démarrage">
          <Toggle
            label="Grille (règle des tiers)"
            checked={settings.gridDefault}
            onChange={(v) => update({ gridDefault: v })}
          />
        </Section>

        <Section title="Caméra par défaut">
          <div className="flex flex-col gap-2">
            <PresetRow
              label="Naturel"
              thumbSrc={thumbs[NATURAL_KEY]}
              gradient={NATURAL_GRADIENT}
              active={settings.defaultPresetId === null}
              onClick={() => update({ defaultPresetId: null })}
            />
            {PRESETS.map((p) => (
              <PresetRow
                key={p.id}
                label={p.label}
                thumbSrc={thumbs[p.id]}
                gradient={swatchGradient(p)}
                active={settings.defaultPresetId === p.id}
                onClick={() => update({ defaultPresetId: p.id })}
              />
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/15 px-4 py-3">
      <div className="text-2xl font-semibold font-mono tabular-nums">{value}</div>
      <div className="text-xs text-white/40">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-white/30">{title}</div>
      {children}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/15 px-4 py-3"
    >
      <span className="text-left">
        <span className="block text-sm">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-white/40">{description}</span>}
      </span>
      <span className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? "bg-white" : "bg-white/15"}`}>
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-black transition-transform ${
            checked ? "translate-x-4 bg-black" : "translate-x-0.5 bg-white/60"
          }`}
        />
      </span>
    </button>
  );
}

function PresetRow({
  label,
  thumbSrc,
  gradient,
  active,
  onClick,
}: {
  label: string;
  thumbSrc?: string;
  gradient: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-left text-sm ${
        active ? "border-white bg-white/10" : "border-white/15"
      }`}
    >
      <PresetThumb src={thumbSrc} gradient={gradient} className="h-9 w-9" />
      <span className="flex-1">{label}</span>
      {active && <CheckIcon className="w-4 h-4" />}
    </button>
  );
}
