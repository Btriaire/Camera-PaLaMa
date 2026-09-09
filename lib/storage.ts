import { Adjustments, SavedPhotoMeta } from "./types";

// Talks to app/api/photos/route.ts — the VPS-backed photo library.
export async function listPhotos(): Promise<SavedPhotoMeta[]> {
  const res = await fetch("/api/photos", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items ?? [];
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
