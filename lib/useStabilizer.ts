"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Electronic stabilization, viewfinder-only: there's no way to move a lens
// element from a web page, so this is the same trick real EIS uses once you
// take the lens out of it — crop in a bit for margin, then shift that crop
// opposite to the phone's own jitter so the framing holds steadier than the
// hand doing it. Viewfinder applies this to the live preview every frame,
// and (for Pose longue) to each accumulated frame of the actual output too
// — see runLongExposureCapture — since that's the one capture mode long
// enough for hand-shake to visibly blur or ghost the result. A quick single
// shot still grabs the plain, uncropped frame: there's no way to know what
// shake happened during an exposure that's already over by the time this
// hook could react to it.
//
// Same platform gap as the level indicator (lib/useDeviceTilt.ts): Android
// and desktop Chrome fire 'deviceorientation' the moment something listens;
// iOS 13+ Safari gates it behind DeviceOrientationEvent.requestPermission(),
// which has to run from a user-gesture handler, not an effect — an effect
// calling it silently no-ops (rejected outside a gesture), which is exactly
// why the stabilizer used to just do nothing on iOS with no error in sight:
// "Stabilisateur" defaults to on, so most people never tap it and never get
// the one gesture the prompt needs. `requestPermission` below is that
// gesture hook — Viewfinder's Stabilisateur/Ultra-stabilisateur buttons call
// it from their own onClick before toggling.
//
// beta/gamma go into refs, not state: a phone reports orientation at a much
// higher rate than a preview needs new renders, and the render loop that
// consumes this (Viewfinder's rAF loop) already reads other fast-changing
// values the same way, precisely to avoid a render storm.
export type Stabilizer = {
  available: boolean;
  // Same value as `available`, mirrored into a ref for the long-lived rAF
  // closure in Viewfinder's render loop — that effect doesn't list this
  // hook's return value in its dependency array (restarting the whole
  // WebGL context every time a sensor event fires would be absurd), so it
  // needs a ref to read the current value rather than the stale one from
  // whenever the effect last ran.
  availableRef: React.RefObject<boolean>;
  // Signed degrees of drift from the slow-moving baseline — NOT yet
  // normalized to any deadzone. "Stabilisateur" and "Ultra-stabilisateur"
  // (lib/stabilizerCrop.ts's shakeAxis) saturate at different tilt amounts,
  // so the caller picks the deadzone and does that division itself rather
  // than this hook baking one strength in.
  deltaXDegRef: React.RefObject<number>;
  deltaYDegRef: React.RefObject<number>;
  // Call from a user-gesture event handler (a click, never an effect) to
  // ask iOS Safari for orientation access. Resolves true once the listener
  // is actually attached — immediately, with no prompt, on platforms that
  // were never gated in the first place. Resolves false if the platform
  // has no orientation API at all, or the user declines the prompt.
  requestPermission: () => Promise<boolean>;
};

const BASELINE_SMOOTHING = 0.02; // per-sample EMA weight -- slow, tracks intentional framing, not shake

export function useStabilizer(): Stabilizer {
  const [available, setAvailable] = useState(false);
  const availableRef = useRef(false);
  const deltaXDegRef = useRef(0);
  const deltaYDegRef = useRef(0);
  const baseline = useRef<{ beta: number; gamma: number } | null>(null);
  const listening = useRef(false);

  const onOrientation = useCallback((e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null) return;
    if (!availableRef.current) {
      availableRef.current = true;
      setAvailable(true);
    }
    if (!baseline.current) {
      baseline.current = { beta: e.beta, gamma: e.gamma };
      return;
    }
    baseline.current.beta += (e.beta - baseline.current.beta) * BASELINE_SMOOTHING;
    baseline.current.gamma += (e.gamma - baseline.current.gamma) * BASELINE_SMOOTHING;
    deltaYDegRef.current = e.beta - baseline.current.beta;
    deltaXDegRef.current = e.gamma - baseline.current.gamma;
  }, []);

  // Shared by the ungated auto-attach effect below and requestPermission's
  // post-grant attach, so a platform that's already listening (or grants
  // twice, e.g. two button taps) never double-registers the listener.
  const attach = useCallback(() => {
    if (listening.current) return;
    listening.current = true;
    window.addEventListener("deviceorientation", onOrientation);
  }, [onOrientation]);

  useEffect(() => {
    if (typeof DeviceOrientationEvent === "undefined") return;
    const gated =
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission ===
      "function";
    if (gated) return; // needs requestPermission() from a user gesture -- see below
    attach();
    return () => {
      if (listening.current) {
        window.removeEventListener("deviceorientation", onOrientation);
        listening.current = false;
      }
    };
  }, [attach, onOrientation]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof DeviceOrientationEvent === "undefined") return false;
    const gatedCtor = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof gatedCtor.requestPermission !== "function") return true; // never gated -- the effect above already attached
    try {
      // Called AS DeviceOrientationEvent.requestPermission(), not through a
      // detached reference — WebKit's native implementation is receiver-
      // sensitive and throws "Illegal invocation" when called unbound,
      // which a try/catch here would otherwise turn into a silent,
      // permanent "capteur indisponible" with no real prompt ever shown.
      const result = await gatedCtor.requestPermission();
      if (result !== "granted") return false;
      attach();
      return true;
    } catch {
      return false;
    }
  }, [attach]);

  return { available, availableRef, deltaXDegRef, deltaYDegRef, requestPermission };
}
