"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { AiCoachResponse } from "@/app/api/ai-coach/route";

export function useAiCoach(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  currentPresetId: string,
  autoIntervalSeconds: number = 6
) {
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [advice, setAdvice] = useState<AiCoachResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const captureFrame = useCallback((): string | null => {
    if (!canvasRef.current) return null;
    try {
      const canvas = canvasRef.current;
      // Capture d'un thumbnail optimisé 384x384
      const thumbCanvas = document.createElement("canvas");
      thumbCanvas.width = 384;
      thumbCanvas.height = 384;
      const ctx = thumbCanvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(canvas, 0, 0, 384, 384);
      return thumbCanvas.toDataURL("image/jpeg", 0.65);
    } catch {
      return null;
    }
  }, [canvasRef]);

  const scanNow = useCallback(async () => {
    const frame = captureFrame();
    if (!frame) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const res = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: frame,
          currentPresetId,
        }),
      });

      if (!res.ok) throw new Error("Erreur analyse IA");
      const data: AiCoachResponse = await res.json();
      setAdvice(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur IA";
      setError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  }, [captureFrame, currentPresetId]);

  useEffect(() => {
    if (!isEnabled) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Premier scan immédiat à l'activation
    scanNow();

    // Répétition périodique
    timerRef.current = setInterval(() => {
      scanNow();
    }, autoIntervalSeconds * 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isEnabled, autoIntervalSeconds, scanNow]);

  return {
    isEnabled,
    setIsEnabled,
    isAnalyzing,
    advice,
    error,
    scanNow,
  };
}
