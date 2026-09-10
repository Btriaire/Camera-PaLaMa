"use client";

import { useRef, useState } from "react";
import { deletePhoto, photoUrl } from "@/lib/storage";
import { shareOrDownloadPhoto } from "@/lib/sharePhoto";
import { getPreset } from "@/lib/presets";
import { SavedPhotoMeta } from "@/lib/types";
import { BackIcon, ShareIcon, SlidersIcon, TrashIcon } from "@/components/Icons";

// Full-screen photo viewer — the missing step between "grid of thumbnails"
// and "editor": see the shot large, read what camera/settings made it,
// swipe to the next one, then decide whether to edit, save a copy, or
// delete it. Swiping is a horizontal drag past a distance threshold, not
// literal momentum scrolling — simpler to get right and just as usable.
export default function PhotoViewer({
  items,
  initialIndex,
  onClose,
  onEdit,
  onDeleted,
}: {
  items: SavedPhotoMeta[];
  initialIndex: number;
  onClose: () => void;
  onEdit: (meta: SavedPhotoMeta) => void;
  onDeleted: (id: string) => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [dragX, setDragX] = useState(0);
  const dragStart = useRef<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const meta = items[index];
  const preset = getPreset(meta?.presetId ?? null);

  if (!meta) {
    onClose();
    return null;
  }

  const goTo = (next: number) => {
    if (next < 0 || next >= items.length) return;
    setIndex(next);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStart.current = e.clientX;
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStart.current === null) return;
    setDragX(e.clientX - dragStart.current);
  };
  const endDrag = () => {
    if (Math.abs(dragX) > 80) {
      goTo(dragX < 0 ? index + 1 : index - 1);
    }
    dragStart.current = null;
    setDragX(0);
  };

  const handleDownload = async () => {
    const res = await fetch(photoUrl(meta.id));
    const blob = await res.blob();
    await shareOrDownloadPhoto(blob, `photo-${meta.id}.jpg`);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await deletePhoto(meta.id);
    onDeleted(meta.id);
    if (items.length <= 1) onClose();
    else goTo(Math.min(index, items.length - 2));
    setDeleting(false);
  };

  const date = new Date(meta.createdAt).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col h-dvh bg-black text-white">
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button onClick={onClose} className="p-1 text-white/70">
          <BackIcon />
        </button>
        <span className="text-xs text-white/40 font-mono tabular-nums">
          {index + 1} / {items.length}
        </span>
        <button onClick={handleDelete} disabled={deleting} className="p-1 text-white/70 disabled:opacity-40">
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>

      <div
        className="relative flex-1 min-h-0 overflow-hidden touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={meta.id}
          src={photoUrl(meta.id)}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
          style={{ transform: `translateX(${dragX}px)`, opacity: 1 - Math.min(0.5, Math.abs(dragX) / 400) }}
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>{date}</span>
          <span>
            {meta.width}×{meta.height}
          </span>
        </div>
        {preset && (
          <div className="flex flex-wrap gap-1.5 text-[10px] text-white/50">
            <span className="rounded-full bg-white/10 px-2 py-0.5">{preset.label}</span>
            {preset.era && <span className="rounded-full bg-white/10 px-2 py-0.5">{preset.era}</span>}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => onEdit(meta)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white py-2.5 text-sm font-medium text-black"
          >
            <SlidersIcon className="w-4 h-4" /> Modifier
          </button>
          <button
            onClick={handleDownload}
            aria-label="Enregistrer dans Photos"
            className="flex items-center justify-center gap-1.5 rounded-full border border-white/25 px-4 py-2.5 text-sm text-white/80"
          >
            <ShareIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
