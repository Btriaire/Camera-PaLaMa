import { Adjustments, SavedPhotoMeta } from "./types";

// Talks to app/api/photos/route.ts — the VPS-backed photo library.
// storageWarning is non-null when the server detected it can't actually
// persist saves in this deployment (see getStorageWarning) — worth
// surfacing wherever the library is shown, not just where it's empty,
// since a save can "succeed" from the UI's point of view and still vanish.
export async function listPhotos(): Promise<{ items: SavedPhotoMeta[]; storageWarning: string | null }> {
  const res = await fetch("/api/photos", { cache: "no-store" });
  if (!res.ok) return { items: [], storageWarning: null };
  const data = await res.json();
  return { items: data.items ?? [], storageWarning: data.storageWarning ?? null };
}

export function photoUrl(id: string): string {
  return `/api/photos?id=${id}&raw=1`;
}

export async function uploadPhoto(
  blob: Blob,
  meta: { width: number; height: number; presetId: string | null; adjustments: Adjustments }
): Promise<SavedPhotoMeta | null> {
  const form = new FormData();
  form.append("file", blob, blob.type === "image/png" ? "photo.png" : "photo.jpg");
  form.append("meta", JSON.stringify(meta));
  const res = await fetch("/api/photos", { method: "POST", body: form });
  if (!res.ok) return null;
  const data = await res.json();
  return data.item ?? null;
}

export async function deletePhoto(id: string): Promise<boolean> {
  const res = await fetch(`/api/photos?id=${id}`, { method: "DELETE" });
  return res.ok;
}
