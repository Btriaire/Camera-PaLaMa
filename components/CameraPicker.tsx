"use client";

import { PRESETS } from "@/lib/presets";
import { HudSkin } from "@/lib/types";
import { BackIcon, CheckIcon } from "@/components/Icons";

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
  activePresetId,
  onSelect,
  onClose,
}: {
  activePresetId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) {
  const vintage = PRESETS.filter((p) => p.category === "vintage");
  const modern = PRESETS.filter((p) => p.category === "modern");

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
          className={`mb-4 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left ${
            activePresetId === null ? "border-white bg-white/10" : "border-white/15"
          }`}
        >
          <div>
            <div className="text-sm font-semibold">Naturel</div>
            <div className="text-xs text-white/40">Aucun style, l&apos;image brute</div>
          </div>
          {activePresetId === null && <CheckIcon />}
        </button>

        <Section title="Pellicule &amp; caméras">
          {vintage.map((p) => (
            <Card key={p.id} active={activePresetId === p.id} onClick={() => onSelect(p.id)}>
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
            </Card>
          ))}
        </Section>

        <Section title="Filtres modernes">
          {modern.map((p) => (
            <Card key={p.id} active={activePresetId === p.id} onClick={() => onSelect(p.id)}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{p.label}</div>
                {activePresetId === p.id && <CheckIcon className="w-4 h-4" />}
              </div>
              <div className="mt-0.5 text-xs text-white/40">{p.blurb}</div>
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
      className={`rounded-2xl border px-4 py-3 text-left ${active ? "border-white bg-white/10" : "border-white/15"}`}
    >
      {children}
    </button>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-white/10 px-2 py-0.5">{children}</span>;
}
