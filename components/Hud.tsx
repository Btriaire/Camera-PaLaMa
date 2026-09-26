"use client";

import { HudSkin, Preset } from "@/lib/types";
import { FilmCanisterBadge } from "@/components/FilmCanister";

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
            className={`absolute left-3 flex items-center gap-2 text-[11px] text-white/90 ${mono}`}
            style={{ top: `calc(${topInset})` }}
          >
            <FilmCanisterBadge preset={preset} />
            <Badge>EXP {shotCount}/36</Badge>
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

      {skin === "thermal" && (
        <>
          <Reticle circular />
          <div
            className={`absolute left-3 flex flex-col gap-1 text-[11px] font-mono text-orange-400 drop-shadow-[0_0_6px_rgba(249,115,22,0.6)] ${mono}`}
            style={{ top: `calc(${topInset})` }}
          >
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-orange-500 text-black text-[9px] font-black rounded">FLIR IR</span>
              <span className="text-white font-bold">SPOT 36.4°C</span>
            </div>
            <span className="text-[10px] text-orange-300/80">EMISSIVITY: 0.95</span>
          </div>

          <div
            className={`absolute right-3 flex flex-col items-end gap-1 text-[10px] font-mono text-orange-400 ${mono}`}
            style={{ top: `calc(${topInset})` }}
          >
            <span className="text-red-400 font-bold">MAX 42.8°C</span>
            <span className="text-cyan-400 font-bold">MIN 18.2°C</span>
          </div>

          {/* Right Thermal Gradient Scale */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
            <span className="text-[9px] font-mono text-red-400 font-bold">45°</span>
            <div className="w-2.5 h-32 rounded-full border border-white/20 bg-gradient-to-b from-red-500 via-yellow-400 via-emerald-400 to-blue-600" />
            <span className="text-[9px] font-mono text-blue-400 font-bold">15°</span>
          </div>

          <div className={`absolute bottom-[168px] left-0 right-0 flex items-center justify-center gap-4 text-[11px] text-orange-300/80 ${mono}`}>
            <span>IRONBOW PALETTE</span>
            <span>RAW CALIBRATED</span>
          </div>
        </>
      )}

      {skin === "nvg" && (
        <>
          {/* Circular NVG phosphor tube frame */}
          <div className="absolute inset-2 md:inset-6 rounded-full border-2 border-emerald-500/30 pointer-events-none shadow-[inset_0_0_60px_rgba(16,185,129,0.2)]" />
          <Reticle circular thin />

          <div
            className={`absolute left-4 flex flex-col gap-1 text-[11px] font-mono text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.7)] ${mono}`}
            style={{ top: `calc(${topInset})` }}
          >
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-emerald-500 text-black text-[9px] font-black rounded">PVS-14</span>
              <span className="font-bold">GEN-3 PINNACLE</span>
            </div>
            <span className="text-[10px] text-emerald-400/70">AUTOGATED / GAIN 100%</span>
          </div>

          <div
            className={`absolute right-4 text-[11px] font-mono text-emerald-400 text-right ${mono}`}
            style={{ top: `calc(${topInset})` }}
          >
            <div>IR ILLUM: ON</div>
            <div className="text-[10px] text-emerald-400/70">{battery ? `BATT ${battery}` : "BATT 3.6V"}</div>
          </div>

          <div className={`absolute bottom-[168px] left-0 right-0 flex items-center justify-center gap-5 text-[11px] font-mono text-emerald-400 tracking-wider ${mono}`}>
            <span>FOV 40°</span>
            <span>PHOSPHOR GREEN</span>
            <span>HD OMNI-VIII</span>
          </div>
        </>
      )}

      {skin === "glitch" && (
        <>
          <div
            className={`absolute left-4 flex flex-col gap-1 text-[12px] font-mono font-bold text-cyan-300 drop-shadow-[2px_0_0_rgba(255,0,0,0.8)] ${mono}`}
            style={{ top: `calc(${topInset})` }}
          >
            <div className="flex items-center gap-2">
              <span className="text-red-500 animate-pulse">REC</span>
              <span>SP 0:00:00</span>
            </div>
            <span className="text-[10px] text-yellow-300 tracking-widest">VHS HQ · AUTO TRACKING</span>
          </div>

          <div
            className={`absolute right-4 text-right text-[11px] font-mono font-bold text-cyan-300 drop-shadow-[2px_0_0_rgba(255,0,0,0.8)] ${mono}`}
            style={{ top: `calc(${topInset})` }}
          >
            <div>HI-FI STEREO</div>
            <div className="text-[10px] text-white/70">{now}</div>
          </div>

          <div className={`absolute bottom-[168px] left-4 right-4 flex items-center justify-between text-[11px] font-mono text-cyan-300/80 drop-shadow-[1px_0_0_rgba(255,0,0,0.7)] ${mono}`}>
            <span>CH 03</span>
            <span>PLAY &#9654;</span>
            <span>NORM 12dB</span>
          </div>
        </>
      )}

      {/* Rolleiflex 6x6 TLR Waist-Level Viewfinder */}
      {skin === "rolleiflex" && (
        <>
          <div className="absolute inset-4 md:inset-8 border-2 border-white/30 rounded-xs pointer-events-none">
            <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-white/20" />
            <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-white/20" />
            {/* Center Focus Ground Glass Red Ring */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-red-500/40 bg-red-500/5 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            </div>
          </div>
          <div className={`absolute left-3 flex items-center gap-2 text-[11px] text-white/90 ${mono}`} style={{ top: `calc(${topInset})` }}>
            <Badge>ROLLEIFLEX 2.8F</Badge>
            <Badge>120 FILM · EXP {shotCount}/12</Badge>
          </div>
          <div className={`absolute bottom-[168px] left-0 right-0 flex items-center justify-center gap-5 text-[11px] text-white/70 ${mono}`}>
            <span>SYNCHRO-COMPUR 1/250s</span>
            <span>ZEISS PLANAR 80mm F2.8</span>
            <span>ISO {iso}</span>
          </div>
        </>
      )}

      {/* Polaroid SX-70 Instant SLR */}
      {skin === "polaroid" && (
        <>
          <div className="absolute inset-4 md:inset-8 border border-white/25 rounded-xs pointer-events-none">
            {/* Split-Image Circle Rangefinder */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-amber-300/50 flex flex-col justify-center items-center">
              <div className="w-full h-px bg-amber-400/60" />
            </div>
          </div>
          <div className={`absolute left-3 flex items-center gap-1.5 text-[11px] text-white/90 ${mono}`} style={{ top: `calc(${topInset})` }}>
            <span className="flex h-3 w-8 rounded-xs overflow-hidden">
              <span className="w-1/5 bg-red-500" />
              <span className="w-1/5 bg-orange-500" />
              <span className="w-1/5 bg-yellow-400" />
              <span className="w-1/5 bg-emerald-500" />
              <span className="w-1/5 bg-blue-500" />
            </span>
            <Badge>SX-70 LAND CAMERA</Badge>
          </div>
          <div className={`absolute right-3 text-[11px] text-amber-300 font-bold ${mono}`} style={{ top: `calc(${topInset})` }}>
            <span>EJECT: [{10 - Math.min(10, shotCount)}/10]</span>
          </div>
          <div className={`absolute bottom-[168px] left-0 right-0 flex items-center justify-center gap-4 text-[11px] text-white/60 ${mono}`}>
            <span>SONAR AUTOFOCUS</span>
            <span>INSTANT FILM</span>
          </div>
        </>
      )}

      {/* Game Boy Camera 1998 2-Bit LCD */}
      {skin === "gameboy" && (
        <>
          <div className="absolute inset-2 border-4 border-[#306230] rounded-lg pointer-events-none shadow-[inset_0_0_20px_rgba(15,56,15,0.4)]" />
          <div className={`absolute left-4 top-16 text-[10px] font-mono text-[#8bac0f] font-black tracking-widest ${mono}`} style={{ top: `calc(${topInset})` }}>
            <div>GAME BOY CAMERA</div>
            <div className="text-[9px] text-[#9bbc0f]">128×112 4-SHADES</div>
          </div>
          <div className={`absolute right-4 top-16 text-right text-[10px] font-mono text-[#8bac0f] font-black ${mono}`} style={{ top: `calc(${topInset})` }}>
            <div>PAGE {shotCount}/30</div>
            <div className="text-[9px]">BATTERY: OK</div>
          </div>
          <div className={`absolute bottom-[168px] left-0 right-0 flex items-center justify-center gap-4 text-[11px] font-mono text-[#8bac0f] font-black ${mono}`}>
            <span className="bg-[#306230] text-[#9bbc0f] px-2 py-0.5 rounded">SHOOT</span>
            <span>ITEMS</span>
            <span>MAGIC</span>
            <span>CHECK</span>
          </div>
        </>
      )}

      {/* Sony Mavica MVC-FD7 3.5" Floppy Disk */}
      {skin === "mavica" && (
        <>
          <div className={`absolute left-3 flex flex-col gap-1 text-[11px] font-bold text-amber-400 ${mono}`} style={{ top: `calc(${topInset})` }}>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded">MAVICA</span>
              <span className="text-white">FD-7</span>
            </div>
            <span className="text-[10px] text-amber-300 animate-pulse">[DISK ACCESS READY]</span>
          </div>
          <div className={`absolute right-3 text-right text-[11px] text-amber-400 ${mono}`} style={{ top: `calc(${topInset})` }}>
            <div>3.5&quot; 2HD DISK</div>
            <div className="text-[10px] text-white/70">REMAIN: {40 - Math.min(40, shotCount * 2)} IMAGES</div>
          </div>
          <Reticle circular />
          <div className={`absolute bottom-[168px] left-0 right-0 flex items-center justify-center gap-4 text-[11px] text-amber-300 ${mono}`}>
            <span>10× OPTICAL ZOOM</span>
            <span>640×480 CCD</span>
            <span>ISO {iso}</span>
          </div>
        </>
      )}

      {/* Arriflex 35 BL Hollywood Motion Picture */}
      {skin === "arriflex" && (
        <>
          {/* Cinema 2.39:1 Anamorphic Framelines */}
          <div className="absolute inset-x-0 top-1/6 bottom-1/6 border-y-2 border-cyan-400/40 pointer-events-none">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] text-cyan-400 font-mono">2.39:1 SCOPE</div>
          </div>
          <div className={`absolute left-3 flex items-center gap-2 text-[11px] text-cyan-300 font-bold ${mono}`} style={{ top: `calc(${topInset})` }}>
            <Badge>ARRI 35 BL</Badge>
            <span className="text-red-500 animate-pulse font-mono">24.000 FPS SYNC</span>
          </div>
          <div className={`absolute right-3 text-[11px] text-cyan-300 font-mono text-right ${mono}`} style={{ top: `calc(${topInset})` }}>
            <div>MAG 400FT: {400 - (shotCount * 12)}FT</div>
            <div className="text-[10px] text-white/70">180.0° SHUTTER</div>
          </div>
          <Reticle thin />
          <div className={`absolute bottom-[168px] left-0 right-0 flex items-center justify-center gap-5 text-[11px] text-cyan-300/90 ${mono}`}>
            <span>KODAK 5219 500T</span>
            <span>T2.0 COOKE</span>
            <span>TC 01:24:18:04</span>
          </div>
        </>
      )}

      {/* Sony Alpha 1 / A7R V Pro Mirrorless */}
      {skin === "sony-alpha" && (
        <>
          {/* Real-time Eye AF green tracking brackets */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-emerald-400/60 rounded-xs pointer-events-none">
            <div className="absolute top-1/3 left-1/3 w-8 h-8 border-2 border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </div>
          <div className={`absolute left-3 flex items-center gap-2 text-[11px] text-white ${mono}`} style={{ top: `calc(${topInset})` }}>
            <span className="px-1.5 py-0.5 bg-orange-600 text-white font-black text-[9px] rounded">SONY α1</span>
            <Badge>AF-C [EYE-AF]</Badge>
            <Badge>CFexpress A [1]</Badge>
          </div>
          {battery && (
            <div className={`absolute right-3 text-[11px] text-emerald-400 font-bold ${mono}`} style={{ top: `calc(${topInset})` }}>
              <span>NP-FZ100 {battery}</span>
            </div>
          )}
          <div className={`absolute bottom-[168px] left-0 right-0 flex items-center justify-center gap-5 text-[11px] text-white/90 font-bold ${mono}`}>
            <span>1/8000s</span>
            <span>F1.4 GM</span>
            <span>ISO {iso}</span>
            <span>S-CINETONE</span>
            <span className="text-emerald-400 font-mono">{evBias >= 0 ? `+${evBias.toFixed(1)}` : evBias.toFixed(1)} MM</span>
          </div>
        </>
      )}

      {/* Canon EOS R5 C Cinema */}
      {skin === "canon-eos" && (
        <>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-20 border border-white/40 pointer-events-none flex items-center justify-center">
            <div className="w-12 h-8 border border-cyan-400/80 rounded-xs" />
          </div>
          <div className={`absolute left-3 flex items-center gap-2 text-[11px] text-white ${mono}`} style={{ top: `calc(${topInset})` }}>
            <span className="px-1.5 py-0.5 bg-red-600 text-white font-black text-[9px] rounded">CANON EOS</span>
            <Badge>DUAL PIXEL CMOS AF II</Badge>
          </div>
          <div className={`absolute right-3 text-[11px] text-white font-mono ${mono}`} style={{ top: `calc(${topInset})` }}>
            <div>C-LOG 3 / 8K RAW</div>
          </div>
          <div className={`absolute bottom-[168px] left-0 right-0 flex items-center justify-center gap-5 text-[11px] text-white/90 ${mono}`}>
            <span>RF 50mm F1.2 L</span>
            <span>1/1000</span>
            <span>ISO {iso}</span>
            <span>WB {kelvin}K</span>
          </div>
        </>
      )}

      {/* RED V-RAPTOR 8K VV Cinema */}
      {skin === "red-cinema" && (
        <>
          {/* Cinema Tally frame border */}
          <div className="absolute inset-1 border-2 border-red-600 pointer-events-none" />
          <div className={`absolute left-3 flex items-center gap-2 text-[11px] text-red-500 font-black ${mono}`} style={{ top: `calc(${topInset})` }}>
            <span className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] rounded">RED</span>
            <span>V-RAPTOR 8K VV</span>
            <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
          </div>
          <div className={`absolute right-3 text-[11px] text-white font-mono text-right ${mono}`} style={{ top: `calc(${topInset})` }}>
            <div className="text-red-500 font-bold">REDCODE RAW 8K</div>
            <div className="text-[10px] text-white/60">CFexpress 2TB [78%]</div>
          </div>
          <Reticle circular thin />
          <div className={`absolute bottom-[168px] left-0 right-0 flex items-center justify-center gap-5 text-[11px] text-white font-bold ${mono}`}>
            <span className="text-red-400">8K 120P</span>
            <span>1/240s</span>
            <span>ISO {iso}</span>
            <span>5600K</span>
            <span className="text-white/60">TC 02:15:44:19</span>
          </div>
        </>
      )}

      {/* ARRI ALEXA 35 LogC4 */}
      {skin === "arri-alexa" && (
        <>
          <div className={`absolute left-3 flex items-center gap-2 text-[11px] text-sky-400 font-bold ${mono}`} style={{ top: `calc(${topInset})` }}>
            <span className="px-1.5 py-0.5 bg-sky-500 text-black font-black text-[9px] rounded">ARRI</span>
            <span>ALEXA 35</span>
            <Badge>LogC4 REVEAL</Badge>
          </div>
          <div className={`absolute right-3 text-[11px] text-sky-400 font-mono text-right ${mono}`} style={{ top: `calc(${topInset})` }}>
            <div>ARRIRAW 4.6K</div>
            <div className="text-[10px] text-white/70">EI {iso} / 17 STOPS</div>
          </div>
          <Reticle circular thin />
          <div className={`absolute bottom-[168px] left-0 right-0 flex items-center justify-center gap-5 text-[11px] text-sky-300 font-bold ${mono}`}>
            <span>24.000 FPS</span>
            <span>180.0°</span>
            <span>T1.8 ARRI MASTER</span>
            <span>{kelvin}K +0.0CC</span>
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

