"use client";

// A bubble-level line, not a number: tilt the phone and the line rotates
// to show true horizontal, turning amber once you're within ~1.5° of
// level -- the same visual language every camera app's level uses. Hidden
// entirely when tiltDeg is null (no sensor data yet, or unavailable --
// see useDeviceTilt).
export default function LevelIndicator({ tiltDeg }: { tiltDeg: number | null }) {
  if (tiltDeg === null) return null;
  const clamped = Math.max(-45, Math.min(45, tiltDeg));
  const level = Math.abs(tiltDeg) < 1.5;

  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 h-px w-28 -translate-x-1/2 -translate-y-1/2 bg-white/20">
      <div
        className={`absolute left-0 top-0 h-px w-full transition-colors ${level ? "bg-amber-300" : "bg-white/80"}`}
        style={{ transform: `rotate(${-clamped}deg)` }}
      />
    </div>
  );
}
