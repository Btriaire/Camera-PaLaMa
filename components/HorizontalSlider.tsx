"use client";

import { useRef, useState } from "react";

// The horizontal sibling of ZoomSlider's vertical track — same "tap or
// drag anywhere jumps the thumb there" model and pointer-capture drag,
// just left-right instead of bottom-top. Used where a control needs a
// continuous range in a horizontal menu row (e.g. Pose longue's duration)
// rather than the always-vertical zoom rail.
export default function HorizontalSlider({
  min,
  max,
  step,
  value,
  onChange,
  ariaLabel,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const range = Math.max(0.0001, max - min);
  const pct = Math.min(1, Math.max(0, (value - min) / range));
  const snap = step > 0 ? step : 1;

  const valueFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return value;
    const rect = el.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const raw = min + t * range;
    return Math.round(raw / snap) * snap;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    trackRef.current?.setPointerCapture(e.pointerId);
    setDragging(true);
    onChange(valueFromClientX(e.clientX));
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    onChange(valueFromClientX(e.clientX));
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
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      className="relative h-9 w-full touch-none rounded-full bg-black/30 active:cursor-grabbing"
    >
      <div className="absolute inset-x-1.5 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/15" />
      <div
        className="absolute left-1.5 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-amber-300/80"
        style={{ width: `calc(${pct * 100}% - 6px)` }}
      />
      <div
        className={`absolute top-1/2 h-7 w-7 rounded-full shadow-md transition-[background-color,transform] ${
          dragging ? "bg-amber-300" : "bg-white"
        }`}
        style={{ left: `${pct * 100}%`, transform: `translate(-50%, -50%) scale(${dragging ? 1.1 : 1})` }}
      />
    </div>
  );
}
