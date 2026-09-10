"use client";

import { useRef, useState } from "react";

// A real, generously-sized vertical track -- not the old rotated native
// <input type="range"> hack. Tap or drag anywhere on it and the thumb
// jumps straight there (the mental model a slider is supposed to have,
// unlike Dial's relative-drag knob, which suits a small circular control
// better than a tall linear one). Pointer capture keeps the drag tracking
// correctly even once a finger slides off the track's edge.
export default function ZoomSlider({
  min,
  max,
  step,
  value,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const range = Math.max(0.0001, max - min);
  const pct = Math.min(1, Math.max(0, (value - min) / range));
  const snap = step > 0 ? step : 0.1;

  const valueFromClientY = (clientY: number) => {
    const el = trackRef.current;
    if (!el) return value;
    const rect = el.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, 1 - (clientY - rect.top) / rect.height));
    const raw = min + t * range;
    return Math.round(raw / snap) * snap;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    trackRef.current?.setPointerCapture(e.pointerId);
    setDragging(true);
    onChange(valueFromClientY(e.clientY));
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    onChange(valueFromClientY(e.clientY));
  };
  const endDrag = () => setDragging(false);

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role="slider"
      aria-label="Zoom (glissière)"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      className="relative h-44 w-9 touch-none rounded-full bg-black/40 backdrop-blur active:cursor-grabbing"
    >
      <div className="absolute inset-y-1.5 left-1/2 w-1.5 -translate-x-1/2 rounded-full bg-white/15" />
      <div
        className="absolute bottom-1.5 left-1/2 w-1.5 -translate-x-1/2 rounded-full bg-white/70"
        style={{ height: `calc(${pct * 100}% - 6px)` }}
      />
      <div
        className={`absolute left-1/2 h-7 w-7 rounded-full shadow-md transition-[background-color,transform] ${
          dragging ? "bg-amber-300" : "bg-white"
        }`}
        style={{ bottom: `${pct * 100}%`, transform: `translate(-50%, 50%) scale(${dragging ? 1.1 : 1})` }}
      />
    </div>
  );
}
