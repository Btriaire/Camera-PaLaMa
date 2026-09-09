"use client";

import { useEffect, useRef, useState } from "react";
import { useCamera } from "@/lib/useCamera";
import { useBattery } from "@/lib/useBattery";
import { useClock } from "@/lib/useClock";
import { GLRenderer } from "@/lib/gl/renderer";
import { Adjustments, NEUTRAL_ADJUSTMENTS } from "@/lib/types";
import { getPreset } from "@/lib/presets";
import Hud from "./Hud";
import CameraPicker from "./CameraPicker";
import {
  ApertureIcon,
  CameraIcon,
  FlashIcon,
  FlipCameraIcon,
  GalleryGridIcon,
  GridIcon,
} from "@/components/Icons";

// Live viewfinder: shows the camera feed through the same WebGL filter
// pipeline used for the final export, so the vintage-camera look you frame
// with is the look you get — no surprise after the shutter. The preview
// texture is capped at 1080 on its long edge for a smooth 60fps loop; the
// actual capture (see useCamera.capture) grabs a full independent still at
// the sensor's native resolution, unrelated to this preview's size.
export default function Viewfinder({
  presetId,
  onSelectPreset,
  onCapture,
  onOpenGallery,
}: {
  presetId: string | null;
  onSelectPreset: (id: string | null) => void;
  onCapture: (bitmap: ImageBitmap, width: number, height: number, adjustments: Adjustments) => void;
  onOpenGallery: () => void;
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
  } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<GLRenderer | null>(null);
  const rafRef = useRef<number | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [evBias, setEvBias] = useState(0);
  const [shotCount, setShotCount] = useState(0);
  const battery = useBattery();
  const { elapsedSeconds, now } = useClock();

  const preset = getPreset(presetId);
  const baseAdjustments: Adjustments = { ...NEUTRAL_ADJUSTMENTS, ...preset?.adjustments };
  const adjustments: Adjustments = { ...baseAdjustments, exposure: baseAdjustments.exposure + evBias };
  const hudSkin = preset?.hud ?? "modern";

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !ready) return;

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
  }, [ready, presetId, evBias]);

  const handleShutter = async () => {
    if (capturing) return;
    setCapturing(true);
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

  if (pickerOpen) {
    return (
      <CameraPicker
        activePresetId={presetId}
        onSelect={(id) => {
          onSelectPreset(id);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    );
  }

  return (
    <div className="relative flex-1 h-dvh bg-black overflow-hidden">
      <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover opacity-0" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" />

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
        shotCount={shotCount}
        elapsedSeconds={elapsedSeconds}
        batteryLevel={battery}
        now={now}
      />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-white/70">
          {error}
        </div>
      )}

      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          onClick={onOpenGallery}
          aria-label="Galerie"
          className="rounded-full bg-black/40 p-2.5 text-white backdrop-blur"
        >
          <GalleryGridIcon />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid((g) => !g)}
            aria-label="Grille"
            className={`rounded-full p-2.5 backdrop-blur ${showGrid ? "bg-white text-black" : "bg-black/40 text-white"}`}
          >
            <GridIcon className="w-5 h-5" />
          </button>
          {capabilities.torch && (
            <button
              onClick={() => setTorch(!torchOn)}
              aria-label="Flash"
              className={`rounded-full p-2.5 backdrop-blur ${
                torchOn ? "bg-white text-black" : "bg-black/40 text-white"
              }`}
            >
              <FlashIcon className="w-5 h-5" off={!torchOn} />
            </button>
          )}
          {capabilities.canSwitch && (
            <button
              onClick={flip}
              aria-label="Changer de caméra"
              className="rounded-full bg-black/40 p-2.5 text-white backdrop-blur"
            >
              <FlipCameraIcon className="w-5 h-5" />
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
        <div className="flex items-center justify-between px-4">
          <button
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-white/25 bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur"
          >
            <ApertureIcon className="w-4 h-4" />
            {preset?.label ?? "Naturel"}
          </button>

          <div className="flex items-center gap-2 rounded-full border border-white/25 bg-black/40 px-2 py-1 backdrop-blur">
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

        <div className="flex items-center justify-center pb-2">
          <button
            onClick={handleShutter}
            disabled={!ready || capturing}
            aria-label="Déclencher"
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white/80 disabled:opacity-40"
          >
            <span className={`h-14 w-14 rounded-full bg-white transition-transform ${capturing ? "scale-75" : ""}`} />
          </button>
        </div>
      </div>

      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-white/50">
          <CameraIcon className="w-10 h-10 animate-pulse" />
        </div>
      )}
    </div>
  );
}
