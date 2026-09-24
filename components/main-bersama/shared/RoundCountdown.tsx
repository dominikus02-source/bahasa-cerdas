"use client";

import { useEffect, useState } from "react";

export function RoundCountdown({
  closesAt,
  serverTime,
  large = false,
}: {
  closesAt: string | null;
  serverTime: string;
  large?: boolean;
}) {
  if (!closesAt) return null;
  return <Countdown closesAt={closesAt} serverTime={serverTime} large={large} />;
}

function Countdown({
  closesAt,
  serverTime,
  large,
}: {
  closesAt: string;
  serverTime: string;
  large: boolean;
}) {
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
      setRemaining(Math.max(0, Date.parse(closesAt) - (Date.now() + clockOffsetMs)));
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [closesAt, clockOffsetMs]);

  const totalSec = Math.ceil(remaining / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  const urgent = totalSec <= 30;

  return (
    <span
      className={`mb-round-countdown mb-number ${large ? "mb-round-countdown-large" : ""} ${urgent ? "mb-round-countdown-urgent" : ""}`}
      role="timer"
      aria-label={`Sisa waktu ${mm}:${ss}`}
    >
      {mm}:{ss}
    </span>
  );
}
