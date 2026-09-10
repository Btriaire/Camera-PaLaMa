"use client";

import { useEffect, useRef, useState } from "react";
import { CapturedPhoto, useCamera } from "@/lib/useCamera";
import { useBattery } from "@/lib/useBattery";
import { useClock } from "@/lib/useClock";
import { GLRenderer } from "@/lib/gl/renderer";
import { Adjustments, NEUTRAL_ADJUSTMENTS, SavedPhotoMeta } from "@/lib/types";
import { getPreset, PRESETS } from "@/lib/presets";
import { getSettings } from "@/lib/settings";
import { photoUrl } from "@/lib/storage";
import { useDeviceTilt } from "@/lib/useDeviceTilt";
import { burstIntervalMs, FLASH_MODES, FlashMode, isStrobing } from "@/lib/flashModes";
import Hud from "./Hud";
import CameraPicker from "./CameraPicker";
import Dashboard from "./Dashboard";
import BurstReview from "./BurstReview";
import Histogram from "./Histogram";
import LevelIndicator from "./LevelIndicator";
import ZoomSlider from "./ZoomSlider";
import {
  ApertureIcon,
  CameraIcon,
  CheckIcon,
  FlashIcon,
  FlipCameraIcon,
  GalleryGridIcon,
  GridIcon,
  ScreenFlashIcon,
  SettingsIcon,
  StrobeIcon,
  TimerIcon,
  ZebraIcon,
} from "@/components/Icons";

const PRESET_ORDER: (string | null)[] = [null, ...PRESETS.map((p) => p.id)];
const TIMER_STEPS = [0, 3, 10] as const;

// Real camera-dial steps, not a continuous slider -- ISO and white balance
// always click through fixed stops on an actual camera/light meter.
const ISO_STEPS = [50, 100, 200, 400, 800, 1600, 3200, 6400, 12800] as const;
const KELVIN_STEPS = [2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 9000, 10000] as const;

function nearestStepIndex(steps: readonly number[], value: number): number {
  let best = 0;
  let bestDiff = Infinity;
  steps.forEach((s, i) => {
    const diff = Math.abs(s - value);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  });
  return best;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Quick-tap zoom levels, the way a real camera app's 0.5/1/2/3 row works --
// always the device's actual min and max (so the full range stays reachable
// with one tap) plus whichever "round" focal lengths fall inside it.
const ZOOM_CANDIDATES = [0.5, 1, 2, 3, 5, 10];
function zoomPresets(min: number, max: number): number[] {
  const inRange = ZOOM_CANDIDATES.filter((v) => v >= min - 0.01 && v <= max + 0.01);
  return Array.from(new Set([min, ...inRange, max]))
    .sort((a, b) => a - b)
    .slice(0, 4);
}

function formatZoom(v: number): string {
  return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}×`;
}

function FlashModeIcon({ mode, className }: { mode: FlashMode; className: string }) {
  if (mode === "screen") return <ScreenFlashIcon className={className} />;
  if (mode === "strobe" || mode === "strobeFast") return <StrobeIcon className={className} />;
  return <FlashIcon className={className} off={mode === "off"} />;
}

// Live viewfinder: shows the camera feed through the same WebGL filter
// pipeline used for the final export, so the vintage-camera look you frame
// with is the look you get — no surprise after the shutter. The preview
// texture is capped at 1080 on its long edge for a smooth 60fps loop; the
// actual capture (see useCamera.capture) grabs a full independent still at
// the sensor's native resolution, unrelated to this preview's size.
//
// `camera` is created once by the parent (app/page.tsx) and passed down —
// this component must never call useCamera() itself. The <video>/<canvas>
// below stay mounted for the page's whole lifetime; every overlay (camera
// picker, dashboard) is drawn on top of this JSX, never a replacement of
// it, specifically so neither element (nor the MediaStream attached to the
// video) is ever torn down just because a screen was opened over it.
export default function Viewfinder({
  camera,
  active,
  presetId,
  onSelectPreset,
  onCapture,
  onOpenGallery,
  recentPhotos,
  pendingSaves,
  onOpenPhoto,
  onBurstSaved,
}: {
  camera: ReturnType<typeof useCamera>;
  active: boolean;
  presetId: string | null;
  onSelectPreset: (id: string | null) => void;
  onCapture: (bitmap: ImageBitmap, width: number, height: number, adjustments: Adjustments) => void;
  onOpenGallery: () => void;
  recentPhotos: SavedPhotoMeta[];
  pendingSaves: number;
  onOpenPhoto: (meta: SavedPhotoMeta) => void;
  onBurstSaved: (meta: SavedPhotoMeta) => void;
}) {
  const lastPhoto = recentPhotos[0] ?? null;
  const {
    videoRef,
    ready,
    error,
    capabilities,
    setTorch,
    zoom,
    setZoom,
    flip,
    trackSettings,
    capture,
    captureFast,
  } = camera;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<GLRenderer | null>(null);
  const rafRef = useRef<number | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [zebraEnabled, setZebraEnabled] = useState(false);
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [flashMenuOpen, setFlashMenuOpen] = useState(false);
  const [stayOnCapture, setStayOnCapture] = useState(false);
  const [evBias, setEvBias] = useState(0);
  const [isoIndex, setIsoIndex] = useState(() => nearestStepIndex(ISO_STEPS, getPreset(presetId)?.iso ?? 400));
  const [kelvinIndex, setKelvinIndex] = useState(() =>
    nearestStepIndex(KELVIN_STEPS, getPreset(presetId)?.kelvin ?? 5500)
  );
  const [shotCount, setShotCount] = useState(0);
  const [timerIndex, setTimerIndex] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const countdownTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeStart = useRef<number | null>(null);
  // Two-finger pinch-to-zoom on the canvas, tracked alongside the existing
  // single-finger swipe-to-change-preset gesture: activePointers holds
  // every finger currently down, pinchStart captures the distance/zoom at
  // the moment a second finger joins, and becamePinch suppresses the swipe
  // logic on release once a gesture has ever been a pinch (so lifting the
  // second finger first doesn't also fire a preset swap).
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);
  const becamePinch = useRef(false);
  const [zoomBadgeVisible, setZoomBadgeVisible] = useState(false);
  const zoomBadgeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstActive = useRef(false);
  const burstShots = useRef<CapturedPhoto[]>([]);
  const burstLoopPromise = useRef<Promise<void> | null>(null);
  const [burstCount, setBurstCount] = useState(0);
  const [burstReview, setBurstReview] = useState<CapturedPhoto[] | null>(null);
  const battery = useBattery();
  const { elapsedSeconds, now } = useClock();
  const tiltDeg = useDeviceTilt();

  const preset = getPreset(presetId);
  const baseAdjustments: Adjustments = { ...NEUTRAL_ADJUSTMENTS, ...preset?.adjustments };
  const isoValue = ISO_STEPS[isoIndex];
  const kelvinValue = KELVIN_STEPS[kelvinIndex];
  // ISO and white balance are camera-body settings, not film-specific --
  // but each film DOES have a native box speed / color balance (already on
  // Preset, previously used only as a HUD flavor badge), so switching
  // pellicule re-baselines the dials to that film's real rating, exactly
  // like loading a fresh roll. From there the user can push/pull like real
  // film processing: exposure nudges gently with ISO stops (grain climbs
  // faster, the actual signature of a high-ISO shot), and K rides the same
  // warm/cool axis a Lightroom-style temperature slider uses -- moving the
  // dial to a higher K number warms the image, not the literal color of a
  // higher-Kelvin light source.
  const isoStops = Math.log2(isoValue / 400);
  const isoExposureBias = isoStops * 8;
  const isoGrainBias = Math.max(0, isoStops) * 22;
  const kelvinTempBias = (kelvinValue - 5500) / 45;
  const adjustments: Adjustments = {
    ...baseAdjustments,
    exposure: clamp(baseAdjustments.exposure + evBias + isoExposureBias, -100, 100),
    grain: clamp(baseAdjustments.grain + isoGrainBias, 0, 100),
    temperature: clamp(baseAdjustments.temperature + kelvinTempBias, -100, 100),
  };
  const hudSkin = preset?.hud ?? "modern";
  const timerSeconds = TIMER_STEPS[timerIndex];

  useEffect(() => {
    setIsoIndex(nearestStepIndex(ISO_STEPS, getPreset(presetId)?.iso ?? 400));
    setKelvinIndex(nearestStepIndex(KELVIN_STEPS, getPreset(presetId)?.kelvin ?? 5500));
  }, [presetId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !ready || !active) return;

    try {
      rendererRef.current = new GLRenderer(canvas);
    } catch {
      return;
    }

    let seed = 0;
    const loop = () => {
      const renderer = rendererRef.current;
      if (renderer && video && video.readyState >= 2 && video.videoWidth > 0) {
        const scale = Math.min(1, 1080 / Math.max(video.videoWidth, video.videoHeight));
        const w = Math.round(video.videoWidth * scale);
        const h = Math.round(video.videoHeight * scale);
        renderer.uploadSource(video, w, h);
        renderer.render(adjustments, seed, zebraEnabled);
        seed += 0.016;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, active, presetId, evBias, isoIndex, kelvinIndex, zebraEnabled]);

  useEffect(() => {
    setShowGrid(getSettings().gridDefault);
    setStayOnCapture(getSettings().stayOnCapture);
    return () => {
      if (countdownTimeout.current) clearTimeout(countdownTimeout.current);
    };
  }, []);

  // "Torche" is the one mode that's a continuous light while framing, not
  // just something that fires at capture time -- keep the hardware torch
  // synced to it (and only it; strobe/screen modes drive the torch or the
  // screen flash themselves, right at capture time).
  useEffect(() => {
    setTorch(flashMode === "torch");
  }, [flashMode, setTorch]);

  // Flashes the "1.8×" readout on every zoom change (pinch or a chip tap)
  // and fades it back out after a beat, like the iPhone camera's zoom HUD.
  useEffect(() => {
    if (!capabilities.zoom) return;
    setZoomBadgeVisible(true);
    if (zoomBadgeTimeout.current) clearTimeout(zoomBadgeTimeout.current);
    zoomBadgeTimeout.current = setTimeout(() => setZoomBadgeVisible(false), 1200);
    return () => {
      if (zoomBadgeTimeout.current) clearTimeout(zoomBadgeTimeout.current);
    };
  }, [zoom, capabilities.zoom]);

  const captureOnce = async () => {
    setCapturing(true);
    // "Flash écran" needs the screen genuinely lit *while* the shot is
    // taken (it's the light source, for a front camera with no physical
    // flash) -- so it stays on through the capture, not a 150ms blink like
    // every other mode's after-the-fact shutter feedback.
    setFlash(true);
    if (flashMode !== "screen") setTimeout(() => setFlash(false), 150);
    else await new Promise((r) => setTimeout(r, 200));
    try {
      const shot = await capture();
      if (shot) {
        setShotCount((n) => n + 1);
        onCapture(shot.bitmap, shot.width, shot.height, adjustments);
      }
    } finally {
      setCapturing(false);
      if (flashMode === "screen") setFlash(false);
    }
  };

  // Recursive setTimeout chain kicked off from a click handler (never from
  // an effect body) — each tick's setState happens inside a timer callback,
  // the pattern React's docs actually recommend for "do something after a
  // delay," rather than modeling a stopwatch as derived render state.
  const armCountdown = (seconds: number) => {
    setCountdown(seconds);
    const tick = (remaining: number) => {
      countdownTimeout.current = setTimeout(() => {
        if (remaining <= 1) {
          setCountdown(null);
          captureOnce();
        } else {
          setCountdown(remaining - 1);
          tick(remaining - 1);
        }
      }, 1000);
    };
    tick(seconds);
  };

  const cancelCountdown = () => {
    if (countdownTimeout.current) clearTimeout(countdownTimeout.current);
    countdownTimeout.current = null;
    setCountdown(null);
  };

  // Burst mode: holding the shutter repeatedly calls capture() until
  // release. A quick tap still resolves to exactly one shot (the loop's
  // first capture) and goes straight to the editor as before; holding
  // longer collects several and opens BurstReview to pick which to keep.
  // In a strobe mode, the torch also toggles on/off once per shot, synced
  // to the same loop -- strobeFast just runs the whole loop at double speed.
  const runBurstLoop = async () => {
    setCapturing(true);
    const strobing = isStrobing(flashMode) && capabilities.torch;
    const interval = burstIntervalMs(flashMode);
    let strobeOn = false;
    try {
      while (burstActive.current) {
        if (strobing) {
          strobeOn = !strobeOn;
          setTorch(strobeOn);
        }
        const shot = await captureFast();
        if (shot) {
          burstShots.current.push(shot);
          setBurstCount(burstShots.current.length);
        }
        if (!burstActive.current) break;
        await new Promise((r) => setTimeout(r, interval));
      }
    } finally {
      if (strobing) setTorch(false);
      setCapturing(false);
    }
  };

  const cycleIso = (dir: 1 | -1) => setIsoIndex((i) => clamp(i + dir, 0, ISO_STEPS.length - 1));
  const cycleKelvin = (dir: 1 | -1) => setKelvinIndex((i) => clamp(i + dir, 0, KELVIN_STEPS.length - 1));

  const handleShutterDown = () => {
    if (countdown !== null || timerSeconds > 0 || capturing) return;
    burstActive.current = true;
    burstShots.current = [];
    setBurstCount(0);
    if (flashMode === "screen") setFlash(true);
    burstLoopPromise.current = runBurstLoop();
  };

  const handleShutterUp = async () => {
    if (countdown !== null) {
      cancelCountdown();
      return;
    }
    if (timerSeconds > 0) {
      armCountdown(timerSeconds);
      return;
    }
    if (!burstActive.current) return;
    burstActive.current = false;
    await burstLoopPromise.current;
    const shots = burstShots.current;
    burstShots.current = [];
    setBurstCount(0);
    if (shots.length === 1) {
      if (flashMode !== "screen") {
        setFlash(true);
        setTimeout(() => setFlash(false), 150);
      }
      setShotCount((n) => n + 1);
      onCapture(shots[0].bitmap, shots[0].width, shots[0].height, adjustments);
    } else if (shots.length > 1) {
      setShotCount((n) => n + shots.length);
      setBurstReview(shots);
    }
    if (flashMode === "screen") setFlash(false);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.current.size === 1) {
      swipeStart.current = e.clientX;
      becamePinch.current = false;
    } else if (activePointers.current.size === 2 && capabilities.zoom) {
      becamePinch.current = true;
      const [a, b] = Array.from(activePointers.current.values());
      pinchStart.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.current.size === 2 && pinchStart.current && capabilities.zoom) {
      const [a, b] = Array.from(activePointers.current.values());
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const scale = distance / Math.max(1, pinchStart.current.distance);
      setZoom(clamp(pinchStart.current.zoom * scale, capabilities.zoom.min, capabilities.zoom.max));
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) pinchStart.current = null;
    if (activePointers.current.size > 0) return;

    if (!becamePinch.current && swipeStart.current !== null) {
      const delta = e.clientX - swipeStart.current;
      if (Math.abs(delta) >= 70) {
        const currentIndex = PRESET_ORDER.indexOf(presetId);
        const nextIndex =
          delta < 0
            ? Math.min(PRESET_ORDER.length - 1, currentIndex + 1)
            : Math.max(0, currentIndex - 1);
        if (nextIndex !== currentIndex) onSelectPreset(PRESET_ORDER[nextIndex]);
      }
    }
    swipeStart.current = null;
    becamePinch.current = false;
  };

  return (
    <div className="relative flex-1 h-dvh bg-black overflow-hidden">
      <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover opacity-0" />
      <canvas
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        className="absolute inset-0 h-full w-full object-cover touch-none"
      />

      <Hud
        skin={hudSkin}
        preset={preset}
        resolution={
          trackSettings.width && trackSettings.height
            ? { width: trackSettings.width, height: trackSettings.height }
            : null
        }
        fps={trackSettings.frameRate}
        zoom={zoom}
        showGrid={showGrid}
        evBias={evBias}
        iso={isoValue}
        kelvin={kelvinValue}
        shotCount={shotCount}
        elapsedSeconds={elapsedSeconds}
        batteryLevel={battery}
        now={now}
      />

      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2"
        style={{ top: "calc(max(0.75rem, env(safe-area-inset-top)) + 3rem)" }}
      >
        <Histogram canvasRef={canvasRef} />
      </div>

      <LevelIndicator tiltDeg={tiltDeg} />

      <div
        className={`absolute inset-0 z-30 bg-white pointer-events-none transition-opacity duration-150 ${
          flash ? "opacity-80" : "opacity-0"
        }`}
      />

      {countdown !== null && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30">
          <span className="text-8xl font-light text-white/90 tabular-nums">{countdown}</span>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-white/70">
          {error}
        </div>
      )}

      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-3">
          <button onClick={onOpenGallery} aria-label="Galerie" className="p-1 text-white drop-shadow-lg">
            <GalleryGridIcon className="w-9 h-9" />
          </button>
          <button
            onClick={() => setDashboardOpen(true)}
            aria-label="Tableau de bord"
            className="p-1 text-white drop-shadow-lg"
          >
            <SettingsIcon className="w-9 h-9" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setTimerIndex((i) => (i + 1) % TIMER_STEPS.length)}
            aria-label="Retardateur"
            className={`relative p-1 drop-shadow-lg ${timerSeconds > 0 ? "text-amber-300" : "text-white"}`}
          >
            <TimerIcon className="w-9 h-9" />
            {timerSeconds > 0 && (
              <span className="absolute -bottom-0.5 -right-0.5 text-[11px] font-bold leading-none">
                {timerSeconds}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowGrid((g) => !g)}
            aria-label="Grille"
            className={`p-1 drop-shadow-lg ${showGrid ? "text-amber-300" : "text-white"}`}
          >
            <GridIcon className="w-9 h-9" />
          </button>
          <button
            onClick={() => setZebraEnabled((z) => !z)}
            aria-label="Alerte de surexposition (zébrures)"
            className={`p-1 drop-shadow-lg ${zebraEnabled ? "text-amber-300" : "text-white"}`}
          >
            <ZebraIcon className="w-9 h-9" />
          </button>
          <button
            onClick={() => setFlashMenuOpen((v) => !v)}
            aria-label="Mode flash"
            className={`p-1 drop-shadow-lg ${flashMode !== "off" ? "text-amber-300" : "text-white"}`}
          >
            <FlashModeIcon mode={flashMode} className="w-9 h-9" />
          </button>
          {capabilities.canSwitch && (
            <button onClick={flip} aria-label="Changer de caméra" className="p-1 text-white drop-shadow-lg">
              <FlipCameraIcon className="w-9 h-9" />
            </button>
          )}
        </div>
      </div>

      {flashMenuOpen && (
        <>
          <button className="fixed inset-0 z-30" aria-label="Fermer le menu flash" onClick={() => setFlashMenuOpen(false)} />
          <div
            className="absolute right-4 z-40 w-72 rounded-2xl border border-white/15 bg-zinc-950/95 p-2 backdrop-blur"
            style={{ top: "calc(max(0.75rem, env(safe-area-inset-top)) + 3.25rem)" }}
          >
            {FLASH_MODES.filter((m) => !m.needsTorch || capabilities.torch).map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setFlashMode(m.id);
                  setFlashMenuOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${
                  flashMode === m.id ? "bg-white/10" : ""
                }`}
              >
                <FlashModeIcon mode={m.id} className="h-5 w-5 shrink-0 text-white" />
                <span className="flex-1">
                  <span className="block text-sm font-medium text-white">{m.label}</span>
                  <span className="block text-[11px] leading-tight text-white/40">{m.blurb}</span>
                </span>
                {flashMode === m.id && <CheckIcon className="h-4 w-4 shrink-0 text-white" />}
              </button>
            ))}
          </div>
        </>
      )}

      {capabilities.zoom && (
        <div className="absolute right-16 top-1/2 -translate-y-1/2">
          <ZoomSlider
            min={capabilities.zoom.min}
            max={capabilities.zoom.max}
            step={capabilities.zoom.step}
            value={zoom}
            onChange={setZoom}
          />
        </div>
      )}

      {capabilities.zoom && (
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-full bg-black/40 px-1.5 py-2 backdrop-blur">
          {zoomPresets(capabilities.zoom.min, capabilities.zoom.max)
            .slice()
            .reverse()
            .map((level) => (
              <button
                key={level}
                onClick={() => setZoom(level)}
                aria-label={`Zoom ${formatZoom(level)}`}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-mono tabular-nums transition-colors ${
                  Math.abs(zoom - level) < 0.05 ? "bg-white text-black font-semibold" : "text-white/80"
                }`}
              >
                {formatZoom(level)}
              </button>
            ))}
        </div>
      )}

      {capabilities.zoom && (
        <div
          className={`pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-1 text-sm font-mono tabular-nums text-white backdrop-blur transition-opacity duration-300 ${
            zoomBadgeVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {formatZoom(zoom)}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div
          className="flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <button
            onClick={() => setPickerOpen(true)}
            className="flex flex-shrink-0 items-center gap-2 rounded-full border border-white/25 bg-black/40 px-4 py-2.5 text-sm font-medium text-white backdrop-blur"
          >
            <ApertureIcon className="w-5 h-5" />
            {preset?.label ?? "Naturel"}
          </button>

          <div className="flex flex-shrink-0 items-center gap-2 rounded-full border border-white/25 bg-black/40 px-3 py-2 backdrop-blur">
            <button
              onClick={() => cycleIso(-1)}
              disabled={isoIndex === 0}
              aria-label="Diminuer l'ISO"
              className="px-2 text-lg leading-none text-white/80 disabled:opacity-30"
            >
              −
            </button>
            <span className="w-16 text-center text-sm font-mono tabular-nums text-white/70">ISO {isoValue}</span>
            <button
              onClick={() => cycleIso(1)}
              disabled={isoIndex === ISO_STEPS.length - 1}
              aria-label="Augmenter l'ISO"
              className="px-2 text-lg leading-none text-white/80 disabled:opacity-30"
            >
              +
            </button>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2 rounded-full border border-white/25 bg-black/40 px-3 py-2 backdrop-blur">
            <button
              onClick={() => cycleKelvin(-1)}
              disabled={kelvinIndex === 0}
              aria-label="Refroidir la balance des blancs"
              className="px-2 text-lg leading-none text-white/80 disabled:opacity-30"
            >
              −
            </button>
            <span className="w-16 text-center text-sm font-mono tabular-nums text-white/70">{kelvinValue}K</span>
            <button
              onClick={() => cycleKelvin(1)}
              disabled={kelvinIndex === KELVIN_STEPS.length - 1}
              aria-label="Réchauffer la balance des blancs"
              className="px-2 text-lg leading-none text-white/80 disabled:opacity-30"
            >
              +
            </button>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2 rounded-full border border-white/25 bg-black/40 px-3 py-2 backdrop-blur">
            <button
              onClick={() => setEvBias((v) => Math.max(-2, Math.round((v - 0.5) * 10) / 10))}
              aria-label="Diminuer l'exposition"
              className="px-2 text-lg leading-none text-white/80"
            >
              −
            </button>
            <span className="w-12 text-center text-sm font-mono tabular-nums text-white/70">
              {evBias > 0 ? `+${evBias.toFixed(1)}` : evBias.toFixed(1)}
            </span>
            <button
              onClick={() => setEvBias((v) => Math.min(2, Math.round((v + 0.5) * 10) / 10))}
              aria-label="Augmenter l'exposition"
              className="px-2 text-lg leading-none text-white/80"
            >
              +
            </button>
          </div>
        </div>

        {stayOnCapture && (pendingSaves > 0 || recentPhotos.length > 0) && (
          <div className="flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {Array.from({ length: pendingSaves }).map((_, i) => (
              <div
                key={`pending-${i}`}
                aria-label="Enregistrement en cours"
                className="h-12 w-12 shrink-0 animate-pulse rounded-lg border border-white/25 bg-white/10"
              />
            ))}
            {recentPhotos.slice(0, 15).map((p) => (
              <button
                key={p.id}
                onClick={() => onOpenPhoto(p)}
                aria-label="Photo prise"
                className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/25"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(p.id)} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 items-center pb-2 px-6">
          <div className="flex justify-start">
            {lastPhoto && !stayOnCapture ? (
              <button
                onClick={onOpenGallery}
                aria-label="Dernière photo"
                className="h-11 w-11 overflow-hidden rounded-xl border-2 border-white/70"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(lastPhoto.id)} alt="" className="h-full w-full object-cover" />
              </button>
            ) : (
              <div className="h-11 w-11" aria-hidden />
            )}
          </div>

          <div className="relative justify-self-center">
            <button
              onPointerDown={handleShutterDown}
              onPointerUp={handleShutterUp}
              onPointerLeave={handleShutterUp}
              disabled={!ready}
              aria-label="Déclencher"
              className={`flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 disabled:opacity-40 ${
                burstCount > 0 ? "border-amber-300" : "border-white/80"
              }`}
            >
              <span className={`h-14 w-14 rounded-full bg-white transition-transform ${capturing ? "scale-75" : ""}`} />
            </button>
            {burstCount > 0 && (
              <span className="absolute -top-2 -right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-300 px-1 text-[11px] font-bold text-black">
                {burstCount}
              </span>
            )}
          </div>

          <div className="h-11 w-11" aria-hidden />
        </div>
      </div>

      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-white/50">
          <CameraIcon className="w-10 h-10 animate-pulse" />
        </div>
      )}

      {pickerOpen && (
        <div className="absolute inset-0 z-40">
          <CameraPicker
            camera={camera}
            activePresetId={presetId}
            onSelect={(id) => {
              onSelectPreset(id);
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)}
          />
        </div>
      )}

      {dashboardOpen && (
        <div className="absolute inset-0 z-40">
          <Dashboard
            camera={camera}
            onClose={() => setDashboardOpen(false)}
            onOpenGallery={() => {
              setDashboardOpen(false);
              onOpenGallery();
            }}
            onSettingsChange={(s) => {
              setShowGrid(s.gridDefault);
              setStayOnCapture(s.stayOnCapture);
            }}
          />
        </div>
      )}

      {burstReview && (
        <div className="absolute inset-0 z-40">
          <BurstReview
            shots={burstReview}
            adjustments={adjustments}
            presetId={presetId}
            onDone={(lastSaved) => {
              setBurstReview(null);
              if (lastSaved) onBurstSaved(lastSaved);
            }}
          />
        </div>
      )}
    </div>
  );
}
