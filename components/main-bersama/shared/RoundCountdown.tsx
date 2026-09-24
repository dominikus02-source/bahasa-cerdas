"use client";

import { useEffect, useState } from "react";

interface RoundCountdownProps {
  closesAt: string | null;
  serverTime: string;
  compact?: boolean;
  light?: boolean;
}

/**
 * Countdown sinkron ke deadline server.
 * Deadline absolut tetap sumber kebenaran; serverTime hanya dipakai bila
 * jam perangkat melenceng jauh. Tick 200ms menjaga pergantian detik terasa
 * tepat tanpa render loop berat.
 */
export function RoundCountdown({
  closesAt,
  serverTime,
  compact = false,
  light = false,
}: RoundCountdownProps) {
  if (!closesAt) return null;
  return (
    <RoundCountdownInner
      closesAt={closesAt}
      serverTime={serverTime}
      compact={compact}
      light={light}
    />
  );
}

function RoundCountdownInner({
  closesAt,
  serverTime,
  compact,
  light,
}: Required<Omit<RoundCountdownProps, "closesAt">> & { closesAt: string }) {
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Date.parse(closesAt) - Date.now()),
  );

  useEffect(() => {
    const observedOffset = Date.parse(serverTime) - Date.now();
    setClockOffsetMs(Math.abs(observedOffset) > 10_000 ? observedOffset : 0);
  }, [serverTime]);

  useEffect(() => {
    const tick = () => {
      setRemaining(
        Math.max(0, Date.parse(closesAt) - (Date.now() + clockOffsetMs)),
      );
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [closesAt, clockOffsetMs]);

  const totalSec = Math.ceil(remaining / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  const urgent = totalSec <= 10;

  return (
    <span
      className={[
        "mb-round-countdown",
        compact ? "mb-round-countdown-compact" : "",
        light ? "mb-round-countdown-light" : "",
        urgent ? "mb-round-countdown-urgent" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="timer"
      aria-label={`Sisa waktu ${mm}:${ss}`}
    >
      <span aria-hidden className="mb-round-countdown-dot" />
      {mm}:{ss}
    </span>
  );
}
