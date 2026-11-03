"use client";

/**
 * Status ruang dan hitung mundur. Satu pengalaman tanpa ajakan upgrade.
 */
import { memo, useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { type JumpaTierView } from "@/lib/jumpa/tiers";

export function TierBadge({ tier, compact = false }: { tier: JumpaTierView; compact?: boolean }) {
  void compact;
  return <span className="jumpa-tier" title={tierLimitsText(tier)}>{tier.label}</span>;
}

/** Ringkasan batas ruang, mis. "30 orang · 45 menit". */
export function tierLimitsText(tier: JumpaTierView): string {
  return `${tier.maxParticipants} orang · ${tier.maxDurationMin} menit`;
}

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

/** Detik tersisa sampai endsAt; berdetak tiap detik HANYA di komponen pemakai. */
export function useRemaining(endsAt: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  if (!endsAt) return null;
  return Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 1000));
}

/**
 * Chip sisa waktu: hanya tampil di 10 menit terakhir (semua paket).
 * Komponen sendiri supaya detak per detik tidak me-render ulang ruang.
 */
export const COUNTDOWN_SHOW_SEC = 10 * 60;

export const CountdownChip = memo(function CountdownChip({ endsAt }: { endsAt: string | null }) {
  const remaining = useRemaining(endsAt);
  // Semua paket: tampil hanya di 10 menit terakhir (keputusan CEO).
  if (remaining === null || remaining > COUNTDOWN_SHOW_SEC) return null;
  return (
    <span className="jumpa-countdown" data-warn="true" role="timer" aria-label={`Sisa waktu ruang ${fmt(remaining)}`}>
      <Timer size={14} aria-hidden /> {fmt(remaining)}
    </span>
  );
});

/**
 * Pengawas batas waktu (tanpa UI selain lembar upgrade). Memanggil onTimeUp
 * saat waktu habis; server tetap menutup ruang lewat cron sweep.
 */
export function TimeLimitWatcher({
  endsAt,
  onTimeUp,
}: {
  endsAt: string | null;
  tier: JumpaTierView;
  promptBeforeMin: number;
  onTimeUp: () => void;
}) {
  const remaining = useRemaining(endsAt);
  useEffect(() => {
    if (remaining === 0) onTimeUp();
  }, [remaining, onTimeUp]);
  return null;
}
