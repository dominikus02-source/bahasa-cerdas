"use client";

import { useEffect, useState, useCallback } from "react";

interface SessionTimerProps {
  sessionId: string;
  durationMin: number;
  phase: string;
  onTimeUp: () => void;
  onFinalCountdown?: (seconds: number) => void;
}

const STORAGE_KEY = (id: string) => `mb-session-end-${id}`;

export function SessionTimer({ sessionId, durationMin, phase, onTimeUp, onFinalCountdown }: SessionTimerProps) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [showFinal, setShowFinal] = useState(false);
  const [finalCount, setFinalCount] = useState(10);

  // Start timer when phase becomes 'question'
  useEffect(() => {
    if (durationMin <= 0) return;
    if (phase !== 'question' && phase !== 'closed' && phase !== 'discussion') return;
    const stored = localStorage.getItem(STORAGE_KEY(sessionId));
    let endsAt: number;
    if (stored) {
      endsAt = parseInt(stored, 10);
    } else {
      endsAt = Date.now() + durationMin * 60 * 1000;
      localStorage.setItem(STORAGE_KEY(sessionId), String(endsAt));
    }
    const tick = () => {
      const now = Date.now();
      const rem = Math.max(0, Math.floor((endsAt - now) / 1000));
      setRemaining(rem);
      if (rem <= 10 && rem > 0) {
        setShowFinal(true);
        setFinalCount(rem);
        onFinalCountdown?.(rem);
      }
      if (rem === 0) {
        setShowFinal(false);
        onTimeUp();
        localStorage.removeItem(STORAGE_KEY(sessionId));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sessionId, durationMin, phase, onTimeUp, onFinalCountdown]);

  if (remaining === null) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const urgent = remaining <= 60;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 12, background: "var(--clr-surface)", border: "1px solid var(--clr-border)" }} aria-live="polite">
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--clr-text-2)" }}>Waktu</span>
        <span style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: urgent ? "var(--clr-danger)" : "var(--clr-text)" }}>{mins}:{secs.toString().padStart(2, "0")}</span>
      </div>
      {showFinal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.85)" /* warna-izin: overlay countdown */, pointerEvents: "none" }} aria-live="assertive">
          <span style={{ fontSize: "clamp(120px, 30vw, 280px)", fontWeight: 900, color: "var(--clr-on-brand)", textShadow: "0 0 40px var(--clr-on-brand)" }}>{finalCount}</span>
        </div>
      )}
    </>
  );
}

export function saveSessionDuration(sessionId: string, minutes: number) {
  localStorage.setItem(`mb-session-duration-${sessionId}`, String(minutes));
}

export function loadSessionDuration(sessionId: string): number {
  const v = localStorage.getItem(`mb-session-duration-${sessionId}`);
  return v ? parseInt(v, 10) : 0;
}
