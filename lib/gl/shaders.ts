// One "uber shader" drives both the live viewfinder preview and the final
// full-resolution export — same math, same look, no surprise between what
// you see and what gets saved. WebGL1/GLSL ES 1.00 on purpose: WebGL2
// support on older iOS Safari (the platform this is meant to replace) is
// shakier than WebGL1's.
export const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

export const FRAGMENT_SHADER = `
precision highp float;
varying vec2 v_texCoord;
uniform sampler2D u_image;
uniform vec2 u_texelSize;
uniform vec2 u_resolution;
uniform float u_seed;

uniform float u_exposure;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_temperature;
uniform float u_tint;
uniform float u_highlights;
uniform float u_shadows;
uniform float u_sharpen;
uniform float u_denoise;
uniform float u_vignette;
uniform float u_grain;
uniform float u_fade;
uniform float u_monochrome;
uniform vec3 u_tintColor;
uniform float u_tintStrength;
uniform float u_chromaticAberration;
uniform float u_lightLeak;
uniform float u_scanlines;

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233)) + u_seed) * 43758.5453);
}

void main() {
  vec2 uv = v_texCoord;

  // Chromatic aberration: split R/B along the vector from center before
  // anything else touches the color, like a cheap lens.
  vec3 color;
  if (u_chromaticAberration > 0.001) {
    vec2 dir = uv - 0.5;
    vec2 off = dir * u_chromaticAberration * 0.02;
    color = vec3(
      texture2D(u_image, uv + off).r,
      texture2D(u_image, uv).g,
      texture2D(u_image, uv - off).b
    );
  } else {
    color = texture2D(u_image, uv).rgb;
  }

  // Cheap 4-neighbor blur, reused as the base for both denoise (blend
  // toward it) and sharpen (push away from it) — an unsharp mask.
  vec3 blurred = (
    texture2D(u_image, uv + vec2(u_texelSize.x, 0.0)).rgb +
    texture2D(u_image, uv - vec2(u_texelSize.x, 0.0)).rgb +
    texture2D(u_image, uv + vec2(0.0, u_texelSize.y)).rgb +
    texture2D(u_image, uv - vec2(0.0, u_texelSize.y)).rgb
  ) * 0.25;

  color = mix(color, blurred, clamp(u_denoise, 0.0, 1.0));
  color = color + (color - blurred) * u_sharpen;

  // Exposure in stops.
  color *= pow(2.0, u_exposure);

  // White balance: warm/cool on the red-blue axis, tint on the green-magenta axis.
  color.r *= 1.0 + u_temperature * 0.3;
  color.b *= 1.0 - u_temperature * 0.3;
  color.g *= 1.0 + u_tint * 0.2;

  // Contrast, pivoting around mid-gray.
  color = (color - 0.5) * (1.0 + u_contrast) + 0.5;

  // Shadows/highlights, split by luminance.
  float l = luma(color);
  float shadowMask = 1.0 - smoothstep(0.0, 0.5, l);
  float highlightMask = smoothstep(0.5, 1.0, l);
  color += u_shadows * shadowMask * 0.4;
  color += u_highlights * highlightMask * 0.4;

  // Saturation.
  color = mix(vec3(luma(color)), color, 1.0 + u_saturation);

  // Monochrome mix, then a duotone-style tint driven by the mono/color result.
  float g = luma(color);
  color = mix(color, vec3(g), clamp(u_monochrome, 0.0, 1.0));
  vec3 tinted = g * u_tintColor;
  color = mix(color, tinted, clamp(u_tintStrength, 0.0, 1.0));

  // Fade: lift the black point for a washed-out matte look.
  color = mix(color, color * 0.82 + 0.09, clamp(u_fade, 0.0, 1.0));

  // Vignette, aspect-corrected so it stays circular on non-square frames.
  vec2 centered = (uv - 0.5) * vec2(1.0, u_resolution.y / u_resolution.x);
  float dist = length(centered);
  float vig = smoothstep(0.3, 0.9, dist);
  color *= 1.0 - vig * clamp(u_vignette, 0.0, 1.0);

  // Light leak: a soft warm blob drifting in from a corner, seeded so every
  // shot gets a slightly different flare instead of the exact same one.
  if (u_lightLeak > 0.001) {
    vec2 leakPos = vec2(0.15 + 0.1 * sin(u_seed), 0.85 + 0.1 * cos(u_seed * 1.7));
    float leakDist = distance(uv, leakPos);
    float leak = smoothstep(0.9, 0.0, leakDist);
    color += vec3(1.0, 0.55, 0.25) * leak * u_lightLeak * 0.8;
  }

  // Scanlines, in screen space so line spacing doesn't depend on zoom.
  if (u_scanlines > 0.001) {
    float line = sin(uv.y * u_resolution.y * 1.5) * 0.5 + 0.5;
    color *= 1.0 - u_scanlines * 0.35 * (1.0 - line);
  }

  // Film grain: per-pixel noise, re-seeded every render call.
  if (u_grain > 0.001) {
    float n = hash(uv * u_resolution.xy);
    color += (n - 0.5) * u_grain * 0.25;
  }

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
