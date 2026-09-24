"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RectangleHorizontal } from "lucide-react";

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
  unlock?: () => void;
};

export function StudentLandscapeControl() {
  const [isLandscape, setIsLandscape] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lockedByAppRef = useRef(false);
  const fullscreenByAppRef = useRef(false);
  const messageTimerRef = useRef<number | null>(null);

  const clearMessageLater = useCallback(() => {
    if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
    messageTimerRef.current = window.setTimeout(() => setMessage(null), 4200);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(orientation: landscape)");
    const sync = () => setIsLandscape(media.matches);
    sync();
    media.addEventListener?.("change", sync);
    window.addEventListener("orientationchange", sync);

    return () => {
      media.removeEventListener?.("change", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);

      const orientation = screen.orientation as LockableOrientation | undefined;
      if (lockedByAppRef.current) {
        try {
          orientation?.unlock?.();
        } catch {
          // Browser owns the final orientation state.
        }
      }

      if (fullscreenByAppRef.current && document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  const requestLandscape = async () => {
    if (busy) return;
    if (isLandscape) {
      setMessage("Landscape sudah aktif.");
      clearMessageLater();
      return;
    }

    setBusy(true);
    setMessage(null);

    const orientation = screen.orientation as LockableOrientation | undefined;
    if (!orientation?.lock) {
      setMessage("Putar HP/tablet ke samping. Matikan kunci rotasi bila perlu.");
      clearMessageLater();
      setBusy(false);
      return;
    }

    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen();
          fullscreenByAppRef.current = true;
        } catch {
          // Some browsers allow orientation lock without Fullscreen API.
        }
      }

      await orientation.lock("landscape");
      lockedByAppRef.current = true;
      setIsLandscape(true);
      setMessage("Mode landscape aktif.");
      clearMessageLater();
    } catch {
      setMessage("Putar perangkat ke samping. Browser ini tidak mengizinkan kunci landscape otomatis.");
      clearMessageLater();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-landscape-control">
      <button
        type="button"
        className={`mb-landscape-btn ${isLandscape ? "mb-landscape-btn-active" : ""}`}
        onClick={() => void requestLandscape()}
        disabled={busy}
        aria-pressed={isLandscape}
        title={isLandscape ? "Landscape aktif" : "Gunakan mode landscape"}
      >
        <RectangleHorizontal size={18} aria-hidden />
        <span>{isLandscape ? "Landscape aktif" : "Landscape"}</span>
      </button>

      {message ? (
        <div className="mb-landscape-message" role="status" aria-live="polite">
          {message}
        </div>
      ) : null}

      <style jsx>{`
        .mb-landscape-control {
          position: relative;
          flex: none;
        }
        .mb-landscape-btn {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 8px 11px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(11,32,49,.74);
          color: #b8cad8;
          font-size: .73rem;
          font-weight: 800;
          box-shadow: 0 10px 24px rgba(0,0,0,.12);
          backdrop-filter: blur(12px);
          cursor: pointer;
          transition:
            background 150ms ease,
            border-color 150ms ease,
            color 150ms ease,
            transform 150ms ease;
        }
        .mb-landscape-btn:hover {
          color: #effcff;
          border-color: rgba(104,226,214,.35);
          background: rgba(13,45,61,.88);
        }
        .mb-landscape-btn:active { transform: scale(.97); }
        .mb-landscape-btn:disabled { opacity: .62; cursor: wait; }
        .mb-landscape-btn-active {
          color: #9df1e8;
          border-color: rgba(79,218,203,.34);
          background: rgba(12,73,71,.5);
        }
        .mb-landscape-message {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          z-index: 20;
          width: min(290px, calc(100vw - 28px));
          padding: 10px 12px;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(6,22,35,.96);
          color: #c4d4df;
          box-shadow: 0 16px 34px rgba(0,0,0,.28);
          font-size: .75rem;
          line-height: 1.4;
          text-align: left;
        }
        @media (max-width: 520px) {
          .mb-landscape-btn span { display: none; }
          .mb-landscape-btn {
            width: 42px;
            padding: 0;
          }
        }
        @media (min-width: 1100px) {
          .mb-landscape-control { display: none; }
        }
      `}</style>
    </div>
  );
}
