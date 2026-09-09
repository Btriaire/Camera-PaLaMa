import { promises as fs } from "fs";
import path from "path";
import { SavedPhotoMeta } from "./types";

// Photos live as plain files on the VPS — an <id>.jpg (or .png) next to an
// <id>.json sidecar with the adjustment stack that produced it. No database:
// consistent with the rest of this app (see lib/store.ts), and it means the
// original + its edits are just files an admin can back up or rsync.
// The turbopackIgnore comment keeps Turbopack's file tracing from treating
// this dynamic path.join as a signal to trace the entire project (see the
// "Encountered unexpected file in NFT list" build warning without it).
const PHOTOS_DIR =
  process.env.PHOTOS_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), ".data", "photos");

async function ensureDir() {
  await fs.mkdir(PHOTOS_DIR, { recursive: true });
}

// IDs are always crypto.randomUUID() (see savePhoto's caller), but GET/DELETE
// take one back from the client as a query param — reject anything that
// isn't that exact shape before it ever reaches a file path.
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function assertValidId(id: string) {
  if (!ID_PATTERN.test(id)) throw new Error("Identifiant de photo invalide");
}

function metaPath(id: string) {
  assertValidId(id);
  return path.join(PHOTOS_DIR, `${id}.json`);
}

function imagePath(id: string, ext: string) {
  assertValidId(id);
  return path.join(PHOTOS_DIR, `${id}.${ext}`);
}

export async function listPhotos(): Promise<SavedPhotoMeta[]> {
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

export async function savePhoto(
  id: string,
  buffer: Buffer,
  ext: string,
  meta: SavedPhotoMeta
): Promise<void> {
  await ensureDir();
  await fs.writeFile(imagePath(id, ext), buffer);
  await fs.writeFile(metaPath(id), JSON.stringify(meta), "utf8");
}

export async function getPhotoMeta(id: string): Promise<SavedPhotoMeta | null> {
  try {
    const raw = await fs.readFile(metaPath(id), "utf8");
    return JSON.parse(raw) as SavedPhotoMeta;
  } catch {
    return null;
  }
}

export async function readPhotoFile(id: string): Promise<{ buffer: Buffer; ext: string } | null> {
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

export async function deletePhoto(id: string): Promise<void> {
  for (const ext of ["jpg", "png"]) {
    await fs.unlink(imagePath(id, ext)).catch(() => {});
  }
  await fs.unlink(metaPath(id)).catch(() => {});
}
