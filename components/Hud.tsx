"use client";

import { HudSkin, Preset } from "@/lib/types";

// The on-screen readouts a real camera viewfinder overlays on the image —
// cosplay skins tied to a preset's `hud` field (film SLR, cinema digital,
// camcorder, CCTV, and today's equivalents: dashcam, video doorbell,
// video-call webcam) plus "modern", which shows nothing but the grid: a
// contemporary filter isn't standing in for a specific device, so it
// doesn't get one.
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

      {skin === "dashcam" && (
        <>
          <div
            className={`absolute left-3 flex items-center gap-1.5 text-[11px] text-white/80 ${mono}`}
            style={{ top: `calc(${topInset})` }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> REC
          </div>
          <div
            className={`absolute right-3 text-[11px] text-white/70 ${mono}`}
            style={{ top: `calc(${topInset})` }}
          >
            {resolution ? `${resolution.width}×${resolution.height}` : "—"} {fps ? `${Math.round(fps)}fps` : ""}
          </div>
          <div className={`absolute bottom-[168px] left-3 rounded bg-black/55 px-1.5 py-0.5 text-[11px] text-white/85 ${mono}`}>
            {now}
          </div>
          <div className={`absolute bottom-[168px] right-3 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white/50 ${mono}`}>
            CH1
          </div>
        </>
      )}

      {skin === "doorbell" && (
        <>
          <div
            className="absolute left-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur"
            style={{ top: `calc(${topInset})` }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
          </div>
          {battery && (
            <div
              className="absolute right-3 rounded-full bg-black/40 px-2.5 py-1 text-[11px] text-white/80 backdrop-blur"
              style={{ top: `calc(${topInset})` }}
            >
              {battery}
            </div>
          )}
          <div className="absolute bottom-[168px] left-0 right-0 flex justify-center">
            <div className={`rounded-full bg-black/55 px-3 py-1.5 text-[11px] text-white/85 backdrop-blur ${mono}`}>
              Entrée principale · {now}
            </div>
          </div>
        </>
      )}

      {skin === "webcam" && (
        <>
          <div
            className={`absolute left-3 flex items-center gap-1.5 text-[11px] text-white/70 ${mono}`}
            style={{ top: `calc(${topInset})` }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> {clock}
          </div>
          <div className="absolute bottom-[168px] left-3 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white">
            Vous
          </div>
        </>
      )}

      {skin === "leica" && (
        <>
          {/* Framelines 35mm / 50mm */}
          <div className="absolute inset-8 md:inset-12 border border-white/35 pointer-events-none">
            <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white/80" />
            <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white/80" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white/80" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white/80" />
          </div>

          {/* Central Rangefinder Patch */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-12 border border-amber-300/40 bg-amber-400/5 rounded-xs flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
          </div>

          <div
            className={`absolute left-3 flex items-center gap-2 text-[11px] text-white/80 ${mono}`}
            style={{ top: `calc(${topInset})` }}
          >
            <span className="h-2 w-2 rounded-full bg-red-600 inline-block mr-0.5" />
            <span className="font-semibold tracking-wider">LEICA M</span>
            <Badge>ISO {iso}</Badge>
          </div>

          {battery && (
            <div
              className={`absolute right-3 text-[11px] text-white/70 ${mono}`}
              style={{ top: `calc(${topInset})` }}
            >
              {battery}
            </div>
          )}

          <div className={`absolute bottom-[168px] left-0 right-0 flex items-center justify-center gap-6 text-[12px] font-bold text-red-500 tracking-widest ${mono}`}>
            <span>1/500</span>
            <span>F2.0</span>
            <span className="text-white/60 font-normal text-[10px]">EXP {shotCount}</span>
            <span className="text-amber-400 font-mono text-[10px]">{evBias >= 0 ? `+${evBias}` : evBias} EV</span>
          </div>
        </>
      )}

      {skin === "hasselblad" && (
        <>
          <div className="absolute inset-4 md:inset-8 border border-white/20">
            <div className="absolute top-1/3 left-0 right-0 border-t border-white/15" />
            <div className="absolute top-2/3 left-0 right-0 border-t border-white/15" />
            <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/15" />
            <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/15" />
            <Reticle />
          </div>

          <div
            className={`absolute left-3 flex items-center gap-2 text-[11px] text-white/70 ${mono}`}
            style={{ top: `calc(${topInset})` }}
          >
            <Badge>HASSELBLAD 6×6</Badge>
            <Badge>ISO {iso}</Badge>
          </div>

          <div className={`absolute bottom-[168px] left-0 right-0 flex items-center justify-center gap-4 text-[11px] text-white/60 ${mono}`}>
            <span>PLANAR 80mm</span>
            <span>1/250s</span>
            <span>f/2.8</span>
            <span>FRAME {shotCount}/12</span>
          </div>
        </>
      )}

      {skin === "digicam" && (
        <>
          <div
            className={`absolute left-3 flex flex-col gap-1 text-[11px] font-bold text-amber-400 drop-shadow-sm ${mono}`}
            style={{ top: `calc(${topInset})` }}
          >
            <div className="flex items-center gap-1.5">
              <span className="px-1 py-0.5 bg-amber-400 text-black text-[9px] rounded font-extrabold">STBY</span>
              <span>FINE</span>
              <span>[{shotCount}]</span>
            </div>
            <span className="text-[10px] text-white/80">640×480 CCD</span>
          </div>

          <div
            className={`absolute right-3 text-right text-[11px] text-amber-400 ${mono}`}
            style={{ top: `calc(${topInset})` }}
          >
            <div>BATTERY [■■■□]</div>
            <div className="text-[10px] text-white/80">MS PRO DUO</div>
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-emerald-400/70 rounded-xs flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-emerald-400/80" />
          </div>
        </>
      )}

      {skin === "xpan" && (
        <>
          <div className={`absolute left-3 flex items-center gap-2 text-[11px] text-white/80 ${mono}`} style={{ top: `calc(${topInset})` }}>
            <Badge>XPAN 65:24</Badge>
            <Badge>45mm F4</Badge>
          </div>
          <Reticle thin />
          <div className={`absolute bottom-[168px] left-0 right-0 flex items-center justify-center gap-4 text-[11px] text-white/70 ${mono}`}>
            <span>PANORAMA 2.7:1</span>
            <span>EXP {shotCount}</span>
          </div>
        </>
      )}

      {skin === "pro" && (
        <>
          <div
            className={`absolute left-3 flex flex-col gap-1 text-[11px] text-white/85 ${mono}`}
            style={{ top: `calc(${topInset})` }}
          >
            <div className="flex items-center gap-1.5">
              <span className="px-1 bg-white text-black font-bold text-[9px] rounded">PRO</span>
              {resolution && <span>{resolution.width}×{resolution.height}</span>}
              {fps && <span>{Math.round(fps)}fps</span>}
            </div>
            <div className="text-[10px] text-white/60">
              {preset ? preset.label : "MANUAL"}
            </div>
          </div>

          {battery && (
            <div
              className={`absolute right-3 text-[11px] text-white/80 ${mono}`}
              style={{ top: `calc(${topInset})` }}
            >
              {battery}
            </div>
          )}

          <Reticle circular />

          <div className="absolute bottom-[168px] left-0 right-0 flex flex-col items-center gap-1.5">
            <EvScale value={evBias} />
            <div className={`flex items-center gap-4 text-[11px] text-white/75 ${mono}`}>
              <span>ISO {iso}</span>
              <span>{kelvin}K</span>
              <span>×{zoom.toFixed(1)}</span>
              <span>RAW+JPEG</span>
            </div>
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

