"use client";

import { useRef, useState } from "react";
import { deletePhoto, photoUrl } from "@/lib/storage";
import { shareOrDownloadPhoto } from "@/lib/sharePhoto";
import { getPreset } from "@/lib/presets";
import { SavedPhotoMeta } from "@/lib/types";
import { BackIcon, ChevronRightIcon, ShareIcon, SlidersIcon, TrashIcon } from "@/components/Icons";

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
  const [isZoomed, setIsZoomed] = useState(false);
  const [showUi, setShowUi] = useState(true);

  const meta = items[index];
  const preset = getPreset(meta?.presetId ?? null);

  if (!meta) {
    onClose();
    return null;
  }

  const goTo = (next: number) => {
    if (next < 0 || next >= items.length) return;
    setIsZoomed(false);
    setIndex(next);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isZoomed) return;
    dragStart.current = e.clientX;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStart.current === null || isZoomed) return;
    setDragX(e.clientX - dragStart.current);
  };

  const endDrag = () => {
    if (isZoomed) return;
    if (Math.abs(dragX) > 70) {
      goTo(dragX < 0 ? index + 1 : index - 1);
    }
    dragStart.current = null;
    setDragX(0);
  };

  const handleDoubleTap = () => {
    setIsZoomed((z) => !z);
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
    <div className="flex flex-col h-dvh bg-black text-white select-none relative overflow-hidden">
      {/* Top Floating Bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-200 ${
          showUi ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          onClick={onClose}
          aria-label="Fermer l'aperçu"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white/90 backdrop-blur-md border border-white/15 active:scale-90 transition-all"
        >
          <BackIcon className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-xs text-white/80 backdrop-blur-md border border-white/15 font-mono tabular-nums">
          <span>{index + 1}</span>
          <span className="text-white/40">/</span>
          <span>{items.length}</span>
        </div>

        <button
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Supprimer la photo"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-red-400 backdrop-blur-md border border-red-500/20 active:scale-90 transition-all disabled:opacity-40"
        >
          <TrashIcon className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Main Image Viewport with double-tap zoom */}
      <div
        className="relative flex-1 min-h-0 w-full overflow-hidden flex items-center justify-center cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={handleDoubleTap}
        onClick={() => setShowUi((u) => !u)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={meta.id}
          src={photoUrl(meta.id)}
          alt="Photo plein écran"
          className={`max-h-full max-w-full object-contain transition-transform duration-200 ${
            isZoomed ? "scale-[2.4] cursor-zoom-out" : "scale-100 cursor-zoom-in"
          }`}
          style={{
            transform: isZoomed
              ? "scale(2.4)"
              : `translateX(${dragX}px) scale(1)`,
            opacity: isZoomed ? 1 : 1 - Math.min(0.5, Math.abs(dragX) / 400),
          }}
        />

        {/* Previous Navigation Arrow */}
        {index > 0 && showUi && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goTo(index - 1);
            }}
            aria-label="Photo précédente"
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white/90 backdrop-blur-md border border-white/15 active:scale-90 transition-all rotate-180"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        )}

        {/* Next Navigation Arrow */}
        {index < items.length - 1 && showUi && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goTo(index + 1);
            }}
            aria-label="Photo suivante"
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white/90 backdrop-blur-md border border-white/15 active:scale-90 transition-all"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        )}

        {/* Zoom Hint Floating Pill */}
        {showUi && (
          <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] text-white/70 backdrop-blur border border-white/10">
            {isZoomed ? "Double-clic pour dézoomer" : "Double-clic pour zoomer 100%"}
          </div>
        )}
      </div>

      {/* Bottom Floating Card & Actions */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 flex flex-col gap-2.5 border-t border-white/10 bg-zinc-950/90 p-4 backdrop-blur-xl transition-opacity duration-200 ${
          showUi ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white/90">{preset ? preset.label : "Capteur Neutre"}</span>
            {preset?.brand && (
              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300">
                {preset.brand}
              </span>
            )}
          </div>
          <span className="font-mono text-xs text-white/60 tabular-nums">
            {meta.width} × {meta.height} px
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-white/50 border-t border-white/5 pt-1.5 font-mono">
          <span>{date}</span>
          <div className="flex items-center gap-2">
            {preset?.iso && <span>ISO {preset.iso}</span>}
            {preset?.kelvin && <span>{preset.kelvin}K</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleDownload}
            aria-label="Enregistrer ou partager"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/15 active:scale-95 transition-all shadow-sm"
          >
            <ShareIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => onEdit(meta)}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-bold text-black hover:bg-zinc-200 active:scale-95 transition-all shadow-lg"
          >
            <SlidersIcon className="w-4 h-4" />
            Modifier en Studio
          </button>
        </div>
      </div>
    </div>
  );
}

