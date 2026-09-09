"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings for the Image Capture API — not yet in TS's own DOM lib,
// and only implemented on Chromium (Android Chrome, desktop Chrome/Edge).
// Where it exists, takePhoto() taps the camera pipeline directly and can
// return a still well above the getUserMedia preview stream's resolution
// (e.g. a 12MP JPEG while the viewfinder itself only streams 1080p) — the
// closest the open web gets to "shoot at the sensor's real resolution".
interface ImageCaptureLike {
  takePhoto(options?: { imageWidth?: number; imageHeight?: number }): Promise<Blob>;
  getPhotoCapabilities(): Promise<{
    imageWidth?: { max: number; min: number };
    imageHeight?: { max: number; min: number };
  }>;
}
type ImageCaptureCtor = new (track: MediaStreamTrack) => ImageCaptureLike;

export type CameraFacing = "user" | "environment";

export type CameraCapabilities = {
  torch: boolean;
  zoom: { min: number; max: number; step: number } | null;
  canSwitch: boolean;
};

export type CapturedPhoto = {
  bitmap: ImageBitmap;
  width: number;
  height: number;
};

export type TrackSettings = {
  width: number | null;
  height: number | null;
  frameRate: number | null;
};

// Wraps getUserMedia + ImageCapture behind one hook: start/stop the stream,
// flip front/back, toggle torch, adjust zoom, and take the highest-resolution
// still the current device/browser will actually give us.
//
// `autoStart: false` skips the automatic getUserMedia call on mount — the
// caller triggers it later via `requestAccess()`, e.g. after a friendly
// "why we need this" screen instead of jumping straight to the browser's
// native permission prompt with no context.
export function useCamera(autoStart: boolean = true) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [facing, setFacing] = useState<CameraFacing>("environment");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<CameraCapabilities>({
    torch: false,
    zoom: null,
    canSwitch: false,
  });
  const [torchOn, setTorchOn] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [trackSettings, setTrackSettings] = useState<TrackSettings>({
    width: null,
    height: null,
    frameRate: null,
  });

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    trackRef.current = null;
  }, []);

  const start = useCallback(async (nextFacing: CameraFacing) => {
    setError(null);
    stop();
    try {
      // Ask for the largest frame the device will offer; browsers clamp to
      // whatever the sensor/driver actually supports, so "ideal" here is
      // safe — it never throws for being too ambitious, unlike "exact".
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: nextFacing,
          width: { ideal: 7680 },
          height: { ideal: 4320 },
        },
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
        torch?: boolean;
        zoom?: { min: number; max: number; step: number };
      };
      let canSwitch = false;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        canSwitch = devices.filter((d) => d.kind === "videoinput").length > 1;
      } catch {
        canSwitch = false;
      }
      setCapabilities({
        torch: Boolean(caps.torch),
        zoom: caps.zoom ? { min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step || 0.1 } : null,
        canSwitch,
      });
      setTorchOn(false);
      setZoom(caps.zoom?.min ?? 1);
      setFacing(nextFacing);
      const settings = track.getSettings?.() ?? {};
      setTrackSettings({
        width: settings.width ?? null,
        height: settings.height ?? null,
        frameRate: settings.frameRate ?? null,
      });
      setReady(true);
    } catch (e) {
      setReady(false);
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Accès à la caméra refusé — autorise-la dans les réglages du navigateur."
          : "Impossible d'accéder à la caméra."
      );
    }
  }, [stop]);

  useEffect(() => {
    if (autoStart) start("environment");
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestAccess = useCallback(() => start("environment"), [start]);

  const flip = useCallback(() => {
    start(facing === "environment" ? "user" : "environment");
  }, [facing, start]);

  const setTorch = useCallback(async (on: boolean) => {
    const track = trackRef.current;
    if (!track || !capabilities.torch) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
      setTorchOn(on);
    } catch {
      // Some browsers report the capability but reject the constraint anyway.
    }
  }, [capabilities.torch]);

  const applyZoom = useCallback(async (value: number) => {
    const track = trackRef.current;
    if (!track || !capabilities.zoom) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: value } as MediaTrackConstraintSet] });
      setZoom(value);
    } catch {
      // Ignore — zoom is a nice-to-have, not worth surfacing an error for.
    }
  }, [capabilities.zoom]);

  // Takes the highest-resolution still the platform will give us: prefer
  // ImageCapture.takePhoto() at its reported max size, and only fall back to
  // grabbing the live preview frame (capped at the viewfinder's own
  // resolution) when ImageCapture isn't available — notably, all of iOS Safari.
  const capture = useCallback(async (): Promise<CapturedPhoto | null> => {
    const track = trackRef.current;
    const video = videoRef.current;
    if (!track) return null;

    const ImageCapture = (globalThis as { ImageCapture?: ImageCaptureCtor }).ImageCapture;
    if (ImageCapture) {
      try {
        const capture = new ImageCapture(track);
        const caps = await capture.getPhotoCapabilities();
        const blob = await capture.takePhoto({
          imageWidth: caps.imageWidth?.max,
          imageHeight: caps.imageHeight?.max,
        });
        const bitmap = await createImageBitmap(blob);
        return { bitmap, width: bitmap.width, height: bitmap.height };
      } catch {
        // Fall through to the video-frame fallback below.
      }
    }

    if (!video || video.readyState < 2) return null;
    const bitmap = await createImageBitmap(video);
    return { bitmap, width: video.videoWidth, height: video.videoHeight };
  }, []);

  return {
    videoRef,
    ready,
    error,
    facing,
    flip,
    capabilities,
    torchOn,
    setTorch,
    zoom,
    setZoom: applyZoom,
    trackSettings,
    capture,
    stop,
    requestAccess,
  };
}
