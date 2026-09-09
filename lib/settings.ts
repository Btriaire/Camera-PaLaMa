"use client";

// Small localStorage-backed prefs for the dashboard — this app has no
// account/server-side settings, so "settings" just means "what the
// viewfinder starts with next time."
export type Settings = {
  defaultPresetId: string | null;
  gridDefault: boolean;
};

const KEY = "camera-palama:settings";

const DEFAULTS: Settings = {
  defaultPresetId: null,
  gridDefault: false,
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
