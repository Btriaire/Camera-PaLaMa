"use client";

import { useEffect, useState } from "react";
import { exportPhoto } from "@/lib/export";
import { uploadPhoto } from "@/lib/storage";
import { Adjustments, SavedPhotoMeta } from "@/lib/types";
import { CapturedPhoto } from "@/lib/useCamera";
import { BackIcon, CheckIcon, CloudUploadIcon, TrashIcon } from "@/components/Icons";

// Shown after a press-and-hold burst: pick which of the rapid-fire shots
// are worth keeping, then save just those — applying the same
// adjustments/preset that were live while shooting, exactly like a single
// capture would. Thumbnails here are a quick, unfiltered 2D-canvas scale-down
// (speed over fidelity for a fast pick-and-choose grid); the actual save
// still runs every kept shot through the full WebGL pipeline.
export default function BurstReview({
  shots,
  adjustments,
  presetId,
  onDone,
}: {
  shots: CapturedPhoto[];
  adjustments: Adjustments;
  presetId: string | null;
  onDone: (lastSaved: SavedPhotoMeta | null) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(shots.map((_, i) => i)));
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setThumbs(
      shots.map((s) => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 320 / Math.max(s.width, s.height));
        canvas.width = Math.max(1, Math.round(s.width * scale));
        canvas.height = Math.max(1, Math.round(s.height * scale));
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(s.bitmap, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", 0.7);
      })
    );
  }, [shots]);

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    let lastSaved: SavedPhotoMeta | null = null;
    try {
      for (const i of Array.from(selected).sort((a, b) => a - b)) {
        const shot = shots[i];
        const blob = await exportPhoto(shot.bitmap, shot.width, shot.height, adjustments, Math.random() * 1000);
        const meta = await uploadPhoto(blob, {
          width: shot.width,
          height: shot.height,
          presetId,
          adjustments,
        });
        if (meta) lastSaved = meta;
      }
    } finally {
      setSaving(false);
    }
    onDone(lastSaved);
  };

  return (
    <div className="flex flex-col h-dvh bg-zinc-950 text-white">
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button onClick={() => onDone(null)} className="p-1 text-white/70">
          <BackIcon />
        </button>
        <h1 className="text-sm font-medium text-white/70">Rafale — {shots.length} photos</h1>
        <div className="w-6" aria-hidden />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="grid grid-cols-3 gap-1">
          {thumbs.map((src, i) => (
            <button
              key={i}
              onClick={() => toggle(i)}
              className="relative aspect-square overflow-hidden bg-white/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className={`h-full w-full object-cover ${selected.has(i) ? "" : "opacity-30"}`} />
              <span
                className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                  selected.has(i) ? "border-white bg-white text-black" : "border-white/60 bg-black/30"
                }`}
              >
                {selected.has(i) && <CheckIcon className="w-3 h-3" />}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <span className="flex items-center gap-1.5 text-sm text-white/50">
          <TrashIcon className="w-4 h-4" />
          {shots.length - selected.size} écartée{shots.length - selected.size !== 1 ? "s" : ""}
        </span>
        <button
          onClick={handleSave}
          disabled={selected.size === 0 || saving}
          className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
        >
          <CloudUploadIcon className="w-4 h-4" />
          {saving ? "Envoi…" : `Enregistrer (${selected.size})`}
        </button>
      </div>
    </div>
  );
}
