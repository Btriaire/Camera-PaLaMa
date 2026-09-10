// The web platform only ever exposes one real hardware control here:
// MediaStreamTrack torch, a boolean continuous light -- there's no API for
// a real xenon flash pulse, exposure-synced timing, or true multi-pulse-
// per-exposure strobing (the kind a real photographer's studio strobe
// does). Everything below is built honestly from that one primitive (plus
// the screen itself, which any device has) rather than pretending to
// hardware control the web can't actually offer.
export type FlashMode = "off" | "torch" | "screen" | "strobe" | "strobeFast";

export const FLASH_MODES: { id: FlashMode; label: string; blurb: string; needsTorch: boolean }[] = [
  { id: "off", label: "Désactivé", blurb: "Pas de flash", needsTorch: false },
  { id: "torch", label: "Torche", blurb: "Lumière continue pendant la prise de vue", needsTorch: true },
  {
    id: "screen",
    label: "Flash écran",
    blurb: "L'écran s'illumine pendant la prise — marche même sans flash physique (idéal pour les selfies)",
    needsTorch: false,
  },
  {
    id: "strobe",
    label: "Stroboscopique",
    blurb: "En rafale : le flash clignote à chaque photo",
    needsTorch: true,
  },
  {
    id: "strobeFast",
    label: "Strobo ultra-rapide",
    blurb: "Même idée, en rafale, à un rythme deux fois plus rapide",
    needsTorch: true,
  },
];

// How long the burst loop waits between shots for each mode -- strobeFast
// pulses at double speed, everything else keeps the existing pace.
export function burstIntervalMs(mode: FlashMode): number {
  return mode === "strobeFast" ? 60 : 120;
}

export function isStrobing(mode: FlashMode): boolean {
  return mode === "strobe" || mode === "strobeFast";
}
