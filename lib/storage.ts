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

const GENERIC_UPLOAD_ERROR = "Échec de l'enregistrement — réessayez.";

export type UploadResult = { ok: true; item: SavedPhotoMeta } | { ok: false; error: string };

export async function uploadPhoto(
  blob: Blob,
  meta: { width: number; height: number; presetId: string | null; adjustments: Adjustments }
): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", blob, blob.type === "image/png" ? "photo.png" : "photo.jpg");
  form.append("meta", JSON.stringify(meta));
  try {
    const res = await fetch("/api/photos", { method: "POST", body: form });
    // The route returns a real, actionable message on failure (e.g. "no
    // Vercel Blob store connected") — parsed defensively since a platform-
    // level failure (a 413 over the body-size limit, a gateway timeout)
    // can hand back a non-JSON body instead of the route's own response.
    const data: { item?: SavedPhotoMeta; error?: string } | null = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: (data && typeof data.error === "string" && data.error) || GENERIC_UPLOAD_ERROR };
    }
    if (!data?.item) return { ok: false, error: GENERIC_UPLOAD_ERROR };
    return { ok: true, item: data.item };
  } catch {
    return { ok: false, error: GENERIC_UPLOAD_ERROR };
  }
}

export async function deletePhoto(id: string): Promise<boolean> {
  const res = await fetch(`/api/photos?id=${id}`, { method: "DELETE" });
  return res.ok;
}
