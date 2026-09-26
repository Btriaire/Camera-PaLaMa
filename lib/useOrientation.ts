"use client";

import { useEffect, useState } from "react";

/**
 * Real-time orientation tracker for Camera PaLaMa.
 * Detects whether the viewport / device is in horizontal / landscape mode.
 */
export function useOrientation(): boolean {
  const [isLandscape, setIsLandscape] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === "undefined") return;
      const mql = window.matchMedia("(orientation: landscape)");
      const isWider = window.innerWidth > window.innerHeight;
      setIsLandscape(mql.matches || isWider);
    };

    checkOrientation();

    const mql = window.matchMedia("(orientation: landscape)");
    const mqlListener = (e: MediaQueryListEvent) => {
      setIsLandscape(e.matches || window.innerWidth > window.innerHeight);
    };

    if (mql.addEventListener) {
      mql.addEventListener("change", mqlListener);
    } else {
      mql.addListener(mqlListener);
    }

    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", mqlListener);
      } else {
        mql.removeListener(mqlListener);
      }
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  return isLandscape;
}
