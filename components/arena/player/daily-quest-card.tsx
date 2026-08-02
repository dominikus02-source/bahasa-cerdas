"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Gift } from "lucide-react";
import { GlassCard } from "./ui";
import { getQuestMeta, questProgressText } from "@/lib/quest-meta";
import type { DailyQuestView } from "@/lib/gamification/client-types";
import { usePlayer } from "./player-context";

/** Misi harian — daftar quest + tombol klaim (reuse lib/coins via /player/quests). */
export function DailyQuestCard({ compact = false }: { compact?: boolean }) {
  const { enqueuePopup, refresh } = usePlayer();
  const [quests, setQuests] = useState<DailyQuestView[] | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/player/quests", { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat misi");
      const data = await res.json();
      setQuests(data.quests);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const claim = async (questId: string, rewardCoins: number) => {
    if (claiming) return;
    setClaiming(questId);
    setError(null);
    try {
      const res = await fetch("/api/player/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal klaim misi");
      }
      enqueuePopup({ type: "COIN", title: `+${rewardCoins} Koin`, body: "Hadiah misi harian", icon: "🪙", amount: rewardCoins });
      await load();
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setClaiming(null);
    }
  };

  if (!quests) {
    return (
      <GlassCard className="p-4">
        <div className="space-y-3">
          <div className="px-skeleton h-4 w-1/2 rounded-lg" />
          {Array.from({ length: compact ? 3 : 5 }, (_, i) => (
            <div key={i} className="px-skeleton h-12 rounded-xl" />
          ))}
        </div>
      </GlassCard>
    );
  }

  const visible = compact ? quests.slice(0, 3) : quests;
  const doneCount = quests.filter((q) => q.claimed || q.completed).length;

  return (
    <GlassCard className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-[var(--px-text)]">
          <Gift size={16} className="text-[var(--px-gold)]" />
          Misi Harian
        </h3>
        <span className="px-chip">
          {doneCount}/{quests.length}
        </span>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">{error}</p>
      )}

      <div className="space-y-2">
        {visible.map((q) => {
          const meta = getQuestMeta(q.questType);
          const Icon = meta.Icon;
          const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
          const isDone = q.completed;
          const isClaimed = q.claimed;

          return (
            <div key={q.id} className={`flex items-center gap-3 rounded-xl border p-3 ${isClaimed ? "border-white/5 bg-white/[0.03]" : "border-[var(--px-border)] bg-white/[0.05]"}`}>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.warna}`}>
                {isClaimed ? <Check size={20} className="text-white" /> : <Icon size={18} className="text-white" />}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[var(--px-text)]">{meta.label}</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/40">
                    <motion.div
                      className={`h-full rounded-full ${isClaimed ? "bg-emerald-500" : "bg-[var(--px-gold)]"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-[var(--px-text-faint)]">{questProgressText(q.progress, q.target, isClaimed)}</span>
                </div>
              </div>

              <div className="shrink-0">
                {isClaimed ? (
                  <span className="px-chip text-emerald-300">
                    <Check size={12} /> Klaim
                  </span>
                ) : isDone ? (
                  <button
                    onClick={() => claim(q.id, q.rewardCoins)}
                    disabled={claiming === q.id}
                    className="px-btn-gold px-3 py-1.5 text-xs"
                  >
                    {claiming === q.id ? "..." : `+${q.rewardCoins}`}
                  </button>
                ) : (
                  <span className="px-chip text-[var(--px-text-faint)]">{q.rewardCoins} 🪙</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
