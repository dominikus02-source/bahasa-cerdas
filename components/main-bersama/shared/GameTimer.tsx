"use client";

import { useEffect, useRef, useState } from "react";
import { Clock3, Pause } from "lucide-react";
import type { GameClockView } from "@/src/main-bersama/contracts/views/common";
import styles from "./GameTimer.module.css";

/** Detik terakhir yang dianggap "menegangkan" (tampilan + musik). */
export const GAME_TIMER_URGENT_MS = 60_000;
export const GAME_TIMER_FINAL_MS = 10_000;

export interface GameClockState {
  /** Sisa waktu (ms). null = jam belum berjalan (lobby) atau sesi tanpa durasi. */
  remainingMs: number | null;
  paused: boolean;
  running: boolean;
}

/**
 * Sisa waktu permainan yang tersinkron ke jam server. Batas waktu absolut
 * (`endsAt`) adalah sumber kebenaran; selisih jam perangkat dikoreksi dari
 * `serverTime` bila melenceng > 3 detik. Tick 250ms cukup untuk tampilan
 * detik tanpa render berat.
 */
export function useGameClock(clock: GameClockView | null | undefined, serverTime: string | undefined): GameClockState {
  const endsAt = clock?.endsAt ?? null;
  const paused = clock?.paused ?? false;
  const pausedRemainingMs = clock?.pausedRemainingMs ?? null;
  const [offsetMs, setOffsetMs] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!serverTime) return;
    const observed = Date.parse(serverTime) - Date.now();
    setOffsetMs(Math.abs(observed) > 3_000 ? observed : 0);
  }, [serverTime]);

  useEffect(() => {
    if (!endsAt || paused) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [endsAt, paused]);

  if (!clock) return { remainingMs: null, paused: false, running: false };
  if (paused) return { remainingMs: pausedRemainingMs, paused: true, running: false };
  if (!endsAt) return { remainingMs: null, paused: false, running: false };
  const remainingMs = Math.max(0, Date.parse(endsAt) - (now + offsetMs));
  return { remainingMs, paused: false, running: remainingMs > 0 };
}

function formatClock(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

interface GameTimerProps {
  clock: GameClockView | null | undefined;
  serverTime: string | undefined;
  compact?: boolean;
  className?: string;
  /** Dipanggil sekali saat waktu mencapai 0 (mis. untuk segera memuat ulang state). */
  onTimeUp?: () => void;
}

/**
 * Jam permainan Main Bersama — sama untuk guru, murid, dan layar kelas.
 * Lobby: durasi pilihan guru. Berjalan: sisa waktu. Jeda: angka beku.
 * Menit terakhir: aksen peringatan (bukan merah — merah khusus galat).
 */
export function GameTimer({ clock, serverTime, compact = false, className, onTimeUp }: GameTimerProps) {
  const state = useGameClock(clock, serverTime);
  const firedRef = useRef(false);

  useEffect(() => {
    if (state.remainingMs === null || state.paused) return;
    if (state.remainingMs > 0) {
      firedRef.current = false;
      return;
    }
    if (!firedRef.current) {
      firedRef.current = true;
      onTimeUp?.();
    }
  }, [state.remainingMs, state.paused, onTimeUp]);

  if (!clock) return null;

  const durationMin = Math.round(clock.durationMs / 60_000);
  const notStarted = state.remainingMs === null;
  const remaining = state.remainingMs ?? clock.durationMs;
  const timeUp = !notStarted && !state.paused && remaining <= 0;
  const urgent = !notStarted && !state.paused && !timeUp && remaining <= GAME_TIMER_URGENT_MS;
  const final = urgent && remaining <= GAME_TIMER_FINAL_MS;
  const progress = Math.max(0, Math.min(1, remaining / clock.durationMs));
  const label = notStarted ? "Durasi" : state.paused ? "Dijeda" : timeUp ? "Waktu habis" : "Sisa waktu";
  const value = notStarted ? `${durationMin} menit` : formatClock(remaining);
  const ariaLabel = notStarted
    ? `Durasi permainan ${durationMin} menit`
    : state.paused
      ? `Permainan dijeda, sisa waktu ${value}`
      : timeUp
        ? "Waktu permainan habis"
        : `Sisa waktu permainan ${value}`;

  return (
    <div
      className={[
        styles.timer,
        compact ? styles.compact : "",
        urgent ? styles.urgent : "",
        final ? styles.final : "",
        state.paused ? styles.paused : "",
        timeUp ? styles.timeUp : "",
        className ?? "",
      ].filter(Boolean).join(" ")}
      role="timer"
      aria-label={ariaLabel}
      data-state={notStarted ? "lobby" : state.paused ? "paused" : timeUp ? "time-up" : urgent ? "urgent" : "running"}
    >
      <span className={styles.icon} aria-hidden>
        {state.paused ? <Pause size={compact ? 14 : 16} /> : <Clock3 size={compact ? 14 : 16} />}
      </span>
      <span className={styles.text} aria-hidden>
        <span className={styles.label}>{label}</span>
        <strong className={styles.value}>{timeUp ? "00:00" : value}</strong>
      </span>
      {!notStarted ? (
        <span className={styles.track} aria-hidden>
          <span className={styles.bar} style={{ transform: `scaleX(${progress})` }} />
        </span>
      ) : null}
      {/* Pengumuman terbatas untuk pembaca layar: hanya saat masuk menit terakhir. */}
      <span className={styles.srOnly} aria-live="polite">
        {urgent && !final ? "Satu menit terakhir" : timeUp ? "Waktu permainan habis" : ""}
      </span>
    </div>
  );
}
