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
      <div className={`mb-session-timer ${urgent ? "mb-session-timer-urgent" : ""}`} aria-live="polite">
        <span className="mb-session-timer-label">Waktu</span>
        <span className="mb-session-timer-value">{mins}:{secs.toString().padStart(2, "0")}</span>
      </div>
      {showFinal && (
        <div className="mb-final-countdown" aria-live="assertive">
          <span className="mb-final-countdown-number">{finalCount}</span>
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
