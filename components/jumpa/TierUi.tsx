"use client";

/**
 * JUMPA Fase 3 — UI paket: lencana, hitung mundur, ajakan upgrade.
 * Ajakan upgrade HANYA untuk guru pembuat ruang paket Gratis
 * (tier.canUpgrade dihitung server). Murid tidak pernah melihatnya.
 */
import { memo, useEffect, useState } from "react";
import { Crown, ExternalLink, Hourglass, Timer, X } from "lucide-react";
import { JUMPA_TIERS, type JumpaTierView } from "@/lib/jumpa/tiers";

const P = JUMPA_TIERS.PREMIUM;

export function TierBadge({ tier, compact = false }: { tier: JumpaTierView; compact?: boolean }) {
  const premium = tier.tier === "PREMIUM" && tier.kind !== "MURID";
  return (
    <span className="jumpa-tier" data-tier={tier.kind === "MURID" ? "MURID" : tier.tier} title={`Paket ${tier.label}`}>
      {premium && <Crown size={compact ? 11 : 12} aria-hidden />}
      {tier.label}
    </span>
  );
}

/** Ringkasan batas ruang, mis. "Maks 40 orang · 45 menit". */
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
 * Chip sisa waktu. Ruang Gratis: selalu tampil (batasnya jelas sejak awal).
 * Ruang lain: tampil 10 menit terakhir. Komponen sendiri supaya detak per
 * detik tidak me-render ulang seluruh ruang.
 */
export const CountdownChip = memo(function CountdownChip({ endsAt, alwaysShow }: { endsAt: string | null; alwaysShow: boolean }) {
  const remaining = useRemaining(endsAt);
  if (remaining === null) return null;
  const warn = remaining <= 10 * 60;
  if (!alwaysShow && !warn) return null;
  return (
    <span className="jumpa-countdown" data-warn={warn} role="timer" aria-label={`Sisa waktu ruang ${fmt(remaining)}`}>
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
  tier,
  promptBeforeMin,
  onTimeUp,
}: {
  endsAt: string | null;
  tier: JumpaTierView;
  promptBeforeMin: number;
  onTimeUp: () => void;
}) {
  const remaining = useRemaining(endsAt);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (remaining === 0) onTimeUp();
  }, [remaining, onTimeUp]);
  if (remaining === null || !tier.canUpgrade || dismissed) return null;
  if (remaining > promptBeforeMin * 60 || remaining === 0) return null;
  return <UpgradeSheet tier={tier} remaining={remaining} onClose={() => setDismissed(true)} />;
}

export function UpgradeSheet({
  tier,
  remaining,
  reason = "time",
  onClose,
}: {
  tier: JumpaTierView | { maxDurationMin: number; upgradeUrl: string | null };
  remaining?: number;
  reason?: "time" | "daily" | "ended";
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  // Satu judul + daftar manfaat; angka hanya muncul sekali.
  const title =
    reason === "daily"
      ? JUMPA_TIERS.FREE.roomsPerDay === null ? "Kuota ruang hari ini habis" : `Kuota ${JUMPA_TIERS.FREE.roomsPerDay} ruang hari ini habis`
      : reason === "ended"
        ? `Batas ${tier.maxDurationMin} menit tercapai`
        : "Ruang Gratis hampir habis";
  return (
    <div className="jumpa-upgrade-wrap" role="presentation">
      <button type="button" className="jumpa-scrim jumpa-in-fade fixed inset-0 z-[70]" aria-label="Tutup" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="jumpa-upgrade-title" className="jumpa-upgrade jumpa-in-pop">
        <button type="button" className="jumpa-icon-btn absolute right-3 top-3" aria-label="Tutup" onClick={onClose}>
          <X size={18} />
        </button>
        <span className="jumpa-upgrade-icon" aria-hidden>
          {reason === "time" ? <Hourglass size={22} /> : <Crown size={22} />}
        </span>
        {remaining !== undefined && reason === "time" && (
          <p className="jumpa-upgrade-timer" role="timer" aria-label="Sisa waktu">
            {fmt(remaining)}
          </p>
        )}
        <h2 id="jumpa-upgrade-title" className="text-lg font-extrabold">{title}</h2>
        <p className="jumpa-section-label mt-3">Dengan Premium</p>
        <ul className="jumpa-upgrade-list !mt-1.5">
          <li>Kelas {P.rooms.KELAS.maxDurationMin} menit · {P.rooms.KELAS.maxParticipants} peserta</li>
          <li>Ruang guru {P.rooms.GURU.maxParticipants} peserta</li>
          {P.roomsPerDay === null && <li>Ruang tanpa batas per hari</li>}
          <li>Video hingga {P.maxCameraHeight}p</li>
        </ul>
        <div className="mt-5 flex flex-col gap-2">
          {tier.upgradeUrl && (
            <a href={tier.upgradeUrl} target="_blank" rel="noopener" className="jumpa-primary jumpa-primary-premium !min-h-[48px] flex-1">
              <Crown size={18} /> Lihat Premium <ExternalLink size={14} className="opacity-70" />
            </a>
          )}
          <button type="button" className="jumpa-ghost shrink-0 whitespace-nowrap" onClick={onClose}>
            {reason === "time" ? "Lanjutkan kelas" : "Nanti saja"}
          </button>
        </div>
      </div>
    </div>
  );
}
