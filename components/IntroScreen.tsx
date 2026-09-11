"use client";

import { CameraIcon } from "@/components/Icons";

// Shown once, before the browser's own permission dialog — explaining why
// the app wants the camera instead of the OS just asking cold. Same
// pattern as Halide/VSCO's first-launch screen.
export default function IntroScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-dvh bg-black text-white px-8 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/20">
        <CameraIcon className="w-9 h-9" />
      </div>
      <h1 className="text-xl font-semibold mb-2">Camera-PaLaMa</h1>
      <p className="mb-8 max-w-xs text-sm text-white/50">
        Cette app a besoin d&apos;accéder à la caméra pour prendre des photos — c&apos;est tout : rien n&apos;est
        envoyé ailleurs, et les photos que vous enregistrez restent stockées ici, sur cet appareil.
      </p>
      <button
        onClick={onContinue}
        className="rounded-full bg-white px-8 py-3 text-sm font-medium text-black"
      >
        Activer la caméra
      </button>
    </div>
  );
}
