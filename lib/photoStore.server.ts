import { promises as fs } from "fs";
import path from "path";
import { del, list, put } from "@vercel/blob";
import { SavedPhotoMeta } from "./types";

// Two storage backends behind the same five functions, chosen automatically
// by environment rather than by a setting: a Vercel deployment's serverless
// functions have an ephemeral, per-invocation filesystem -- writing to
// PHOTOS_DIR there looks like it works for the request that wrote it, then
// the next request (a different, or recycled, execution environment) sees
// nothing. Vercel Blob is Vercel's own object storage and is what actually
// persists there; BLOB_READ_WRITE_TOKEN only exists once a Blob store is
// connected to the project, which is exactly the signal we want. On the VPS
// (Docker) or local dev there's no such token, so this falls through to the
// plain-files implementation below, which needs no external service where
// a real writable disk is already available.
const BLOB_ENABLED = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const PHOTOS_DIR =
  process.env.PHOTOS_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), ".data", "photos");

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function assertValidId(id: string) {
  if (!ID_PATTERN.test(id)) throw new Error("Identifiant de photo invalide");
}

// ---- Vercel Blob backend ----

const BLOB_PREFIX = "photos/";

async function findBlob(id: string, suffix: string): Promise<{ url: string } | null> {
  const { blobs } = await list({ prefix: `${BLOB_PREFIX}${id}${suffix}` });
  return blobs[0] ?? null;
}

async function listPhotosBlob(): Promise<SavedPhotoMeta[]> {
  const { blobs } = await list({ prefix: BLOB_PREFIX, limit: 1000 });
  const metaBlobs = blobs.filter((b) => b.pathname.endsWith(".json"));
  const metas = await Promise.all(
    metaBlobs.map(async (b) => {
      try {
        const res = await fetch(b.url, { cache: "no-store" });
        return (await res.json()) as SavedPhotoMeta;
      } catch {
        return null;
      }
    })
  );
  return metas
    .filter((m): m is SavedPhotoMeta => m !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function savePhotoBlob(id: string, buffer: Buffer, ext: string, meta: SavedPhotoMeta): Promise<void> {
  // addRandomSuffix: false -- our ids are already unique (crypto.randomUUID),
  // so a deterministic pathname is what lets a later request find this
  // exact blob again by id alone, via list()'s prefix match below.
  await put(`${BLOB_PREFIX}${id}.${ext}`, buffer, {
    access: "public",
    addRandomSuffix: false,
    contentType: ext === "png" ? "image/png" : "image/jpeg",
  });
  await put(`${BLOB_PREFIX}${id}.json`, JSON.stringify(meta), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

async function getPhotoMetaBlob(id: string): Promise<SavedPhotoMeta | null> {
  const blob = await findBlob(id, ".json");
  if (!blob) return null;
  try {
    const res = await fetch(blob.url, { cache: "no-store" });
    return (await res.json()) as SavedPhotoMeta;
  } catch {
    return null;
  }
}

async function readPhotoFileBlob(id: string): Promise<{ buffer: Buffer; ext: string } | null> {
  for (const ext of ["jpg", "png"]) {
    const blob = await findBlob(id, `.${ext}`);
    if (!blob) continue;
    const res = await fetch(blob.url, { cache: "no-store" });
    if (!res.ok) continue;
    return { buffer: Buffer.from(await res.arrayBuffer()), ext };
  }
  return null;
}

async function deletePhotoBlob(id: string): Promise<void> {
  const { blobs } = await list({ prefix: `${BLOB_PREFIX}${id}` });
  if (blobs.length) await del(blobs.map((b) => b.url));
}

// ---- Plain-files backend (VPS/Docker, local dev) ----

async function ensureDir() {
  await fs.mkdir(PHOTOS_DIR, { recursive: true });
}

function metaPath(id: string) {
  return path.join(PHOTOS_DIR, `${id}.json`);
}

function imagePath(id: string, ext: string) {
  return path.join(PHOTOS_DIR, `${id}.${ext}`);
}

async function listPhotosFs(): Promise<SavedPhotoMeta[]> {
  await ensureDir();
  const files = await fs.readdir(PHOTOS_DIR);
  const metas = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        try {
          const raw = await fs.readFile(path.join(PHOTOS_DIR, f), "utf8");
          return JSON.parse(raw) as SavedPhotoMeta;
        } catch {
          return null;
        }
      })
  );
  return metas
    .filter((m): m is SavedPhotoMeta => m !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function savePhotoFs(id: string, buffer: Buffer, ext: string, meta: SavedPhotoMeta): Promise<void> {
  await ensureDir();
  await fs.writeFile(imagePath(id, ext), buffer);
  await fs.writeFile(metaPath(id), JSON.stringify(meta), "utf8");
}

async function getPhotoMetaFs(id: string): Promise<SavedPhotoMeta | null> {
  try {
    const raw = await fs.readFile(metaPath(id), "utf8");
    return JSON.parse(raw) as SavedPhotoMeta;
  } catch {
    return null;
  }
}

async function readPhotoFileFs(id: string): Promise<{ buffer: Buffer; ext: string } | null> {
  await ensureDir();
  for (const ext of ["jpg", "png"]) {
    try {
      const buffer = await fs.readFile(imagePath(id, ext));
      return { buffer, ext };
    } catch {
      continue;
    }
  }
  return null;
}

async function deletePhotoFs(id: string): Promise<void> {
  for (const ext of ["jpg", "png"]) {
    await fs.unlink(imagePath(id, ext)).catch(() => {});
  }
  await fs.unlink(metaPath(id)).catch(() => {});
}

// ---- Public API (used by app/api/photos/route.ts) ----

export async function listPhotos(): Promise<SavedPhotoMeta[]> {
  return BLOB_ENABLED ? listPhotosBlob() : listPhotosFs();
}

export async function savePhoto(id: string, buffer: Buffer, ext: string, meta: SavedPhotoMeta): Promise<void> {
  assertValidId(id);
  return BLOB_ENABLED ? savePhotoBlob(id, buffer, ext, meta) : savePhotoFs(id, buffer, ext, meta);
}

export async function getPhotoMeta(id: string): Promise<SavedPhotoMeta | null> {
  assertValidId(id);
  return BLOB_ENABLED ? getPhotoMetaBlob(id) : getPhotoMetaFs(id);
}

export async function readPhotoFile(id: string): Promise<{ buffer: Buffer; ext: string } | null> {
  assertValidId(id);
  return BLOB_ENABLED ? readPhotoFileBlob(id) : readPhotoFileFs(id);
}

export async function deletePhoto(id: string): Promise<void> {
  assertValidId(id);
  return BLOB_ENABLED ? deletePhotoBlob(id) : deletePhotoFs(id);
}
