"use client";

import { useEffect, useState } from "react";

function formatNow(): string {
  const now = new Date();
  return (
    now.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
    " " +
    now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );
}

// A ticking clock for the HUD: session elapsed time (mm:ss, like a
// camcorder's REC counter) and the real wall-clock time (for the CCTV
// skin's timestamp). Both are only ever computed inside the interval
// callback, never during render, so re-rendering never reads the clock.
export function useClock() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [now, setNow] = useState(formatNow);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsedSeconds((t) => t + 1);
      setNow(formatNow());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return { elapsedSeconds, now };
}
