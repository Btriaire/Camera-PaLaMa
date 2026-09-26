// Master Uber-Shader for Camera-PaLaMa
// Drives live viewfinder, experimental filters, manual focus peaking, and final export.
// Compatible with WebGL1 / GLSL ES 1.00.

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
uniform float u_superContrast;
uniform float u_denoise;
uniform float u_vignette;
uniform float u_grain;
uniform float u_halation;
uniform float u_bloom;
uniform float u_fade;
uniform float u_monochrome;
uniform vec3 u_tintColor;
uniform float u_tintStrength;
uniform float u_chromaticAberration;
uniform float u_lightLeak;
uniform float u_scanlines;

// Curious & Experimental Bizarre Shaders
uniform float u_infrared;
uniform float u_thermal;
uniform float u_nightVision;
uniform float u_glitch;
uniform float u_kaleidoscope;
uniform float u_solarize;
uniform float u_cyanotype;
uniform float u_dither;
uniform float u_lomochrome;
uniform float u_crossProcess;
uniform float u_tiltShift;
uniform float u_macroBoost;

// Live Viewfinder Shooting Aids
uniform float u_zebra;
uniform float u_focusPeaking;

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233)) + u_seed) * 43758.5453);
}

// Thermal false-color heatmap (Black -> Blue -> Purple -> Orange -> Yellow -> White)
vec3 thermalMap(float val) {
  val = clamp(val, 0.0, 1.0);
  if (val < 0.2) {
    return mix(vec3(0.0, 0.0, 0.2), vec3(0.1, 0.1, 0.8), val / 0.2);
  } else if (val < 0.45) {
    return mix(vec3(0.1, 0.1, 0.8), vec3(0.8, 0.1, 0.6), (val - 0.2) / 0.25);
  } else if (val < 0.75) {
    return mix(vec3(0.8, 0.1, 0.6), vec3(1.0, 0.6, 0.0), (val - 0.45) / 0.3);
  } else if (val < 0.95) {
    return mix(vec3(1.0, 0.6, 0.0), vec3(1.0, 0.95, 0.2), (val - 0.75) / 0.2);
  } else {
    return mix(vec3(1.0, 0.95, 0.2), vec3(1.0, 1.0, 1.0), (val - 0.95) / 0.05);
  }
}

void main() {
  vec2 uv = v_texCoord;

  // 1. Kaleidoscope optical prism distortion
  if (u_kaleidoscope > 0.001) {
    vec2 p = uv - 0.5;
    float r = length(p);
    float a = atan(p.y, p.x);
    float segments = 6.0;
    float pi = 3.14159265;
    float seg = 2.0 * pi / segments;
    a = mod(a, seg);
    if (a > seg * 0.5) a = seg - a;
    vec2 kUv = vec2(cos(a), sin(a)) * r + 0.5;
    uv = mix(uv, kUv, clamp(u_kaleidoscope, 0.0, 1.0));
  }

  // 2. Glitch & VHS horizontal scan displacement
  if (u_glitch > 0.001) {
    float lineNoise = step(0.96, hash(vec2(floor(uv.y * 30.0), floor(u_seed * 10.0))));
    uv.x += (hash(vec2(uv.y, u_seed)) - 0.5) * 0.08 * lineNoise * u_glitch;
  }

  // 3. Chromatic aberration
  vec3 color;
  float totalChroma = u_chromaticAberration + (u_glitch * 0.4);
  if (totalChroma > 0.001) {
    vec2 dir = uv - 0.5;
    vec2 off = dir * totalChroma * 0.025;
    color = vec3(
      texture2D(u_image, uv + off).r,
      texture2D(u_image, uv).g,
      texture2D(u_image, uv - off).b
    );
  } else {
    color = texture2D(u_image, uv).rgb;
  }

  // 4. Smart Edge-Preserving Bilateral Denoise & Unsharp Mask
  vec2 tx = u_texelSize;
  if (u_denoise > 0.001) {
    float centerL = luma(color);
    vec3 cN1 = texture2D(u_image, uv + vec2(tx.x, 0.0)).rgb;
    vec3 cN2 = texture2D(u_image, uv - vec2(tx.x, 0.0)).rgb;
    vec3 cN3 = texture2D(u_image, uv + vec2(0.0, tx.y)).rgb;
    vec3 cN4 = texture2D(u_image, uv - vec2(0.0, tx.y)).rgb;
    vec3 cN5 = texture2D(u_image, uv + tx).rgb;
    vec3 cN6 = texture2D(u_image, uv - tx).rgb;

    float w1 = exp(-pow(abs(luma(cN1) - centerL), 2.0) / 0.03);
    float w2 = exp(-pow(abs(luma(cN2) - centerL), 2.0) / 0.03);
    float w3 = exp(-pow(abs(luma(cN3) - centerL), 2.0) / 0.03);
    float w4 = exp(-pow(abs(luma(cN4) - centerL), 2.0) / 0.03);
    float w5 = exp(-pow(abs(luma(cN5) - centerL), 2.0) / 0.03) * 0.7;
    float w6 = exp(-pow(abs(luma(cN6) - centerL), 2.0) / 0.03) * 0.7;

    float totW = 1.0 + w1 + w2 + w3 + w4 + w5 + w6;
    vec3 bilateral = (color + cN1 * w1 + cN2 * w2 + cN3 * w3 + cN4 * w4 + cN5 * w5 + cN6 * w6) / totW;
    color = mix(color, bilateral, clamp(u_denoise * 1.5, 0.0, 1.0));
  }

  // 4b. Adaptive High-Pass Edge Sharpening
  if (u_sharpen > 0.001) {
    vec3 blurred = (
      texture2D(u_image, uv + vec2(tx.x, 0.0)).rgb +
      texture2D(u_image, uv - vec2(tx.x, 0.0)).rgb +
      texture2D(u_image, uv + vec2(0.0, tx.y)).rgb +
      texture2D(u_image, uv - vec2(0.0, tx.y)).rgb
    ) * 0.25;
    vec3 highPass = color - blurred;
    color = color + highPass * (u_sharpen * 2.2);
  }

  // 5. Super Contrast / Clarity
  if (u_superContrast > 0.001) {
    vec2 r = tx * 4.0;
    vec3 local = (
      texture2D(u_image, uv + vec2(r.x, 0.0)).rgb +
      texture2D(u_image, uv - vec2(r.x, 0.0)).rgb +
      texture2D(u_image, uv + vec2(0.0, r.y)).rgb +
      texture2D(u_image, uv - vec2(0.0, r.y)).rgb +
      texture2D(u_image, uv + r).rgb +
      texture2D(u_image, uv - r).rgb +
      texture2D(u_image, uv + vec2(r.x, -r.y)).rgb +
      texture2D(u_image, uv + vec2(-r.x, r.y)).rgb
    ) * 0.125;
    float detail = luma(color) - luma(local);
    color += detail * u_superContrast * 1.8;
  }

  // 6. Halation (CineStill / vintage film red highlight scattering)
  if (u_halation > 0.001) {
    vec3 wideRed = (
      texture2D(u_image, uv + vec2(tx.x * 3.0, 0.0)).rgb +
      texture2D(u_image, uv - vec2(tx.x * 3.0, 0.0)).rgb +
      texture2D(u_image, uv + vec2(0.0, tx.y * 3.0)).rgb +
      texture2D(u_image, uv - vec2(0.0, tx.y * 3.0)).rgb
    ) * 0.25;
    float highlightLum = smoothstep(0.65, 0.98, luma(wideRed));
    vec3 halationGlow = vec3(1.0, 0.22, 0.08) * highlightLum * u_halation * 0.65;
    color += halationGlow;
  }

  // 7. Bloom (Pro-Mist dream glow)
  if (u_bloom > 0.001) {
    float bloomThreshold = smoothstep(0.55, 0.95, luma(blurred));
    vec3 bloomColor = blurred * bloomThreshold * u_bloom * 0.45;
    color = mix(color, color + bloomColor, 0.8);
  }

  // 8. Exposure
  color *= pow(2.0, u_exposure);

  // 9. White balance & tint
  color.r *= 1.0 + u_temperature * 0.35;
  color.b *= 1.0 - u_temperature * 0.35;
  color.g *= 1.0 + u_tint * 0.25;

  // 10. Contrast
  color = (color - 0.5) * (1.0 + u_contrast) + 0.5;

  // 11. Shadows & Highlights
  float l = luma(color);
  float shadowMask = 1.0 - smoothstep(0.0, 0.55, l);
  float highlightMask = smoothstep(0.45, 1.0, l);
  color += u_shadows * shadowMask * 0.45;
  color += u_highlights * highlightMask * 0.45;

  // 12. Saturation
  color = mix(vec3(luma(color)), color, 1.0 + u_saturation);

  // ==========================================
  // CURIOUS & EXPERIMENTAL FILTERS
  // ==========================================

  // A. Kodak Aerochrome (Infrared False Color: Greens -> Crimson Red, Sky -> Deep Cyan)
  if (u_infrared > 0.001) {
    float isGreen = max(0.0, color.g - max(color.r, color.b) * 0.8);
    vec3 irColor = color;
    // Map foliage to vivid infrared ruby/crimson
    irColor.r += isGreen * 2.4;
    irColor.g -= isGreen * 0.6;
    irColor.b -= isGreen * 0.3;
    // Boost cyan skies
    irColor.b += max(0.0, color.b - color.r) * 0.3;
    color = mix(color, clamp(irColor, 0.0, 1.0), clamp(u_infrared, 0.0, 1.0));
  }

  // B. Thermal Heat Vision (FLIR Ironbow Palette)
  if (u_thermal > 0.001) {
    float heat = luma(color);
    vec3 therm = thermalMap(heat);
    color = mix(color, therm, clamp(u_thermal, 0.0, 1.0));
  }

  // C. Night Vision Gen-3 PVS-14 (Phosphor Green + Cathode Gain + Central Tube)
  if (u_nightVision > 0.001) {
    float nvgLum = pow(luma(color), 0.7) * 1.4;
    vec3 nvgColor = vec3(nvgLum * 0.2, nvgLum * 1.0, nvgLum * 0.3);
    // Cathode Tube Vignette
    vec2 p = (uv - 0.5) * vec2(1.0, u_resolution.y / u_resolution.x);
    float tubeDist = length(p);
    float tubeVig = smoothstep(0.35, 0.55, tubeDist);
    nvgColor *= (1.0 - tubeVig * 0.95);
    color = mix(color, nvgColor, clamp(u_nightVision, 0.0, 1.0));
  }

  // D. Sabattier Darkroom Solarization
  if (u_solarize > 0.001) {
    vec3 sol = color;
    sol = abs(sol - 0.5) * 2.0; // Inversion curve
    color = mix(color, sol, clamp(u_solarize, 0.0, 1.0));
  }

  // E. Prussian Blue Cyanotype 1842
  if (u_cyanotype > 0.001) {
    float cyLuma = luma(color);
    vec3 cyanColor = mix(vec3(0.02, 0.08, 0.25), vec3(0.85, 0.92, 0.98), cyLuma);
    color = mix(color, cyanColor, clamp(u_cyanotype, 0.0, 1.0));
  }

  // F. 1998 GameBoy 2-bit Dither Matrix
  if (u_dither > 0.001) {
    vec2 dCoord = floor(uv * u_resolution.xy / 2.5);
    float ditherVal = mod(dCoord.x + dCoord.y * 2.0, 4.0) / 4.0;
    float ditLuma = luma(color) + (ditherVal - 0.5) * 0.25;
    float level = floor(ditLuma * 4.0) / 4.0;
    vec3 gbColors = mix(vec3(0.06, 0.22, 0.06), vec3(0.61, 0.73, 0.06), level);
    color = mix(color, gbColors, clamp(u_dither, 0.0, 1.0));
  }

  // G. Lomography LomoChrome Turquoise (Greens/Yellows -> Turquoise/Cyan, Blues -> Warm Amber Gold)
  if (u_lomochrome > 0.001) {
    vec3 tc = color;
    float r = color.r;
    float g = color.g;
    float b = color.b;
    tc.r = mix(r, b * 1.2, 0.75);
    tc.g = mix(g, (g + b) * 0.6, 0.85);
    tc.b = mix(b, (r + g) * 0.4, 0.75);
    color = mix(color, clamp(tc, 0.0, 1.0), clamp(u_lomochrome, 0.0, 1.0));
  }

  // H. Cross-Processing (E-6 Slide Film processed in C-41 Negative Chemistry)
  if (u_crossProcess > 0.001) {
    vec3 xp = color;
    xp.r = pow(xp.r, 1.35) * 1.2;
    xp.g = pow(xp.g, 0.92) * 1.05;
    xp.b = pow(xp.b, 0.75) * 0.85;
    // Boost cyan in shadows, yellow in highlights
    xp.g += (1.0 - luma(color)) * 0.08;
    xp.r += luma(color) * 0.12;
    color = mix(color, clamp(xp, 0.0, 1.0), clamp(u_crossProcess, 0.0, 1.0));
  }

  // I. Tilt-Shift Miniature Diorama (Sharp center horizontal band, progressive top/bottom blur)
  if (u_tiltShift > 0.001) {
    float distFromCenter = abs(uv.y - 0.5);
    float blurFactor = smoothstep(0.12, 0.42, distFromCenter) * clamp(u_tiltShift, 0.0, 1.0);
    vec3 tsBlur = (
      texture2D(u_image, uv + vec2(0.0, tx.y * 4.0)).rgb +
      texture2D(u_image, uv - vec2(0.0, tx.y * 4.0)).rgb +
      texture2D(u_image, uv + vec2(0.0, tx.y * 8.0)).rgb +
      texture2D(u_image, uv - vec2(0.0, tx.y * 8.0)).rgb
    ) * 0.25;
    color = mix(color, tsBlur, blurFactor * 0.85);
  }

  // J. Macro High-Pass Texture Boost (Extreme micro-contrast for close-up structures)
  if (u_macroBoost > 0.001) {
    vec3 fineDetail = color - blurred;
    color += fineDetail * u_macroBoost * 2.5;
  }

  // 13. Monochrome & Duotone tinting
  float g = luma(color);
  color = mix(color, vec3(g), clamp(u_monochrome, 0.0, 1.0));
  vec3 tinted = g * u_tintColor;
  color = mix(color, tinted, clamp(u_tintStrength, 0.0, 1.0));

  // 14. Fade / Film Matte lift
  color = mix(color, color * 0.82 + 0.09, clamp(u_fade, 0.0, 1.0));

  // 15. Vignette (aspect-corrected)
  vec2 centered = (uv - 0.5) * vec2(1.0, u_resolution.y / u_resolution.x);
  float dist = length(centered);
  float vig = smoothstep(0.28, 0.88, dist);
  color *= 1.0 - vig * clamp(u_vignette, 0.0, 1.0);

  // 16. Light Leak
  if (u_lightLeak > 0.001) {
    vec2 leakPos = vec2(0.12 + 0.08 * sin(u_seed * 1.3), 0.88 + 0.08 * cos(u_seed * 1.7));
    float leakDist = distance(uv, leakPos);
    float leak = smoothstep(0.95, 0.0, leakDist);
    color += vec3(1.0, 0.52, 0.22) * leak * u_lightLeak * 0.85;
  }

  // 17. Scanlines
  if (u_scanlines > 0.001) {
    float line = sin(uv.y * u_resolution.y * 1.5) * 0.5 + 0.5;
    color *= 1.0 - u_scanlines * 0.35 * (1.0 - line);
  }

  // 18. Film Grain (luma-weighted noise)
  if (u_grain > 0.001) {
    float n = hash(uv * u_resolution.xy);
    float grainWeight = 1.0 - pow(luma(color), 1.8);
    color += (n - 0.5) * u_grain * 0.28 * max(0.2, grainWeight);
  }

  // 19. Zebra stripes (Live overexposure warning)
  if (u_zebra > 0.5 && luma(color) > 0.92) {
    float stripe = mod(gl_FragCoord.x + gl_FragCoord.y, 16.0);
    if (stripe < 8.0) color = mix(color, vec3(0.05), 0.55);
  }

  // 20. Manual Focus Peaking Simulation (Live high-frequency green edge detection)
  if (u_focusPeaking > 0.5) {
    float edge = length(color - blurred) * 6.0;
    if (edge > 0.45) {
      color = mix(color, vec3(0.0, 1.0, 0.35), 0.85); // Bright neon green peaking
    }
  }

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
