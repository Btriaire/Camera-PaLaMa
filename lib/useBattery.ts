"use client";

import { useEffect, useState } from "react";

interface BatteryManagerLike extends EventTarget {
  level: number;
}

// The Battery Status API is gone from most browsers now (privacy fingerprinting
// concerns) — feature-detected, returns null everywhere it's unavailable so
// the HUD can just hide the readout instead of showing a fake percentage.
export function useBattery(): number | null {
  const [level, setLevel] = useState<number | null>(null);

  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    if (!nav.getBattery) return;
    let battery: BatteryManagerLike | null = null;
    const update = () => battery && setLevel(battery.level);

    nav.getBattery().then((b) => {
      battery = b;
      update();
      b.addEventListener("levelchange", update);
    });
    return () => {
      battery?.removeEventListener("levelchange", update);
    };
  }, []);

  return level;
}
