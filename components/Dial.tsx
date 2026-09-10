"use client";

import { useRef, useState } from "react";

// A circular gauge you drag vertically to adjust — replaces a flat range
// slider with something that reads at a glance (filled arc = how far off
// neutral you are) and feels like a real camera dial. Pointer Events cover
// mouse and touch identically, with capture so the drag tracks correctly
// even once the finger leaves the dial's small hit area.
export default function Dial({
  label,
  value,
  min = -100,
  max = 100,
  onChange,
  onCommit,
  accent = "#ffffff",
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  // Fired once, on release, with the final value — the moment to record an
  // undo step. onChange fires continuously during the drag for live
  // preview and would flood the history with one entry per pixel.
  onCommit?: (value: number) => void;
  accent?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startY: number; startValue: number; lastValue: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const range = max - min;
  const pct = Math.min(1, Math.max(0, (value - min) / range));
  const startAngle = -135;
  const endAngle = 135;
  const angle = startAngle + pct * (endAngle - startAngle);

  const size = 64;
  const center = size / 2;
  const radius = 26;

  const toXY = (deg: number): [number, number] => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [center + radius * Math.cos(rad), center + radius * Math.sin(rad)];
  };

  const describeArc = (a0: number, a1: number) => {
    if (a1 <= a0) return "";
    const [x0, y0] = toXY(a0);
    const [x1, y1] = toXY(a1);
    const largeArc = a1 - a0 > 180 ? 1 : 0;
    return `M ${x0} ${y0} A ${radius} ${radius} 0 ${largeArc} 1 ${x1} ${y1}`;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    wrapperRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startValue: value, lastValue: value };
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const deltaY = dragRef.current.startY - e.clientY;
    const deltaValue = (deltaY / 140) * range;
    const next = Math.min(max, Math.max(min, dragRef.current.startValue + deltaValue));
    const rounded = Math.round(next * 10) / 10;
    dragRef.current.lastValue = rounded;
    onChange(rounded);
  };

  const endDrag = () => {
    if (dragRef.current && dragRef.current.lastValue !== dragRef.current.startValue) {
      onCommit?.(dragRef.current.lastValue);
    }
    dragRef.current = null;
    setDragging(false);
  };

  const zeroMarker = min < 0 && max > 0 ? toXY(startAngle + ((0 - min) / range) * (endAngle - startAngle)) : null;

  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      <div
        ref={wrapperRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative touch-none cursor-grab active:cursor-grabbing"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <path
            d={describeArc(startAngle, endAngle)}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={5}
            strokeLinecap="round"
          />
          <path d={describeArc(startAngle, angle)} fill="none" stroke={accent} strokeWidth={5} strokeLinecap="round" />
          {zeroMarker && <circle cx={zeroMarker[0]} cy={zeroMarker[1]} r={1.5} fill="rgba(255,255,255,0.35)" />}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-[12px] font-mono tabular-nums ${dragging ? "text-white" : "text-white/85"}`}>
            {Math.round(value)}
          </span>
        </div>
      </div>
      <span className="text-[10px] text-white/50 text-center leading-tight max-w-[70px]">{label}</span>
    </div>
  );
}
