"use client";

import { useEffect, useState } from "react";

// Horizon-level indicator support. DeviceOrientationEvent's gamma is the
// left-right tilt of the phone -- exactly what a bubble level needs.
// Android/desktop Chrome fire it as soon as something listens; iOS 13+
// Safari gates it behind DeviceOrientationEvent.requestPermission(), which
// must run inside a user-gesture handler, not an effect. Wiring up that
// gesture-triggered prompt is a real chunk of its own UI (see the
// ImageCapture / tap-to-focus gaps already called out elsewhere in this
// app) -- left for later. Until then this simply returns null on iOS and
// the level indicator stays hidden there, same graceful-degrade approach
// as the rest of the app takes for browser gaps it can't paper over.
export function useDeviceTilt(): number | null {
  const [tiltDeg, setTiltDeg] = useState<number | null>(null);

  useEffect(() => {
    if (typeof DeviceOrientationEvent === "undefined") return;
    const gated =
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission ===
      "function";
    if (gated) return;

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null) setTiltDeg(e.gamma);
    };
    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, []);

  return tiltDeg;
}
