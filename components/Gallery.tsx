"use client";

import { useEffect, useState } from "react";
import { listPhotos, photoUrl } from "@/lib/storage";
import { SavedPhotoMeta } from "@/lib/types";
import { BackIcon } from "@/components/Icons";
import PhotoViewer from "./PhotoViewer";

type CapturedPhoto = { bitmap: ImageBitmap; width: number; height: number };

// Grid of everything saved to the VPS. Tapping a shot opens it full-screen
// in PhotoViewer first — see it large, read what camera made it, swipe to
// the next one — rather than dropping straight into the editor.
export default function Gallery({
  onClose,
  onEdit,
}: {
  onClose: () => void;
  onEdit: (photo: CapturedPhoto, meta: SavedPhotoMeta) => void;
}) {
  const [items, setItems] = useState<SavedPhotoMeta[] | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    listPhotos().then(({ items, storageWarning }) => {
      setItems(items);
      setStorageWarning(storageWarning);
    });
  }, []);

  const handleEdit = async (meta: SavedPhotoMeta) => {
    setOpening(true);
    try {
      const res = await fetch(photoUrl(meta.id));
      const blob = await res.blob();
      const bitmap = await createImageBitmap(blob);
      onEdit({ bitmap, width: meta.width || bitmap.width, height: meta.height || bitmap.height }, meta);
    } finally {
      setOpening(false);
    }
  };

  const handleDeleted = (id: string) => {
    setItems((prev) => prev?.filter((i) => i.id !== id) ?? prev);
  };

  if (viewerIndex !== null && items) {
    return (
      <PhotoViewer
        items={items}
        initialIndex={viewerIndex}
        onClose={() => setViewerIndex(null)}
        onEdit={handleEdit}
        onDeleted={handleDeleted}
      />
    );
  }

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

      {storageWarning && (
        <div className="mx-3 mb-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          {storageWarning}
        </div>
      )}

      {items === null ? (
        <div className="flex-1 flex items-center justify-center text-white/40">Chargement…</div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-8 text-center text-white/40">
          {storageWarning ? "" : "Aucune photo enregistrée pour l'instant."}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 overflow-y-auto px-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {items.map((item, i) => (
            <button
              key={item.id}
              onClick={() => setViewerIndex(i)}
              disabled={opening}
              className="relative aspect-square overflow-hidden bg-white/5 disabled:opacity-60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(item.id)} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
