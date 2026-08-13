"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { GlassCard, InitialAvatar, formatId } from "./ui";
import { RankIcon } from "@/components/gamification/RankIcon";
import type { LeaderboardEntryView } from "@/lib/gamification/client-types";

type Period = "ALL_TIME" | "WEEKLY" | "SEASON";
type Scope = "GLOBAL" | "SCHOOL" | "CLASS" | "FRIENDS";

const PERIOD_LABELS: Record<Period, string> = {
  ALL_TIME: "Semua Waktu",
  WEEKLY: "Mingguan",
  SEASON: "Musim",
};

/** Podium + daftar papan peringkat, data dari /player/leaderboard. */
export function LeaderboardPanel({ compact = false }: { compact?: boolean }) {
  const [period, setPeriod] = useState<Period>("WEEKLY");
  const [scope, setScope] = useState<Scope>("GLOBAL");
  const [entries, setEntries] = useState<LeaderboardEntryView[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/player/leaderboard?scope=${scope}&period=${period}&limit=20`, { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat papan peringkat");
      const data = await res.json();
      setEntries(data.entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, [period, scope]);

  useEffect(() => {
    load();
  }, [load]);

  const podium = entries?.slice(0, 3) ?? [];
  const rest = entries?.slice(3) ?? [];
  const visibleRest = compact ? rest.slice(0, 5) : rest;

  return (
    <GlassCard className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-[var(--px-text)]">
          <Trophy size={16} className="text-[var(--px-gold)]" />
          Papan Peringkat
        </h3>
        <div className="flex items-center gap-1">
          {(["WEEKLY", "SEASON", "ALL_TIME"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${period === p ? "px-btn-gold" : "px-btn-ghost"}`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex gap-1">
        {(["GLOBAL", "SCHOOL", "CLASS", "FRIENDS"] as Scope[]).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={`rounded-full px-3 py-1 text-[10px] font-bold transition ${scope === s ? "px-btn-royal" : "px-btn-ghost"}`}
          >
            {s === "GLOBAL" ? "Global" : s === "SCHOOL" ? "Sekolah" : s === "CLASS" ? "Kelas" : "Teman"}
          </button>
        ))}
      </div>

      {loading && !entries && (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="px-skeleton h-12 rounded-xl" />
          ))}
        </div>
      )}

      {error && <p className="text-xs text-rose-300">{error}</p>}

      {entries && entries.length === 0 && (
        <p className="py-6 text-center text-sm text-[var(--px-text-dim)]">Belum ada pemain di papan ini.</p>
      )}

      {podium.length > 0 && (
        <div className="mb-4 flex items-end justify-center gap-2">
          {/* Podium standar: juara 2 di kiri, juara 1 di TENGAH, juara 3 di kanan. */}
          {[1, 0, 2].map((idx, i) => {
            const e = podium[idx];
            if (!e) return null;
            const pos = idx + 1;
            const heights = [72, 96, 58]; // 2nd, 1st, 3rd
            return (
              <motion.div
                key={e.userId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex w-24 flex-col items-center"
              >
                <div className={`relative mb-1 flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${e.isMe ? "ring-2 ring-[var(--px-gold)]" : ""}`}>
                  {e.avatar ? <img src={e.avatar} alt={e.name} className="h-9 w-9 rounded-full object-cover" /> : <InitialAvatar name={e.name} size={36} />}
                  {e.playerRank && (
                    <span className="absolute -bottom-1 -right-1.5">
                      <RankIcon rank={e.playerRank} size={18} glow={pos === 1} />
                    </span>
                  )}
                </div>
                <p className="mb-1 w-full truncate text-center text-[10px] font-bold text-[var(--px-text)]">{e.name.split(" ")[0]}</p>
                {e.rankTitle && (
                  <p className="mb-1 w-full truncate text-center text-[8px] font-bold" style={{ color: e.rankColor }}>
                    {e.rankTitle}
                  </p>
                )}
                <div className={`flex w-full flex-col items-center rounded-t-xl pt-2 ${pos === 1 ? "px-podium-1" : pos === 2 ? "px-podium-2" : "px-podium-3"}`} style={{ height: heights[i] }}>
                  <span className="text-xl font-black leading-none">{pos}</span>
                  <span className="mt-1 text-[9px] font-bold opacity-80">{formatId(e.score)}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {visibleRest.length > 0 && (
        <div className="space-y-1.5">
          {visibleRest.map((e) => (
            <div key={e.userId} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${e.isMe ? "border border-[var(--px-gold)]/40 bg-[var(--px-gold)]/10" : "bg-white dark:bg-slate-800/90/[0.04]"}`}>
              <span className="w-6 text-center text-xs font-black text-[var(--px-text-faint)]">{e.rank}</span>
              {e.avatar ? (
                <img src={e.avatar} alt={e.name} className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <InitialAvatar name={e.name} size={28} />
              )}
              {e.playerRank && <RankIcon rank={e.playerRank} size={20} />}
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--px-text)]">
                {e.name}
                {e.isMe && <span className="ml-1.5 text-[10px] font-bold text-[var(--px-gold)]">Kamu</span>}
                <span className="ml-1.5 text-[10px] font-bold" style={{ color: e.rankColor }}>
                  Tkt {e.level}
                </span>
              </span>
              <span className="text-xs font-extrabold text-[var(--px-gold)]">{formatId(e.score)}</span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 rounded-lg px-3 py-2 text-[10px] leading-relaxed text-[var(--px-text-dim)]" style={{ background: "rgba(255,210,74,0.06)" }}>
        Papan Mingguan mulai dari nol setiap Senin 00.00 WIB, dan Musim baru setiap 4 minggu.
        Tenang — XP total, level, dan pangkatmu tidak pernah direset.
      </p>
    </GlassCard>
  );
}
