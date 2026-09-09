"use client";

export default function AdjustSlider({
  label,
  value,
  min = -100,
  max = 100,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/80">{label}</span>
        <span className="text-white/40 tabular-nums">{Math.round(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-white"
      />
    </div>
  );
}
