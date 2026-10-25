"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { ArrowRight, Check, Gift, Loader2, RotateCw, Sparkles } from "lucide-react";
import { getQuestMeta, questProgressText } from "@/lib/quest-meta";
import type { DailyQuestView } from "@/lib/gamification/client-types";

/**
 * CTA per tipe misi → halaman yang benar-benar menuntaskan misi tersebut.
 * Mapping murni clien-side; quest engine (lib/coins.ts) tidak disentuh.
 */
const QUEST_CTA: Record<string, { href: string; label: string }> = {
  MENULIS: { href: "/murid/karya", label: "Tulis" },
  MENGOMENTARI: { href: "/murid/karya", label: "Komentari" },
  MEMBERI_LIKE: { href: "/murid/karya", label: "Sukai" },
  BACA_MATERI: { href: "/arena/jalur-cerdas", label: "Belajar" },
  MENJAWAB_KUIS: { href: "/arena/jalur-cerdas", label: "Jawab Soal" },
};
const QUEST_CTA_FALLBACK = { href: "/arena", label: "Mulai" };

/**
 * Misi Harian — Player Experience Layer di atas sistem quest existing.
 * Hanya membaca GET /api/player/quests dan memanggil POST untuk klaim;
 * TIDAK ada logika quest/XP/koin/streak yang ditulis ulang di sini.
 */
export function DailyMissionCard() {
  const [quests, setQuests] = useState<DailyQuestView[] | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/player/quests", { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat misi harian");
      const data = await res.json();
      setQuests(Array.isArray(data.quests) ? data.quests : []);
      setError(null);
    } catch {
      setError("Misi harian belum bisa dimuat. Coba beberapa saat lagi.");
    }
  }, []);

  useEffect(() => {
    load();
    // Segarkan saat murid kembali ke tab ini — progress misi diperbarui dari
    // aktivitas di halaman lain (jalur cerdas, karya, dl.). Tanpa interval.
    const onFocus = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [load]);

  const claim = async (questId: string) => {
    if (claimingId) return;
    setClaimingId(questId);
    setError(null);
    try {
      const res = await fetch("/api/player/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal mengambil reward");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setClaimingId(null);
    }
  };

  // ── Loading ──
  if (quests === null && !error) {
    return (
      <section aria-label="Misi harian" className="my-day-hero px-card bc-tint-orange px-5 py-6 space-y-4">
        <div className="px-skeleton rounded-lg" style={{ width: 140, height: 14 }} />
        <div className="px-skeleton rounded-lg" style={{ width: "60%", height: 10 }} />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="px-skeleton h-14 rounded-xl" />
        ))}
      </section>
    );
  }

  // ── Error — dashboard tidak boleh crash ──
  if (quests === null) {
    return (
      <section aria-label="Misi harian" className="my-day-hero px-card bc-tint-orange px-5 py-6 text-center">
        <p className="text-sm font-bold text-[var(--px-text)]">Misi Harian</p>
        <p className="mt-1 text-xs text-[var(--px-text-dim)]">{error}</p>
        <button
          type="button"
          onClick={load}
          className="px-btn-gold mt-3 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold"
        >
          <RotateCw size={14} />
          Coba Lagi
        </button>
      </section>
    );
  }

  // ── Kosong ──
  if (quests.length === 0) {
    return (
      <section aria-label="Misi harian" className="my-day-hero px-card bc-tint-orange px-5 py-6 text-center">
        <Gift size={20} className="mx-auto mb-2 text-[var(--px-gold)]" />
        <p className="text-sm font-bold text-[var(--px-text)]">Misi Harian</p>
        <p className="mt-1 text-xs text-[var(--px-text-dim)]">Misi baru sedang disiapkan. Kembali lagi nanti.</p>
      </section>
    );
  }

  const doneCount = quests.filter((q) => q.completed).length;
  const claimedCount = quests.filter((q) => q.claimed).length;
  const allDone = doneCount === quests.length;
  const totalCoins = quests.reduce((sum, q) => sum + q.rewardCoins, 0);
  const earnedCoins = quests.filter((q) => q.claimed).reduce((sum, q) => sum + q.rewardCoins, 0);
  const overallPct = Math.min(100, Math.round((doneCount / quests.length) * 100));

  return (
    <section aria-label="Misi harian" className="my-day-hero px-card bc-tint-orange h-full px-5 py-6">
      {/* HEADER */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {allDone ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-bc-success">
              Semua Misi Selesai!
            </p>
          ) : (
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--px-gold)]">Misi Harian</p>
          )}
          <h2 className="mt-0.5 flex items-center gap-2 text-base font-extrabold text-[var(--px-text)]">
            {allDone ? <Sparkles size={16} className="text-bc-success" /> : <Gift size={16} className="text-[var(--px-gold)]" />}
            {allDone ? "Keren! Semua misi selesai" : "Misi Hari Ini"}
          </h2>
          <p className="mt-0.5 text-xs text-[var(--px-text-dim)]">
            {allDone
              ? `+${earnedCoins} koin sudah dikumpulkan.`
              : "Selesaikan misi hari ini dan kumpulkan koin."}
          </p>
        </div>
        <span className="px-chip shrink-0">
          {doneCount}/{quests.length}
        </span>
      </div>

      {/* SUMMARY */}
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-[11px] font-bold">
          <span className="text-[var(--px-text-dim)]">
            {claimedCount}/{quests.length} reward diterima
          </span>
          <span className="text-[var(--px-gold)]">+{totalCoins} Koin</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--px-track)]">
          <div
            className={`h-full rounded-full transition-all ${allDone ? "bg-bc-success" : "bg-[var(--px-gold)]"}`}
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-bc-danger-soft px-3 py-2 text-xs font-semibold text-bc-danger">{error}</p>
      )}

      {/* MISSIONS */}
      <div className="space-y-2">
        {quests.map((q) => {
          const meta = getQuestMeta(q.questType);
          const Icon = meta.Icon;
          const cta = QUEST_CTA[q.questType] ?? QUEST_CTA_FALLBACK;
          const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
          const isDone = q.completed;
          const isClaimed = q.claimed;

          return (
            <div
              key={q.id}
              className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-xl border p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] ${
                isClaimed ? "border-bc-success/30 bg-bc-success-soft" : "border-[var(--px-border)] bg-[var(--px-glass)]"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.warna}`}
              >
                {isClaimed ? <Check size={20} className="text-white" /> : <Icon size={18} className="text-white" />}
              </div>

              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 break-words text-sm font-bold leading-snug text-[var(--px-text)]">{meta.label}</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--px-track)]">
                    <div
                      className={`h-full rounded-full transition-all ${isClaimed || isDone ? "bg-bc-success" : "bg-[var(--px-gold)]"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] font-semibold text-[var(--px-text-faint)]">
                  {q.progress}/{q.target} · {questProgressText(q.progress, q.target, isDone)}
                </p>
              </div>

              <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:flex-col sm:items-end sm:gap-1.5">
                <span className="text-[11px] font-bold text-[var(--px-gold)]">+{q.rewardCoins} Koin</span>
                {isClaimed ? (
                  <span className="px-chip text-bc-success">
                    <Check size={11} className="mr-0.5 inline" /> Diterima
                  </span>
                ) : isDone ? (
                  <button
                    type="button"
                    onClick={() => claim(q.id)}
                    disabled={claimingId === q.id}
                    className={buttonClass({ variant: "accent", size: "sm", className: "disabled:cursor-wait" })}
                    aria-label={`Ambil reward misi ${meta.label}`}
                  >
                    {claimingId === q.id ? <Loader2 size={12} className="animate-spin" /> : null}
                    {claimingId === q.id ? "..." : "Ambil Reward"}
                  </button>
                ) : (
                  <Link
                    href={cta.href}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--px-border)] px-3 py-1.5 text-[11px] font-bold text-[var(--px-royal-2)] transition-colors hover:bg-[var(--px-glass)]"
                    aria-label={`Mulai misi ${meta.label}`}
                  >
                    {cta.label}
                    <ArrowRight size={11} />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* COMPLETION MOMENT */}
      {allDone && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-bc-success/30 bg-bc-success-soft p-3">
          <p className="text-xs font-semibold text-bc-success">
            Besok ada misi baru lagi. Jaga rentetan belajarmu!
          </p>
          <Link
            href="/arena/jalur-cerdas"
            className={buttonClass({ variant: "secondary", size: "sm", className: "shrink-0" })}
          >
            Lanjut Belajar
            <ArrowRight size={11} />
          </Link>
        </div>
      )}
    </section>
  );
}