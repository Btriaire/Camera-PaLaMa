"use client";

import React from "react";
import { Preset } from "@/lib/types";

export type FilmCanisterStyle = {
  brandName: string;
  filmName: string;
  iso: string | number;
  process: "C-41" | "B&W" | "E-6" | "CINEMA" | "INSTANT" | "SPECIAL";
  bodyBg: string;
  bodyGradient: string;
  accentColor: string;
  textColor: string;
  subTextColor: string;
  stripeColor?: string;
  hasChecker?: boolean;
  hasRainbow?: boolean;
  dxCode: [boolean, boolean, boolean, boolean, boolean, boolean]; // 6 conductive silver/black patches
  filmBaseColor: string; // Acetate color
};

export const FILM_STYLES: Record<string, FilmCanisterStyle> = {
  "portra-160": {
    brandName: "KODAK",
    filmName: "PORTRA 160",
    iso: 160,
    process: "C-41",
    bodyBg: "#eab308",
    bodyGradient: "linear-gradient(135deg, #facc15 0%, #ca8a04 50%, #854d0e 100%)",
    accentColor: "#dc2626",
    textColor: "#18181b",
    subTextColor: "#1e3a8a",
    stripeColor: "#dc2626",
    dxCode: [true, false, true, true, false, true],
    filmBaseColor: "#6c411b",
  },
  "portra-400": {
    brandName: "KODAK",
    filmName: "PORTRA 400",
    iso: 400,
    process: "C-41",
    bodyBg: "#eab308",
    bodyGradient: "linear-gradient(135deg, #fde047 0%, #eab308 40%, #92400e 100%)",
    accentColor: "#dc2626",
    textColor: "#09090b",
    subTextColor: "#1d4ed8",
    stripeColor: "#dc2626",
    dxCode: [true, true, false, true, false, true],
    filmBaseColor: "#6c411b",
  },
  "portra-800": {
    brandName: "KODAK",
    filmName: "PORTRA 800",
    iso: 800,
    process: "C-41",
    bodyBg: "#eab308",
    bodyGradient: "linear-gradient(135deg, #facc15 0%, #d97706 45%, #78350f 100%)",
    accentColor: "#dc2626",
    textColor: "#09090b",
    subTextColor: "#2563eb",
    stripeColor: "#dc2626",
    dxCode: [true, true, true, false, false, true],
    filmBaseColor: "#6c411b",
  },
  "ektar-100": {
    brandName: "KODAK",
    filmName: "EKTAR 100",
    iso: 100,
    process: "C-41",
    bodyBg: "#b91c1c",
    bodyGradient: "linear-gradient(135deg, #ef4444 0%, #b91c1c 45%, #450a0a 100%)",
    accentColor: "#facc15",
    textColor: "#ffffff",
    subTextColor: "#fde047",
    stripeColor: "#eab308",
    dxCode: [true, false, false, true, true, true],
    filmBaseColor: "#593113",
  },
  "gold-200": {
    brandName: "KODAK",
    filmName: "GOLD 200",
    iso: 200,
    process: "C-41",
    bodyBg: "#d97706",
    bodyGradient: "linear-gradient(135deg, #fbbf24 0%, #d97706 45%, #78350f 100%)",
    accentColor: "#dc2626",
    textColor: "#000000",
    subTextColor: "#b91c1c",
    stripeColor: "#dc2626",
    dxCode: [true, false, true, false, true, true],
    filmBaseColor: "#6b3f1c",
  },
  "colorplus-200": {
    brandName: "KODAK",
    filmName: "ColorPlus 200",
    iso: 200,
    process: "C-41",
    bodyBg: "#b45309",
    bodyGradient: "linear-gradient(135deg, #f59e0b 0%, #b45309 50%, #451a03 100%)",
    accentColor: "#dc2626",
    textColor: "#ffffff",
    subTextColor: "#fde68a",
    stripeColor: "#dc2626",
    dxCode: [true, false, true, false, true, true],
    filmBaseColor: "#663b18",
  },
  "kodachrome-64": {
    brandName: "KODAK",
    filmName: "KODACHROME 64",
    iso: 64,
    process: "E-6",
    bodyBg: "#dc2626",
    bodyGradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 40%, #7f1d1d 100%)",
    accentColor: "#facc15",
    textColor: "#ffffff",
    subTextColor: "#fde047",
    stripeColor: "#facc15",
    dxCode: [false, true, true, false, true, true],
    filmBaseColor: "#422006",
  },
  "fuji-velvia-50": {
    brandName: "FUJIFILM",
    filmName: "Velvia 50 RVP",
    iso: 50,
    process: "E-6",
    bodyBg: "#047857",
    bodyGradient: "linear-gradient(135deg, #10b981 0%, #047857 45%, #064e3b 100%)",
    accentColor: "#db2777",
    textColor: "#ffffff",
    subTextColor: "#fbcfe8",
    stripeColor: "#db2777",
    dxCode: [false, true, false, true, true, true],
    filmBaseColor: "#3b1e08",
  },
  "fuji-provia-100f": {
    brandName: "FUJIFILM",
    filmName: "PROVIA 100F",
    iso: 100,
    process: "E-6",
    bodyBg: "#0369a1",
    bodyGradient: "linear-gradient(135deg, #38bdf8 0%, #0369a1 45%, #082f49 100%)",
    accentColor: "#10b981",
    textColor: "#ffffff",
    subTextColor: "#a7f3d0",
    stripeColor: "#10b981",
    dxCode: [true, false, false, true, true, true],
    filmBaseColor: "#3d220b",
  },
  "fuji-pro-400h": {
    brandName: "FUJIFILM",
    filmName: "PRO 400H",
    iso: 400,
    process: "C-41",
    bodyBg: "#059669",
    bodyGradient: "linear-gradient(135deg, #6ee7b7 0%, #059669 45%, #064e3b 100%)",
    accentColor: "#06b6d4",
    textColor: "#ffffff",
    subTextColor: "#cffafe",
    stripeColor: "#22d3ee",
    dxCode: [true, true, false, true, false, true],
    filmBaseColor: "#613c1f",
  },
  "fuji-superia": {
    brandName: "FUJIFILM",
    filmName: "SUPERIA X-TRA 400",
    iso: 400,
    process: "C-41",
    bodyBg: "#15803d",
    bodyGradient: "linear-gradient(135deg, #4ade80 0%, #15803d 45%, #14532d 100%)",
    accentColor: "#ef4444",
    textColor: "#ffffff",
    subTextColor: "#fecaca",
    stripeColor: "#dc2626",
    dxCode: [true, true, false, true, false, true],
    filmBaseColor: "#694121",
  },
  "fuji-classic-chrome": {
    brandName: "FUJIFILM",
    filmName: "CLASSIC CHROME",
    iso: 200,
    process: "C-41",
    bodyBg: "#475569",
    bodyGradient: "linear-gradient(135deg, #94a3b8 0%, #475569 50%, #1e293b 100%)",
    accentColor: "#10b981",
    textColor: "#f8fafc",
    subTextColor: "#cbd5e1",
    stripeColor: "#10b981",
    dxCode: [true, false, true, false, true, true],
    filmBaseColor: "#57391f",
  },
  "agfa-vista": {
    brandName: "AGFA",
    filmName: "VISTA plus 200",
    iso: 200,
    process: "C-41",
    bodyBg: "#b91c1c",
    bodyGradient: "linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #450a0a 100%)",
    accentColor: "#0284c7",
    textColor: "#ffffff",
    subTextColor: "#bae6fd",
    stripeColor: "#0ea5e9",
    dxCode: [true, false, true, false, true, true],
    filmBaseColor: "#694022",
  },
  "agfa-vista-400": {
    brandName: "AGFA",
    filmName: "VISTA plus 400",
    iso: 400,
    process: "C-41",
    bodyBg: "#991b1b",
    bodyGradient: "linear-gradient(135deg, #ef4444 0%, #991b1b 50%, #450a0a 100%)",
    accentColor: "#0284c7",
    textColor: "#ffffff",
    subTextColor: "#bae6fd",
    stripeColor: "#0ea5e9",
    dxCode: [true, true, false, true, false, true],
    filmBaseColor: "#694022",
  },
  "tri-x-400": {
    brandName: "KODAK",
    filmName: "TRI-X 400 (TX)",
    iso: 400,
    process: "B&W",
    bodyBg: "#18181b",
    bodyGradient: "linear-gradient(135deg, #3f3f46 0%, #18181b 50%, #09090b 100%)",
    accentColor: "#facc15",
    textColor: "#ffffff",
    subTextColor: "#fde047",
    stripeColor: "#eab308",
    dxCode: [true, true, false, true, false, true],
    filmBaseColor: "#27272a",
  },
  "tmax-3200": {
    brandName: "KODAK",
    filmName: "T-MAX P3200",
    iso: 3200,
    process: "B&W",
    bodyBg: "#334155",
    bodyGradient: "linear-gradient(135deg, #64748b 0%, #334155 50%, #0f172a 100%)",
    accentColor: "#db2777",
    textColor: "#ffffff",
    subTextColor: "#fbcfe8",
    stripeColor: "#db2777",
    dxCode: [true, true, true, true, true, false],
    filmBaseColor: "#1e293b",
  },
  "ilford-hp5": {
    brandName: "ILFORD",
    filmName: "HP5 PLUS 400",
    iso: 400,
    process: "B&W",
    bodyBg: "#18181b",
    bodyGradient: "linear-gradient(135deg, #27272a 0%, #18181b 50%, #09090b 100%)",
    accentColor: "#16a34a",
    textColor: "#ffffff",
    subTextColor: "#86efac",
    stripeColor: "#16a34a",
    hasChecker: true,
    dxCode: [true, true, false, true, false, true],
    filmBaseColor: "#27272a",
  },
  "ilford-pan-f": {
    brandName: "ILFORD",
    filmName: "PAN F PLUS 50",
    iso: 50,
    process: "B&W",
    bodyBg: "#18181b",
    bodyGradient: "linear-gradient(135deg, #27272a 0%, #18181b 50%, #09090b 100%)",
    accentColor: "#0284c7",
    textColor: "#ffffff",
    subTextColor: "#7dd3fc",
    stripeColor: "#0284c7",
    hasChecker: true,
    dxCode: [false, true, false, true, true, true],
    filmBaseColor: "#27272a",
  },
  "ilford-sfx-200": {
    brandName: "ILFORD",
    filmName: "SFX 200 Near-IR",
    iso: 200,
    process: "B&W",
    bodyBg: "#450a0a",
    bodyGradient: "linear-gradient(135deg, #7f1d1d 0%, #450a0a 50%, #1c1917 100%)",
    accentColor: "#ef4444",
    textColor: "#ffffff",
    subTextColor: "#fca5a5",
    stripeColor: "#ef4444",
    hasChecker: true,
    dxCode: [true, false, true, false, true, true],
    filmBaseColor: "#1c1917",
  },
  "neopan-acros-100": {
    brandName: "FUJIFILM",
    filmName: "NEOPAN 100 ACROS",
    iso: 100,
    process: "B&W",
    bodyBg: "#27272a",
    bodyGradient: "linear-gradient(135deg, #52525b 0%, #27272a 50%, #09090b 100%)",
    accentColor: "#e4e4e7",
    textColor: "#ffffff",
    subTextColor: "#a1a1aa",
    stripeColor: "#e4e4e7",
    dxCode: [true, false, false, true, true, true],
    filmBaseColor: "#18181b",
  },
  "cinestill-800t": {
    brandName: "CINESTILL",
    filmName: "800Tungsten",
    iso: 800,
    process: "CINEMA",
    bodyBg: "#0f172a",
    bodyGradient: "linear-gradient(135deg, #334155 0%, #0f172a 50%, #020617 100%)",
    accentColor: "#ef4444",
    textColor: "#ffffff",
    subTextColor: "#f87171",
    stripeColor: "#ff0033",
    dxCode: [true, true, true, false, false, true],
    filmBaseColor: "#3b1e08",
  },
  "cinestill-50d": {
    brandName: "CINESTILL",
    filmName: "50Daylight Xpro",
    iso: 50,
    process: "CINEMA",
    bodyBg: "#0369a1",
    bodyGradient: "linear-gradient(135deg, #38bdf8 0%, #0369a1 50%, #082f49 100%)",
    accentColor: "#eab308",
    textColor: "#ffffff",
    subTextColor: "#fef08a",
    stripeColor: "#facc15",
    dxCode: [false, true, false, true, true, true],
    filmBaseColor: "#3b1e08",
  },
  "polaroid-sx70": {
    brandName: "POLAROID",
    filmName: "SX-70 Instant",
    iso: 150,
    process: "INSTANT",
    bodyBg: "#f8fafc",
    bodyGradient: "linear-gradient(135deg, #ffffff 0%, #e2e8f0 50%, #94a3b8 100%)",
    accentColor: "#ef4444",
    textColor: "#0f172a",
    subTextColor: "#475569",
    hasRainbow: true,
    dxCode: [true, false, true, true, false, false],
    filmBaseColor: "#1e293b",
  },
  "polaroid-sepia-1970": {
    brandName: "POLAROID",
    filmName: "Sépia 1970",
    iso: 100,
    process: "INSTANT",
    bodyBg: "#78350f",
    bodyGradient: "linear-gradient(135deg, #92400e 0%, #78350f 50%, #451a03 100%)",
    accentColor: "#fde68a",
    textColor: "#ffffff",
    subTextColor: "#fef3c7",
    hasRainbow: true,
    dxCode: [true, false, false, true, true, true],
    filmBaseColor: "#451a03",
  },
  "lomochrome-turquoise": {
    brandName: "LOMOGRAPHY",
    filmName: "LomoChrome Turquoise",
    iso: 400,
    process: "C-41",
    bodyBg: "#0891b2",
    bodyGradient: "linear-gradient(135deg, #22d3ee 0%, #0891b2 50%, #164e63 100%)",
    accentColor: "#eab308",
    textColor: "#ffffff",
    subTextColor: "#fde047",
    stripeColor: "#eab308",
    dxCode: [true, true, false, true, false, true],
    filmBaseColor: "#164e63",
  },
  "cross-process-e6": {
    brandName: "LOMOGRAPHY",
    filmName: "X-PRO E6 in C41",
    iso: 200,
    process: "SPECIAL",
    bodyBg: "#7c3aed",
    bodyGradient: "linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #4c1d95 100%)",
    accentColor: "#facc15",
    textColor: "#ffffff",
    subTextColor: "#fef08a",
    stripeColor: "#facc15",
    dxCode: [true, false, true, false, true, true],
    filmBaseColor: "#2e1065",
  },
  "xpan-panoramic": {
    brandName: "HASSELBLAD",
    filmName: "XPAN 65×24",
    iso: 400,
    process: "SPECIAL",
    bodyBg: "#71717a",
    bodyGradient: "linear-gradient(135deg, #a1a1aa 0%, #71717a 50%, #27272a 100%)",
    accentColor: "#f59e0b",
    textColor: "#ffffff",
    subTextColor: "#fde68a",
    stripeColor: "#f59e0b",
    dxCode: [true, true, false, true, false, true],
    filmBaseColor: "#3f3f46",
  },
  "leica-monochrom": {
    brandName: "LEICA",
    filmName: "M-MONOCHROM",
    iso: 320,
    process: "B&W",
    bodyBg: "#18181b",
    bodyGradient: "linear-gradient(135deg, #27272a 0%, #18181b 50%, #09090b 100%)",
    accentColor: "#ef4444",
    textColor: "#ffffff",
    subTextColor: "#fca5a5",
    stripeColor: "#ef4444",
    dxCode: [true, false, true, true, true, false],
    filmBaseColor: "#18181b",
  },
  "daguerreotype": {
    brandName: "DAGUERRE",
    filmName: "1839 Plaques Sépia",
    iso: 1,
    process: "SPECIAL",
    bodyBg: "#573010",
    bodyGradient: "linear-gradient(135deg, #78350f 0%, #573010 50%, #2e1804 100%)",
    accentColor: "#fde047",
    textColor: "#ffffff",
    subTextColor: "#fef08a",
    stripeColor: "#b45309",
    dxCode: [false, false, false, false, false, false],
    filmBaseColor: "#2e1804",
  },
  "kodak-vision3-500t": {
    brandName: "KODAK",
    filmName: "VISION3 500T 5219",
    iso: 500,
    process: "CINEMA",
    bodyBg: "#0f172a",
    bodyGradient: "linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #020617 100%)",
    accentColor: "#f59e0b",
    textColor: "#ffffff",
    subTextColor: "#fde68a",
    stripeColor: "#e11d48",
    dxCode: [true, true, true, false, true, false],
    filmBaseColor: "#1c1917",
  },
  "kodak-vision3-250d": {
    brandName: "KODAK",
    filmName: "VISION3 250D 5207",
    iso: 250,
    process: "CINEMA",
    bodyBg: "#1e3a8a",
    bodyGradient: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 50%, #0f172a 100%)",
    accentColor: "#fbbf24",
    textColor: "#ffffff",
    subTextColor: "#fef08a",
    stripeColor: "#fbbf24",
    dxCode: [true, false, true, false, true, true],
    filmBaseColor: "#1c1917",
  },
  "fuji-eterna-250d": {
    brandName: "FUJIFILM",
    filmName: "ETERNA 250D",
    iso: 250,
    process: "CINEMA",
    bodyBg: "#065f46",
    bodyGradient: "linear-gradient(135deg, #059669 0%, #065f46 50%, #022c22 100%)",
    accentColor: "#34d399",
    textColor: "#ffffff",
    subTextColor: "#a7f3d0",
    stripeColor: "#10b981",
    dxCode: [true, false, true, false, true, true],
    filmBaseColor: "#022c22",
  },
  "ilford-panf-50": {
    brandName: "ILFORD",
    filmName: "PAN F PLUS 50",
    iso: 50,
    process: "B&W",
    bodyBg: "#09090b",
    bodyGradient: "linear-gradient(135deg, #27272a 0%, #09090b 50%, #000000 100%)",
    accentColor: "#f43f5e",
    textColor: "#ffffff",
    subTextColor: "#fda4af",
    stripeColor: "#f43f5e",
    hasChecker: true,
    dxCode: [false, true, false, true, true, true],
    filmBaseColor: "#09090b",
  },
  "agfa-vista-200": {
    brandName: "AGFA",
    filmName: "VISTA PLUS 200",
    iso: 200,
    process: "C-41",
    bodyBg: "#b91c1c",
    bodyGradient: "linear-gradient(135deg, #ef4444 0%, #b91c1c 50%, #450a0a 100%)",
    accentColor: "#0ea5e9",
    textColor: "#ffffff",
    subTextColor: "#bae6fd",
    stripeColor: "#0ea5e9",
    dxCode: [true, false, true, false, true, true],
    filmBaseColor: "#694022",
  },
  "rolleiflex-28f": {
    brandName: "ROLLEI",
    filmName: "Rolleiflex TLR 6×6",
    iso: 100,
    process: "SPECIAL",
    bodyBg: "#27272a",
    bodyGradient: "linear-gradient(135deg, #52525b 0%, #27272a 50%, #09090b 100%)",
    accentColor: "#ef4444",
    textColor: "#ffffff",
    subTextColor: "#d4d4d8",
    stripeColor: "#ef4444",
    dxCode: [true, false, false, true, true, true],
    filmBaseColor: "#18181b",
  },
  "sony-mavica-fd7": {
    brandName: "SONY",
    filmName: "MAVICA 3.5\" FLOPPY",
    iso: 100,
    process: "SPECIAL",
    bodyBg: "#1d4ed8",
    bodyGradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #172554 100%)",
    accentColor: "#fbbf24",
    textColor: "#ffffff",
    subTextColor: "#fde68a",
    stripeColor: "#fbbf24",
    dxCode: [true, false, false, true, true, true],
    filmBaseColor: "#172554",
  },
  "gameboy-camera": {
    brandName: "NINTENDO",
    filmName: "GAME BOY 2-BIT",
    iso: 400,
    process: "SPECIAL",
    bodyBg: "#3f6212",
    bodyGradient: "linear-gradient(135deg, #65a30d 0%, #3f6212 50%, #1a2e05 100%)",
    accentColor: "#a3e635",
    textColor: "#ffffff",
    subTextColor: "#d9f99d",
    stripeColor: "#a3e635",
    dxCode: [true, true, false, true, false, true],
    filmBaseColor: "#1a2e05",
  },
  "sony-a1-pro": {
    brandName: "SONY",
    filmName: "ALPHA 1 PRO 50MP",
    iso: 100,
    process: "CINEMA",
    bodyBg: "#09090b",
    bodyGradient: "linear-gradient(135deg, #27272a 0%, #09090b 50%, #000000 100%)",
    accentColor: "#f97316",
    textColor: "#ffffff",
    subTextColor: "#fdba74",
    stripeColor: "#f97316",
    dxCode: [true, false, false, true, true, true],
    filmBaseColor: "#09090b",
  },
  "canon-r5c-pro": {
    brandName: "CANON",
    filmName: "EOS R5 C CINEMA",
    iso: 800,
    process: "CINEMA",
    bodyBg: "#991b1b",
    bodyGradient: "linear-gradient(135deg, #dc2626 0%, #991b1b 50%, #450a0a 100%)",
    accentColor: "#ffffff",
    textColor: "#ffffff",
    subTextColor: "#fecaca",
    stripeColor: "#ffffff",
    dxCode: [true, true, true, false, false, true],
    filmBaseColor: "#450a0a",
  },
  "red-raptor-8k": {
    brandName: "RED",
    filmName: "V-RAPTOR 8K VV",
    iso: 800,
    process: "CINEMA",
    bodyBg: "#000000",
    bodyGradient: "linear-gradient(135deg, #18181b 0%, #09090b 50%, #000000 100%)",
    accentColor: "#dc2626",
    textColor: "#ffffff",
    subTextColor: "#f87171",
    stripeColor: "#dc2626",
    dxCode: [true, true, true, false, false, true],
    filmBaseColor: "#000000",
  },
  "arri-alexa-35": {
    brandName: "ARRI",
    filmName: "ALEXA 35 LogC4",
    iso: 800,
    process: "CINEMA",
    bodyBg: "#1e293b",
    bodyGradient: "linear-gradient(135deg, #334155 0%, #1e293b 50%, #0f172a 100%)",
    accentColor: "#0ea5e9",
    textColor: "#ffffff",
    subTextColor: "#7dd3fc",
    stripeColor: "#0ea5e9",
    dxCode: [true, true, true, false, false, true],
    filmBaseColor: "#0f172a",
  },
  "hasselblad-x2d-100c": {
    brandName: "HASSELBLAD",
    filmName: "X2D 100C MEDIUM FORMAT",
    iso: 64,
    process: "SPECIAL",
    bodyBg: "#374151",
    bodyGradient: "linear-gradient(135deg, #4b5563 0%, #374151 50%, #111827 100%)",
    accentColor: "#f59e0b",
    textColor: "#ffffff",
    subTextColor: "#fde68a",
    stripeColor: "#f59e0b",
    dxCode: [false, true, false, true, true, true],
    filmBaseColor: "#111827",
  },
  "leica-m11-pro": {
    brandName: "LEICA",
    filmName: "M11 60MP RANGEFINDER",
    iso: 64,
    process: "SPECIAL",
    bodyBg: "#09090b",
    bodyGradient: "linear-gradient(135deg, #27272a 0%, #09090b 50%, #000000 100%)",
    accentColor: "#dc2626",
    textColor: "#ffffff",
    subTextColor: "#fca5a5",
    stripeColor: "#dc2626",
    dxCode: [false, true, false, true, true, true],
    filmBaseColor: "#09090b",
  },
};

function getFilmStyle(preset: Preset | { id: string; label: string; brand?: string; iso?: number } | null): FilmCanisterStyle {
  if (!preset) {
    return {
      brandName: "RAW",
      filmName: "Capteur 35mm",
      iso: 400,
      process: "SPECIAL",
      bodyBg: "#27272a",
      bodyGradient: "linear-gradient(135deg, #3f3f46 0%, #27272a 50%, #18181b 100%)",
      accentColor: "#38bdf8",
      textColor: "#ffffff",
      subTextColor: "#94a3b8",
      dxCode: [true, true, false, true, false, true],
      filmBaseColor: "#18181b",
    };
  }

  if (FILM_STYLES[preset.id]) {
    return FILM_STYLES[preset.id];
  }

  const isBw = preset.id.includes("bw") || preset.id.includes("mono") || preset.id.includes("noir");
  const isNight = preset.id.includes("night") || preset.id.includes("astro");
  const isMacro = preset.id.includes("macro");

  return {
    brandName: preset.brand?.toUpperCase() || (isMacro ? "MACRO" : isNight ? "NIGHT" : "PALAMA"),
    filmName: preset.label,
    iso: preset.iso || 400,
    process: isBw ? "B&W" : "C-41",
    bodyBg: isMacro ? "#064e3b" : isNight ? "#020617" : "#1e293b",
    bodyGradient: isMacro
      ? "linear-gradient(135deg, #059669 0%, #064e3b 50%, #022c22 100%)"
      : isNight
      ? "linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #020617 100%)"
      : "linear-gradient(135deg, #334155 0%, #1e293b 50%, #0f172a 100%)",
    accentColor: isMacro ? "#34d399" : isNight ? "#a855f7" : "#38bdf8",
    textColor: "#ffffff",
    subTextColor: isMacro ? "#a7f3d0" : isNight ? "#e9d5ff" : "#cbd5e1",
    dxCode: [true, true, false, true, false, true],
    filmBaseColor: "#18181b",
  };
}

export function FilmLeaderTongue({
  filmBaseColor,
  accentColor,
  iso,
  filmName,
  exposures = 36,
  className = "",
}: {
  filmBaseColor: string;
  accentColor: string;
  iso: string | number;
  filmName: string;
  exposures?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative h-24 flex flex-col justify-between overflow-hidden rounded-r-lg border-y border-r border-white/20 shadow-md ${className}`}
      style={{
        backgroundColor: filmBaseColor,
        backgroundImage: `radial-gradient(ellipse at center, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.55) 100%)`,
      }}
    >
      {/* Top Sprocket Hole Row */}
      <div className="flex items-center justify-between px-1.5 pt-1.5">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={`top-hole-${i}`}
            className="h-2.5 w-3.5 rounded-[3px] bg-black/90 border border-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"
          />
        ))}
      </div>

      {/* Center Film Strip with Retro Edge Markings */}
      <div className="flex items-center justify-between px-3 text-[10px] font-mono font-bold tracking-wider text-amber-300/85">
        <span className="truncate max-w-[130px] uppercase drop-shadow-sm">{filmName}</span>
        <div className="flex items-center gap-2 text-[9px] text-white/70">
          <span className="text-amber-400">DX {iso}</span>
          <span>► 24A</span>
          <span className="font-mono bg-black/60 px-1 rounded border border-white/10 text-white/95">
            EXP {exposures}
          </span>
        </div>
      </div>

      {/* Bottom Sprocket Hole Row */}
      <div className="flex items-center justify-between px-1.5 pb-1.5">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={`bot-hole-${i}`}
            className="h-2.5 w-3.5 rounded-[3px] bg-black/90 border border-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"
          />
        ))}
      </div>
    </div>
  );
}

export function FilmCanister35mm({
  preset,
  className = "",
  showLeader = true,
}: {
  preset: Preset | { id: string; label: string; brand?: string; iso?: number; era?: string } | null;
  className?: string;
  showLeader?: boolean;
}) {
  const style = getFilmStyle(preset);

  return (
    <div className={`relative flex items-center select-none ${className}`}>
      {/* 35mm Canister Body */}
      <div className="relative flex h-24 w-32 shrink-0 flex-col justify-between overflow-hidden rounded-l-md rounded-r-sm border border-zinc-700/80 bg-zinc-900 shadow-2xl">
        {/* Top Crimped Metallic Cap & Center Spindle Hub */}
        <div className="relative z-10 flex h-3.5 w-full items-center justify-between border-b border-zinc-600 bg-gradient-to-r from-zinc-500 via-zinc-300 to-zinc-600 px-2 shadow-sm">
          <div className="h-1.5 w-3 rounded bg-zinc-700/80 border border-zinc-500" />
          {/* Central Spool Spindle Core */}
          <div className="flex h-2.5 w-4 items-center justify-center rounded-sm bg-black border border-zinc-600 shadow-inner">
            <div className="h-1 w-1.5 rounded-full bg-zinc-400" />
          </div>
          <div className="h-1.5 w-3 rounded bg-zinc-700/80 border border-zinc-500" />
        </div>

        {/* Canister Printed Label Wrap */}
        <div
          className="relative flex-1 p-2 flex flex-col justify-between"
          style={{
            background: style.bodyGradient,
          }}
        >
          {/* Subtle Metallic Cylinder Sheen Overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/15 via-transparent to-black/35" />

          {/* Rainbow Stripe for Polaroid */}
          {style.hasRainbow && (
            <div className="absolute top-0 left-0 right-0 h-1.5 flex">
              <div className="flex-1 bg-red-500" />
              <div className="flex-1 bg-orange-500" />
              <div className="flex-1 bg-yellow-400" />
              <div className="flex-1 bg-green-500" />
              <div className="flex-1 bg-blue-500" />
            </div>
          )}

          {/* Checkerboard Pattern for Ilford */}
          {style.hasChecker && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-[repeating-linear-gradient(90deg,#000_0px,#000_4px,#fff_4px,#fff_8px)] opacity-80" />
          )}

          {/* Header Row: Brand & Process */}
          <div className="relative z-10 flex items-center justify-between">
            <span
              className="font-black tracking-widest text-[11px] uppercase font-sans drop-shadow-sm"
              style={{ color: style.textColor }}
            >
              {style.brandName}
            </span>
            <span className="rounded bg-black/60 px-1 py-0.2 font-mono text-[8px] font-bold text-white border border-white/20">
              {style.process}
            </span>
          </div>

          {/* Film Name Main Livery */}
          <div className="relative z-10 my-auto">
            <div
              className="text-xs font-black tracking-tight leading-tight line-clamp-1 uppercase drop-shadow-sm"
              style={{ color: style.textColor }}
            >
              {style.filmName}
            </div>
          </div>

          {/* Bottom Row: ISO Box Speed & DX Patches */}
          <div className="relative z-10 flex items-end justify-between">
            <div className="flex items-center gap-1">
              <span
                className="font-mono text-xs font-black leading-none px-1.5 py-0.5 rounded shadow-sm"
                style={{
                  backgroundColor: style.accentColor,
                  color: style.accentColor === "#facc15" || style.accentColor === "#eab308" || style.accentColor === "#fde047" ? "#000" : "#fff",
                }}
              >
                {style.iso}
              </span>
              <span className="font-mono text-[9px] font-bold text-white/80">135-36</span>
            </div>

            {/* Real 35mm DX Conductive Barcode Strip */}
            <div className="flex gap-[1px] bg-black p-0.5 rounded border border-white/20">
              {style.dxCode.map((conductive, idx) => (
                <div
                  key={`dx-${idx}`}
                  className={`h-2.5 w-1 ${conductive ? "bg-zinc-200" : "bg-black"}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Crimped Metal Cap */}
        <div className="relative z-10 flex h-3 w-full items-center justify-center border-t border-zinc-600 bg-gradient-to-r from-zinc-500 via-zinc-300 to-zinc-600 shadow-sm">
          <div className="h-1 w-8 rounded-full bg-zinc-700/60" />
        </div>

        {/* Velvet Light Trap Slit Accent */}
        <div className="absolute top-3.5 bottom-3 right-0 w-1.5 bg-black border-l border-zinc-800 shadow-[inset_2px_0_3px_rgba(0,0,0,0.9)]" />
      </div>

      {/* Exposed Film Tongue Leader */}
      {showLeader && (
        <div className="flex-1 -ml-1">
          <FilmLeaderTongue
            filmBaseColor={style.filmBaseColor}
            accentColor={style.accentColor}
            iso={style.iso}
            filmName={style.filmName}
            exposures={36}
          />
        </div>
      )}
    </div>
  );
}

export function FilmCanisterBadge({
  preset,
  className = "",
  showIso = true,
}: {
  preset: Preset | { id: string; label: string; brand?: string; iso?: number } | null;
  className?: string;
  showIso?: boolean;
}) {
  const style = getFilmStyle(preset);

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/85 py-1.5 pl-2 pr-3 shadow-lg backdrop-blur select-none ${className}`}
    >
      {/* Mini 35mm Canister Icon */}
      <div
        className="relative flex h-7 w-5 shrink-0 flex-col justify-between overflow-hidden rounded-[2px] border border-zinc-500 shadow"
        style={{ background: style.bodyGradient }}
      >
        {/* Top Metallic Cap */}
        <div className="h-1 w-full bg-gradient-to-r from-zinc-400 via-zinc-200 to-zinc-400 border-b border-zinc-600" />
        {/* Brand Bar */}
        <div
          className="text-[6.5px] font-black text-center uppercase tracking-tighter leading-none drop-shadow"
          style={{ color: style.textColor }}
        >
          {style.brandName.slice(0, 3)}
        </div>
        {/* Bottom Cap */}
        <div className="h-1 w-full bg-gradient-to-r from-zinc-400 via-zinc-200 to-zinc-400 border-t border-zinc-600" />
      </div>

      {/* Film Label & ISO */}
      <div className="flex flex-col text-left">
        <span className="text-xs font-bold leading-tight text-white line-clamp-1 max-w-[130px]">
          {preset?.label ?? "Naturel"}
        </span>
        {showIso && (
          <span className="text-[10px] font-mono font-medium text-amber-300 leading-none">
            {style.process} · ISO {style.iso}
          </span>
        )}
      </div>
    </div>
  );
}
