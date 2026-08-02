"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PartyPopper, X } from "lucide-react";
import { Confetti } from "./confetti";
import { usePlayer } from "./player-context";

/** Modal naik level — muncul global dari PlayerContext saat level bergeser. */
export function LevelUpModal() {
  const { levelUp, dismissLevelUp } = usePlayer();

  return (
    <AnimatePresence>
      {levelUp && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 px-levelup-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismissLevelUp}
        >
          <Confetti count={80} />

          <motion.div
            className="relative w-full max-w-sm rounded-3xl border border-[var(--px-gold)]/40 bg-[#0e1735]/90 p-8 text-center shadow-2xl"
            initial={{ scale: 0.7, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={dismissLevelUp}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5 text-[var(--px-text-dim)] hover:text-white"
              aria-label="Tutup"
            >
              <X size={16} />
            </button>

            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[var(--px-gold)] to-[var(--px-gold-2)] text-4xl shadow-lg">
              <PartyPopper className="text-[#231a06]" size={40} />
            </div>

            <p className="text-sm font-bold uppercase tracking-widest text-[var(--px-gold)]">Naik Level!</p>
            <h2 className="mt-1 text-4xl font-black px-gold-text">
              Level {levelUp.levelAfter}
            </h2>
            <p className="mt-2 text-sm font-semibold text-[var(--px-text-dim)]">
              Kamu naik dari level {levelUp.levelBefore} ke level {levelUp.levelAfter}!
            </p>

            <div className="mt-5 rounded-2xl bg-white/5 p-4">
              <p className="text-xs font-semibold text-[var(--px-text-faint)]">Pangkat sekarang</p>
              <p className="text-lg font-extrabold" style={{ color: levelUp.rankColor }}>
                {levelUp.rankLabel}
              </p>
            </div>

            <button onClick={dismissLevelUp} className="px-btn-gold mt-6 w-full py-3 text-sm">
              Lanjut belajar
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
