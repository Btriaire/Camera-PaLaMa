"use client";

import { useEffect, useRef, useState } from "react";

// Electronic stabilization, viewfinder-only: there's no way to move a lens
// element from a web page, so this is the same trick real EIS uses once you
// take the lens out of it — crop in a bit for margin, then shift that crop
// opposite to the phone's own jitter so the framing holds steadier than the
// hand doing it. It only smooths what you SEE while composing; a capture
// still grabs the plain, uncropped frame, the same as with this off.
//
// Same platform gap as the level indicator (lib/useDeviceTilt.ts): Android
// and desktop Chrome fire 'deviceorientation' the moment something listens;
// iOS 13+ Safari gates it behind DeviceOrientationEvent.requestPermission(),
// which has to run from a user-gesture handler, not an effect — not wired up
// here either, so this quietly does nothing on iOS rather than fake motion
// data it doesn't have. `available` reflects that, for UI that wants to say so.
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
  // Each in roughly [-1, 1] — how far current orientation has drifted from
  // the slow-moving baseline, saturating at BASELINE_DEADZONE_DEG of tilt.
  // The caller decides how many pixels of crop margin that maps to.
  shakeXRef: React.RefObject<number>;
  shakeYRef: React.RefObject<number>;
};

const BASELINE_SMOOTHING = 0.02; // per-sample EMA weight -- slow, tracks intentional framing, not shake
const SHAKE_DEADZONE_DEG = 4; // tilt delta from baseline that saturates the compensation

export function useStabilizer(): Stabilizer {
  const [available, setAvailable] = useState(false);
  const availableRef = useRef(false);
  const shakeXRef = useRef(0);
  const shakeYRef = useRef(0);
  const baseline = useRef<{ beta: number; gamma: number } | null>(null);

  useEffect(() => {
    if (typeof DeviceOrientationEvent === "undefined") return;
    const gated =
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission ===
      "function";
    if (gated) return;

    const onOrientation = (e: DeviceOrientationEvent) => {
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
      const deltaBeta = e.beta - baseline.current.beta;
      const deltaGamma = e.gamma - baseline.current.gamma;
      shakeYRef.current = Math.max(-1, Math.min(1, deltaBeta / SHAKE_DEADZONE_DEG));
      shakeXRef.current = Math.max(-1, Math.min(1, deltaGamma / SHAKE_DEADZONE_DEG));
    };
    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, []);

  return { available, availableRef, shakeXRef, shakeYRef };
}
