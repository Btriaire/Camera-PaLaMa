import { Preset } from "./types";

// Each preset is just a set of Adjustments deltas from neutral — no LUT
// images to ship, no binary assets, and every look stays tweakable by hand
// afterwards since it runs through the exact same shader as the sliders.
export const PRESETS: Preset[] = [
  {
    id: "kodachrome-64",
    label: "Kodachrome 64",
    blurb: "Rouges profonds, noirs denses — la diapo culte des 70s",
    adjustments: { temperature: 20, saturation: 25, contrast: 20, shadows: -15, grain: 15, vignette: 10 },
  },
  {
    id: "polaroid-sx70",
    label: "Polaroid SX-70",
    blurb: "Blancs délavés, fuite de lumière, chimie instantanée",
    adjustments: { fade: 35, temperature: 15, contrast: -10, saturation: -10, vignette: 25, lightLeak: 20, grain: 10 },
  },
  {
    id: "agfa-vista",
    label: "Agfa Vista 200",
    blurb: "Dominante vert-cyan, couleurs gonflées",
    adjustments: { tintColor: [200, 255, 210], tintStrength: 15, saturation: 20, temperature: -10, contrast: 10, grain: 12 },
  },
  {
    id: "fuji-superia",
    label: "Fuji Superia 400",
    blurb: "Verts froids, grain fin, contraste doux",
    adjustments: { temperature: -8, tintColor: [210, 255, 225], tintStrength: 10, saturation: 10, grain: 8, contrast: 5 },
  },
  {
    id: "ilford-hp5",
    label: "Ilford HP5",
    blurb: "Noir & blanc argentique, grain qui mord",
    adjustments: { monochrome: 100, contrast: 25, grain: 25, shadows: -10, highlights: -5 },
  },
  {
    id: "cinestill-800t",
    label: "CineStill 800T",
    blurb: "Halos rouges, nuit urbaine, tungstène",
    adjustments: { tintColor: [255, 180, 150], tintStrength: 12, temperature: 10, shadows: -10, lightLeak: 15, grain: 18, contrast: 10 },
  },
  {
    id: "lomo-lca",
    label: "Lomo LC-A",
    blurb: "Vignette qui écrase, couleurs saturées, cross-process",
    adjustments: { vignette: 45, saturation: 35, contrast: 20, tintColor: [210, 255, 190], tintStrength: 10, grain: 15 },
  },
  {
    id: "holga",
    label: "Holga Toy Camera",
    blurb: "Plastique, flou de bord, fuite de lumière",
    adjustments: { vignette: 55, denoise: 30, lightLeak: 30, fade: 15, grain: 20, saturation: -10 },
  },
  {
    id: "disposable-flash",
    label: "Jetable + Flash",
    blurb: "Hautes lumières cramées, grain dur, soirée 2003",
    adjustments: { highlights: 35, exposure: 10, temperature: -15, grain: 35, contrast: 15, saturation: -5 },
  },
  {
    id: "vhs",
    label: "Caméscope VHS",
    blurb: "Lignes de balayage, aberration chromatique",
    adjustments: { scanlines: 60, chromaticAberration: 40, saturation: -30, denoise: 25, contrast: -10, temperature: -5 },
  },
  {
    id: "security-cam",
    label: "Caméra de surveillance",
    blurb: "Vert monochrome, grain lourd, 3h du matin",
    adjustments: { monochrome: 100, tintColor: [150, 255, 150], tintStrength: 60, grain: 30, scanlines: 30, contrast: -15, exposure: -5 },
  },
  {
    id: "daguerreotype",
    label: "Daguerréotype",
    blurb: "Sépia XIXe, vignette lourde, portrait figé",
    adjustments: { monochrome: 100, tintColor: [210, 180, 140], tintStrength: 70, vignette: 50, fade: 20, denoise: 15, contrast: 10 },
  },
  {
    id: "leica-monochrom",
    label: "Leica Monochrom",
    blurb: "N&B numérique pur, micro-contraste chirurgical",
    adjustments: { monochrome: 100, contrast: 30, grain: 5, sharpen: 20, shadows: -5 },
  },
];

export function getPreset(id: string | null): Preset | null {
  return PRESETS.find((p) => p.id === id) ?? null;
}
