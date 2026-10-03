# Camera-PaLaMa

A camera + non-destructive photo editor meant to replace the stock iPhone
camera app for day-to-day shooting. Next.js App Router, installable as a
PWA, deployable on Vercel or a VPS via Docker.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Camera access needs
HTTPS (or `localhost`) — a phone on your LAN talking to a plain `http://`
dev server won't get permission to use `getUserMedia`.

## What's here

- **Capture** — `lib/useCamera.ts` asks `getUserMedia` for the largest frame
  the device offers, then prefers the `ImageCapture` API's `takePhoto()`
  (requested at its reported max size) for the still itself — on Android
  Chrome this taps the camera pipeline directly and can return a photo well
  above the viewfinder's own preview resolution. Falls back to grabbing the
  live video frame where `ImageCapture` isn't available (notably, all of
  iOS Safari today).
- **Honesty about "RAW"**: no browser exposes the sensor's raw Bayer data —
  `ImageCapture`/`getUserMedia` only ever hand back already-processed
  frames. "Maximum resolution" here means the highest still the platform's
  camera pipeline will give a web page, not an actual `.dng`/`.cr2` file.
- **Editing** — `components/Editor.tsx` + `lib/gl/` run every adjustment
  (exposure, contrast, curves, white balance, sharpen/denoise, vignette,
  grain, chromatic aberration, scanlines, light leaks…) as one WebGL shader
  (`lib/gl/shaders.ts`). It's non-destructive: only the parameter stack is
  kept in state, and every render — live preview or final export — starts
  back from the untouched source and reapplies the full stack, so nothing
  is ever baked in early.
- **Styles** — `lib/presets.ts` ships a baker's dozen of old-camera looks
  (Kodachrome, Polaroid SX-70, Agfa Vista, Ilford HP5, CineStill 800T, Lomo
  LC-A, Holga, VHS, security-cam, daguerreotype…), each just a set of the
  same adjustment values, so every look stays tweakable afterwards.
- **Library** — saved shots live in the browser's own IndexedDB
  (`lib/photoDb.ts`, `lib/storage.ts`), each with the adjustment stack that
  produced it. No server storage: nothing to configure, and photos never
  leave the device.

## Deploying

Capture, live preview, editing and the photo library are all client-side,
so any host works.

**Vercel:** connect the repo — no environment variables needed.

**VPS (Docker):** `docker compose up -d --build`. The image build sets
`DOCKER_BUILD=1`, which turns on Next's `output: "standalone"` (Vercel
doesn't want it). Listens on 127.0.0.1:3501 behind your reverse proxy.

## Not done yet

- No tap-to-focus — `focusMode` support is too inconsistent across browsers
  to be worth it yet.
- No cross-device sync — the library lives in this browser only.
