"use client";

import { HudSkin, Preset } from "@/lib/types";

// The on-screen readouts a real camera viewfinder overlays on the image —
// four cosplay skins tied to a preset's `hud` field (film SLR, cinema
// digital, camcorder, CCTV) plus "modern", which shows nothing but the
// grid: a contemporary filter isn't standing in for a specific old device,
// so it doesn't get one.
//
// Every number here is genuinely live: resolution/fps from the active
// track, zoom, battery, the clock, and now ISO/white-balance too, which
// start at a preset's real film-stock rating (see lib/presets.ts) but
// track whatever the viewfinder's ISO/K dials are actually set to —
// nothing here is invented to look more "pro".
export default function Hud({
  skin,
  preset,
  resolution,
  fps,
  zoom,
  showGrid,
  evBias,
  iso,
  kelvin,
  shotCount,
  elapsedSeconds,
  batteryLevel,
  now,
}: {
  skin: HudSkin;
  preset: Preset | null;
  resolution: { width: number; height: number } | null;
  fps: number | null;
  zoom: number;
  showGrid: boolean;
  evBias: number;
  iso: number;
  kelvin: number;
  shotCount: number;
  elapsedSeconds: number;
  batteryLevel: number | null;
  now: string;
}) {
  const mono = "font-mono tabular-nums";
  const battery = batteryLevel !== null ? `${Math.round(batteryLevel * 100)}%` : null;
  const clock = formatClock(elapsedSeconds);
  // The top-bar icons (gallery/settings, timer/grid/flash) sit at
  // max(0.75rem, safe-area-inset-top) plus their own ~3rem height (see
  // Viewfinder.tsx) -- a plain "top-16" here ignored the safe-area part, so
  // on any phone with a tall inset (notch/Dynamic Island/punch-hole) these
  // badges crept up underneath those icons instead of sitting below them.
  const topInset = "max(0.75rem, env(safe-area-inset-top)) + 3rem";

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {showGrid && <Grid />}

      {skin === "film" && (
        <>
          <div
            className={`absolute left-3 flex items-center gap-2 text-[11px] text-white/70 ${mono}`}
            style={{ top: `calc(${topInset})` }}
          >
            <Badge>ISO {iso}</Badge>
            {preset?.era && <Badge>{preset.era}</Badge>}
          </div>
          {battery && (
            <div
              className={`absolute right-3 text-[11px] text-white/70 ${mono}`}
              style={{ top: `calc(${topInset})` }}
            >
              {battery}
            </div>
          )}
          <Reticle />
          <div className="absolute bottom-[168px] left-0 right-0 flex flex-col items-center gap-1">
            <EvScale value={evBias} />
            <div className={`flex items-center gap-3 text-[10px] text-white/50 ${mono}`}>
              <span>{kelvin}K</span>
              <span>×{zoom.toFixed(1)}</span>
              <span>N°{shotCount}</span>
            </div>
          </div>
        </>
      )}

      {skin === "cinema" && (
        <>
          <div
            className={`absolute left-3 flex flex-col gap-0.5 text-[11px] text-white/70 ${mono}`}
            style={{ top: `calc(${topInset})` }}
          >
            <Badge>
              {resolution ? `${resolution.width}×${resolution.height}` : "—"} {fps ? `${Math.round(fps)}fps` : ""}
            </Badge>
            {preset && <Badge>{preset.label}</Badge>}
          </div>
          {battery && (
            <div
              className={`absolute right-3 text-[11px] text-white/70 ${mono}`}
              style={{ top: `calc(${topInset})` }}
            >
              {battery}
            </div>
          )}
          <Reticle circular />
          <div className={`absolute bottom-[168px] left-0 right-0 flex items-center justify-center gap-4 text-[11px] text-white/60 ${mono}`}>
            <span>ISO {iso}</span>
            <span>{kelvin}K</span>
            <span>{clock}</span>
          </div>
        </>
      )}

      {skin === "camcorder" && (
        <>
          <div
            className={`absolute left-3 flex items-center gap-2 text-[11px] text-white/70 ${mono}`}
            style={{ top: `calc(${topInset})` }}
          >
            <span className="flex items-center gap-1 text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" /> LIVE
            </span>
            <span>{clock}</span>
          </div>
          <div
            className={`absolute right-3 text-[11px] text-white/70 ${mono}`}
            style={{ top: `calc(${topInset})` }}
          >
            {resolution ? `${resolution.width}×${resolution.height}` : "—"} {fps ? `${Math.round(fps)}fps` : ""}
          </div>
          <Reticle thin />
          <div className={`absolute bottom-[168px] left-0 right-0 flex items-center justify-center gap-4 text-[11px] text-white/60 ${mono}`}>
            <span>ISO {iso}</span>
            <span>WB {kelvin}K</span>
            <EvScale value={evBias} compact />
          </div>
        </>
      )}

      {skin === "cctv" && (
        <>
          <CornerBrackets />
          <div
            className={`absolute left-4 text-[11px] text-green-400/80 ${mono}`}
            style={{ top: `calc(${topInset})` }}
          >
            CAM 01
          </div>
          <div
            className={`absolute right-4 text-[11px] text-green-400/80 ${mono}`}
            style={{ top: `calc(${topInset})` }}
          >
            {now}
          </div>
          <div
            className="absolute left-4 flex items-center gap-1 text-[11px] text-red-400/80"
            style={{ top: `calc(${topInset} + 18px)` }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-red-400/80 animate-pulse" /> REC
          </div>
          <div className={`absolute bottom-[168px] left-0 right-0 text-center text-[10px] text-green-400/50 ${mono}`}>
            {resolution ? `${resolution.width}x${resolution.height}` : "—"}
          </div>
        </>
      )}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-black/40 px-1.5 py-0.5">{children}</span>;
}

function Reticle({ circular, thin }: { circular?: boolean; thin?: boolean }) {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      {circular ? (
        <div className="h-14 w-14 rounded-full border border-white/40" />
      ) : (
        <div className={`relative h-10 w-10 ${thin ? "opacity-50" : "opacity-70"}`}>
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white" />
          <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-white" />
        </div>
      )}
    </div>
  );
}

function CornerBrackets() {
  const corner = "absolute h-5 w-5 border-green-400/60";
  return (
    <>
      <div className={`${corner} left-4 top-4 border-l-2 border-t-2`} />
      <div className={`${corner} right-4 top-4 border-r-2 border-t-2`} />
      <div className={`${corner} left-4 bottom-4 border-l-2 border-b-2`} />
      <div className={`${corner} right-4 bottom-4 border-r-2 border-b-2`} />
    </>
  );
}

function EvScale({ value, compact }: { value: number; compact?: boolean }) {
  const ticks = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];
  return (
    <div className="flex items-center gap-1">
      {!compact && <span className="text-[10px] text-white/40 mr-1">EV</span>}
      {ticks.map((t) => (
        <div
          key={t}
          className={`w-px ${t === 0 ? "h-3 bg-white/70" : "h-1.5 bg-white/30"} ${
            Math.abs(t - value) < 0.25 ? "!bg-yellow-400 !h-3" : ""
          }`}
        />
      ))}
      <span className="text-[10px] text-white/50 ml-1 font-mono tabular-nums">
        {value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)}
      </span>
    </div>
  );
}

function Grid() {
  return (
    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="border border-white/15" />
      ))}
    </div>
  );
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

