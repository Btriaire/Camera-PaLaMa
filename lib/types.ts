// Every slider in the editor, plus what a vintage-camera preset dials in.
// Ranges are all human-friendly (-100..100 or 0..100), converted to shader
// units inside the renderer — never store shader-space numbers here.
export type Adjustments = {
  exposure: number; // -100..100, stops of brightness
  contrast: number; // -100..100
  saturation: number; // -100..100
  temperature: number; // -100..100, cool blue .. warm orange
  tint: number; // -100..100, green .. magenta
  highlights: number; // -100..100, recover/blow highlights
  shadows: number; // -100..100, lift/crush shadows
  sharpen: number; // 0..100, unsharp-mask style edge boost
  superContrast: number; // 0..100, local/mid-frequency contrast ("clarity") — distinct from contrast
  denoise: number; // 0..100, cheap blur-blend
  vignette: number; // 0..100
  grain: number; // 0..100, film grain
  halation: number; // 0..100, red highlight diffusion / glow (CineStill / vintage emulsion)
  bloom: number; // 0..100, pro-mist dreamy highlight diffusion
  fade: number; // 0..100, lifts blacks for a matte/faded look
  monochrome: number; // 0..100, mix toward grayscale
  tintColor: [number, number, number]; // 0..255, color the mono/duotone leans on
  tintStrength: number; // 0..100, how hard tintColor colors the result
  chromaticAberration: number; // 0..100
  lightLeak: number; // 0..100
  scanlines: number; // 0..100
  
  // Experimental & Bizarre Optical Effects
  infrared: number; // 0..100, Kodak Aerochrome false-color infrared (greens -> deep red)
  thermal: number; // 0..100, FLIR / predator thermal heat vision false color
  nightVision: number; // 0..100, Gen-3 phosphor green NVG + tube flare
  glitch: number; // 0..100, VHS tracking error & digital displacement
  kaleidoscope: number; // 0..100, optical prism facet reflections
  solarize: number; // 0..100, Sabattier darkroom solarization reversal
  cyanotype: number; // 0..100, 1842 historic Prussian blue blueprint process
  dither: number; // 0..100, 2-bit bayer matrix retro pixelation

  dateStamp?: boolean; // overlay vintage orange LED timestamp on photo
  aspectRatio?: "original" | "3:2" | "4:3" | "1:1" | "16:9" | "65:24";
  filmBorder?: "none" | "35mm" | "polaroid";
};

export const NEUTRAL_ADJUSTMENTS: Adjustments = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  sharpen: 0,
  superContrast: 0,
  denoise: 0,
  vignette: 0,
  grain: 0,
  halation: 0,
  bloom: 0,
  fade: 0,
  monochrome: 0,
  tintColor: [255, 255, 255],
  tintStrength: 0,
  chromaticAberration: 0,
  lightLeak: 0,
  scanlines: 0,
  infrared: 0,
  thermal: 0,
  nightVision: 0,
  glitch: 0,
  kaleidoscope: 0,
  solarize: 0,
  cyanotype: 0,
  dither: 0,
  dateStamp: false,
  aspectRatio: "original",
  filmBorder: "none",
};

// Viewfinder HUD skins
export type HudSkin =
  | "film"
  | "cinema"
  | "camcorder"
  | "cctv"
  | "modern"
  | "dashcam"
  | "doorbell"
  | "webcam"
  | "leica"
  | "hasselblad"
  | "digicam"
  | "xpan"
  | "pro"
  | "thermal"
  | "nvg"
  | "glitch";

export type PresetCategory = "color-film" | "bw-film" | "cinema" | "vintage-digi" | "curious" | "modern";

export type Preset = {
  id: string;
  label: string;
  brand?: "Kodak" | "Fujifilm" | "Ilford" | "CineStill" | "Polaroid" | "Agfa" | "Leica" | "Hasselblad" | "Lomography" | "Specialty";
  blurb: string; // one line of flavor text shown under the name
  category: "vintage" | "modern" | "curious"; // grouping in the camera picker
  hud: HudSkin;
  era?: string; // e.g. "1968" — shown as a spec badge
  iso?: number;
  kelvin?: number;
  aspectRatio?: "3:2" | "4:3" | "1:1" | "16:9" | "65:24";
  filmBorder?: "none" | "35mm" | "polaroid";
  dateStampDefault?: boolean;
  adjustments: Partial<Adjustments>;
};

export type SavedPhotoMeta = {
  id: string;
  createdAt: string;
  width: number;
  height: number;
  presetId: string | null;
  adjustments: Adjustments;
};
