"use client";

import { useEffect, useState } from "react";
import { deletePhoto, listPhotos, photoUrl } from "@/lib/storage";
import { SavedPhotoMeta } from "@/lib/types";
import { BackIcon, TrashIcon } from "@/components/Icons";

type CapturedPhoto = { bitmap: ImageBitmap; width: number; height: number };

// Grid of everything saved to the VPS. Tapping a shot re-fetches the
// original file and drops it back into the editor with its saved
// adjustment stack — reopening a photo never re-applies filters on top of
// an already-filtered file, it always starts fresh from the source bytes.
export default function Gallery({
  onClose,
  onEdit,
}: {
  onClose: () => void;
  onEdit: (photo: CapturedPhoto, meta: SavedPhotoMeta) => void;
}) {
  const [items, setItems] = useState<SavedPhotoMeta[] | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const refresh = () => listPhotos().then(setItems);
  useEffect(() => {
    refresh();
  }, []);

  const handleOpen = async (meta: SavedPhotoMeta) => {
    setOpening(meta.id);
    try {
      const res = await fetch(photoUrl(meta.id));
      const blob = await res.blob();
      const bitmap = await createImageBitmap(blob);
      onEdit({ bitmap, width: meta.width || bitmap.width, height: meta.height || bitmap.height }, meta);
    } finally {
      setOpening(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setItems((prev) => prev?.filter((i) => i.id !== id) ?? prev);
    await deletePhoto(id);
  };

  return (
    <div className="flex flex-col h-dvh bg-zinc-950 text-white">
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button onClick={onClose} className="p-1 text-white/70">
          <BackIcon />
        </button>
        <h1 className="text-lg font-semibold">Bibliothèque</h1>
      </div>

      {items === null ? (
        <div className="flex-1 flex items-center justify-center text-white/40">Chargement…</div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-8 text-center text-white/40">
          Aucune photo enregistrée pour l&apos;instant.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 overflow-y-auto px-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleOpen(item)}
              disabled={opening !== null}
              className="relative aspect-square overflow-hidden bg-white/5 disabled:opacity-60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(item.id)} alt="" className="h-full w-full object-cover" loading="lazy" />
              <span
                onClick={(e) => handleDelete(e, item.id)}
                role="button"
                aria-label="Supprimer"
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1.5 text-white/90"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
