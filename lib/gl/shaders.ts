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

// Pro Cinema & Color Science Shaders
uniform float u_anamorphicFlare;
uniform float u_toneCurve;
uniform float u_shadowTint;
uniform float u_highlightTint;
uniform float u_dehaze;
uniform float u_skinSmooth;

// Cutting-Edge Computational Photography Engine
uniform float u_acesToneMap;
uniform float u_casSharpness;
uniform float u_remjetHalation;
uniform float u_printFilmStock;

// Live Viewfinder Shooting Aids & Pro Tools
uniform float u_zebra;
uniform float u_zebraThreshold;
uniform float u_focusPeaking;
uniform float u_focusPeakingColor;
uniform float u_falseColor;
uniform float u_liveDro;
uniform float u_monoAssist;
uniform float u_anamorphicDesqueeze;

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233)) + u_seed) * 43758.5453);
}

// Professional False Color Exposure Mapping (Arri / RED / Atomos Standard IRE Scale)
vec3 applyFalseColor(float lum) {
  if (lum > 0.98) {
    return vec3(1.0, 0.0, 0.0); // >98 IRE Pure Red (Clipping)
  } else if (lum >= 0.85) {
    return vec3(1.0, 0.55, 0.0); // 85-95 IRE Amber/Orange (Highlight Warning)
  } else if (lum >= 0.58 && lum < 0.70) {
    return vec3(0.92, 0.78, 0.25); // 58-70 IRE Ochre Yellow (Medium Skin)
  } else if (lum >= 0.50 && lum < 0.58) {
    return vec3(1.0, 0.42, 0.68); // 50-58 IRE Pink (Light Skin)
  } else if (lum >= 0.38 && lum <= 0.42) {
    return vec3(0.18, 0.75, 0.35); // 38-42 IRE Green (18% Middle Grey)
  } else if (lum <= 0.02) {
    return vec3(0.55, 0.0, 0.65); // 0-2 IRE Purple (Crushed Black)
  } else if (lum <= 0.10) {
    return vec3(0.0, 0.25, 0.85); // 2-10 IRE Blue (Deep Shadow)
  } else {
    return vec3(lum * 0.45 + 0.15); // Desaturated tonal context
  }
}

// Selectable Neon Focus Peaking Colors (0: Green, 1: Red, 2: Cyan, 3: Yellow)
vec3 getPeakingColor(float code) {
  if (code < 0.5) return vec3(0.0, 1.0, 0.35); // Neon Green
  if (code < 1.5) return vec3(1.0, 0.15, 0.25); // Electric Red
  if (code < 2.5) return vec3(0.0, 0.85, 1.0);  // Electric Cyan
  return vec3(1.0, 0.92, 0.0);                   // Vivid Yellow
}

// 1. Academy Color Encoding System (ACES 1.3 Fitted RRT+ODT)
vec3 acesFitted(vec3 col) {
  mat3 m1 = mat3(
    0.59719, 0.07600, 0.02840,
    0.35458, 0.90834, 0.13383,
    0.04823, 0.01566, 0.83777
  );
  mat3 m2 = mat3(
    1.60475, -0.10208, -0.00327,
    -0.53108, 1.10813, -0.07276,
    -0.07367, -0.00605, 1.07602
  );
  vec3 v = m1 * col;
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return clamp(m2 * (a / b), 0.0, 1.0);
}

// 2. AMD FidelityFX Contrast-Adaptive Sharpening (CAS)
vec3 casSharpen(sampler2D tex, vec2 uv, vec2 tx, float sharpness) {
  vec3 e = texture2D(tex, uv).rgb;
  vec3 b = texture2D(tex, uv + vec2(0.0, -tx.y)).rgb;
  vec3 d = texture2D(tex, uv + vec2(-tx.x, 0.0)).rgb;
  vec3 f = texture2D(tex, uv + vec2(tx.x, 0.0)).rgb;
  vec3 h = texture2D(tex, uv + vec2(0.0, tx.y)).rgb;

  vec3 minRGB = min(min(min(d, e), min(f, b)), h);
  vec3 maxRGB = max(max(max(d, e), max(f, b)), h);

  vec3 rcpMRGB = 1.0 / max(maxRGB, vec3(0.0001));
  vec3 ampRGB = clamp(min(minRGB, 2.0 - maxRGB) * rcpMRGB, 0.0, 1.0);
  ampRGB = inversesqrt(ampRGB);

  float peak = -3.0 * sharpness + 8.0;
  vec3 wRGB = -1.0 / (ampRGB * peak);
  vec3 rcpWeightRGB = 1.0 / (1.0 + 4.0 * wRGB);

  return clamp((b * wRGB + d * wRGB + f * wRGB + h * wRGB + e) * rcpWeightRGB, 0.0, 1.0);
}

// 3. Physical Remjet Anti-Halation Layer Red Scatter Simulation
vec3 remjetScatter(sampler2D tex, vec2 uv, vec2 tx, float amount) {
  if (amount <= 0.001) return vec3(0.0);
  vec3 halationSum = vec3(0.0);
  for (int x = -3; x <= 3; x++) {
    for (int y = -3; y <= 3; y++) {
      float dist = length(vec2(float(x), float(y)));
      if (dist <= 3.0) {
        float weight = exp(-dist * dist / 4.5);
        vec3 s = texture2D(tex, uv + vec2(float(x), float(y)) * tx * 3.2).rgb;
        float lum = luma(s);
        float threshold = smoothstep(0.65, 0.98, lum);
        halationSum += vec3(1.0, 0.16, 0.04) * s.r * threshold * weight;
      }
    }
  }
  return halationSum * amount * 0.07;
}

// 4. Hollywood Print Film 3D LUT Simulation (Kodak 2383 / Technicolor 3-Strip / Bleach Bypass)
vec3 applyPrintFilmStock(vec3 c, float mode) {
  if (mode < 0.5) return c;
  if (mode < 1.5) {
    // Kodak 2383 Print Film
    vec3 k = c;
    k.r = pow(k.r, 1.12) * 1.06;
    k.g = pow(k.g, 1.06);
    k.b = pow(k.b, 0.94) * 0.94;
    k = (k * (k * 0.45 + 0.55)) / (k * (k * 0.35 + 0.45) + 0.2);
    return clamp(k, 0.0, 1.0);
  } else if (mode < 2.5) {
    // Technicolor 3-Strip 1935
    float r = c.r; float g = c.g; float b = c.b;
    vec3 tech;
    tech.r = clamp(r * 1.4 - (g + b) * 0.2, 0.0, 1.0);
    tech.g = clamp(g * 1.3 - (r + b) * 0.15, 0.0, 1.0);
    tech.b = clamp(b * 1.35 - (r + g) * 0.18, 0.0, 1.0);
    return mix(c, tech, 0.85);
  } else if (mode < 3.5) {
    // Bleach Bypass Silver Retention
    float lum = luma(c);
    vec3 blend = mix(c, vec3(lum), 0.65);
    vec3 bb = mix(2.0 * c * blend, 1.0 - 2.0 * (1.0 - c) * (1.0 - blend), step(0.5, lum));
    return mix(c, bb, 0.85);
  }
  return c;
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

  // Anamorphic Optical De-Squeeze (1.33x / 1.55x / 2.0x)
  if (u_anamorphicDesqueeze > 1.01) {
    uv.x = (uv.x - 0.5) * u_anamorphicDesqueeze + 0.5;
    if (uv.x < 0.0 || uv.x > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
  }

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
  vec3 blurred = (
    texture2D(u_image, uv + vec2(tx.x, 0.0)).rgb +
    texture2D(u_image, uv - vec2(tx.x, 0.0)).rgb +
    texture2D(u_image, uv + vec2(0.0, tx.y)).rgb +
    texture2D(u_image, uv - vec2(0.0, tx.y)).rgb
  ) * 0.25;

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

  // ==========================================
  // PROFESSIONAL CINEMA & COLOR SCIENCE SUITE
  // ==========================================

  // K. Anamorphic Blue Streak Lens Flare
  if (u_anamorphicFlare > 0.001) {
    vec3 streak = vec3(0.0);
    vec2 stx = u_texelSize;
    for (float i = 1.0; i <= 5.0; i += 1.0) {
      vec2 off = vec2(stx.x * i * 9.0, 0.0);
      vec3 s1 = texture2D(u_image, uv + off).rgb;
      vec3 s2 = texture2D(u_image, uv - off).rgb;
      float l1 = smoothstep(0.72, 0.98, luma(s1));
      float l2 = smoothstep(0.72, 0.98, luma(s2));
      streak += (s1 * l1 + s2 * l2) / (i * 1.6);
    }
    vec3 anamorphicBlue = vec3(0.18, 0.55, 1.0) * streak * u_anamorphicFlare * 0.85;
    color += anamorphicBlue;
  }

  // L. Atmospheric Dehaze & Micro-Contrast
  if (u_dehaze > 0.001) {
    vec3 minChannel = vec3(min(min(color.r, color.g), color.b));
    float airlight = luma(minChannel);
    color = (color - airlight * 0.35 * u_dehaze) / max(vec3(0.08), vec3(1.0) - airlight * 0.25 * u_dehaze);
    color = mix(color, (color - 0.5) * (1.0 + u_dehaze * 0.25) + 0.5, 0.4);
  }

  // M. Portrait Melanin Protection & Skin Softening
  if (u_skinSmooth > 0.001) {
    bool isSkin = (color.r > color.g) && (color.g > color.b) && ((color.r - color.b) > 0.08);
    if (isSkin) {
      vec3 smoothSkin = mix(color, blurred, u_skinSmooth * 0.6);
      color = mix(color, smoothSkin, clamp(u_skinSmooth, 0.0, 1.0));
    }
  }

  // N. Cineon / Arri Film S-Curve Tone Mapping (Soft shoulder roll-off & deep rich blacks)
  if (u_toneCurve > 0.001) {
    vec3 x = max(vec3(0.0), color);
    vec3 filmic = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
    color = mix(color, filmic, clamp(u_toneCurve, 0.0, 1.0));
  }

  // O. 3-Way Split Toning: Cinema Teal Shadows & Warm Amber Highlights
  if (u_shadowTint > 0.001) {
    float sWeight = 1.0 - smoothstep(0.0, 0.55, luma(color));
    vec3 tealShadow = vec3(0.05, 0.35, 0.45);
    color = mix(color, color + tealShadow * sWeight * 0.5, clamp(u_shadowTint, 0.0, 1.0));
  }
  if (u_highlightTint > 0.001) {
    float hWeight = smoothstep(0.45, 1.0, luma(color));
    vec3 amberHigh = vec3(0.45, 0.28, 0.05);
    color = mix(color, color + amberHigh * hWeight * 0.5, clamp(u_highlightTint, 0.0, 1.0));
  }

  // ==========================================
  // ADVANCED COMPUTATIONAL PHOTOGRAPHY PIPELINE
  // ==========================================

  // P. AMD FidelityFX Contrast-Adaptive Sharpening (Zero-Halo & Zero-Ringing)
  if (u_casSharpness > 0.001) {
    vec3 cas = casSharpen(u_image, uv, tx, clamp(u_casSharpness, 0.0, 1.0));
    color = mix(color, cas, clamp(u_casSharpness, 0.0, 1.0));
  }

  // Q. Physical Remjet Anti-Halation Layer Scatter
  if (u_remjetHalation > 0.001) {
    vec3 remjet = remjetScatter(u_image, uv, tx, u_remjetHalation);
    color += remjet;
  }

  // R. Hollywood Print Film Stock Emulation (Kodak 2383 / Technicolor 3-Strip / Bleach Bypass)
  if (u_printFilmStock > 0.1) {
    color = applyPrintFilmStock(color, u_printFilmStock);
  }

  // S. Academy Color Encoding System (ACES 1.3 Fitted RRT+ODT Tone Curve)
  if (u_acesToneMap > 0.001) {
    vec3 aces = acesFitted(color);
    color = mix(color, aces, clamp(u_acesToneMap, 0.0, 1.0));
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

  // 19. Live Dynamic Range Optimizer (DRO / Real-Time Shadow Recovery)
  if (u_liveDro > 0.001) {
    float lumVal = luma(color);
    float shadowWeight = 1.0 - smoothstep(0.0, 0.65, lumVal);
    vec3 lifted = color + (vec3(1.0) - color) * shadowWeight * 0.45 * u_liveDro;
    color = mix(color, lifted, 0.88);
  }

  // 20. Live Monochrome Composition Assist (Framing / Contrast view)
  if (u_monoAssist > 0.5) {
    float mVal = luma(color);
    color = vec3(mVal);
  }

  // 21. Dynamic Multi-Threshold Animated Zebra Stripes
  if (u_zebra > 0.5) {
    float thresh = u_zebraThreshold > 0.1 ? u_zebraThreshold : 0.92;
    if (luma(color) >= thresh) {
      float stripe = mod(gl_FragCoord.x + gl_FragCoord.y + u_seed * 50.0, 16.0);
      if (stripe < 8.0) color = mix(color, vec3(0.04), 0.75);
    }
  }

  // 22. Multi-Color Manual Focus Peaking (0: Green, 1: Red, 2: Cyan, 3: Yellow)
  if (u_focusPeaking > 0.5) {
    float edge = length(color - blurred) * 6.5;
    if (edge > 0.42) {
      vec3 peakCol = getPeakingColor(u_focusPeakingColor);
      color = mix(color, peakCol, 0.88);
    }
  }

  // 23. Live False Color Exposure Monitor (Arri / RED / Atomos standard IRE heatmap)
  if (u_falseColor > 0.5) {
    color = applyFalseColor(luma(color));
  }

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
