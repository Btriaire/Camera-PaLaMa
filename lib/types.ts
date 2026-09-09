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
  denoise: number; // 0..100, cheap blur-blend
  vignette: number; // 0..100
  grain: number; // 0..100, film grain
  fade: number; // 0..100, lifts blacks for a matte/faded look
  monochrome: number; // 0..100, mix toward grayscale
  tintColor: [number, number, number]; // 0..255, color the mono/duotone leans on
  tintStrength: number; // 0..100, how hard tintColor colors the result
  chromaticAberration: number; // 0..100
  lightLeak: number; // 0..100
  scanlines: number; // 0..100
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
  denoise: 0,
  vignette: 0,
  grain: 0,
  fade: 0,
  monochrome: 0,
  tintColor: [255, 255, 255],
  tintStrength: 0,
  chromaticAberration: 0,
  lightLeak: 0,
  scanlines: 0,
};

export type Preset = {
  id: string;
  label: string;
  blurb: string; // one line of flavor text shown under the name
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
