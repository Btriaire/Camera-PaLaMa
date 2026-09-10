import { Adjustments } from "../types";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./shaders";

// Anything the browser can hand a WebGL texture from — a live <video>
// frame or a decoded still.
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

// Wraps the WebGL1 context + uber-shader that renders every filter/preset.
// One instance is reused for both the live viewfinder preview (called every
// animation frame) and the full-resolution export (called once, against an
// offscreen canvas sized to the original capture) — same GPU program, same
// output, no drift between preview and final.
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

    // Fullscreen quad, two triangles, with matching UVs (flipped in Y since
    // video/image sources are top-down but WebGL texture space is bottom-up).
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
      "u_highlights", "u_shadows", "u_sharpen", "u_denoise", "u_vignette",
      "u_grain", "u_fade", "u_monochrome", "u_tintColor", "u_tintStrength",
      "u_chromaticAberration", "u_lightLeak", "u_scanlines", "u_zebra",
    ]) {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }
  }

  // Uploads a new frame/image. Call every frame for live video, once per
  // still image. Resizes the drawing buffer to match if needed.
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

  // `zebra` is deliberately not part of Adjustments: it's a live-viewfinder
  // shooting aid (overexposure warning), never something that should get
  // baked into an exported photo. Callers that export (lib/export.ts,
  // preset thumbnails) simply never pass it, so it defaults off there.
  render(adjustments: Adjustments, seed = 0, zebra = false) {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uniforms.u_image, 0);
    gl.uniform2f(this.uniforms.u_texelSize, 1 / Math.max(this.sourceWidth, 1), 1 / Math.max(this.sourceHeight, 1));
    gl.uniform2f(this.uniforms.u_resolution, this.sourceWidth, this.sourceHeight);
    gl.uniform1f(this.uniforms.u_seed, seed);
    gl.uniform1f(this.uniforms.u_zebra, zebra ? 1.0 : 0.0);

    gl.uniform1f(this.uniforms.u_exposure, adjustments.exposure / 50);
    gl.uniform1f(this.uniforms.u_contrast, adjustments.contrast / 100);
    gl.uniform1f(this.uniforms.u_saturation, adjustments.saturation / 100);
    gl.uniform1f(this.uniforms.u_temperature, adjustments.temperature / 100);
    gl.uniform1f(this.uniforms.u_tint, adjustments.tint / 100);
    gl.uniform1f(this.uniforms.u_highlights, adjustments.highlights / 100);
    gl.uniform1f(this.uniforms.u_shadows, adjustments.shadows / 100);
    gl.uniform1f(this.uniforms.u_sharpen, (adjustments.sharpen / 100) * 1.5);
    gl.uniform1f(this.uniforms.u_denoise, adjustments.denoise / 100);
    gl.uniform1f(this.uniforms.u_vignette, adjustments.vignette / 100);
    gl.uniform1f(this.uniforms.u_grain, adjustments.grain / 100);
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

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose() {
    const gl = this.gl;
    gl.deleteTexture(this.texture);
    gl.deleteProgram(this.program);
  }
}
