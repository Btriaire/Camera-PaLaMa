"use client";

import { useState } from "react";
import { PRESETS, PRO_SCENE_PRESETS, VINTAGE_PRESETS, CURIOUS_PRESETS, MODERN_PRESETS } from "@/lib/presets";
import { HudSkin } from "@/lib/types";
import { useCamera } from "@/lib/useCamera";
import { NATURAL_KEY, usePresetThumbnails } from "@/lib/usePresetThumbnails";
import { BackIcon, CheckIcon } from "@/components/Icons";
import PresetThumb, { NATURAL_GRADIENT, PresetBeforeAfter, swatchGradient } from "@/components/PresetThumb";
import { FilmCanister35mm } from "@/components/FilmCanister";

const HUD_LABEL: Record<HudSkin, string> = {
  film: "Pellicule 35mm",
  cinema: "Cinéma Numérique",
  camcorder: "Caméscope VHS",
  cctv: "Vidéosurveillance",
  modern: "Capteur Moderne",
  dashcam: "Dashcam Pro",
  doorbell: "Interphone Connecté",
  webcam: "Webcam Y2K",
  leica: "Télémètre Leica M",
  hasselblad: "Moyen Format 6×6",
  rolleiflex: "Rolleiflex TLR 6×6",
  polaroid: "Polaroid SX-70 Instant",
  gameboy: "Game Boy 128×112 LCD",
  mavica: "Sony Mavica Disquette 3.5\"",
  arriflex: "Arriflex 35 BL Cinéma",
  "sony-alpha": "Sony α1 / A7R V Pro",
  "canon-eos": "Canon Cinema EOS R5 C",
  "red-cinema": "RED V-RAPTOR 8K VV",
  "arri-alexa": "ARRI ALEXA 35 LogC4",
  digicam: "Digicam CCD Y2K",
  xpan: "Panoramique XPan 65:24",
  pro: "Visée Pro Mirrorless",
  thermal: "Vision Thermique FLIR",
  nvg: "Vision Nocturne PVS-14",
  glitch: "Signal VHS Glitch",
  linhof: "Linhof 4×5 Grand Format",
  contax: "Contax T2 Carl Zeiss",
  mamiya: "Mamiya RB67 Pro 6×7",
  nikon: "Nikon F3 HP NASA",
  holga: "Holga 120N Toy Camera",
  olympus: "Olympus Pen F Demi-Format",
};

type TabFilter = "all" | "films" | "bw" | "cinema" | "medium" | "pro-scenes" | "macro" | "curious" | "modern";

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
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  const bwPresets = PRESETS.filter((p) => p.adjustments.monochrome && p.adjustments.monochrome > 50);
  const cinemaPresets = PRESETS.filter((p) => p.id.includes("vision3") || p.id.includes("eterna") || p.id.includes("cinestill") || p.id.includes("arriflex") || p.id.includes("red-raptor") || p.id.includes("arri-alexa"));
  const mediumFormatPresets = PRESETS.filter((p) => p.id.includes("hasselblad") || p.id.includes("rolleiflex") || p.id.includes("polaroid") || p.id.includes("xpan") || p.id.includes("leica") || p.id.includes("linhof") || p.id.includes("contax") || p.id.includes("mamiya") || p.id.includes("nikon") || p.id.includes("holga") || p.id.includes("olympus"));
  const macroPresets = PRESETS.filter((p) => p.id.startsWith("macro-") || p.id === "macro-ultra");
  const filmPresets = PRESETS.filter((p) => p.category === "vintage" && !bwPresets.some(b => b.id === p.id) && !cinemaPresets.some(c => c.id === p.id) && !mediumFormatPresets.some(m => m.id === p.id));
  const proScenes = PRO_SCENE_PRESETS.filter((p) => !macroPresets.some(m => m.id === p.id));
  const curious = CURIOUS_PRESETS;
  const modern = MODERN_PRESETS;

  const thumbs = usePresetThumbnails(camera?.videoRef.current ?? photoSource ?? null);

  return (
    <div className="flex flex-col h-dvh bg-zinc-950 text-white">
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-white/10"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button onClick={onClose} aria-label="Retour" className="p-1.5 text-white/70 hover:text-white transition-colors">
          <BackIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-bold tracking-tight">Pelliculothèque &amp; Boîtiers Mythiques</h1>
          <p className="text-[11px] text-white/50">{PRESETS.length} émulsions réelles, histoires &amp; caméras légendaires</p>
        </div>
      </div>

      {/* Fast Tab Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2.5 border-b border-white/10 bg-zinc-900/60 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TabButton active={activeTab === "all"} onClick={() => setActiveTab("all")}>
          Tous ({PRESETS.length})
        </TabButton>
        <TabButton active={activeTab === "films"} onClick={() => setActiveTab("films")} accent="text-amber-400 border-amber-400/40">
          Pellicules Couleur ({filmPresets.length})
        </TabButton>
        <TabButton active={activeTab === "bw"} onClick={() => setActiveTab("bw")} accent="text-zinc-300 border-zinc-500/40">
          Noir &amp; Blanc ({bwPresets.length})
        </TabButton>
        <TabButton active={activeTab === "cinema"} onClick={() => setActiveTab("cinema")} accent="text-cyan-400 border-cyan-400/40">
          Cinéma 35mm ({cinemaPresets.length})
        </TabButton>
        <TabButton active={activeTab === "medium"} onClick={() => setActiveTab("medium")} accent="text-emerald-400 border-emerald-400/40">
          Moyen Format &amp; Mythiques ({mediumFormatPresets.length})
        </TabButton>
        <TabButton active={activeTab === "pro-scenes"} onClick={() => setActiveTab("pro-scenes")} accent="text-sky-400 border-sky-400/40">
          Boîtiers Pro Modernes ({proScenes.length})
        </TabButton>
        <TabButton active={activeTab === "macro"} onClick={() => setActiveTab("macro")} accent="text-emerald-300 border-emerald-300/40">
          Macro ({macroPresets.length})
        </TabButton>
        <TabButton active={activeTab === "curious"} onClick={() => setActiveTab("curious")} accent="text-purple-400 border-purple-400/40">
          Curieux ({curious.length})
        </TabButton>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {activeTab === "all" && (
          <Card active={activePresetId === null} onClick={() => onSelect(null)} className="mb-4">
            <div className="p-2.5 pb-1 bg-black/40 border-b border-white/10">
              <FilmCanister35mm preset={null} />
            </div>
            <div className="relative">
              <PresetThumb src={thumbs[NATURAL_KEY]} gradient={NATURAL_GRADIENT} className="h-28 w-full" />
              {activePresetId === null && <ActiveBadge />}
            </div>
            <div className="p-3">
              <div className="text-sm font-semibold">Capteur Neutre (RAW)</div>
              <div className="text-xs text-white/40">Aucun traitement, l&apos;image brute du capteur sans émulsion</div>
            </div>
          </Card>
        )}

        {/* Section Pellicules Couleur */}
        {(activeTab === "all" || activeTab === "films") && (
          <Section title="Pellicules Argentiques Couleur (Kodak, Fuji, Agfa)">
            {filmPresets.map((p) => (
              <PresetDetailCard
                key={p.id}
                preset={p}
                active={activePresetId === p.id}
                onSelect={() => onSelect(p.id)}
                naturalThumb={thumbs[NATURAL_KEY]}
                presetThumb={thumbs[p.id]}
              />
            ))}
          </Section>
        )}

        {/* Section Noir & Blanc */}
        {(activeTab === "all" || activeTab === "bw") && (
          <Section title="Noir &amp; Blanc Argentique Mythique (Tri-X, HP5, Acros, Verichrome)">
            {bwPresets.map((p) => (
              <PresetDetailCard
                key={p.id}
                preset={p}
                active={activePresetId === p.id}
                onSelect={() => onSelect(p.id)}
                naturalThumb={thumbs[NATURAL_KEY]}
                presetThumb={thumbs[p.id]}
              />
            ))}
          </Section>
        )}

        {/* Section Cinéma 35mm Hollywood & 70mm */}
        {(activeTab === "all" || activeTab === "cinema") && (
          <Section title="Cinéma 35mm Hollywood &amp; Émulsions ECN-2">
            {cinemaPresets.map((p) => (
              <PresetDetailCard
                key={p.id}
                preset={p}
                active={activePresetId === p.id}
                onSelect={() => onSelect(p.id)}
                naturalThumb={thumbs[NATURAL_KEY]}
                presetThumb={thumbs[p.id]}
              />
            ))}
          </Section>
        )}

        {/* Section Moyen Format & Boîtiers Mythiques */}
        {(activeTab === "all" || activeTab === "medium") && (
          <Section title="Moyen Format 120, Grand Format 4×5 &amp; Boîtiers Mythiques">
            {mediumFormatPresets.map((p) => (
              <PresetDetailCard
                key={p.id}
                preset={p}
                active={activePresetId === p.id}
                onSelect={() => onSelect(p.id)}
                naturalThumb={thumbs[NATURAL_KEY]}
                presetThumb={thumbs[p.id]}
              />
            ))}
          </Section>
        )}

        {/* Section Boîtiers Modernes Pro */}
        {(activeTab === "all" || activeTab === "pro-scenes") && (
          <Section title="Boîtiers Professionnels Modernes &amp; Cinéma RAW">
            {proScenes.map((p) => (
              <PresetDetailCard
                key={p.id}
                preset={p}
                active={activePresetId === p.id}
                onSelect={() => onSelect(p.id)}
                naturalThumb={thumbs[NATURAL_KEY]}
                presetThumb={thumbs[p.id]}
              />
            ))}
          </Section>
        )}

        {/* Section Macro & Micro-Détails */}
        {(activeTab === "all" || activeTab === "macro") && (
          <Section title="Macro &amp; Micro-Détails (Optiques Rapprochées &amp; Textures)">
            {macroPresets.map((p) => (
              <PresetDetailCard
                key={p.id}
                preset={p}
                active={activePresetId === p.id}
                onSelect={() => onSelect(p.id)}
                naturalThumb={thumbs[NATURAL_KEY]}
                presetThumb={thumbs[p.id]}
              />
            ))}
          </Section>
        )}

        {/* Section Filtres Curieux & Bizarres */}
        {(activeTab === "all" || activeTab === "curious") && (
          <Section title="Filtres Curieux &amp; Bizarres (Expérimental)">
            {curious.map((p) => (
              <PresetDetailCard
                key={p.id}
                preset={p}
                active={activePresetId === p.id}
                onSelect={() => onSelect(p.id)}
                naturalThumb={thumbs[NATURAL_KEY]}
                presetThumb={thumbs[p.id]}
              />
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

function PresetDetailCard({
  preset: p,
  active,
  onSelect,
  naturalThumb,
  presetThumb,
}: {
  preset: any;
  active: boolean;
  onSelect: () => void;
  naturalThumb?: string;
  presetThumb?: string;
}) {
  return (
    <Card active={active} onClick={onSelect}>
      <div className="p-2.5 pb-1 bg-black/40 border-b border-white/10 flex items-center justify-between">
        <FilmCanister35mm preset={p} />
        {p.brand && (
          <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-400/15 px-2 py-0.5 rounded-full border border-amber-400/30">
            {p.brand}
          </span>
        )}
      </div>
      <div className="relative">
        <PresetBeforeAfter
          beforeSrc={naturalThumb}
          afterSrc={presetThumb}
          gradient={swatchGradient(p)}
          className="h-32 w-full"
        />
        {active && <ActiveBadge />}
      </div>
      <div className="p-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-amber-300">{p.label}</div>
          {p.era && <span className="text-[10px] font-mono text-white/50">{p.era}</span>}
        </div>
        
        <div className="text-xs text-white/80 leading-relaxed">{p.blurb}</div>

        {/* History & Origin */}
        {p.history && (
          <div className="mt-1 rounded-xl bg-black/40 p-2.5 border border-white/10 text-[11px] text-white/70 leading-normal">
            <span className="block text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider mb-1">
              Histoire &amp; Genèse
            </span>
            {p.history}
          </div>
        )}

        {/* Use Case & Famous Artists */}
        <div className="flex flex-col gap-1.5 pt-1 border-t border-white/10 text-[10px]">
          {p.useCase && (
            <div className="flex items-baseline gap-1.5 text-emerald-300">
              <span className="font-mono font-bold uppercase text-emerald-400 text-[9px] shrink-0">Usage idéal :</span>
              <span className="text-white/80">{p.useCase}</span>
            </div>
          )}

          {p.famousArtists && p.famousArtists.length > 0 && (
            <div className="flex items-baseline gap-1.5 flex-wrap text-cyan-300">
              <span className="font-mono font-bold uppercase text-cyan-400 text-[9px] shrink-0">Artistes &amp; Réalisateurs :</span>
              <div className="flex flex-wrap gap-1">
                {p.famousArtists.map((artist: string, idx: number) => (
                  <span key={idx} className="bg-cyan-950/60 text-cyan-200 px-1.5 py-0.2 rounded border border-cyan-500/30">
                    {artist}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Technical Specs Tags */}
        <div className="mt-1 flex flex-wrap gap-1.5 text-[9.5px] text-white/60 pt-1 border-t border-white/5">
          <Tag>{HUD_LABEL[p.hud as HudSkin] ?? p.hud}</Tag>
          {p.iso && <Tag>ISO {p.iso}</Tag>}
          {p.kelvin && <Tag>{p.kelvin}K</Tag>}
          {p.aspectRatio && <Tag>{p.aspectRatio}</Tag>}
        </div>
      </div>
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  accent,
  children,
}: {
  active: boolean;
  onClick: () => void;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
        active
          ? "bg-white text-black shadow-md scale-105"
          : `bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white ${accent ?? ""}`
      }`}
    >
      {children}
    </button>
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
