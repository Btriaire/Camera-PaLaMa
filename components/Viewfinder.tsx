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
import Hud from "./Hud";
import CameraPicker from "./CameraPicker";
import Dashboard from "./Dashboard";
import BurstReview from "./BurstReview";
import {
  ApertureIcon,
  CameraIcon,
  FlashIcon,
  FlipCameraIcon,
  GalleryGridIcon,
  GridIcon,
  SettingsIcon,
  TimerIcon,
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
  lastPhoto,
  onBurstSaved,
}: {
  camera: ReturnType<typeof useCamera>;
  active: boolean;
  presetId: string | null;
  onSelectPreset: (id: string | null) => void;
  onCapture: (bitmap: ImageBitmap, width: number, height: number, adjustments: Adjustments) => void;
  onOpenGallery: () => void;
  lastPhoto: SavedPhotoMeta | null;
  onBurstSaved: (meta: SavedPhotoMeta) => void;
}) {
  const {
    videoRef,
    ready,
    error,
    capabilities,
    torchOn,
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
  const burstActive = useRef(false);
  const burstShots = useRef<CapturedPhoto[]>([]);
  const burstLoopPromise = useRef<Promise<void> | null>(null);
  const [burstCount, setBurstCount] = useState(0);
  const [burstReview, setBurstReview] = useState<CapturedPhoto[] | null>(null);
  const battery = useBattery();
  const { elapsedSeconds, now } = useClock();

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
        renderer.render(adjustments, seed);
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
  }, [ready, active, presetId, evBias, isoIndex, kelvinIndex]);

  useEffect(() => {
    setShowGrid(getSettings().gridDefault);
    return () => {
      if (countdownTimeout.current) clearTimeout(countdownTimeout.current);
    };
  }, []);

  const captureOnce = async () => {
    setCapturing(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    try {
      const shot = await capture();
      if (shot) {
        setShotCount((n) => n + 1);
        onCapture(shot.bitmap, shot.width, shot.height, adjustments);
      }
    } finally {
      setCapturing(false);
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
  const runBurstLoop = async () => {
    setCapturing(true);
    try {
      while (burstActive.current) {
        const shot = await captureFast();
        if (shot) {
          burstShots.current.push(shot);
          setBurstCount(burstShots.current.length);
        }
        if (!burstActive.current) break;
        await new Promise((r) => setTimeout(r, 120));
      }
    } finally {
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
      setFlash(true);
      setTimeout(() => setFlash(false), 150);
      setShotCount((n) => n + 1);
      onCapture(shots[0].bitmap, shots[0].width, shots[0].height, adjustments);
    } else if (shots.length > 1) {
      setShotCount((n) => n + shots.length);
      setBurstReview(shots);
    }
  };

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    swipeStart.current = e.clientX;
  };
  const handleCanvasPointerUp = (e: React.PointerEvent) => {
    if (swipeStart.current === null) return;
    const delta = e.clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(delta) < 70) return;
    const currentIndex = PRESET_ORDER.indexOf(presetId);
    const nextIndex =
      delta < 0
        ? Math.min(PRESET_ORDER.length - 1, currentIndex + 1)
        : Math.max(0, currentIndex - 1);
    if (nextIndex !== currentIndex) onSelectPreset(PRESET_ORDER[nextIndex]);
  };

  return (
    <div className="relative flex-1 h-dvh bg-black overflow-hidden">
      <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover opacity-0" />
      <canvas
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerUp={handleCanvasPointerUp}
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
          {capabilities.torch && (
            <button
              onClick={() => setTorch(!torchOn)}
              aria-label="Flash"
              className={`p-1 drop-shadow-lg ${torchOn ? "text-amber-300" : "text-white"}`}
            >
              <FlashIcon className="w-9 h-9" off={!torchOn} />
            </button>
          )}
          {capabilities.canSwitch && (
            <button onClick={flip} aria-label="Changer de caméra" className="p-1 text-white drop-shadow-lg">
              <FlipCameraIcon className="w-9 h-9" />
            </button>
          )}
        </div>
      </div>

      {capabilities.zoom && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 rounded-full bg-black/40 px-1.5 py-3 backdrop-blur">
          <input
            type="range"
            aria-label="Zoom"
            min={capabilities.zoom.min}
            max={capabilities.zoom.max}
            step={capabilities.zoom.step}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-28 accent-white"
            style={{ writingMode: "vertical-lr" as React.CSSProperties["writingMode"], direction: "rtl" }}
          />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div
          className="flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <button
            onClick={() => setPickerOpen(true)}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-white/25 bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur"
          >
            <ApertureIcon className="w-4 h-4" />
            {preset?.label ?? "Naturel"}
          </button>

          <div className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-white/25 bg-black/40 px-2 py-1 backdrop-blur">
            <button
              onClick={() => cycleIso(-1)}
              disabled={isoIndex === 0}
              aria-label="Diminuer l'ISO"
              className="px-1.5 text-sm text-white/80 disabled:opacity-30"
            >
              −
            </button>
            <span className="w-14 text-center text-[11px] font-mono tabular-nums text-white/70">ISO {isoValue}</span>
            <button
              onClick={() => cycleIso(1)}
              disabled={isoIndex === ISO_STEPS.length - 1}
              aria-label="Augmenter l'ISO"
              className="px-1.5 text-sm text-white/80 disabled:opacity-30"
            >
              +
            </button>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-white/25 bg-black/40 px-2 py-1 backdrop-blur">
            <button
              onClick={() => cycleKelvin(-1)}
              disabled={kelvinIndex === 0}
              aria-label="Refroidir la balance des blancs"
              className="px-1.5 text-sm text-white/80 disabled:opacity-30"
            >
              −
            </button>
            <span className="w-14 text-center text-[11px] font-mono tabular-nums text-white/70">{kelvinValue}K</span>
            <button
              onClick={() => cycleKelvin(1)}
              disabled={kelvinIndex === KELVIN_STEPS.length - 1}
              aria-label="Réchauffer la balance des blancs"
              className="px-1.5 text-sm text-white/80 disabled:opacity-30"
            >
              +
            </button>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2 rounded-full border border-white/25 bg-black/40 px-2 py-1 backdrop-blur">
            <button
              onClick={() => setEvBias((v) => Math.max(-2, Math.round((v - 0.5) * 10) / 10))}
              aria-label="Diminuer l'exposition"
              className="px-1.5 text-sm text-white/80"
            >
              −
            </button>
            <span className="w-10 text-center text-[11px] font-mono tabular-nums text-white/70">
              {evBias > 0 ? `+${evBias.toFixed(1)}` : evBias.toFixed(1)}
            </span>
            <button
              onClick={() => setEvBias((v) => Math.min(2, Math.round((v + 0.5) * 10) / 10))}
              aria-label="Augmenter l'exposition"
              className="px-1.5 text-sm text-white/80"
            >
              +
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 items-center pb-2 px-6">
          <div className="flex justify-start">
            {lastPhoto ? (
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
            onClose={() => setDashboardOpen(false)}
            onOpenGallery={() => {
              setDashboardOpen(false);
              onOpenGallery();
            }}
            onSettingsChange={(s) => setShowGrid(s.gridDefault)}
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
