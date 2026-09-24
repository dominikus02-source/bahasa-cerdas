"use client";

import { useCallback, useEffect, useState } from "react";

export function FullscreenButton({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    setSupported(typeof root.requestFullscreen === "function");
    const sync = () => setActive(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    } catch {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        // Browser menolak fullscreen: biarkan UI tetap berjalan normal.
      }
    }
  }, []);

  useEffect(() => {
    if (!supported) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "f" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      event.preventDefault();
      void toggle();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [supported, toggle]);

  if (!supported) return null;

  return (
    <button
      type="button"
      className={`mb-fullscreen-btn ${compact ? "mb-fullscreen-btn-compact" : ""} ${className}`.trim()}
      onClick={() => void toggle()}
      title={active ? "Keluar layar penuh (F)" : "Layar penuh (F)"}
      aria-pressed={active}
    >
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {active ? (
          <>
            <path d="M8 3v5H3" /><path d="M16 3v5h5" /><path d="M8 21v-5H3" /><path d="M16 21v-5h5" />
          </>
        ) : (
          <>
            <path d="M8 3H3v5" /><path d="M16 3h5v5" /><path d="M8 21H3v-5" /><path d="M16 21h5v-5" />
          </>
        )}
      </svg>
      <span>{active ? "Keluar layar penuh" : "Layar penuh"}</span>
    </button>
  );
}
