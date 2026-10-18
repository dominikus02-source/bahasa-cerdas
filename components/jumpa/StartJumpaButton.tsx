"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Video } from "lucide-react";
import { JUMPA_ENABLED } from "@/lib/features";

/**
 * Tombol "Mulai JUMPA" untuk kelas guru. Klik 1 = buat ruang (atau buka
 * jadwal hari ini yang ≤ 15 menit lagi) & buka lobby; klik 2 (di lobby) =
 * Gabung. Tidak tampil bila flag mati. `notifyClass` = sakelar "Beri tahu
 * kelas" di panel (mati → tidak ada notifikasi "sedang JUMPA" ke murid).
 * variant "grad" = tombol utama panel JUMPA (Panduan Desain: gradien merek).
 */
export default function StartJumpaButton({ groupId, className = "", variant = "secondary", label = "Mulai JUMPA", notifyClass = true }: { groupId: string; className?: string; variant?: "secondary" | "grad"; label?: string; /** "Beri tahu kelas" (disimpan di ruang; server yang menegakkan). */ notifyClass?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeUrl, setUpgradeUrl] = useState<string | null>(null);

  if (!JUMPA_ENABLED) return null;

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/jumpa/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ groupId, notifyClass }),
      });
      const body = (await res.json().catch(() => null)) as { url?: string; error?: string; code?: string; upgradeUrl?: string } | null;
      if (!res.ok || !body?.url) {
        setError(body?.error ?? "Gagal membuat ruang JUMPA.");
        // Fase 3: kuota harian paket Gratis habis → tawarkan Premium.
        setUpgradeUrl(body?.code === "TIER_DAILY_LIMIT" && typeof body.upgradeUrl === "string" && body.upgradeUrl.startsWith("/") ? body.upgradeUrl : null);
        setBusy(false);
        return;
      }
      router.push(body.url);
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
      setBusy(false);
    }
  };

  const cls = variant === "grad" ? "jpe-btn w-full sm:w-auto" : "bc-btn-secondary min-h-11 w-full justify-center text-sm shrink-0 sm:w-auto";
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <button type="button" onClick={start} disabled={busy} className={cls} data-tone={variant === "grad" ? "grad" : undefined} aria-label={`${label}, ruang video untuk kelas ini`}>
        {busy ? <Loader2 size={18} className="animate-spin" /> : <Video size={18} />} {label}
      </button>
      {error && <p role="alert" className="text-xs text-[var(--clr-danger)]">{error}</p>}
      {upgradeUrl && (
        <a href={upgradeUrl} className="text-xs font-semibold text-[var(--clr-accent-strong)] underline-offset-2 hover:underline">
          Lihat paket Premium
        </a>
      )}
    </div>
  );
}
