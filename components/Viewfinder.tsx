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
import { useStabilizer } from "@/lib/useStabilizer";
import { computeStabilizedCrop, shakeAxis } from "@/lib/stabilizerCrop";
import { burstIntervalMs, FLASH_MODES, FlashMode, isStrobing } from "@/lib/flashModes";
import { cropForDigitalZoom, enhanceCroppedZoom, SUPER_ZOOM_AI_MULTIPLIER } from "@/lib/superRes";
import {
  LONG_EXPOSURE_BLENDS,
  LONG_EXPOSURE_DEFAULT_S,
  LONG_EXPOSURE_MAX_S,
  LONG_EXPOSURE_MIN_S,
  LONG_EXPOSURE_STEP_S,
  LongExposureAccumulator,
  LongExposureBlend,
} from "@/lib/longExposure";
import Hud from "./Hud";
import CameraPicker from "./CameraPicker";
import Dashboard from "./Dashboard";
import BurstReview from "./BurstReview";
import Histogram from "./Histogram";
import LevelIndicator from "./LevelIndicator";
import ZoomSlider from "./ZoomSlider";
import HorizontalSlider from "./HorizontalSlider";
import {
  ApertureIcon,
  CameraIcon,
  CheckIcon,
  ContrastIcon,
  FlashIcon,
  FlipCameraIcon,
  GalleryGridIcon,
  GridIcon,
  LongExposureIcon,
  ScreenFlashIcon,
  SettingsIcon,
  SparkleIcon,
  StabilizerIcon,
  StrobeIcon,
  TimerIcon,
  ZebraIcon,
} from "@/components/Icons";

// Live "on" strength for the Super Contraste quick-toggle — the dial in the
// editor is continuous (0..100), but a viewfinder button is binary, so it
// jumps straight to a strong-but-not-extreme value rather than exposing a
// second slider on the shooting screen.
const LIVE_SUPER_CONTRAST = 70;

// How much the stabilizer crops in to get shift margin — a real phone's
// own EIS typically sacrifices somewhere in this range too; more margin
// smooths bigger shakes but costs more of the frame permanently. Shake
// saturates the full margin at SHAKE_DEADZONE_DEG of tilt from baseline.
// "Ultra-stabilisateur" trades more of the frame for a bigger margin and
// reacts to smaller tilts (a lower deadzone), for handheld Pose longue or
// otherwise shaky situations where the base amount doesn't cut it.
const STABILIZER_ZOOM = 1.12;
const SHAKE_DEADZONE_DEG = 4;
const STABILIZER_ZOOM_STRONG = 1.35;
const SHAKE_DEADZONE_DEG_STRONG = 2;

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
  // max always makes the cut, even after SuperZoom stretches the range
  // well past the last "round" candidate below it — it's the one value
  // this row exists to make reachable with a single tap.
  const inRange = ZOOM_CANDIDATES.filter((v) => v >= min - 0.01 && v <= max + 0.01);
  const belowMax = Array.from(new Set([min, ...inRange]))
    .filter((v) => v < max - 0.01)
    .sort((a, b) => a - b);
  return [...belowMax.slice(0, 3), max];
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
  onCapture: (
    bitmap: ImageBitmap,
    width: number,
    height: number,
    adjustments: Adjustments,
    aiOptions: { superRes: boolean; denoise: boolean }
  ) => void;
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
    setZoom: setHardwareZoom,
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
  // On by default, like a phone's own EIS -- the button is there to turn
  // it off (e.g. on a tripod, where the crop margin only costs framing for
  // nothing), not to opt in.
  const [stabilizerOn, setStabilizerOn] = useState(true);
  // Ultra-stabilisateur: an independent, off-by-default stronger mode (more
  // crop margin, reacts to smaller tilts) for handheld Pose longue or
  // otherwise shaky shots where the base amount isn't enough. It can be on
  // with the base stabilizer on or off — either way it's the one that wins
  // (see stabZoom/stabDeadzone below), since applying both at once would
  // just mean picking one crop factor over the other anyway.
  const [superStabilizerOn, setSuperStabilizerOn] = useState(false);
  // Mirrors stabilizerOn/superStabilizerOn for the render loop's long-lived
  // rAF closure, same reasoning as uiZoomRef below: toggling either
  // shouldn't tear down and recreate the whole WebGL context every time.
  const stabilizerOnRef = useRef(true);
  const superStabilizerOnRef = useRef(false);
  useEffect(() => {
    stabilizerOnRef.current = stabilizerOn;
  }, [stabilizerOn]);
  useEffect(() => {
    superStabilizerOnRef.current = superStabilizerOn;
  }, [superStabilizerOn]);
  // Super Contraste live-previews for real (it's just another shader
  // uniform, rendered the same on-screen as it will be in the capture).
  // Super-résolution IA can't live-preview — it's a several-second AI pass,
  // not a per-frame effect — so its button instead arms "run the AI pass on
  // whatever gets captured next," same idea as a flash mode.
  const [superContrastOn, setSuperContrastOn] = useState(false);
  const [superResOn, setSuperResOn] = useState(false);
  const [denoiseAIOn, setDenoiseAIOn] = useState(false);
  // SuperZoom's AI enhancement (crop + ESRGAN upscale, see applySuperZoom)
  // is a multi-second pass, exactly like Super-résolution IA/Débruitage IA
  // above — but unlike those, it used to run automatically just because
  // uiZoom's slider position crossed the hardware max, with no way to opt
  // out short of zooming back down. That ambushed captures with a blocking
  // "SuperZoom IA…" overlay nobody asked for. Now it's an explicit toggle,
  // same pattern as the other two: past the hardware max, a capture still
  // gets a plain crop (soft/blocky, instant, ordinary digital zoom) unless
  // this is on.
  const [superZoomOn, setSuperZoomOn] = useState(false);
  // SuperZoom: zoom past the camera's own reported max (or, on a device
  // that reports no zoom capability at all, past 1x) can only mean cropping
  // in — there's no more lens to move. uiZoom is that full range, decoupled
  // from the camera hook's own zoom (which stays hardware-only and simply
  // gets pinned at its max once uiZoom climbs past it); a ref mirrors it so
  // the live-preview render loop (a long-lived rAF closure, not recreated
  // every frame) can read the current value without restarting the whole
  // WebGL context on every pinch/slider tick.
  const [uiZoom, setUiZoomState] = useState(1);
  const uiZoomRef = useRef(1);
  const [superZoomProgress, setSuperZoomProgress] = useState<number | null>(null);
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [flashMenuOpen, setFlashMenuOpen] = useState(false);
  // Pose longue: 0 means off. Real-time frame accumulation (see
  // lib/longExposure.ts) rather than AI, so the live canvas below shows
  // the actual result building up, not a stand-in progress bar.
  const [longExposureSeconds, setLongExposureSeconds] = useState<number>(0);
  const [longExposureBlend, setLongExposureBlend] = useState<LongExposureBlend>("lighten");
  const [longExposureMenuOpen, setLongExposureMenuOpen] = useState(false);
  // Whole seconds remaining, not raw elapsed ms — updated only when the
  // displayed number actually changes (see runLongExposureCapture) so a
  // 10+ fps capture loop doesn't force a React render on every single
  // frame just to redraw a number that only needs to change once a second.
  const [longExposureRemainingS, setLongExposureRemainingS] = useState<number | null>(null);
  const longExposureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const longExposureStop = useRef(false);
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
  const stabilizer = useStabilizer();

  // The camera's own reported zoom ceiling (1x if it reports no zoom
  // capability at all) — SuperZoom is what happens past this point.
  const hardwareMaxZoom = capabilities.zoom?.max ?? 1;
  const zoomMin = capabilities.zoom?.min ?? 1;
  const zoomMax = hardwareMaxZoom * SUPER_ZOOM_AI_MULTIPLIER;
  const digitalZoomFactor = uiZoom / hardwareMaxZoom;
  const inSuperZoom = digitalZoomFactor > 1.02;

  const setUiZoom = (value: number) => {
    const clamped = clamp(value, zoomMin, zoomMax);
    setUiZoomState(clamped);
    uiZoomRef.current = clamped;
    setHardwareZoom(Math.min(clamped, hardwareMaxZoom));
  };

  // Keeps uiZoom pinned to the device's actual native zoom once
  // capabilities load in (right after the camera starts, or after a flip).
  useEffect(() => {
    setUiZoom(zoomMin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomMin, hardwareMaxZoom]);

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
    superContrast: superContrastOn ? LIVE_SUPER_CONTRAST : baseAdjustments.superContrast,
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

    // Only allocated/used once uiZoomRef climbs past the hardware max —
    // an honest, cheap preview of what SuperZoom will look like: a crop of
    // the live frame stretched back up, same as any digital zoom. The AI
    // enhancement itself is too slow for every frame; it only ever runs
    // once, on the still actually captured (see captureOnce/handleShutterUp).
    const zoomCropCanvas = document.createElement("canvas");

    let seed = 0;
    const loop = () => {
      const renderer = rendererRef.current;
      if (renderer && video && video.readyState >= 2 && video.videoWidth > 0) {
        const scale = Math.min(1, 1080 / Math.max(video.videoWidth, video.videoHeight));
        const w = Math.round(video.videoWidth * scale);
        const h = Math.round(video.videoHeight * scale);
        const digitalFactor = uiZoomRef.current / (capabilities.zoom?.max ?? 1);
        // No point paying a permanent FOV crop for compensation that has
        // nothing to compensate with — see useStabilizer's own note on why
        // availableRef can be false for the whole session (iOS Safari).
        // Ultra-stabilisateur wins when both are on — see its own state
        // comment for why applying both at once wouldn't make sense.
        const sensorAvailable = stabilizer.availableRef.current;
        const stabOn = (stabilizerOnRef.current || superStabilizerOnRef.current) && sensorAvailable;
        const stabZoom = superStabilizerOnRef.current ? STABILIZER_ZOOM_STRONG : STABILIZER_ZOOM;
        const stabDeadzone = superStabilizerOnRef.current ? SHAKE_DEADZONE_DEG_STRONG : SHAKE_DEADZONE_DEG;
        const totalZoom = Math.max(digitalFactor, 1) * (stabOn ? stabZoom : 1);
        if (totalZoom > 1.02) {
          zoomCropCanvas.width = w;
          zoomCropCanvas.height = h;
          const ctx = zoomCropCanvas.getContext("2d");
          const shakeX = stabOn ? shakeAxis(stabilizer.deltaXDegRef.current, stabDeadzone) : 0;
          const shakeY = stabOn ? shakeAxis(stabilizer.deltaYDegRef.current, stabDeadzone) : 0;
          // The shift only ever draws on the stabilizer's own slice of the
          // zoom (never SuperZoom's), so a deliberate zoom-in stays
          // centered on what was framed instead of drifting with shake.
          const { cropX, cropY, cropW, cropH } = computeStabilizedCrop(
            video.videoWidth,
            video.videoHeight,
            totalZoom,
            stabOn ? stabZoom : 1,
            shakeX,
            shakeY
          );
          if (ctx) {
            ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, w, h);
            renderer.uploadSource(zoomCropCanvas, w, h);
          } else {
            renderer.uploadSource(video, w, h);
          }
        } else {
          renderer.uploadSource(video, w, h);
        }
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
  }, [ready, active, presetId, evBias, isoIndex, kelvinIndex, zebraEnabled, superContrastOn]);

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
    setZoomBadgeVisible(true);
    if (zoomBadgeTimeout.current) clearTimeout(zoomBadgeTimeout.current);
    zoomBadgeTimeout.current = setTimeout(() => setZoomBadgeVisible(false), 1200);
    return () => {
      if (zoomBadgeTimeout.current) clearTimeout(zoomBadgeTimeout.current);
    };
  }, [uiZoom]);

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
      let shot = await capture();
      if (shot) {
        if (digitalZoomFactor > 1.02) {
          shot = await applySuperZoom(shot, digitalZoomFactor);
        }
        setShotCount((n) => n + 1);
        onCapture(shot.bitmap, shot.width, shot.height, adjustments, { superRes: superResOn, denoise: denoiseAIOn });
      }
    } finally {
      setCapturing(false);
      if (flashMode === "screen") setFlash(false);
    }
  };

  // SuperZoom's actual "AI expanding beyond normal zoom": crop to the
  // region that zoom level implies, then — only if superZoomOn is armed —
  // run the same super-resolution pass the editor's own toggle uses to
  // reconstruct detail a plain crop+stretch would just blur away. Without
  // it, a capture past the hardware max still gets the crop (so framing
  // matches what was previewed) but skips the slow AI pass, same as
  // ordinary digital zoom.
  const applySuperZoom = async (shot: CapturedPhoto, factor: number): Promise<CapturedPhoto> => {
    const cropped = await cropForDigitalZoom(shot.bitmap, factor);
    if (!superZoomOn) return cropped;
    setSuperZoomProgress(0);
    try {
      const result = await enhanceCroppedZoom(cropped.bitmap, (fraction) => setSuperZoomProgress(fraction));
      const bitmap = await createImageBitmap(result.blob);
      return { bitmap, width: result.width, height: result.height };
    } finally {
      setSuperZoomProgress(null);
    }
  };

  // Pose longue: captures frames as fast as the camera will give them and
  // composites each one live onto longExposureCanvasRef (see
  // lib/longExposure.ts) until the chosen duration elapses or a second tap
  // ends it early. The result then goes through onCapture exactly like any
  // other shot, so presets/adjustments and the AI toggles above still
  // apply to it once.
  const runLongExposureCapture = async () => {
    const canvas = longExposureCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.readyState < 2 || video.videoWidth === 0) return;
    setCapturing(true);
    longExposureStop.current = false;
    const durationMs = longExposureSeconds * 1000;
    // Capped the same way the live preview is (see the render loop above):
    // this canvas is a real, visible, repeatedly-repainted 2D surface, not
    // an offscreen one, and redrawing it at the sensor's full resolution
    // 10+ times a second — on top of the WebGL preview already doing the
    // same — is real compositor load for what's fundamentally a special
    // effect, not a resolution-critical capture.
    const scale = Math.min(1, 1080 / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);
    const accumulator = new LongExposureAccumulator(canvas, width, height, longExposureBlend);
    // Reused scratch canvas for the stabilizer's per-frame crop+shift, so
    // hand-shake over the exposure doesn't blur/ghost the accumulated
    // result — the stabilizer otherwise only ever touches the live preview
    // (see useStabilizer's own comment), but a multi-second accumulation
    // is exactly the one capture mode where uncompensated hand-shake would
    // actually show up in the saved photo.
    const stabCropCanvas = document.createElement("canvas");
    const start = Date.now();
    let shownRemaining = longExposureSeconds;
    setLongExposureRemainingS(shownRemaining);
    try {
      while (Date.now() - start < durationMs && !longExposureStop.current) {
        const shot = await captureFast();
        if (shot) {
          const stabOn = (stabilizerOnRef.current || superStabilizerOnRef.current) && stabilizer.availableRef.current;
          if (stabOn) {
            const stabZoom = superStabilizerOnRef.current ? STABILIZER_ZOOM_STRONG : STABILIZER_ZOOM;
            const stabDeadzone = superStabilizerOnRef.current ? SHAKE_DEADZONE_DEG_STRONG : SHAKE_DEADZONE_DEG;
            const shakeX = shakeAxis(stabilizer.deltaXDegRef.current, stabDeadzone);
            const shakeY = shakeAxis(stabilizer.deltaYDegRef.current, stabDeadzone);
            const { cropX, cropY, cropW, cropH } = computeStabilizedCrop(
              shot.width,
              shot.height,
              stabZoom,
              stabZoom,
              shakeX,
              shakeY
            );
            stabCropCanvas.width = shot.width;
            stabCropCanvas.height = shot.height;
            const ctx = stabCropCanvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(shot.bitmap, cropX, cropY, cropW, cropH, 0, 0, shot.width, shot.height);
              accumulator.addFrame(stabCropCanvas);
            } else {
              accumulator.addFrame(shot.bitmap);
            }
          } else {
            accumulator.addFrame(shot.bitmap);
          }
          shot.bitmap.close();
        }
        const remaining = Math.max(0, Math.ceil((durationMs - (Date.now() - start)) / 1000));
        if (remaining !== shownRemaining) {
          shownRemaining = remaining;
          setLongExposureRemainingS(remaining);
        }
      }
      if (accumulator.frameCount === 0) return;
      const blob = await accumulator.toBlob();
      const bitmap = await createImageBitmap(blob);
      setShotCount((n) => n + 1);
      onCapture(bitmap, width, height, adjustments, { superRes: superResOn, denoise: denoiseAIOn });
    } finally {
      setCapturing(false);
      setLongExposureRemainingS(null);
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
    // Fixed for the whole burst, not re-read per shot — the framing
    // shouldn't shift mid-roll just because a slider tick landed between
    // frames. Every shot gets cropped to match what SuperZoom previewed;
    // the (slow) AI enhancement itself only ever runs on a single shot,
    // resolved below in handleShutterUp — multiplying it across a burst
    // would turn "hold for a roll" into "hold for several minutes."
    const factor = digitalZoomFactor;
    let strobeOn = false;
    try {
      while (burstActive.current) {
        if (strobing) {
          strobeOn = !strobeOn;
          setTorch(strobeOn);
        }
        let shot = await captureFast();
        if (shot && factor > 1.02) shot = await cropForDigitalZoom(shot.bitmap, factor);
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
    if (countdown !== null || timerSeconds > 0 || capturing || longExposureSeconds > 0) return;
    burstActive.current = true;
    burstShots.current = [];
    setBurstCount(0);
    if (flashMode === "screen") setFlash(true);
    burstLoopPromise.current = runBurstLoop();
  };

  const handleShutterUp = async () => {
    // Pose longue takes over the shutter entirely while armed: one tap
    // starts it, a second tap (while it's running) ends it early with
    // whatever's accumulated so far instead of waiting out the full
    // duration — like letting go of a real bulb-exposure shutter button.
    if (longExposureSeconds > 0) {
      if (capturing) longExposureStop.current = true;
      else await runLongExposureCapture();
      return;
    }
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
      // Already cropped to the SuperZoom framing inside runBurstLoop; a
      // single resolved shot is the one case worth paying for the AI
      // enhancement pass on top of that crop — and only if superZoomOn is
      // armed, same opt-in as applySuperZoom above.
      let shot = shots[0];
      if (digitalZoomFactor > 1.02 && superZoomOn) {
        setSuperZoomProgress(0);
        try {
          const result = await enhanceCroppedZoom(shot.bitmap, (fraction) => setSuperZoomProgress(fraction));
          const bitmap = await createImageBitmap(result.blob);
          shot = { bitmap, width: result.width, height: result.height };
        } finally {
          setSuperZoomProgress(null);
        }
      }
      setShotCount((n) => n + 1);
      onCapture(shot.bitmap, shot.width, shot.height, adjustments, { superRes: superResOn, denoise: denoiseAIOn });
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
    } else if (activePointers.current.size === 2) {
      becamePinch.current = true;
      const [a, b] = Array.from(activePointers.current.values());
      pinchStart.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: uiZoom };
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.current.size === 2 && pinchStart.current) {
      const [a, b] = Array.from(activePointers.current.values());
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const scale = distance / Math.max(1, pinchStart.current.distance);
      setUiZoom(pinchStart.current.zoom * scale);
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
      {/* Pose longue's live accumulation — see runLongExposureCapture.
          Always mounted (never conditionally rendered) so its ref is
          already attached by the time a shutter tap starts a capture;
          only visible while one is actually running. */}
      <canvas
        ref={longExposureCanvasRef}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: longExposureRemainingS !== null ? 1 : 0 }}
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
        zoom={uiZoom}
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

      {superZoomProgress !== null && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm">
          <SparkleIcon className="w-8 h-8 animate-pulse text-cyan-300" />
          <p className="text-sm text-white/80">
            {superZoomProgress < 0.99 ? `SuperZoom IA… ${Math.round(superZoomProgress * 100)}%` : "Finalisation…"}
          </p>
        </div>
      )}

      {longExposureRemainingS !== null && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3">
          <span className="text-7xl font-light tabular-nums text-amber-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            {longExposureRemainingS}
          </span>
          <span className="rounded-full bg-black/60 px-3 py-1.5 text-xs text-white/70 backdrop-blur">
            Temps restant — retapez pour arrêter
          </span>
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

      {longExposureMenuOpen && (
        <>
          <button
            className="fixed inset-0 z-30"
            aria-label="Fermer le menu pose longue"
            onClick={() => setLongExposureMenuOpen(false)}
          />
          <div
            className="absolute left-4 right-4 z-40 rounded-2xl border border-white/15 bg-zinc-950/95 p-2 backdrop-blur"
            style={{ bottom: "calc(max(1.5rem, env(safe-area-inset-bottom)) + 9rem)" }}
          >
            {LONG_EXPOSURE_BLENDS.map((b) => (
              <button
                key={b.id}
                onClick={() => setLongExposureBlend(b.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${
                  longExposureBlend === b.id ? "bg-white/10" : ""
                }`}
              >
                <span className="flex-1">
                  <span className="block text-sm font-medium text-white">{b.label}</span>
                  <span className="block text-[11px] leading-tight text-white/40">{b.blurb}</span>
                </span>
                {longExposureBlend === b.id && <CheckIcon className="h-4 w-4 shrink-0 text-white" />}
              </button>
            ))}
            <div className="mt-1 flex items-center justify-between gap-2 border-t border-white/10 px-2 pt-2">
              <span className="text-xs font-medium text-white/60">Durée</span>
              <div className="flex items-center gap-2">
                <span className="w-10 text-right font-mono text-sm tabular-nums text-amber-300">
                  {longExposureSeconds > 0 ? longExposureSeconds : LONG_EXPOSURE_DEFAULT_S}s
                </span>
                <button
                  onClick={() => setLongExposureSeconds(0)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    longExposureSeconds === 0 ? "bg-white text-black" : "text-white/50"
                  }`}
                >
                  Désactivé
                </button>
              </div>
            </div>
            <div className="px-2 pb-1 pt-2">
              <HorizontalSlider
                ariaLabel="Durée de la pose longue"
                min={LONG_EXPOSURE_MIN_S}
                max={LONG_EXPOSURE_MAX_S}
                step={LONG_EXPOSURE_STEP_S}
                value={longExposureSeconds > 0 ? longExposureSeconds : LONG_EXPOSURE_DEFAULT_S}
                onChange={setLongExposureSeconds}
              />
              <div className="flex justify-between px-1 pt-1 text-[10px] text-white/40">
                <span>{LONG_EXPOSURE_MIN_S}s</span>
                <span>{LONG_EXPOSURE_MAX_S}s</span>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="absolute right-16 top-1/2 -translate-y-1/2">
        <ZoomSlider min={zoomMin} max={zoomMax} step={capabilities.zoom?.step || 0.1} value={uiZoom} onChange={setUiZoom} />
      </div>

      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-full bg-black/40 px-1.5 py-2 backdrop-blur">
        {zoomPresets(zoomMin, zoomMax)
          .slice()
          .reverse()
          .map((level) => (
            <button
              key={level}
              onClick={() => setUiZoom(level)}
              aria-label={`Zoom ${formatZoom(level)}${
                level > hardwareMaxZoom + 0.01 ? (superZoomOn ? " (SuperZoom IA)" : " (zoom numérique)") : ""
              }`}
              className={`flex h-8 w-8 flex-col items-center justify-center rounded-full text-[11px] font-mono tabular-nums leading-none transition-colors ${
                Math.abs(uiZoom - level) < 0.05 ? "bg-white text-black font-semibold" : "text-white/80"
              }`}
            >
              {formatZoom(level)}
              {level > hardwareMaxZoom + 0.01 && superZoomOn && <SparkleIcon className="w-2.5 h-2.5" />}
            </button>
          ))}
      </div>

      <div
        className={`pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-sm font-mono tabular-nums text-white backdrop-blur transition-opacity duration-300 ${
          zoomBadgeVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {formatZoom(uiZoom)}
        {inSuperZoom && superZoomOn && <SparkleIcon className="w-3.5 h-3.5 text-cyan-300" />}
      </div>

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

          <button
            onClick={() => setStabilizerOn((v) => !v)}
            aria-pressed={stabilizerOn}
            aria-label="Stabilisateur électronique"
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium backdrop-blur transition-colors ${
              stabilizerOn ? "border-emerald-300/70 bg-emerald-300/15 text-emerald-300" : "border-white/25 bg-black/40 text-white"
            }`}
          >
            <StabilizerIcon className="w-4 h-4" />
            {stabilizerOn && !stabilizer.available ? "Stabilisateur (capteur indisponible)" : "Stabilisateur"}
          </button>

          <button
            onClick={() => setSuperStabilizerOn((v) => !v)}
            aria-pressed={superStabilizerOn}
            aria-label="Ultra-stabilisateur électronique"
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium backdrop-blur transition-colors ${
              superStabilizerOn ? "border-violet-300/70 bg-violet-300/15 text-violet-300" : "border-white/25 bg-black/40 text-white"
            }`}
          >
            <StabilizerIcon className="w-4 h-4" />
            {superStabilizerOn && !stabilizer.available ? "Ultra-stabilisateur (capteur indisponible)" : "Ultra-stabilisateur"}
          </button>

          {/* Only shown once actually zoomed past the hardware max — this
              is the one AI toggle that's about a mode the user has to
              already be in for it to make sense, unlike the always-shown
              toggles below which apply to any shot. */}
          {inSuperZoom && (
            <button
              onClick={() => setSuperZoomOn((v) => !v)}
              aria-pressed={superZoomOn}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium backdrop-blur transition-colors ${
                superZoomOn ? "border-cyan-300/70 bg-cyan-300/15 text-cyan-300" : "border-white/25 bg-black/40 text-white"
              }`}
            >
              <SparkleIcon className="w-4 h-4" />
              SuperZoom IA
            </button>
          )}

          <button
            onClick={() => setSuperContrastOn((v) => !v)}
            aria-pressed={superContrastOn}
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium backdrop-blur transition-colors ${
              superContrastOn ? "border-cyan-300/70 bg-cyan-300/15 text-cyan-300" : "border-white/25 bg-black/40 text-white"
            }`}
          >
            <ContrastIcon className="w-4 h-4" />
            Super Contraste
          </button>

          <button
            onClick={() => setDenoiseAIOn((v) => !v)}
            aria-pressed={denoiseAIOn}
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium backdrop-blur transition-colors ${
              denoiseAIOn ? "border-cyan-300/70 bg-cyan-300/15 text-cyan-300" : "border-white/25 bg-black/40 text-white"
            }`}
          >
            <SparkleIcon className="w-4 h-4" />
            Débruitage IA
          </button>

          <button
            onClick={() => setSuperResOn((v) => !v)}
            aria-pressed={superResOn}
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium backdrop-blur transition-colors ${
              superResOn ? "border-cyan-300/70 bg-cyan-300/15 text-cyan-300" : "border-white/25 bg-black/40 text-white"
            }`}
          >
            <SparkleIcon className="w-4 h-4" />
            Super-résolution IA
          </button>

          <button
            onClick={() => setLongExposureMenuOpen((v) => !v)}
            aria-pressed={longExposureSeconds > 0}
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium backdrop-blur transition-colors ${
              longExposureSeconds > 0 ? "border-amber-300/70 bg-amber-300/15 text-amber-300" : "border-white/25 bg-black/40 text-white"
            }`}
          >
            <LongExposureIcon className="w-4 h-4" />
            {longExposureSeconds > 0 ? `Pose longue ${longExposureSeconds}s` : "Pose longue"}
          </button>
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
