"use client";

import { Adjustments, SavedPhotoMeta } from "./types";
import { dbDeletePhoto, dbListPhotos, dbPutPhoto, StoredPhoto } from "./photoDb";

// The photo library lives entirely in this browser's IndexedDB (see
// lib/photoDb.ts) — no server round-trip, so no dependency on the hosting
// platform's storage being configured. Every function here keeps its old,
// server-shaped signature (listPhotos/uploadPhoto/deletePhoto/photoUrl) so
// none of the components consuming it needed to change.
//
// <img src>/fetch() both need a synchronous URL string, but reading a blob
// back out of IndexedDB is async — so every blob gets a real object URL
// the moment it's read (listPhotos) or written (uploadPhoto), cached here,
// and photoUrl() is just a synchronous lookup into that cache. That's also
// why `fetch(photoUrl(id))` elsewhere in the app (Gallery/PhotoViewer/
// page.tsx, to re-decode a saved photo for editing or sharing) still
// works unchanged: fetch() on a blob: URL resolves with that same blob.
const urlCache = new Map<string, string>();

function cacheUrl(id: string, blob: Blob): string {
  const existing = urlCache.get(id);
  if (existing) return existing;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

function toMeta(record: StoredPhoto): SavedPhotoMeta {
  return {
    id: record.id,
    createdAt: record.createdAt,
    width: record.width,
    height: record.height,
    presetId: record.presetId,
    adjustments: record.adjustments,
  };
}

export async function listPhotos(): Promise<{ items: SavedPhotoMeta[]; storageWarning: string | null }> {
  try {
    const records = await dbListPhotos();
    records.forEach((r) => cacheUrl(r.id, r.blob));
    const items = records.map(toMeta).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { items, storageWarning: null };
  } catch {
    return { items: [], storageWarning: null };
  }
}

// Synchronous by design (see the module comment) — returns "" for an id
// that hasn't been through listPhotos()/uploadPhoto() yet in this session,
// same as the old API route returning 404 would have looked to an <img>.
export function photoUrl(id: string): string {
  return urlCache.get(id) ?? "";
}

const GENERIC_UPLOAD_ERROR = "Échec de l'enregistrement — stockage local indisponible.";

export type UploadResult = { ok: true; item: SavedPhotoMeta } | { ok: false; error: string };

export async function uploadPhoto(
  blob: Blob,
  meta: { width: number; height: number; presetId: string | null; adjustments: Adjustments }
): Promise<UploadResult> {
  try {
    const item: SavedPhotoMeta = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...meta,
    };
    await dbPutPhoto({ ...item, blob });
    cacheUrl(item.id, blob);
    return { ok: true, item };
  } catch {
    return { ok: false, error: GENERIC_UPLOAD_ERROR };
  }
}

export async function deletePhoto(id: string): Promise<boolean> {
  try {
    await dbDeletePhoto(id);
    const url = urlCache.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      urlCache.delete(id);
    }
    return true;
  } catch {
    return false;
  }
}
