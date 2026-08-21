"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePlayer } from "./player-context";
import { BadgeIcon } from "@/components/gamification/BadgeIcon";
import { popupDuration, type RewardPopupType } from "./reward-queue";

const TYPE_META: Record<RewardPopupType, { label: string; icon: string; chip: string; value: string }> = {
  REWARD: { label: "Reward", icon: "✨", chip: "bg-amber-50 dark:bg-amber-500/10", value: "text-amber-600 dark:text-[var(--px-gold)]" },
  XP: { label: "XP", icon: "⚡", chip: "bg-sky-50 dark:bg-sky-500/10", value: "text-sky-600 dark:text-sky-300" },
  COIN: { label: "Koin", icon: "🪙", chip: "bg-amber-50 dark:bg-amber-500/10", value: "text-amber-600 dark:text-[var(--px-gold)]" },
  BADGE: { label: "Lencana", icon: "🏅", chip: "bg-amber-50 dark:bg-amber-500/10", value: "text-amber-600 dark:text-amber-300" },
  ACHIEVEMENT: { label: "Pencapaian", icon: "🏆", chip: "bg-violet-50 dark:bg-violet-500/10", value: "text-violet-600 dark:text-violet-300" },
  LEVEL_UP: { label: "Naik Tingkat", icon: "🎉", chip: "bg-emerald-50 dark:bg-emerald-500/10", value: "text-emerald-600 dark:text-emerald-300" },
  RANK_UP: { label: "Rank Baru", icon: "🏆", chip: "bg-amber-50 dark:bg-amber-500/10", value: "text-amber-600 dark:text-[var(--px-gold)]" },
};

/**
 * Popup reward berurutan (queue) — SATU bahasa visual untuk XP/Koin/reward.
 * - satu aktif, berikutnya menyusul (FIFO + prioritas dari context)
 * - auto-dismiss (P0 6 dtk, lain 4 dtk) + tombol OK
 * - aria-live polite (tidak mencuri fokus), icon dekoratif aria-hidden
 * - tidak dirender saat modal Level/Rank (P0) aktif — tidak bertabrakan
 * - prefers-reduced-motion dihormati
 */
export function RewardPopupQueue() {
  const { popups, dequeuePopup, levelUp, rankUp } = usePlayer();
  const reduceMotion = useReducedMotion();
  const current = popups[0];

  // Auto-dismiss head — bersihkan timer tiap ganti event (unmount-safe).
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => dequeuePopup(current.id), popupDuration(current.type));
    return () => clearTimeout(t);
  }, [current, dequeuePopup]);

  if (levelUp || rankUp) return null;

  const meta = current ? TYPE_META[current.type] : null;

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-[max(4rem,env(safe-area-inset-top))] z-[90] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {current && meta && (
          <motion.div
            key={current.id}
            className="pointer-events-auto"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -18, scale: 0.92 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.95 }}
            transition={reduceMotion ? { duration: 0.15 } : { type: "spring", stiffness: 320, damping: 22 }}
          >
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg shadow-slate-900/10 backdrop-blur-md dark:border-[var(--px-border)] dark:bg-[#0e1735]/85 dark:shadow-black/40">
              <span
                aria-hidden="true"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.chip}`}
              >
                <BadgeIcon icon={current.icon ?? meta.icon} size={30} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">{current.title}</p>
                {current.type === "REWARD" ? (
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-bold">
                    {typeof current.xp === "number" && current.xp > 0 && (
                      <span className="text-sky-600 dark:text-sky-300">+{current.xp} XP</span>
                    )}
                    {typeof current.coin === "number" && current.coin > 0 && (
                      <span className="text-amber-600 dark:text-[var(--px-gold)]">+{current.coin} Koin</span>
                    )}
                  </p>
                ) : (
                  current.body && <p className="truncate text-xs text-slate-500 dark:text-[var(--px-text-dim)]">{current.body}</p>
                )}
                {current.type === "COIN" && (
                  <Link
                    href="/arena/toko-koin"
                    className="mt-0.5 inline-block text-[10px] font-bold text-amber-600 hover:underline dark:text-amber-400"
                  >
                    Gunakan di Toko →
                  </Link>
                )}
              </div>
              <button
                className="pointer-events-auto rounded-full bg-slate-900/5 px-2 py-0.5 text-[10px] font-bold text-slate-500 transition-colors hover:bg-slate-900/10 hover:text-slate-700 dark:bg-white/10 dark:text-[var(--px-text-dim)] dark:hover:bg-white/20 dark:hover:text-white"
                onClick={() => dequeuePopup(current.id)}
                aria-label="Tutup notifikasi reward"
              >
                OK
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
