"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Gift, Lock } from "lucide-react";
import { GlassCard, formatId } from "./ui";
import type { AchievementView } from "@/lib/gamification/client-types";
import { usePlayer } from "./player-context";
import { BadgeIcon } from "@/components/gamification/BadgeIcon";

/** Grid achievement — progress realtime + klaim reward. */
export function AchievementGrid({ limit }: { limit?: number }) {
  const { enqueuePopup, refresh } = usePlayer();
  const [achievements, setAchievements] = useState<AchievementView[] | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/player/achievements", { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat pencapaian");
      const data = await res.json();
      setAchievements(data.achievements);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const claim = async (code: string, rewardXP: number, rewardCoins: number) => {
    if (claiming) return;
    setClaiming(code);
    setError(null);
    try {
      const res = await fetch("/api/player/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal klaim");
      }
      if (rewardXP > 0) enqueuePopup({ type: "XP", title: `+${rewardXP} XP`, body: "Hadiah pencapaian", icon: "⚡", amount: rewardXP });
      if (rewardCoins > 0) enqueuePopup({ type: "COIN", title: `+${rewardCoins} Koin`, body: "Hadiah pencapaian", icon: "🪙", amount: rewardCoins });
      await load();
      // NOTIFICATION 1.0 — refresh SILENT: baseline diperbarui tanpa popup diff ganda.
      refresh(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setClaiming(null);
    }
  };

  if (!achievements) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="px-skeleton h-16 rounded-2xl" />
        ))}
      </div>
    );
  }

  const completed = achievements.filter((a) => a.completed).length;
  const visible = limit ? achievements.slice(0, limit) : achievements;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--px-text-dim)]">
          {completed}/{achievements.length} selesai
        </p>
      </div>

      {error && <p className="mb-3 text-xs text-rose-500 dark:text-rose-300">{error}</p>}

      <div className="space-y-2">
        {visible.map((a, i) => {
          const pct = Math.min(100, Math.round((a.progress / a.target) * 100));
          const done = a.completed;
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 rounded-2xl border border-[var(--px-border)] bg-[var(--px-glass)] p-3"
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${done ? "bg-gradient-to-br from-amber-500/40 to-orange-600/30" : "bg-white/5 dark:bg-slate-900/5 opacity-60"}`}>
                {done ? <BadgeIcon icon={a.icon} size={34} alt={a.name} /> : <Lock size={16} />}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[var(--px-text)]">{a.name}</p>
                <p className="line-clamp-1 text-[11px] text-[var(--px-text-dim)]">{a.description}</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--px-track)]">
                    <motion.div
                      className={`h-full rounded-full ${done ? "bg-emerald-500" : "bg-[var(--px-royal)]"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-[var(--px-text-faint)]">
                    {done ? `${formatId(a.target)}/${formatId(a.target)}` : `${formatId(a.progress)}/${formatId(a.target)}`}
                  </span>
                </div>
              </div>

              <div className="shrink-0 text-right">
                {a.claimed ? (
                  <span className="px-chip text-emerald-300">
                    <Check size={12} /> Selesai
                  </span>
                ) : done ? (
                  <button onClick={() => claim(a.code, a.rewardXP, a.rewardCoins)} disabled={claiming === a.code} className="px-btn-gold px-3 py-1.5 text-xs">
                    {claiming === a.code ? "..." : <span className="inline-flex items-center gap-1"><Gift size={12} /> Klaim</span>}
                  </button>
                ) : (
                  <span className="px-chip text-[var(--px-text-faint)]">
                    {a.rewardXP > 0 && `+${a.rewardXP} XP`}
                    {a.rewardXP > 0 && a.rewardCoins > 0 && " · "}
                    {a.rewardCoins > 0 && `+${a.rewardCoins} 🪙`}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
