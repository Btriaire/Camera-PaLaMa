import { Preset } from "./types";

// Each preset is just a set of Adjustments deltas from neutral — no LUT
// images to ship, no binary assets, and every look stays tweakable by hand
// afterwards since it runs through the exact same shader as the sliders.
//
// `iso`/`kelvin` on the vintage ones are the film stock's actual historical
// rating/color balance where one exists (Kodachrome 64 really is ISO 64,
// CineStill 800T really is tungsten-balanced 3200K) — flavor for the HUD,
// not a live light reading, but not invented either. Where no real number
// exists (a toy camera loaded with whatever film was around, a camcorder's
// auto-gain), it's a representative stand-in; see the comment on each.
export const PRESETS: Preset[] = [
  {
    id: "kodachrome-64",
    label: "Kodachrome 64",
    blurb: "Rouges profonds, noirs denses — la diapo culte des 70s",
    category: "vintage",
    hud: "film",
    era: "1968",
    iso: 64, // its actual, literal box speed
    kelvin: 5500,
    adjustments: { temperature: 20, saturation: 25, contrast: 20, shadows: -15, grain: 15, vignette: 10 },
  },
  {
    id: "polaroid-sx70",
    label: "Polaroid SX-70",
    blurb: "Blancs délavés, fuite de lumière, chimie instantanée",
    category: "vintage",
    hud: "film",
    era: "1972",
    iso: 150, // the SX-70 integral film's real rated speed
    kelvin: 5500,
    adjustments: { fade: 35, temperature: 15, contrast: -10, saturation: -10, vignette: 25, lightLeak: 20, grain: 10 },
  },
  {
    id: "agfa-vista",
    label: "Agfa Vista 200",
    blurb: "Dominante vert-cyan, couleurs gonflées",
    category: "vintage",
    hud: "film",
    era: "1996",
    iso: 200, // its actual box speed
    kelvin: 5500,
    adjustments: { tintColor: [200, 255, 210], tintStrength: 15, saturation: 20, temperature: -10, contrast: 10, grain: 12 },
  },
  {
    id: "fuji-superia",
    label: "Fuji Superia 400",
    blurb: "Verts froids, grain fin, contraste doux",
    category: "vintage",
    hud: "film",
    era: "1998",
    iso: 400, // its actual box speed
    kelvin: 5500,
    adjustments: { temperature: -8, tintColor: [210, 255, 225], tintStrength: 10, saturation: 10, grain: 8, contrast: 5 },
  },
  {
    id: "ilford-hp5",
    label: "Ilford HP5",
    blurb: "Noir & blanc argentique, grain qui mord",
    category: "vintage",
    hud: "film",
    era: "1989",
    iso: 400, // its actual box speed (HP5 Plus)
    adjustments: { monochrome: 100, contrast: 25, grain: 25, shadows: -10, highlights: -5 },
  },
  {
    id: "cinestill-800t",
    label: "CineStill 800T",
    blurb: "Halos rouges, nuit urbaine, tungstène",
    category: "vintage",
    hud: "cinema",
    era: "2012",
    iso: 800, // its actual box speed — the "T" is tungsten balance
    kelvin: 3200,
    adjustments: { tintColor: [255, 180, 150], tintStrength: 12, temperature: 10, shadows: -10, lightLeak: 15, grain: 18, contrast: 10 },
  },
  {
    id: "lomo-lca",
    label: "Lomo LC-A",
    blurb: "Vignette qui écrase, couleurs saturées, cross-process",
    category: "vintage",
    hud: "film",
    era: "1984",
    iso: 200, // representative — whatever consumer film was loaded
    kelvin: 5500,
    adjustments: { vignette: 45, saturation: 35, contrast: 20, tintColor: [210, 255, 190], tintStrength: 10, grain: 15 },
  },
  {
    id: "holga",
    label: "Holga Toy Camera",
    blurb: "Plastique, flou de bord, fuite de lumière",
    category: "vintage",
    hud: "film",
    era: "1981",
    iso: 100, // representative — typical 120 roll film speed
    kelvin: 5500,
    adjustments: { vignette: 55, denoise: 30, lightLeak: 30, fade: 15, grain: 20, saturation: -10 },
  },
  {
    id: "disposable-flash",
    label: "Jetable + Flash",
    blurb: "Hautes lumières cramées, grain dur, soirée 2003",
    category: "vintage",
    hud: "film",
    era: "1998",
    iso: 800, // typical disposable-camera box speed
    kelvin: 5800, // flash color temperature
    adjustments: { highlights: 35, exposure: 10, temperature: -15, grain: 35, contrast: 15, saturation: -5 },
  },
  {
    id: "vhs",
    label: "Caméscope VHS",
    blurb: "Lignes de balayage, aberration chromatique",
    category: "vintage",
    hud: "camcorder",
    era: "1985",
    iso: 400, // representative CCD auto-gain equivalent
    kelvin: 4300, // typical indoor auto white-balance miss
    adjustments: { scanlines: 60, chromaticAberration: 40, saturation: -30, denoise: 25, contrast: -10, temperature: -5 },
  },
  {
    id: "security-cam",
    label: "Caméra de surveillance",
    blurb: "Vert monochrome, grain lourd, 3h du matin",
    category: "vintage",
    hud: "cctv",
    era: "2005",
    iso: 3200, // representative — cheap sensor, high gain, low light
    adjustments: { monochrome: 100, tintColor: [150, 255, 150], tintStrength: 60, grain: 30, scanlines: 30, contrast: -15, exposure: -5 },
  },
  {
    id: "daguerreotype",
    label: "Daguerréotype",
    blurb: "Sépia XIXe, vignette lourde, portrait figé plusieurs minutes",
    category: "vintage",
    hud: "film",
    era: "1839",
    iso: 1, // the real process needed minutes of direct sunlight — this is not an exaggeration
    kelvin: 5500,
    adjustments: { monochrome: 100, tintColor: [210, 180, 140], tintStrength: 70, vignette: 50, fade: 20, denoise: 15, contrast: 10 },
  },
  {
    id: "leica-monochrom",
    label: "Leica Monochrom",
    blurb: "N&B numérique pur, micro-contraste chirurgical",
    category: "vintage",
    hud: "cinema",
    era: "2015",
    iso: 320, // the M Monochrom's actual base ISO
    adjustments: { monochrome: 100, contrast: 30, grain: 5, sharpen: 20, shadows: -5 },
  },

  // Modern, non-costume filters: no era/ISO/Kelvin badge, no HUD cosplay —
  // just today's clean camera app UI, since these aren't standing in for a
  // specific old device.
  {
    id: "vivid-pop",
    label: "Vivid Pop",
    blurb: "Couleurs punchy, contraste net — le feed qui claque",
    category: "modern",
    hud: "modern",
    adjustments: { saturation: 30, contrast: 15, sharpen: 20, highlights: -5 },
  },
  {
    id: "clarte-urbaine",
    label: "Clarté Urbaine",
    blurb: "Contraste froid et net, béton et verre",
    category: "modern",
    hud: "modern",
    adjustments: { contrast: 20, saturation: 10, tintColor: [200, 220, 255], tintStrength: 8, sharpen: 15 },
  },
  {
    id: "chaleur-doree",
    label: "Chaleur Dorée",
    blurb: "Golden hour instantané, peau et ciel dorés",
    category: "modern",
    hud: "modern",
    adjustments: { temperature: 25, highlights: 10, fade: 10, saturation: 10 },
  },
  {
    id: "noir-contraste",
    label: "Noir Contrasté",
    blurb: "N&B moderne, ombres qui claquent",
    category: "modern",
    hud: "modern",
    adjustments: { monochrome: 100, contrast: 35, sharpen: 25, shadows: -15 },
  },
  {
    id: "pastel-doux",
    label: "Pastel Doux",
    blurb: "Tons délavés, hautes lumières relevées, tout en douceur",
    category: "modern",
    hud: "modern",
    adjustments: { fade: 30, saturation: -15, highlights: 15, contrast: -10 },
  },
  {
    id: "neon-nuit",
    label: "Néon Nuit",
    blurb: "Magenta et cyan, ville la nuit, léger halo",
    category: "modern",
    hud: "modern",
    adjustments: {
      tintColor: [255, 110, 220],
      tintStrength: 18,
      contrast: 20,
      saturation: 20,
      shadows: -10,
      vignette: 20,
      chromaticAberration: 10,
    },
  },
  {
    id: "teint-naturel",
    label: "Teint Naturel",
    blurb: "\"Pas de filtre\" mais en mieux — à peine retouché",
    category: "modern",
    hud: "modern",
    adjustments: { contrast: 8, saturation: 5, sharpen: 10, denoise: 10 },
  },
];

export function getPreset(id: string | null): Preset | null {
  return PRESETS.find((p) => p.id === id) ?? null;
}

export const VINTAGE_PRESETS = PRESETS.filter((p) => p.category === "vintage");
export const MODERN_PRESETS = PRESETS.filter((p) => p.category === "modern");
