type IconProps = { className?: string };

const base = "w-5 h-5";

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
