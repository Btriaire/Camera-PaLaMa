"use client";

import { useEffect, useState } from "react";

// Horizon-level indicator and Gyroscope sensor support.
// DeviceOrientationEvent's gamma is the left-right tilt of the phone (roll),
// and beta is the front-back tilt (pitch) — exactly what an electronic horizon level needs.
// On Android & desktop, it starts immediately.
// On iOS 13+ (iPhone / iPad), it requires DeviceOrientationEvent.requestPermission() inside a user gesture.

export type DeviceTiltState = {
  roll: number | null; // left-right tilt (-180..180 deg)
  pitch: number | null; // front-back tilt (-90..90 deg)
  isLevel: boolean; // true when within +/- 1.0 deg
  available: boolean;
  requestPermission: () => Promise<boolean>;
};

let globalRoll: number | null = null;
let globalPitch: number | null = null;
let listeners: Array<(roll: number | null, pitch: number | null) => void> = [];
let isListening = false;

function onOrientationEvent(e: DeviceOrientationEvent) {
  if (e.gamma !== null && e.beta !== null) {
    globalRoll = e.gamma;
    globalPitch = e.beta;
    for (const listener of listeners) {
      listener(globalRoll, globalPitch);
    }
  }
}

export async function requestGyroPermission(): Promise<boolean> {
  if (typeof DeviceOrientationEvent === "undefined") return false;
  const doe = DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<"granted" | "denied">;
  };
  if (typeof doe.requestPermission === "function") {
    try {
      const res = await doe.requestPermission();
      if (res === "granted") {
        if (!isListening) {
          window.addEventListener("deviceorientation", onOrientationEvent, true);
          isListening = true;
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  } else {
    if (!isListening) {
      window.addEventListener("deviceorientation", onOrientationEvent, true);
      isListening = true;
    }
    return true;
  }
}

export function useDeviceTilt(): number | null {
  const [roll, setRoll] = useState<number | null>(globalRoll);

  useEffect(() => {
    const handler = (r: number | null) => {
      setRoll(r);
    };
    listeners.push(handler);

    // If not gated (Android / Desktop), auto-listen
    const doe = typeof DeviceOrientationEvent !== "undefined" ? (DeviceOrientationEvent as unknown as { requestPermission?: unknown }) : null;
    const isGated = doe && typeof doe.requestPermission === "function";

    if (!isGated && !isListening && typeof window !== "undefined") {
      window.addEventListener("deviceorientation", onOrientationEvent, true);
      isListening = true;
    }

    // On iOS, listen for first user pointer/touch to auto-arm the permission
    const onUserTouch = async () => {
      await requestGyroPermission();
      window.removeEventListener("pointerdown", onUserTouch);
      window.removeEventListener("touchstart", onUserTouch);
    };

    if (isGated && !isListening && typeof window !== "undefined") {
      window.addEventListener("pointerdown", onUserTouch, { once: true });
      window.addEventListener("touchstart", onUserTouch, { once: true });
    }

    return () => {
      listeners = listeners.filter((l) => l !== handler);
    };
  }, []);

  return roll;
}

export function useFullDeviceTilt(): DeviceTiltState {
  const [roll, setRoll] = useState<number | null>(globalRoll);
  const [pitch, setPitch] = useState<number | null>(globalPitch);

  useEffect(() => {
    const handler = (r: number | null, p: number | null) => {
      setRoll(r);
      setPitch(p);
    };
    listeners.push(handler);

    const doe = typeof DeviceOrientationEvent !== "undefined" ? (DeviceOrientationEvent as unknown as { requestPermission?: unknown }) : null;
    const isGated = doe && typeof doe.requestPermission === "function";

    if (!isGated && !isListening && typeof window !== "undefined") {
      window.addEventListener("deviceorientation", onOrientationEvent, true);
      isListening = true;
    }

    const onUserTouch = async () => {
      await requestGyroPermission();
      window.removeEventListener("pointerdown", onUserTouch);
      window.removeEventListener("touchstart", onUserTouch);
    };

    if (isGated && !isListening && typeof window !== "undefined") {
      window.addEventListener("pointerdown", onUserTouch, { once: true });
      window.addEventListener("touchstart", onUserTouch, { once: true });
    }

    return () => {
      listeners = listeners.filter((l) => l !== handler);
    };
  }, []);

  const isLevel = roll !== null && Math.abs(roll) < 1.0;
  const available = roll !== null;

  return {
    roll,
    pitch,
    isLevel,
    available,
    requestPermission: requestGyroPermission,
  };
}
