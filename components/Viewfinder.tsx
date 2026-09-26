"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { soundEngine } from "@/lib/audio";
import Hud from "./Hud";
import CameraPicker from "./CameraPicker";
import Dashboard from "./Dashboard";
import { FilmCanisterBadge } from "./FilmCanister";
import BurstReview from "./BurstReview";
import Histogram from "./Histogram";
import LevelIndicator from "./LevelIndicator";
import ZoomSlider from "./ZoomSlider";
import HorizontalSlider from "./HorizontalSlider";
import PhotoViewer from "./PhotoViewer";
import VintageViewfinderMask, { VINTAGE_VIEWFINDER_MODES, VintageViewfinderMode } from "./VintageViewfinderMask";
import {
  ApertureIcon,
  BurstIcon,
  CameraIcon,
  CheckIcon,
  ContrastIcon,
  FlashIcon,
  FlipCameraIcon,
  FocusPeakingIcon,
  GalleryGridIcon,
  GridIcon,
  HistogramIcon,
  LongExposureIcon,
  LoupeIcon,
  MacroFlowerIcon,
  RatioFramingIcon,
  ScreenFlashIcon,
  SettingsIcon,
  SoundIcon,
  SparkleIcon,
  StabilizerIcon,
  StrobeIcon,
  TimerIcon,
  TorchIcon,
  VintageViewfinderIcon,
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
//
// The margin and deadzone compound multiplicatively into how much crop
// movement a given amount of real tilt produces (crop shift = shakeAxis(
// delta, deadzone) * margin(zoom), and shakeAxis's own gain is 1/deadzone)
// — the original 1.35/2° combination was roughly 4.8x more reactive than
// the base 1.12/4° to the exact same sensor reading (2x from the deadzone
// halving, ~2.4x more from the bigger margin), reported as "Ultra creates
// more movement" rather than smoothing it out: real hand tremor and
// ordinary sensor noise that the base mode's lower gain absorbs comfortably
// got blown up into visibly larger, more frequent crop jumps instead.
// 1.22/3° keeps Ultra meaningfully stronger for genuinely bigger shakes
// (roughly 2.2x the base gain, not ~4.8x) without turning ordinary tremor
// into the dominant visible motion.
const STABILIZER_ZOOM = 1.12;
const SHAKE_DEADZONE_DEG = 4;
const STABILIZER_ZOOM_STRONG = 1.22;
const SHAKE_DEADZONE_DEG_STRONG = 3;

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
  saveError,
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
  // Set (briefly) when a "rester sur le viseur" save fails — that flow has
  // no editor screen of its own to show an error in, so without this the
  // pulsing placeholder tile just quietly disappears with no explanation.
  saveError: string | null;
  onOpenPhoto: (meta: SavedPhotoMeta) => void;
  onBurstSaved: (meta: SavedPhotoMeta) => void;
}) {
  const lastPhoto = recentPhotos[0] ?? null;
  const {
    videoRef,
    ready,
    error,
    capabilities,
    torchOn,
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
  const [focusPeakingEnabled, setFocusPeakingEnabled] = useState(false);
  const [macroModeOn, setMacroModeOn] = useState(false);
  const [macroLoupeOn, setMacroLoupeOn] = useState(false);
  const [liveAspectMask, setLiveAspectMask] = useState<"none" | "1:1" | "4:5" | "16:9" | "3:2" | "65:24">("none");
  const [showHistogram, setShowHistogram] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
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
  const [burstModeArmed, setBurstModeArmed] = useState(false);
  const [burstSpeed, setBurstSpeed] = useState<"fast" | "normal" | "eco">("normal");
  const [burstMenuOpen, setBurstMenuOpen] = useState(false);
  const [viewerPhotoIndex, setViewerPhotoIndex] = useState<number | null>(null);
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

  const [vintageMask, setVintageMask] = useState<VintageViewfinderMode>("none");
  const [vintageMaskMenuOpen, setVintageMaskMenuOpen] = useState(false);

  const cycleVintageMask = () => {
    const steps: VintageViewfinderMode[] = ["none", "slr-prism", "tlr-6x6", "lens-circle", "film-sprockets"];
    const idx = steps.indexOf(vintageMask);
    setVintageMask(steps[(idx + 1) % steps.length]);
  };

  const cycleAspectMask = () => {
    const steps: ("none" | "1:1" | "4:5" | "16:9" | "3:2" | "65:24")[] = [
      "none",
      "1:1",
      "4:5",
      "16:9",
      "3:2",
      "65:24",
    ];
    const idx = steps.indexOf(liveAspectMask);
    setLiveAspectMask(steps[(idx + 1) % steps.length]);
  };

  const toggleSoundMute = () => {
    const next = !soundMuted;
    setSoundMuted(next);
    soundEngine.setSoundEnabled(!next);
  };

  const toggleMacroMode = () => {
    setMacroModeOn((prev) => {
      const next = !prev;
      if (next) {
        setFocusPeakingEnabled(true);
      }
      return next;
    });
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
  // Memoized on the primitives that actually determine it (not on
  // baseAdjustments/preset, new object references every render) so it
  // stays referentially stable across unrelated re-renders — the ref
  // mirror effect above depends on this object, and without a stable
  // reference it would fire, harmlessly but pointlessly, on every render.
  const adjustments: Adjustments = useMemo(
    () => ({
      ...baseAdjustments,
      exposure: clamp(baseAdjustments.exposure + evBias + isoExposureBias, -100, 100),
      grain: clamp(baseAdjustments.grain + isoGrainBias, 0, 100),
      temperature: clamp(baseAdjustments.temperature + kelvinTempBias, -100, 100),
      superContrast: macroModeOn
        ? Math.max(baseAdjustments.superContrast, 55)
        : superContrastOn
        ? LIVE_SUPER_CONTRAST
        : baseAdjustments.superContrast,
      sharpen: macroModeOn ? Math.max(baseAdjustments.sharpen, 60) : baseAdjustments.sharpen,
      macroBoost: macroModeOn ? Math.max(baseAdjustments.macroBoost ?? 0, 80) : baseAdjustments.macroBoost ?? 0,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [presetId, evBias, isoIndex, kelvinIndex, superContrastOn, macroModeOn]
  );
  const hudSkin = preset?.hud ?? "modern";
  const timerSeconds = TIMER_STEPS[timerIndex];

  // Mirrors adjustments/zebraEnabled/capabilities for the render loop's
  // long-lived rAF closure below, same reasoning as uiZoomRef and the
  // stabilizer refs: the loop reads these from refs, updated here on every
  // render, so it always sees the latest values without needing either of
  // them in that effect's own dependency array — which used to include
  // presetId, evBias, isoIndex, kelvinIndex, zebraEnabled and
  // superContrastOn (everything adjustments is derived from), so picking a
  // preset, nudging EV, or clicking ISO/Kelvin tore down and recreated the
  // entire WebGL context (new program, shaders recompiled, new texture) on
  // every tap. Beyond the waste, real mobile browsers cap how many WebGL
  // contexts can be live at once (iOS Safari's limit is much tighter than
  // desktop Chrome's) — tapping through several presets in a row, exactly
  // what trying out new styles looks like, could exhaust it and leave the
  // canvas permanently black with no recovery, since nothing here ever
  // listened for a lost context either.
  const adjustmentsRef = useRef(adjustments);
  const zebraEnabledRef = useRef(zebraEnabled);
  const focusPeakingEnabledRef = useRef(focusPeakingEnabled);
  const capabilitiesRef = useRef(capabilities);
  useEffect(() => {
    adjustmentsRef.current = adjustments;
  }, [adjustments]);
  useEffect(() => {
    zebraEnabledRef.current = zebraEnabled;
  }, [zebraEnabled]);
  useEffect(() => {
    focusPeakingEnabledRef.current = focusPeakingEnabled;
  }, [focusPeakingEnabled]);
  useEffect(() => {
    capabilitiesRef.current = capabilities;
  }, [capabilities]);

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

    // iOS Safari can drop a WebGL context under GPU/memory pressure at any
    // time, independent of how it's used — and unlike desktop Chrome, it
    // only fires webglcontextrestored if the loss event was acknowledged
    // with preventDefault(); an unacknowledged loss is treated as
    // permanent. With nothing here listening for either event, a dropped
    // context left the canvas black for the rest of the session with no
    // way back. Listening and recreating the renderer on restore is what
    // actually makes this self-healing, regardless of what triggered the
    // loss in the first place.
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      rendererRef.current = null;
    };
    const handleContextRestored = () => {
      try {
        rendererRef.current = new GLRenderer(canvas);
      } catch {
        rendererRef.current = null;
      }
    };
    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

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
        const digitalFactor = uiZoomRef.current / (capabilitiesRef.current.zoom?.max ?? 1);
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
        renderer.render(adjustmentsRef.current, seed, zebraEnabledRef.current, focusPeakingEnabledRef.current);
        seed += 0.016;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
    // adjustments/zebraEnabled/capabilities deliberately excluded — the
    // loop reads them from refs (see the comment above their declaration)
    // precisely so this effect, and the WebGL context it creates, doesn't
    // tear down and recreate on every preset tap or dial nudge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, active]);

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
    soundEngine.playShutter();
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([35, 25, 35]);
    }
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
    // Reused scratch canvas for the per-frame crop+shift below, so
    // hand-shake over the exposure doesn't blur/ghost the accumulated
    // result — the stabilizer otherwise only ever touches the live preview
    // (see useStabilizer's own comment), but a multi-second accumulation
    // is exactly the one capture mode where uncompensated hand-shake would
    // actually show up in the saved photo. The same canvas also carries
    // SuperZoom's digital-zoom crop: without it, a Pose longue capture
    // started while zoomed past the hardware max would ignore that zoom
    // entirely and save the full, uncropped field of view — a jarring
    // mismatch against the (correctly cropped) live preview it replaces
    // the instant the exposure starts.
    const stabCropCanvas = document.createElement("canvas");
    const start = Date.now();
    let shownRemaining = longExposureSeconds;
    setLongExposureRemainingS(shownRemaining);
    try {
      while (Date.now() - start < durationMs && !longExposureStop.current) {
        const shot = await captureFast();
        if (shot) {
          // Re-read every frame, same as the live preview loop above, so a
          // pinch/slider zoom change mid-exposure is reflected the same way
          // it would be if this were still just a live preview.
          const digitalFactor = uiZoomRef.current / (capabilities.zoom?.max ?? 1);
          const stabOn = (stabilizerOnRef.current || superStabilizerOnRef.current) && stabilizer.availableRef.current;
          const stabZoom = superStabilizerOnRef.current ? STABILIZER_ZOOM_STRONG : STABILIZER_ZOOM;
          const stabDeadzone = superStabilizerOnRef.current ? SHAKE_DEADZONE_DEG_STRONG : SHAKE_DEADZONE_DEG;
          const totalZoom = Math.max(digitalFactor, 1) * (stabOn ? stabZoom : 1);
          if (totalZoom > 1.02) {
            const shakeX = stabOn ? shakeAxis(stabilizer.deltaXDegRef.current, stabDeadzone) : 0;
            const shakeY = stabOn ? shakeAxis(stabilizer.deltaYDegRef.current, stabDeadzone) : 0;
            const { cropX, cropY, cropW, cropH } = computeStabilizedCrop(
              shot.width,
              shot.height,
              totalZoom,
              stabOn ? stabZoom : 1,
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
    const baseInterval = burstIntervalMs(flashMode);
    const interval = burstSpeed === "fast" ? 90 : burstSpeed === "eco" ? 320 : baseInterval;
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
          soundEngine.playShutter();
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

  // Stabilisateur defaults to on, so most people never get a reason to tap
  // it — which on iOS Safari means it also never gets the one user gesture
  // DeviceOrientationEvent.requestPermission() requires, and the toggle
  // quietly does nothing forever with no error in sight. Route both
  // stabilizer buttons' taps through here so that gesture is never missed:
  // harmless (resolves immediately, no prompt) once already available or
  // on a platform that was never gated.
  const toggleStabilizer = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    if (!stabilizer.available) stabilizer.requestPermission();
    setter((v) => !v);
  };

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

      {showHistogram && (
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 z-20"
          style={{ top: "calc(max(0.75rem, env(safe-area-inset-top)) + 3.5rem)" }}
        >
          <Histogram canvasRef={canvasRef} />
        </div>
      )}

      {/* Live Aspect Ratio Framing Letterbox Mask */}
      {liveAspectMask !== "none" && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-2">
          <div
            className={`w-full max-w-full max-h-full border-2 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.72)] transition-all ${
              liveAspectMask === "1:1"
                ? "aspect-square"
                : liveAspectMask === "4:5"
                ? "aspect-[4/5]"
                : liveAspectMask === "16:9"
                ? "aspect-[16/9]"
                : liveAspectMask === "3:2"
                ? "aspect-[3/2]"
                : "aspect-[65/24]"
            }`}
          >
            <div className="absolute bottom-2 right-2 rounded bg-black/75 px-2 py-0.5 font-mono text-[11px] font-bold text-white border border-white/20 backdrop-blur">
              {liveAspectMask === "65:24" ? "2.7:1 XPAN" : liveAspectMask}
            </div>
          </div>
        </div>
      )}

      {/* Optional Vintage Optical Viewfinder Lens Mask */}
      <VintageViewfinderMask
        mode={vintageMask}
        evBias={evBias}
        iso={isoValue}
        shotCount={shotCount}
      />

      {/* Macro Mode Dedicated Live HUD & Reticle */}
      {macroModeOn && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-between p-4">
          <div
            className="flex items-center gap-2.5 rounded-full border-2 border-emerald-400/70 bg-black/85 px-4 py-2 backdrop-blur-xl shadow-[0_0_25px_rgba(52,211,153,0.4)]"
            style={{ marginTop: "calc(max(0.75rem, env(safe-area-inset-top)) + 3.6rem)" }}
          >
            <MacroFlowerIcon className="w-5 h-5 text-emerald-400 animate-pulse" />
            <span className="font-mono text-xs font-black uppercase tracking-wider text-emerald-300">
              MODE MACRO PRO · NETTETÉ MAX
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
          </div>

          {/* Macro Preset Quick Selector */}
          <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto max-w-[95vw] rounded-full border border-emerald-500/40 bg-black/85 px-3 py-1.5 backdrop-blur-xl shadow-lg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-[10px] font-mono font-bold text-emerald-400 mr-1 uppercase">Style :</span>
            {[
              { id: "macro-plus-ultra", label: "Ultra-Précision" },
              { id: "macro-botanique-vivid", label: "Botanique" },
              { id: "macro-mineral-textures", label: "Minéral" },
              { id: "macro-insect-eye", label: "Œil Insecte" },
              { id: "macro-microscope-40x", label: "Microscope" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => onSelectPreset(m.id)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
                  presetId === m.id
                    ? "bg-emerald-400 text-black shadow-md font-bold"
                    : "text-white/80 hover:bg-white/10"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="relative flex items-center justify-center">
            <div className="relative h-48 w-48 rounded-full border-2 border-dashed border-emerald-400/70 bg-emerald-950/15 backdrop-blur-[1px] shadow-[0_0_30px_rgba(52,211,153,0.3)] flex items-center justify-center">
              <div className="absolute h-full w-[1px] bg-emerald-400/40" />
              <div className="absolute w-full h-[1px] bg-emerald-400/40" />
              <div className="h-12 w-12 rounded-full border border-emerald-300/80" />
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="absolute bottom-2 text-[9px] font-mono font-bold tracking-tight text-emerald-300 bg-black/70 px-2 py-0.5 rounded border border-emerald-500/30">
                MISE AU POINT PROCHE (3-15 CM)
              </span>
            </div>
          </div>

          <div className="pointer-events-auto mb-20 flex items-center gap-2 rounded-full border border-emerald-500/40 bg-black/85 p-1.5 backdrop-blur-xl shadow-xl">
            <button
              onClick={() => setUiZoom(1)}
              className={`rounded-full px-3.5 py-1.5 font-mono text-xs font-black transition-all ${
                Math.abs(uiZoom - 1) < 0.1 ? "bg-emerald-400 text-black shadow-md" : "text-white/80 hover:bg-white/10"
              }`}
            >
              1.0×
            </button>
            <button
              onClick={() => setUiZoom(2)}
              className={`rounded-full px-3.5 py-1.5 font-mono text-xs font-black transition-all ${
                Math.abs(uiZoom - 2) < 0.1 ? "bg-emerald-400 text-black shadow-md" : "text-white/80 hover:bg-white/10"
              }`}
            >
              2.0×
            </button>
            <button
              onClick={() => setUiZoom(3)}
              className={`rounded-full px-3.5 py-1.5 font-mono text-xs font-black transition-all ${
                Math.abs(uiZoom - 3) < 0.1 ? "bg-emerald-400 text-black shadow-md" : "text-white/80 hover:bg-white/10"
              }`}
            >
              3.0×
            </button>
            <button
              onClick={() => setUiZoom(5)}
              className={`rounded-full px-3.5 py-1.5 font-mono text-xs font-black transition-all ${
                Math.abs(uiZoom - 5) < 0.1 ? "bg-emerald-400 text-black shadow-md" : "text-white/80 hover:bg-white/10"
              }`}
            >
              5.0×
            </button>
            {capabilities.torch && (
              <button
                onClick={() => setTorch(!torchOn)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-xs font-black transition-all ${
                  torchOn ? "bg-amber-400 text-black shadow-md" : "text-white/80 hover:bg-white/10"
                }`}
              >
                <TorchIcon className="w-4 h-4" on={torchOn} />
                Torche
              </button>
            )}
          </div>
        </div>
      )}

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
          <div className="flex flex-col items-center gap-2 rounded-3xl border border-amber-400/40 bg-black/80 px-6 py-5 backdrop-blur-xl shadow-[0_0_30px_rgba(245,158,11,0.3)]">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
                Pose Longue en Cours
              </span>
            </div>
            <span className="text-6xl font-extralight font-mono tabular-nums text-amber-300 drop-shadow-[0_2px_12px_rgba(245,158,11,0.5)]">
              {longExposureRemainingS}s
            </span>
            <div className="w-48 h-1.5 rounded-full bg-white/20 overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, ((longExposureSeconds - longExposureRemainingS) / (longExposureSeconds || 1)) * 100))}%`,
                }}
              />
            </div>
            <span className="text-[11px] text-white/70 mt-1">
              Accumulation de lumière · Retapez pour figer
            </span>
          </div>
        </div>
      )}

      {burstCount > 0 && (
        <div className="pointer-events-none absolute top-[28%] left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 rounded-full border-2 border-amber-400 bg-black/85 px-5 py-2.5 backdrop-blur-xl shadow-[0_0_25px_rgba(245,158,11,0.5)]">
            <BurstIcon className="w-7 h-7 text-amber-400" />
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-xs font-bold text-amber-400/90 tracking-wider">RAFALE</span>
              <span className="text-2xl font-black text-white tabular-nums">[{burstCount}]</span>
            </div>
          </div>
          <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-medium text-white/80 backdrop-blur">
            Relâchez pour enregistrer la série
          </span>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-white/70">
          {error}
        </div>
      )}

      {saveError && (
        <div
          className="absolute left-4 right-4 z-30 rounded-xl border border-red-400/40 bg-red-950/90 px-3 py-2 text-center text-xs text-red-200 backdrop-blur"
          style={{ top: "calc(max(0.75rem, env(safe-area-inset-top)) + 3.25rem)" }}
        >
          {saveError}
        </div>
      )}

      {/* Top Controls Bar with Large Touch Icons */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 z-30 pointer-events-auto"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        {/* Left capsule: Gallery, Settings & Audio */}
        <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/75 p-2 backdrop-blur-xl shadow-xl">
          <button
            onClick={onOpenGallery}
            aria-label="Galerie"
            className="flex h-11 w-11 items-center justify-center rounded-full text-white/95 hover:bg-white/20 hover:text-white active:scale-90 transition-all"
          >
            <GalleryGridIcon className="w-7 h-7" />
          </button>
          <button
            onClick={() => setDashboardOpen(true)}
            aria-label="Tableau de bord"
            className="flex h-11 w-11 items-center justify-center rounded-full text-white/95 hover:bg-white/20 hover:text-white active:scale-90 transition-all"
          >
            <SettingsIcon className="w-7 h-7" />
          </button>
          <button
            onClick={toggleSoundMute}
            aria-label={soundMuted ? "Activer les sons" : "Désactiver les sons (silencieux)"}
            className={`flex h-11 w-11 items-center justify-center rounded-full active:scale-90 transition-all ${
              soundMuted ? "bg-red-500/30 text-red-300 border border-red-400/50" : "text-white/95 hover:bg-white/20 hover:text-white"
            }`}
          >
            <SoundIcon className="w-6 h-6" mute={soundMuted} />
          </button>
        </div>

        {/* Right capsule: Quick Shooting Tools (Macro, Timer, Ratio, Grid, Zebra, Peaking, Burst, Flash, Flip) */}
        <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/75 p-2 backdrop-blur-xl shadow-xl overflow-x-auto max-w-[70vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={toggleMacroMode}
            aria-label="Mode Macro (Mise au point ultra-proche)"
            className={`flex h-11 w-11 items-center justify-center rounded-full active:scale-90 transition-all ${
              macroModeOn ? "bg-emerald-400 text-black font-bold shadow-[0_0_15px_rgba(52,211,153,0.6)] ring-2 ring-emerald-300" : "text-white/95 hover:bg-white/20 hover:text-white"
            }`}
          >
            <MacroFlowerIcon className="w-7 h-7" />
          </button>
          <button
            onClick={() => setVintageMaskMenuOpen((v) => !v)}
            aria-label="Viseur Optique Rétro / Masque Dépoli d'appareil vintage"
            className={`relative flex h-11 w-11 items-center justify-center rounded-full active:scale-90 transition-all ${
              vintageMask !== "none" ? "bg-amber-400 text-black font-bold shadow-[0_0_15px_rgba(245,158,11,0.7)] ring-2 ring-amber-300" : "text-white/95 hover:bg-white/20 hover:text-white"
            }`}
          >
            <VintageViewfinderIcon className="w-7 h-7" />
            {vintageMask !== "none" && (
              <span className="absolute -bottom-0.5 -right-0.5 text-[9px] font-mono font-black leading-none bg-black text-amber-400 px-1 py-0.2 rounded border border-amber-400/40">
                {vintageMask === "slr-prism" ? "SLR" : vintageMask === "tlr-6x6" ? "TLR" : vintageMask === "lens-circle" ? "LENS" : "35M"}
              </span>
            )}
          </button>
          <button
            onClick={cycleAspectMask}
            aria-label="Cadre de cadrage / Ratio"
            className={`relative flex h-11 w-11 items-center justify-center rounded-full active:scale-90 transition-all ${
              liveAspectMask !== "none" ? "bg-amber-400 text-black font-bold shadow-[0_0_12px_rgba(245,158,11,0.6)] ring-2 ring-amber-300" : "text-white/95 hover:bg-white/20 hover:text-white"
            }`}
          >
            <RatioFramingIcon className="w-7 h-7" />
            {liveAspectMask !== "none" && (
              <span className="absolute -bottom-0.5 -right-0.5 text-[9.5px] font-mono font-black leading-none bg-black text-amber-400 px-1 rounded border border-amber-400/40">
                {liveAspectMask === "65:24" ? "XP" : liveAspectMask}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowHistogram((h) => !h)}
            aria-label="Histogramme en direct"
            className={`flex h-11 w-11 items-center justify-center rounded-full active:scale-90 transition-all ${
              showHistogram ? "bg-cyan-400 text-black font-bold shadow-[0_0_12px_rgba(34,211,238,0.6)] ring-2 ring-cyan-300" : "text-white/95 hover:bg-white/20 hover:text-white"
            }`}
          >
            <HistogramIcon className="w-7 h-7" />
          </button>
          <button
            onClick={() => setTimerIndex((i) => (i + 1) % TIMER_STEPS.length)}
            aria-label="Retardateur"
            className={`relative flex h-11 w-11 items-center justify-center rounded-full active:scale-90 transition-all ${
              timerSeconds > 0 ? "bg-amber-400 text-black font-bold shadow-[0_0_12px_rgba(245,158,11,0.6)] ring-2 ring-amber-300" : "text-white/95 hover:bg-white/20 hover:text-white"
            }`}
          >
            <TimerIcon className="w-7 h-7" />
            {timerSeconds > 0 && (
              <span className="absolute -bottom-0.5 -right-0.5 text-[10px] font-mono font-black leading-none bg-black text-amber-400 px-1 rounded border border-amber-400/40">
                {timerSeconds}s
              </span>
            )}
          </button>
          <button
            onClick={() => setShowGrid((g) => !g)}
            aria-label="Grille"
            className={`flex h-11 w-11 items-center justify-center rounded-full active:scale-90 transition-all ${
              showGrid ? "bg-white text-black font-bold shadow-md ring-2 ring-white/60" : "text-white/95 hover:bg-white/20 hover:text-white"
            }`}
          >
            <GridIcon className="w-7 h-7" />
          </button>
          <button
            onClick={() => setZebraEnabled((z) => !z)}
            aria-label="Alerte de surexposition (zébrures)"
            className={`flex h-11 w-11 items-center justify-center rounded-full active:scale-90 transition-all ${
              zebraEnabled ? "bg-amber-400 text-black font-bold shadow-[0_0_12px_rgba(245,158,11,0.6)] ring-2 ring-amber-300" : "text-white/95 hover:bg-white/20 hover:text-white"
            }`}
          >
            <ZebraIcon className="w-7 h-7" />
          </button>
          <button
            onClick={() => setFocusPeakingEnabled((fp) => !fp)}
            aria-label="Aide à la mise au point (Focus Peaking vert)"
            className={`flex h-11 w-11 items-center justify-center rounded-full active:scale-90 transition-all ${
              focusPeakingEnabled ? "bg-emerald-400 text-black font-bold shadow-[0_0_12px_rgba(52,211,153,0.6)] ring-2 ring-emerald-300" : "text-white/95 hover:bg-white/20 hover:text-white"
            }`}
          >
            <FocusPeakingIcon className="w-7 h-7" />
          </button>
          <button
            onClick={() => setBurstMenuOpen((v) => !v)}
            aria-label="Mode rafale"
            className={`flex h-11 w-11 items-center justify-center rounded-full active:scale-90 transition-all ${
              burstModeArmed ? "bg-amber-400 text-black font-bold shadow-[0_0_12px_rgba(245,158,11,0.6)] ring-2 ring-amber-300" : "text-white/95 hover:bg-white/20 hover:text-white"
            }`}
          >
            <BurstIcon className="w-7 h-7" />
          </button>
          <button
            onClick={() => setFlashMenuOpen((v) => !v)}
            aria-label="Mode flash"
            className={`flex h-11 w-11 items-center justify-center rounded-full active:scale-90 transition-all ${
              flashMode !== "off" ? "bg-amber-400 text-black font-bold shadow-[0_0_12px_rgba(245,158,11,0.6)] ring-2 ring-amber-300" : "text-white/95 hover:bg-white/20 hover:text-white"
            }`}
          >
            <FlashModeIcon mode={flashMode} className="w-7 h-7" />
          </button>
          {capabilities.canSwitch && (
            <button
              onClick={flip}
              aria-label="Changer de caméra"
              className="flex h-11 w-11 items-center justify-center rounded-full text-white/95 hover:bg-white/20 hover:text-white active:scale-90 transition-all"
            >
              <FlipCameraIcon className="w-7 h-7" />
            </button>
          )}
        </div>
      </div>

      {vintageMaskMenuOpen && (
        <>
          <button className="fixed inset-0 z-30" aria-label="Fermer le menu viseur optique" onClick={() => setVintageMaskMenuOpen(false)} />
          <div
            className="absolute right-4 z-40 w-80 rounded-2xl border border-white/15 bg-zinc-950/95 p-2 backdrop-blur shadow-2xl"
            style={{ top: "calc(max(0.75rem, env(safe-area-inset-top)) + 3.25rem)" }}
          >
            <div className="px-3 py-1.5 border-b border-white/10 mb-1 flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400">
                Masque Viseur Rétro &amp; Dépoli
              </span>
              <span className="text-[10px] text-white/50">Optionnel</span>
            </div>
            {VINTAGE_VIEWFINDER_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setVintageMask(m.id);
                  setVintageMaskMenuOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-all ${
                  vintageMask === m.id ? "bg-amber-400/15 border border-amber-400/40" : "hover:bg-white/5"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-[10px] font-black border ${
                    vintageMask === m.id
                      ? "bg-amber-400 text-black border-amber-300 shadow-sm"
                      : "bg-white/10 text-white/70 border-white/10"
                  }`}
                >
                  {m.shortLabel}
                </div>
                <span className="flex-1">
                  <span className={`block text-xs font-bold ${vintageMask === m.id ? "text-amber-300" : "text-white"}`}>
                    {m.label}
                  </span>
                  <span className="block text-[10px] leading-tight text-white/50">{m.blurb}</span>
                </span>
                {vintageMask === m.id && <CheckIcon className="h-4 w-4 shrink-0 text-amber-400" />}
              </button>
            ))}
          </div>
        </>
      )}

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
            aria-label="Sélecteur d'émulsion et styles photographiques"
            className="flex flex-shrink-0 items-center gap-2 rounded-full border border-amber-400/40 bg-black/75 px-3 py-1.5 backdrop-blur shadow-lg active:scale-95 transition-all hover:border-amber-400"
          >
            <FilmCanisterBadge preset={preset ?? null} />
          </button>

          <button
            onClick={toggleMacroMode}
            aria-pressed={macroModeOn}
            className={`flex flex-shrink-0 items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold backdrop-blur shadow-md active:scale-95 transition-all ${
              macroModeOn
                ? "border-emerald-400 bg-emerald-400/25 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.4)]"
                : "border-white/30 bg-black/55 text-white"
            }`}
          >
            <MacroFlowerIcon className="w-5 h-5" />
            Macro (Détails+)
          </button>

          <button
            onClick={cycleVintageMask}
            aria-pressed={vintageMask !== "none"}
            aria-label="Changer de masque de viseur optique rétro"
            className={`flex flex-shrink-0 items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold backdrop-blur shadow-md active:scale-95 transition-all ${
              vintageMask !== "none"
                ? "border-amber-400 bg-amber-400/25 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] font-bold"
                : "border-white/30 bg-black/55 text-white"
            }`}
          >
            <VintageViewfinderIcon className="w-5 h-5" />
            {vintageMask === "none"
              ? "Viseur Rétro (OFF)"
              : vintageMask === "slr-prism"
              ? "Viseur SLR 1970"
              : vintageMask === "tlr-6x6"
              ? "Viseur 6×6 Dépoli"
              : vintageMask === "lens-circle"
              ? "Viseur Lentille"
              : "Cadre 35mm"}
          </button>

          <div className="flex flex-shrink-0 items-center gap-2 rounded-full border border-white/30 bg-black/55 px-3.5 py-2.5 backdrop-blur shadow-md">
            <button
              onClick={() => cycleIso(-1)}
              disabled={isoIndex === 0}
              aria-label="Diminuer l'ISO"
              className="px-2 text-xl leading-none text-white/90 disabled:opacity-30 active:scale-90"
            >
              −
            </button>
            <span className="w-16 text-center text-sm font-mono font-bold tabular-nums text-white">ISO {isoValue}</span>
            <button
              onClick={() => cycleIso(1)}
              disabled={isoIndex === ISO_STEPS.length - 1}
              aria-label="Augmenter l'ISO"
              className="px-2 text-xl leading-none text-white/90 disabled:opacity-30 active:scale-90"
            >
              +
            </button>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2 rounded-full border border-white/30 bg-black/55 px-3.5 py-2.5 backdrop-blur shadow-md">
            <button
              onClick={() => cycleKelvin(-1)}
              disabled={kelvinIndex === 0}
              aria-label="Refroidir la balance des blancs"
              className="px-2 text-xl leading-none text-white/90 disabled:opacity-30 active:scale-90"
            >
              −
            </button>
            <span className="w-16 text-center text-sm font-mono font-bold tabular-nums text-white">{kelvinValue}K</span>
            <button
              onClick={() => cycleKelvin(1)}
              disabled={kelvinIndex === KELVIN_STEPS.length - 1}
              aria-label="Réchauffer la balance des blancs"
              className="px-2 text-xl leading-none text-white/90 disabled:opacity-30 active:scale-90"
            >
              +
            </button>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2 rounded-full border border-white/30 bg-black/55 px-3.5 py-2.5 backdrop-blur shadow-md">
            <button
              onClick={() => setEvBias((v) => Math.max(-2, Math.round((v - 0.5) * 10) / 10))}
              aria-label="Diminuer l'exposition"
              className="px-2 text-xl leading-none text-white/90 active:scale-90"
            >
              −
            </button>
            <span className="w-12 text-center text-sm font-mono font-bold tabular-nums text-white">
              {evBias > 0 ? `+${evBias.toFixed(1)}` : evBias.toFixed(1)}
            </span>
            <button
              onClick={() => setEvBias((v) => Math.min(2, Math.round((v + 0.5) * 10) / 10))}
              aria-label="Augmenter l'exposition"
              className="px-2 text-xl leading-none text-white/90 active:scale-90"
            >
              +
            </button>
          </div>

          <button
            onClick={() => toggleStabilizer(setStabilizerOn)}
            aria-pressed={stabilizerOn}
            aria-label="Stabilisateur électronique"
            className={`flex flex-shrink-0 items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold backdrop-blur transition-all ${
              stabilizerOn ? "border-emerald-300 bg-emerald-300/20 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.3)]" : "border-white/30 bg-black/55 text-white"
            }`}
          >
            <StabilizerIcon className="w-5 h-5" />
            {stabilizerOn && !stabilizer.available ? "Stabilisateur (capteur indisponible)" : "Stabilisateur"}
          </button>

          <button
            onClick={() => toggleStabilizer(setSuperStabilizerOn)}
            aria-pressed={superStabilizerOn}
            aria-label="Ultra-stabilisateur électronique"
            className={`flex flex-shrink-0 items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold backdrop-blur transition-all ${
              superStabilizerOn ? "border-violet-300 bg-violet-300/20 text-violet-300 shadow-[0_0_10px_rgba(196,181,253,0.3)]" : "border-white/30 bg-black/55 text-white"
            }`}
          >
            <StabilizerIcon className="w-5 h-5" />
            {superStabilizerOn && !stabilizer.available ? "Ultra-stabilisateur (capteur indisponible)" : "Ultra-stabilisateur"}
          </button>

          {inSuperZoom && (
            <button
              onClick={() => setSuperZoomOn((v) => !v)}
              aria-pressed={superZoomOn}
              className={`flex flex-shrink-0 items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold backdrop-blur transition-all ${
                superZoomOn ? "border-cyan-300 bg-cyan-300/20 text-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.3)]" : "border-white/30 bg-black/55 text-white"
              }`}
            >
              <SparkleIcon className="w-5 h-5" />
              SuperZoom IA
            </button>
          )}

          <button
            onClick={() => setSuperContrastOn((v) => !v)}
            aria-pressed={superContrastOn}
            className={`flex flex-shrink-0 items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold backdrop-blur transition-all ${
              superContrastOn ? "border-cyan-300 bg-cyan-300/20 text-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.3)]" : "border-white/30 bg-black/55 text-white"
            }`}
          >
            <ContrastIcon className="w-5 h-5" />
            Super Contraste
          </button>

          <button
            onClick={() => setDenoiseAIOn((v) => !v)}
            aria-pressed={denoiseAIOn}
            className={`flex flex-shrink-0 items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold backdrop-blur transition-all ${
              denoiseAIOn ? "border-cyan-300 bg-cyan-300/20 text-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.3)]" : "border-white/30 bg-black/55 text-white"
            }`}
          >
            <SparkleIcon className="w-5 h-5" />
            Débruitage IA
          </button>

          <button
            onClick={() => setSuperResOn((v) => !v)}
            aria-pressed={superResOn}
            className={`flex flex-shrink-0 items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold backdrop-blur transition-all ${
              superResOn ? "border-cyan-300 bg-cyan-300/20 text-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.3)]" : "border-white/30 bg-black/55 text-white"
            }`}
          >
            <SparkleIcon className="w-5 h-5" />
            Super-résolution IA
          </button>

          <button
            onClick={() => setBurstMenuOpen((v) => !v)}
            aria-pressed={burstModeArmed}
            className={`flex flex-shrink-0 items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold backdrop-blur transition-all ${
              burstModeArmed ? "border-amber-300 bg-amber-300/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]" : "border-white/30 bg-black/55 text-white"
            }`}
          >
            <BurstIcon className="w-5 h-5" />
            {burstModeArmed ? `Rafale (${burstSpeed === "fast" ? "10fps" : burstSpeed === "eco" ? "3fps" : "5fps"})` : "Mode Rafale"}
          </button>

          <button
            onClick={() => setLongExposureMenuOpen((v) => !v)}
            aria-pressed={longExposureSeconds > 0}
            className={`flex flex-shrink-0 items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold backdrop-blur transition-all ${
              longExposureSeconds > 0 ? "border-amber-300 bg-amber-300/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]" : "border-white/30 bg-black/55 text-white"
            }`}
          >
            <LongExposureIcon className="w-5 h-5" />
            {longExposureSeconds > 0 ? `Pose longue ${longExposureSeconds}s` : "Pose longue"}
          </button>
        </div>

        {stayOnCapture && (pendingSaves > 0 || recentPhotos.length > 0) && (
          <div className="flex gap-2.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {Array.from({ length: pendingSaves }).map((_, i) => (
              <div
                key={`pending-${i}`}
                aria-label="Enregistrement en cours"
                className="h-16 w-16 shrink-0 animate-pulse rounded-2xl border-2 border-white/25 bg-white/10 shadow-md"
              />
            ))}
            {recentPhotos.slice(0, 15).map((p, i) => (
              <button
                key={p.id}
                onClick={() => setViewerPhotoIndex(i)}
                aria-label="Ouvrir la photo en grand"
                className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-white/30 shadow-md active:scale-90 transition-transform bg-black/50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(p.id)} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Shutter Bar with Much Larger Preview Box */}
        <div className="grid grid-cols-3 items-center pb-2 px-6">
          <div className="flex justify-start">
            {lastPhoto && !stayOnCapture ? (
              <button
                onClick={() => setViewerPhotoIndex(0)}
                aria-label="Ouvrir la dernière photo en grand"
                className="h-17 w-17 overflow-hidden rounded-2xl border-2 border-white/95 shadow-2xl relative active:scale-90 transition-transform bg-black/60 ring-2 ring-white/20"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(lastPhoto.id)} alt="" className="h-full w-full object-cover" />
                {recentPhotos.length > 1 && (
                  <span className="absolute bottom-1 right-1 bg-black/85 backdrop-blur text-[11px] font-mono font-black text-amber-300 px-1.5 rounded-sm border border-white/30">
                    {recentPhotos.length}
                  </span>
                )}
              </button>
            ) : (
              <div className="h-17 w-17" aria-hidden />
            )}
          </div>

          <div className="relative justify-self-center">
            <button
              onPointerDown={handleShutterDown}
              onPointerUp={handleShutterUp}
              onPointerLeave={handleShutterUp}
              disabled={!ready}
              aria-label="Déclencher"
              className={`flex h-[90px] w-[90px] items-center justify-center rounded-full border-[5px] shadow-2xl active:scale-95 transition-all disabled:opacity-40 ${
                burstCount > 0 ? "border-amber-300 ring-4 ring-amber-400/50" : "border-white/90 ring-4 ring-white/20"
              }`}
            >
              <span className={`h-[72px] w-[72px] rounded-full bg-white shadow-inner transition-transform ${capturing ? "scale-75" : ""}`} />
            </button>
            {burstCount > 0 && (
              <span className="absolute -top-2 -right-2 flex h-8 min-w-8 items-center justify-center rounded-full bg-amber-400 px-2 text-xs font-black text-black shadow-lg">
                {burstCount}
              </span>
            )}
          </div>

          <div className="h-17 w-17" aria-hidden />
        </div>
      </div>

      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-white/50">
          <CameraIcon className="w-10 h-10 animate-pulse" />
        </div>
      )}

      {burstMenuOpen && (
        <>
          <button
            className="fixed inset-0 z-30"
            aria-label="Fermer le menu rafale"
            onClick={() => setBurstMenuOpen(false)}
          />
          <div
            className="absolute left-4 right-4 z-40 rounded-2xl border border-white/15 bg-zinc-950/95 p-3.5 backdrop-blur shadow-2xl"
            style={{ bottom: "calc(max(1.5rem, env(safe-area-inset-bottom)) + 9rem)" }}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <BurstIcon className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Mode Prise Rafale</span>
              </div>
              <span className="text-[10px] font-mono text-white/50">CADENCE</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-3">
              <button
                onClick={() => {
                  setBurstSpeed("fast");
                  setBurstModeArmed(true);
                  setBurstMenuOpen(false);
                }}
                className={`flex flex-col items-center gap-1 rounded-xl p-2.5 border transition-all ${
                  burstSpeed === "fast" && burstModeArmed ? "border-amber-400 bg-amber-400/20 text-white" : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                <span className="text-sm font-bold text-amber-300">10 fps</span>
                <span className="text-[10px] text-white/50">Ultra Rapide</span>
              </button>
              <button
                onClick={() => {
                  setBurstSpeed("normal");
                  setBurstModeArmed(true);
                  setBurstMenuOpen(false);
                }}
                className={`flex flex-col items-center gap-1 rounded-xl p-2.5 border transition-all ${
                  burstSpeed === "normal" && burstModeArmed ? "border-amber-400 bg-amber-400/20 text-white" : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                <span className="text-sm font-bold text-amber-300">5 fps</span>
                <span className="text-[10px] text-white/50">Standard</span>
              </button>
              <button
                onClick={() => {
                  setBurstSpeed("eco");
                  setBurstModeArmed(true);
                  setBurstMenuOpen(false);
                }}
                className={`flex flex-col items-center gap-1 rounded-xl p-2.5 border transition-all ${
                  burstSpeed === "eco" && burstModeArmed ? "border-amber-400 bg-amber-400/20 text-white" : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                <span className="text-sm font-bold text-amber-300">3 fps</span>
                <span className="text-[10px] text-white/50">Éco / Précision</span>
              </button>
            </div>
            <div className="pt-3 flex justify-between items-center border-t border-white/10 mt-3 text-xs">
              <button
                onClick={() => {
                  setBurstModeArmed((v) => !v);
                  setBurstMenuOpen(false);
                }}
                className={`px-3 py-1 rounded-full font-medium transition-colors ${
                  burstModeArmed ? "bg-amber-400 text-black font-bold" : "bg-white/10 text-white/70"
                }`}
              >
                {burstModeArmed ? "Armé" : "Désactivé"}
              </button>
              <span className="text-[11px] text-white/50">Maintenez le déclencheur</span>
            </div>
          </div>
        </>
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

      {/* Full-Screen Ultra-High-Res Lightbox when clicking on the preview box */}
      {viewerPhotoIndex !== null && recentPhotos.length > 0 && (
        <div className="fixed inset-0 z-50">
          <PhotoViewer
            items={recentPhotos}
            initialIndex={viewerPhotoIndex}
            onClose={() => setViewerPhotoIndex(null)}
            onEdit={(m) => {
              setViewerPhotoIndex(null);
              onOpenPhoto(m);
            }}
            onDeleted={() => {
              setViewerPhotoIndex(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
