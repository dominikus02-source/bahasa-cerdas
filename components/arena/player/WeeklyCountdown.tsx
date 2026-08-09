"use client";

import { useEffect, useState } from "react";

/**
 * Countdown WIB hydration-safe untuk kompetisi.
 *
 * Semua input (endsAt, baseline) datang dari server. Render pertama pakai
 * `endsAt - baseline` (deterministik → tidak ada hydration mismatch). Setelah
 * mount, komponen menghitung ulang dari `Date.now() - baseline` sehingga
 * terus berdetak per detik tanpa perlu mengirim ulang waktu server.
 */
function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hari = Math.floor(totalSec / 86400);
  const jam = Math.floor((totalSec % 86400) / 3600);
  const mnt = Math.floor((totalSec % 3600) / 60);
  if (hari > 0) return `${hari} hari ${jam} jam`;
  if (jam > 0) return `${jam} jam ${mnt} mnt`;
  if (mnt > 0) return `${mnt} mnt`;
  return "kurang dari 1 mnt";
}

export default function WeeklyCountdown({
  endsAt,
  baseline,
  className,
}: {
  endsAt: string;
  baseline: string;
  className?: string;
}) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const base = new Date(baseline).getTime();
    const update = () => setElapsedMs(Math.max(0, Date.now() - base));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [baseline]);

  const remaining = new Date(endsAt).getTime() - new Date(baseline).getTime() - elapsedMs;

  return (
    <span className={className} suppressHydrationWarning>
      {formatRemaining(remaining)}
    </span>
  );
}
