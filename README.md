# Camera-PaLaMa

A camera + non-destructive photo editor meant to replace the stock iPhone
camera app for day-to-day shooting. Next.js App Router, installable as a
PWA, self-hosted on a VPS via Docker.

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
- **Library** — `app/api/photos/route.ts` stores saved shots as plain files
  on disk (`PHOTOS_DIR`), each with a JSON sidecar holding the adjustment
  stack that produced it. No database — just files you can back up or rsync.

## Deploying

**VPS (the way that actually persists photos):**

```bash
docker compose up -d --build
```

Ships a `Dockerfile` + `docker-compose.yml` producing a standalone Next.js
server, with `./data/photos` mounted into the container so saved shots
survive rebuilds. Defaults to port 3501 on the host (127.0.0.1, behind
whatever reverse proxy you already run).

**Vercel:** works for trying out the camera and editor — capture, live
filtered preview, and every adjustment are all client-side WebGL, no server
needed. **Saving a photo will not persist there**: `app/api/photos/route.ts`
writes to local disk via Node's `fs`, and Vercel's serverless functions have
an ephemeral filesystem that doesn't survive between requests. Treat a
Vercel deploy as a UI preview, not where your library lives.

## Not done yet

- No offline service worker — a hand-rolled one for a hashed Next.js build
  risks serving stale chunks after a deploy; a proper one wants
  `next-pwa`/Serwist.
- No tap-to-focus — `focusMode` support is too inconsistent across browsers
  to be worth it yet.
- No cross-device sync — the library is whatever files sit in `PHOTOS_DIR`
  on the one server you deployed to.
