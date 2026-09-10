// Pose longue (long exposure): there's no web API that holds a camera
// sensor's shutter open for seconds — getUserMedia hands back ordinary
// video frames, nothing like a bulb-exposure control. What real cameras
// get from a long exposure is actually built here the way "Slow Shutter
// Cam"-style apps do it: capture frames as fast as the camera will give
// them for the chosen duration and blend them together. No AI, no shader —
// this is one canvas 2D composite operation per frame, cheap and genuinely
// real-time, so the viewfinder can show the trails building live instead
// of a spinner.
export type LongExposureBlend = "lighten" | "average";

// A slider, not fixed steps — 30s tops because that's already the classic
// bulb-mode ceiling on a real camera before you're into minutes-long
// astrophotography territory, and past maybe 30s of frames at whatever
// rate the camera streams there's nothing more to see in the accumulator
// that a shorter exposure hasn't already shown.
export const LONG_EXPOSURE_MIN_S = 1;
export const LONG_EXPOSURE_MAX_S = 30;
export const LONG_EXPOSURE_STEP_S = 1;
export const LONG_EXPOSURE_DEFAULT_S = 5;

export const LONG_EXPOSURE_BLENDS: { id: LongExposureBlend; label: string; blurb: string }[] = [
  {
    id: "lighten",
    label: "Traînées lumineuses",
    blurb: "Garde le pixel le plus clair vu à chaque image — phares, étoiles, feux d'artifice.",
  },
  {
    id: "average",
    label: "Flou de mouvement doux",
    blurb: "Moyenne toutes les images — eau lissée, foule floutée, et moins de bruit en prime.",
  },
];

// Draws onto a canvas the caller already owns (typically one shown live in
// the viewfinder) so every added frame is visible immediately — the light
// trails or motion blur really do build up on screen as the exposure runs.
export class LongExposureAccumulator {
  private ctx: CanvasRenderingContext2D;
  private frames = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    width: number,
    height: number,
    private blend: LongExposureBlend
  ) {
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Contexte 2D indisponible");
    this.ctx = ctx;
  }

  addFrame(source: CanvasImageSource) {
    this.frames += 1;
    if (this.blend === "lighten") {
      // "lighten" is a native canvas composite mode: per channel, keeps
      // whichever of source/backdrop is brighter — exactly a light-trail
      // accumulation. The very first frame draws plain so the canvas
      // starts from a real image rather than compositing against blank.
      this.ctx.globalCompositeOperation = this.frames === 1 ? "source-over" : "lighten";
      this.ctx.globalAlpha = 1;
    } else {
      // Drawing frame i at alpha = 1/i over the running result is the
      // standard trick for an incremental average: after frame 2 the
      // canvas holds 50/50 of frames 1-2, after frame 3 it's 1/3 each of
      // frames 1-3, and so on — no need to keep every frame in memory to
      // average them.
      this.ctx.globalCompositeOperation = "source-over";
      this.ctx.globalAlpha = 1 / this.frames;
    }
    this.ctx.drawImage(source, 0, 0, this.canvas.width, this.canvas.height);
  }

  get frameCount() {
    return this.frames;
  }

  toBlob(quality = 0.95): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Échec de la pose longue"))),
        "image/jpeg",
        quality
      );
    });
  }
}
