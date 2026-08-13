"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Coins, Gift, Image as ImageIcon, Medal, Sparkles, Type, X } from "lucide-react";
import type { PlayerRank } from "@prisma/client";
import { RankIcon } from "@/components/gamification/RankIcon";
import { useRankSound } from "@/components/gamification/use-rank-sound";
import { usePlayer } from "@/components/arena/player/player-context";
import { Confetti } from "@/components/arena/player/confetti";
import { getRankReward } from "@/lib/gamification/rank-rewards";

/**
 * RankUpModal — modal fullscreen saat pemain naik Rank.
 * Glow warna rank, confetti, icon rank besar, dan reward yang muncul
 * satu per satu (rank baru → koin → badge → title → frame → mystery box).
 */
export function RankUpModal() {
  const { rankUp, dismissRankUp } = usePlayer();
  const { playRankUp, playClick } = useRankSound();
  const [revealed, setRevealed] = useState(0);

  const rank = (rankUp?.rankAfter ?? "BRONZE") as PlayerRank;

  const rewards = useMemo(() => {
    if (!rankUp) return [];
    const cfg = getRankReward(rank);
    const items: { icon: React.ReactNode; label: string; sub: string }[] = [
      { icon: <Medal size={16} />, label: `Lencana ${cfg.badgeName}`, sub: `Lencana ${rankUp.rankLabel}` },
    ];
    if (cfg.coin > 0) items.push({ icon: <Coins size={16} />, label: `${cfg.coin} Koin`, sub: "Hadiah koin naik pangkat" });
    items.push({ icon: <Type size={16} />, label: `Gelar "${cfg.title}"`, sub: "Gelar baru di profil" });
    items.push({ icon: <ImageIcon size={16} />, label: "Bingkai Avatar", sub: `Bingkai ${rankUp.rankLabel}` });
    if (cfg.mysteryBox) items.push({ icon: <Gift size={16} />, label: "Kotak Misteri", sub: `Bonus ${cfg.mysteryBoxCoins} Koin acak` });
    return items;
  }, [rankUp, rank]);

  // Reveal reward satu per satu + suara di mount.
  useEffect(() => {
    if (!rankUp) return;
    setRevealed(0);
    playRankUp();
    const timers = rewards.map((_, i) => setTimeout(() => setRevealed(i + 1), 500 + i * 350));
    return () => timers.forEach(clearTimeout);
  }, [rankUp, playRankUp, rewards]);

  if (!rankUp) return null;

  return (
    <AnimatePresence>
      {rankUp && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Glow fullscreen warna rank */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 40%, ${rankUp.rankColor}40 0%, transparent 60%)`,
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[#0b132b]/90 backdrop-blur-md" />

          <Confetti count={120} />

          <motion.div
            className="relative w-full max-w-sm rounded-3xl border border-[var(--px-gold)]/40 bg-[#0e1735]/95 p-8 text-center shadow-2xl"
            initial={{ scale: 0.7, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <button
              onClick={() => {
                playClick();
                dismissRankUp();
              }}
              className="absolute right-4 top-4 rounded-full bg-white/10 dark:bg-slate-900/10 p-1.5 text-[var(--px-text-dim)] hover:text-white"
              aria-label="Tutup"
            >
              <X size={16} />
            </button>

            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.15 }}
              className="mx-auto mb-3 w-fit"
            >
              <RankIcon rank={rankUp.rankAfter} size={140} glow />
            </motion.div>

            <p className="text-xs font-bold uppercase tracking-widest text-[var(--px-gold)]">Pangkat Baru!</p>
            <h2 className="mt-1 text-3xl font-black" style={{ color: rankUp.rankColor }}>
              {rankUp.rankLabel}
            </h2>
            <p className="mt-1 text-sm font-bold text-white">
              {rankUp.rankTitle}
              <span className="ml-2 text-xs font-semibold text-[var(--px-text-dim)]">
                dari {rankUp.rankLabelBefore}
              </span>
            </p>

            {/* Reward satu per satu */}
            <div className="mt-5 space-y-2 text-left">
              {rewards.map((r, i) => {
                const show = i < revealed;
                return (
                  <AnimatePresence key={r.label}>
                    {show && (
                      <motion.div
                        initial={{ opacity: 0, x: -24, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 320, damping: 20 }}
                        className="flex items-center gap-3 rounded-xl border border-[var(--px-gold)]/25 bg-[var(--px-gold)]/10 px-3 py-2"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--px-gold)]/20 text-[var(--px-gold)]">
                          {r.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-white">{r.label}</p>
                          <p className="text-[11px] font-semibold text-[var(--px-text-dim)]">{r.sub}</p>
                        </div>
                        <Sparkles size={14} className="ml-auto text-[var(--px-gold)]" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                );
              })}
            </div>

            <button
              onClick={() => {
                playClick();
                dismissRankUp();
              }}
              className="px-btn-gold mt-6 w-full py-3 text-sm"
            >
              Lanjut bertualang
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
