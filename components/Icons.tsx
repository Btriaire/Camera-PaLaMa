type IconProps = { className?: string };

const base = "w-6.5 h-6.5";

export function BackIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function CameraIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1-2h7l1 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z"
      />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

export function FlipCameraIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h11.5a3 3 0 0 1 3 3v1M20 16H8.5a3 3 0 0 1-3-3v-1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 5 4 8l3 3M17 19l3-3-3-3" />
    </svg>
  );
}

export function FlashIcon({ className = base, off = false }: IconProps & { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 3 6 13.5h5L10.5 21 18 10h-5L13 3Z" />
      {off && <path strokeLinecap="round" d="M4 4l16 16" />}
    </svg>
  );
}

export function ShareIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V4M8.5 7.5 12 4l3.5 3.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
    </svg>
  );
}

export function ContrastIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ScreenFlashIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path
        strokeLinecap="round"
        d="M12 7v2M12 15v2M8 11h2M14 11h2M9.3 8.3l1.4 1.4M13.3 13.3l1.4 1.4M14.7 8.3l-1.4 1.4M10.7 13.3l-1.4 1.4"
      />
    </svg>
  );
}

export function StrobeIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 3 5 12.5h3.5L7.5 21l7-9.5H11L14 3Z" />
      <path strokeLinecap="round" d="M18 6.5v3.5M21 7.5v1.5" />
    </svg>
  );
}

export function SparkleIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3.5c.6 3 2 4.4 5 5-3 .6-4.4 2-5 5-.6-3-2-4.4-5-5 3-.6 4.4-2 5-5Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 15c.35 1.7 1.15 2.5 2.85 2.85-1.7.35-2.5 1.15-2.85 2.85-.35-1.7-1.15-2.5-2.85-2.85 1.7-.35 2.5-1.15 2.85-2.85Z" />
    </svg>
  );
}

export function CloudUploadIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 17.5A4 4 0 0 1 7 9.6 5 5 0 0 1 16.8 8 4.2 4.2 0 0 1 16 16.4"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20v-7M9.5 15.5 12 13l2.5 2.5" />
    </svg>
  );
}

export function TrashIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m1 0-.7 12.1a2 2 0 0 1-2 1.9H9.7a2 2 0 0 1-2-1.9L7 7" />
    </svg>
  );
}

export function CompareIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3.5v17" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5.5A1.5 1.5 0 0 0 4 8.5v7A1.5 1.5 0 0 0 5.5 17H8M16 7h2.5A1.5 1.5 0 0 1 20 8.5v7a1.5 1.5 0 0 1-1.5 1.5H16" />
    </svg>
  );
}

export function SlidersIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" d="M5 7h7M16 7h3M5 12h3M8 12h11M5 17h11M20 17h-3" />
      <circle cx="14" cy="7" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="6" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="18" cy="17" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function GalleryGridIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
    </svg>
  );
}

export function StabilizerIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" d="M6 4 4 6M18 4l2 2M4 18l2 2M20 18l-2 2" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LongExposureIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <circle cx="7" cy="17" r="3" />
      <path
        strokeLinecap="round"
        d="M9.5 15.2C13 10.5 16 6.5 20.5 4.5M12.2 16.8C15 13.6 17.3 11 19.7 8.7M14.6 18.3C16.5 16.5 17.9 15 19.2 13.4"
        opacity="0.9"
      />
    </svg>
  );
}

export function GridIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path strokeLinecap="round" d="M4 9.5h16M4 14.5h16M9.5 4v16M14.5 4v16" />
    </svg>
  );
}

export function ZebraIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path strokeLinecap="round" d="M4 8.5 8.5 4M4 13.5 13.5 4M7 20 20 7M12 20 20 12M17 20 20 17" />
    </svg>
  );
}

export function ApertureIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="8.5" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 7.5 9.3 12M12 7.5l4.3 1.2M9.3 12l-2.6 3.9M16.3 8.7l1.9 4M6.7 15.9h5M17.3 15.9l-2.3-4.2M11.7 15.9 9.3 12"
      />
    </svg>
  );
}

export function SettingsIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="3" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V19a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H4a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H10a1.65 1.65 0 0 0 1-1.51V4a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V10a1.65 1.65 0 0 0 1.51 1H20a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
      />
    </svg>
  );
}

export function TimerIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="13" r="8" />
      <path strokeLinecap="round" d="M12 9v4l2.5 2.5M10 2.5h4" />
    </svg>
  );
}

export function ChevronRightIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function UndoIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7.5H14.5A5 5 0 0 1 19.5 12.5A5 5 0 0 1 14.5 17.5H10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 4 6 7.5 10 11" />
    </svg>
  );
}

export function RedoIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 7.5H9.5A5 5 0 0 0 4.5 12.5A5 5 0 0 0 9.5 17.5H14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 4 18 7.5 14 11" />
    </svg>
  );
}

export function CheckIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12.5 9.5 17 19 7.5" />
    </svg>
  );
}

export function FocusPeakingIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="3" />
      <path strokeLinecap="round" d="M3 9V5a2 2 0 0 1 2-2h4M15 3h4a2 2 0 0 1 2 2v4M21 15v4a2 2 0 0 1-2 2h-4M9 21H5a2 2 0 0 1-2-2v-4" />
      <path strokeLinecap="round" strokeDasharray="2 2" d="M12 7v2M12 15v2M7 12h2M15 12h2" />
    </svg>
  );
}

export function SunIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

export function ColorIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9" fill="currentColor" fillOpacity="0.2" />
      <circle cx="8" cy="10" r="1.5" fill="currentColor" />
      <circle cx="12" cy="8" r="1.5" fill="currentColor" />
      <circle cx="16" cy="10" r="1.5" fill="currentColor" />
      <circle cx="10" cy="15" r="1.5" fill="currentColor" />
      <circle cx="14" cy="15" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function WandIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="m15 4 5 5M18 1l5 5M2 22l14-14M11 7l-2-2M7 11l-2-2" />
      <path strokeLinecap="round" d="M9 2v2M3 8h2M6 5 4.5 3.5" />
    </svg>
  );
}

export function ResetIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v5h5" />
    </svg>
  );
}

export function BurstIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <rect x="7" y="7" width="13" height="13" rx="2" className="fill-current/10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 17V5a1 1 0 0 1 1-1h12" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 14V3a1 1 0 0 1 1-1h12" opacity="0.6" />
      <circle cx="13.5" cy="13.5" r="2" fill="currentColor" />
    </svg>
  );
}

export function MacroFlowerIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5C10.5 7 10.5 8.5 12 9.5C13.5 8.5 13.5 7 12 4.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5C10.5 17 10.5 15.5 12 14.5C13.5 15.5 13.5 17 12 19.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12C7 10.5 8.5 10.5 9.5 12C8.5 13.5 7 13.5 4.5 12Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12C17 10.5 15.5 10.5 14.5 12C15.5 13.5 17 13.5 19.5 12Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.7 6.7C9 8 9.8 9.2 9.2 10.5C8 9.8 6.8 9 6.7 6.7Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.3 17.3C15 16 14.2 14.8 14.8 13.5C16 14.2 17.2 15 17.3 17.3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.3 6.7C15 8 14.2 9.2 14.8 10.5C16 9.8 17.2 9 17.3 6.7Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.7 17.3C9 16 9.8 14.8 9.2 13.5C8 14.2 6.8 15 6.7 17.3Z" />
    </svg>
  );
}

export function LoupeIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 7.5v6M7.5 10.5h6M15.5 15.5l5 5" />
    </svg>
  );
}

export function TorchIcon({ className = base, on = false }: IconProps & { on?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6v4l-2 3v10a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V10L7 7V3h2Z" fill={on ? "currentColor" : "none"} fillOpacity={on ? 0.2 : 0} />
      <path strokeLinecap="round" d="M12 13v2" />
      {on && <path strokeLinecap="round" d="M12 1V0M5 2 3.5.5M19 2l1.5-1.5" />}
    </svg>
  );
}

export function RatioFramingIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
      <rect x="7.5" y="7.5" width="9" height="9" rx="1" strokeDasharray="2 2" />
    </svg>
  );
}

export function HistogramIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 17v-4M10 17v-8M14 17v-11M18 17v-6" />
    </svg>
  );
}

export function SoundIcon({ className = base, mute = false }: IconProps & { mute?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" fillOpacity={mute ? 0 : 0.2} />
      {!mute ? (
        <>
          <path strokeLinecap="round" d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path strokeLinecap="round" d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </>
      ) : (
        <path strokeLinecap="round" d="M23 9l-6 6M17 9l6 6" />
      )}
    </svg>
  );
}

export function VintageViewfinderIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      {/* Outer Viewfinder Bezel */}
      <rect x="2.5" y="3.5" width="19" height="17" rx="3.5" />
      {/* Central Ground Glass Circle */}
      <circle cx="12" cy="12" r="5" strokeDasharray="1.5 1.5" />
      {/* Stigmometer Split Line */}
      <line x1="8" y1="12" x2="16" y2="12" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2" fill="currentColor" fillOpacity="0.25" />
      {/* Corner Optical Alignment Ticks */}
      <path strokeLinecap="round" d="M5.5 6.5h2M5.5 6.5v2M18.5 6.5h-2M18.5 6.5v2M5.5 17.5h2M5.5 17.5v-2M18.5 17.5h-2M18.5 17.5v-2" />
    </svg>
  );
}

export function FalseColorIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8h10M7 12h10M7 16h10" strokeLinecap="round" strokeWidth="2.2" />
      <circle cx="6" cy="8" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="6" cy="16" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function WaveformIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l2.5-4 2 3 2.5-7 2.5 9 2.5-5 2 3 2-2" />
    </svg>
  );
}

export function DroHdrIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" fillOpacity="0.3" stroke="none" />
      <path strokeLinecap="round" d="M12 7v10M8.5 9.5l7 5M8.5 14.5l7-5" />
    </svg>
  );
}

export function MonochromeAssistIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17a8.5 8.5 0 0 0 0-17Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AnamorphicIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <rect x="2" y="7" width="20" height="10" rx="1.5" />
      <path strokeLinecap="round" d="M6 7v10M18 7v10M2 12h20" strokeDasharray="1.5 1.5" />
    </svg>
  );
}

export function Horizon3DIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <line x1="3" y1="12" x2="8" y2="12" strokeLinecap="round" strokeWidth="2" />
      <line x1="16" y1="12" x2="21" y2="12" strokeLinecap="round" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.5" />
      <line x1="12" y1="6" x2="12" y2="8" strokeLinecap="round" />
      <line x1="12" y1="16" x2="12" y2="18" strokeLinecap="round" />
    </svg>
  );
}

export function ProBadgeIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 9v6M7 9h2.5a1.5 1.5 0 0 1 0 3H7M13 12v3M13 9h2.5a1.5 1.5 0 0 1 0 3H13m2.5 0L17 15" />
    </svg>
  );
}

export function UltraZoomIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <circle cx="10" cy="10" r="7" />
      <line x1="21" y1="21" x2="15" y2="15" strokeLinecap="round" strokeWidth="2.2" />
      <circle cx="10" cy="10" r="3.5" strokeDasharray="2 2" />
      <path strokeLinecap="round" d="M10 7v6M7 10h6" />
    </svg>
  );
}

export function OisLockIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.2" />
      <path strokeLinecap="round" d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function RadarScopeIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" strokeDasharray="3 3" />
      <line x1="12" y1="12" x2="19" y2="7" strokeLinecap="round" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AutofocusTargetIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
      <circle cx="12" cy="12" r="3" strokeDasharray="2 2" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BokehDepthIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <circle cx="9" cy="10" r="6" strokeDasharray="3 2" />
      <circle cx="15" cy="14" r="5" strokeWidth="1.8" />
      <circle cx="12" cy="7" r="2.5" strokeDasharray="2 2" />
    </svg>
  );
}
