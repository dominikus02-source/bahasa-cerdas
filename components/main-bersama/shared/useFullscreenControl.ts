"use client";

import { useCallback, useEffect, useState } from "react";

interface FullscreenOptions {
  onError?: (message: string) => void;
  keyboard?: boolean;
}

/**
 * One authoritative fullscreen controller for Main Bersama surfaces.
 * Tracks browser state via fullscreenchange, supports F as a classroom
 * shortcut, and always exposes an explicit exit path.
 */
export function useFullscreenControl({
  onError,
  keyboard = true,
}: FullscreenOptions = {}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const sync = useCallback(() => {
    setIsFullscreen(Boolean(document.fullscreenElement));
  }, []);

  const enter = useCallback(async () => {
    try {
      if (!document.fullscreenEnabled) {
        onError?.("Mode layar penuh tidak didukung browser ini.");
        return false;
      }
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      sync();
      return true;
    } catch {
      onError?.("Mode layar penuh tidak dapat diaktifkan browser ini.");
      return false;
    }
  }, [onError, sync]);

  const exit = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      sync();
      return true;
    } catch {
      onError?.("Layar penuh tidak dapat ditutup. Tekan Esc pada keyboard.");
      return false;
    }
  }, [onError, sync]);

  const toggle = useCallback(async () => {
    if (document.fullscreenElement) return exit();
    return enter();
  }, [enter, exit]);

  useEffect(() => {
    sync();
    const onChange = () => sync();
    const onErrorEvent = () => {
      sync();
      onError?.("Perubahan mode layar penuh ditolak browser.");
    };
    const onKey = (event: KeyboardEvent) => {
      if (!keyboard || event.key.toLowerCase() !== "f") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      event.preventDefault();
      void toggle();
    };

    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("fullscreenerror", onErrorEvent);
    if (keyboard) window.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("fullscreenerror", onErrorEvent);
      if (keyboard) window.removeEventListener("keydown", onKey);
    };
  }, [keyboard, onError, sync, toggle]);

  return { isFullscreen, enter, exit, toggle };
}
