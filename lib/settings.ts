"use client";

// Small localStorage-backed prefs for the dashboard — this app has no
// account/server-side settings, so "settings" just means "what the
// viewfinder starts with next time."
export type Settings = {
  defaultPresetId: string | null;
  gridDefault: boolean;
  // When on, taking a photo saves it immediately (with whatever style/ISO/K
  // is live) and stays on the viewfinder instead of opening the editor —
  // shots pile up in a filmstrip so you can keep shooting without breaking
  // flow, and tap one later to actually edit it.
  stayOnCapture: boolean;
};

const KEY = "camera-palama:settings";

const DEFAULTS: Settings = {
  defaultPresetId: null,
  gridDefault: false,
  stayOnCapture: false,
};

export function getSettings(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(settings: Settings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(settings));
}

const INTRO_KEY = "camera-palama:intro-seen";

export function hasSeenIntro(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return true;
  }
}

export function markIntroSeen() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INTRO_KEY, "1");
}
