import { Adjustments } from "../types";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./shaders";

export type ImageSource = HTMLVideoElement | HTMLImageElement | ImageBitmap | HTMLCanvasElement;

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Impossible de créer le shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Erreur de compilation shader: ${log}`);
  }
  return shader;
}

export type LiveAssistOptions = {
  zebra?: boolean;
  zebraThreshold?: number;
  focusPeaking?: boolean;
  focusPeakingColor?: number;
  falseColor?: boolean;
  liveDro?: boolean;
  monoAssist?: boolean;
  anamorphicDesqueeze?: number;
};

export class GLRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private texture: WebGLTexture;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private sourceWidth = 0;
  private sourceHeight = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false });
    if (!gl) throw new Error("WebGL indisponible sur cet appareil");
    this.gl = gl;

    const program = gl.createProgram();
    if (!program) throw new Error("Impossible de créer le programme WebGL");
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Erreur de link WebGL: ${gl.getProgramInfoLog(program)}`);
    }
    this.program = program;
    gl.useProgram(program);

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const texCoords = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
    const texLoc = gl.getAttribLocation(program, "a_texCoord");
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    if (!texture) throw new Error("Impossible de créer la texture");
    this.texture = texture;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    for (const name of [
      "u_image", "u_texelSize", "u_resolution", "u_seed",
      "u_exposure", "u_contrast", "u_saturation", "u_temperature", "u_tint",
      "u_highlights", "u_shadows", "u_sharpen", "u_superContrast", "u_denoise", "u_vignette",
      "u_grain", "u_halation", "u_bloom", "u_fade", "u_monochrome", "u_tintColor", "u_tintStrength",
      "u_chromaticAberration", "u_lightLeak", "u_scanlines",
      "u_zebra", "u_zebraThreshold", "u_focusPeaking", "u_focusPeakingColor",
      "u_falseColor", "u_liveDro", "u_monoAssist", "u_anamorphicDesqueeze",
      "u_infrared", "u_thermal", "u_nightVision", "u_glitch", "u_kaleidoscope",
      "u_solarize", "u_cyanotype", "u_dither", "u_lomochrome", "u_crossProcess", "u_tiltShift", "u_macroBoost",
      "u_anamorphicFlare", "u_toneCurve", "u_shadowTint", "u_highlightTint", "u_dehaze", "u_skinSmooth",
      "u_acesToneMap", "u_casSharpness", "u_remjetHalation", "u_printFilmStock",
      "u_jwstSpikes", "u_kirlianAura", "u_lidarMesh", "u_quantumEvent", "u_solarHAlpha", "u_electronMicro",
      "u_dofBlur", "u_focusDistance", "u_focusPoint", "u_apertureFStop", "u_focusPlaneMode",
      "u_bokehAspect", "u_petzvalSwirl", "u_highlightKnee",
    ]) {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }
  }

  uploadSource(source: ImageSource, width: number, height: number) {
    const gl = this.gl;
    this.sourceWidth = width;
    this.sourceHeight = height;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  render(
    adjustments: Adjustments,
    seed = 0,
    liveAssist: LiveAssistOptions | boolean = false,
    legacyPeaking = false
  ) {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);

    const opts: LiveAssistOptions =
      typeof liveAssist === "boolean"
        ? { zebra: liveAssist, focusPeaking: legacyPeaking }
        : liveAssist;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uniforms.u_image, 0);
    gl.uniform2f(this.uniforms.u_texelSize, 1 / Math.max(this.sourceWidth, 1), 1 / Math.max(this.sourceHeight, 1));
    gl.uniform2f(this.uniforms.u_resolution, this.sourceWidth, this.sourceHeight);
    gl.uniform1f(this.uniforms.u_seed, seed);

    // Live Shooting Aids & Pro Tools
    gl.uniform1f(this.uniforms.u_zebra, opts.zebra ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_zebraThreshold, opts.zebraThreshold ?? 0.92);
    gl.uniform1f(this.uniforms.u_focusPeaking, opts.focusPeaking ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_focusPeakingColor, opts.focusPeakingColor ?? 0.0);
    gl.uniform1f(this.uniforms.u_falseColor, opts.falseColor ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_liveDro, opts.liveDro ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_monoAssist, opts.monoAssist ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_anamorphicDesqueeze, opts.anamorphicDesqueeze ?? 1.0);

    gl.uniform1f(this.uniforms.u_exposure, adjustments.exposure / 50);
    gl.uniform1f(this.uniforms.u_contrast, adjustments.contrast / 100);
    gl.uniform1f(this.uniforms.u_saturation, adjustments.saturation / 100);
    gl.uniform1f(this.uniforms.u_temperature, adjustments.temperature / 100);
    gl.uniform1f(this.uniforms.u_tint, adjustments.tint / 100);
    gl.uniform1f(this.uniforms.u_highlights, adjustments.highlights / 100);
    gl.uniform1f(this.uniforms.u_shadows, adjustments.shadows / 100);
    gl.uniform1f(this.uniforms.u_sharpen, (adjustments.sharpen / 100) * 1.5);
    gl.uniform1f(this.uniforms.u_superContrast, adjustments.superContrast / 100);
    gl.uniform1f(this.uniforms.u_denoise, adjustments.denoise / 100);
    gl.uniform1f(this.uniforms.u_vignette, adjustments.vignette / 100);
    gl.uniform1f(this.uniforms.u_grain, adjustments.grain / 100);
    gl.uniform1f(this.uniforms.u_halation, (adjustments.halation ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_bloom, (adjustments.bloom ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_fade, adjustments.fade / 100);
    gl.uniform1f(this.uniforms.u_monochrome, adjustments.monochrome / 100);
    gl.uniform3f(
      this.uniforms.u_tintColor,
      adjustments.tintColor[0] / 255,
      adjustments.tintColor[1] / 255,
      adjustments.tintColor[2] / 255
    );
    gl.uniform1f(this.uniforms.u_tintStrength, adjustments.tintStrength / 100);
    gl.uniform1f(this.uniforms.u_chromaticAberration, adjustments.chromaticAberration / 100);
    gl.uniform1f(this.uniforms.u_lightLeak, adjustments.lightLeak / 100);
    gl.uniform1f(this.uniforms.u_scanlines, adjustments.scanlines / 100);

    // Curious effects & Macro
    gl.uniform1f(this.uniforms.u_infrared, (adjustments.infrared ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_thermal, (adjustments.thermal ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_nightVision, (adjustments.nightVision ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_glitch, (adjustments.glitch ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_kaleidoscope, (adjustments.kaleidoscope ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_solarize, (adjustments.solarize ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_cyanotype, (adjustments.cyanotype ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_dither, (adjustments.dither ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_lomochrome, (adjustments.lomochrome ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_crossProcess, (adjustments.crossProcess ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_tiltShift, (adjustments.tiltShift ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_macroBoost, (adjustments.macroBoost ?? 0) / 100);

    // Pro Cinema & Color Science
    gl.uniform1f(this.uniforms.u_anamorphicFlare, (adjustments.anamorphicFlare ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_toneCurve, (adjustments.toneCurve ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_shadowTint, (adjustments.shadowTint ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_highlightTint, (adjustments.highlightTint ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_dehaze, (adjustments.dehaze ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_skinSmooth, (adjustments.skinSmooth ?? 0) / 100);

    // Cutting-Edge Computational Photography
    gl.uniform1f(this.uniforms.u_acesToneMap, (adjustments.acesToneMap ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_casSharpness, (adjustments.casSharpness ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_remjetHalation, (adjustments.remjetHalation ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_printFilmStock, adjustments.printFilmStock ?? 0);

    // Exotic & Scientific Computational Sensors
    gl.uniform1f(this.uniforms.u_jwstSpikes, (adjustments.jwstSpikes ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_kirlianAura, (adjustments.kirlianAura ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_lidarMesh, (adjustments.lidarMesh ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_quantumEvent, (adjustments.quantumEvent ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_solarHAlpha, (adjustments.solarHAlpha ?? 0) / 100);
    gl.uniform1f(this.uniforms.u_electronMicro, (adjustments.electronMicro ?? 0) / 100);

    // Optical Depth of Field, Autofocus & Bokeh Simulator
    gl.uniform1f(this.uniforms.u_dofBlur, (adjustments.dofBlur ?? 0));
    gl.uniform1f(this.uniforms.u_focusDistance, (adjustments.focusDistance ?? 30));
    gl.uniform2f(
      this.uniforms.u_focusPoint,
      adjustments.focusPoint ? adjustments.focusPoint[0] : 0.5,
      adjustments.focusPoint ? adjustments.focusPoint[1] : 0.5
    );
    gl.uniform1f(this.uniforms.u_apertureFStop, (adjustments.apertureFStop ?? 1.8));
    gl.uniform1f(this.uniforms.u_focusPlaneMode, (adjustments.focusPlaneMode ?? 0));
    gl.uniform1f(this.uniforms.u_bokehAspect, (adjustments.bokehAspect ?? 1.0));
    gl.uniform1f(this.uniforms.u_petzvalSwirl, (adjustments.petzvalSwirl ?? 0));
    gl.uniform1f(this.uniforms.u_highlightKnee, (adjustments.highlightKnee ?? 0));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  renderSplit(
    neutralAdj: Adjustments,
    activeAdj: Adjustments,
    splitRatio = 0.5,
    seed = 0,
    liveAssist: LiveAssistOptions | boolean = false,
    legacyPeaking = false
  ) {
    const gl = this.gl;
    const splitX = Math.round(this.canvas.width * Math.max(0.01, Math.min(0.99, splitRatio)));

    gl.enable(gl.SCISSOR_TEST);

    // Left: Unfiltered Neutral Sensor
    gl.scissor(0, 0, splitX, this.canvas.height);
    this.render(neutralAdj, seed, liveAssist, legacyPeaking);

    // Right: Active Emulsion
    gl.scissor(splitX, 0, this.canvas.width - splitX, this.canvas.height);
    this.render(activeAdj, seed, liveAssist, legacyPeaking);

    gl.disable(gl.SCISSOR_TEST);
  }

  dispose() {
    const gl = this.gl;
    gl.deleteTexture(this.texture);
    gl.deleteProgram(this.program);
  }
}
