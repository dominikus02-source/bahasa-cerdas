"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Confetti } from "./confetti";
import { usePlayer } from "./player-context";
import { RankIcon } from "@/components/gamification/RankIcon";
import { rankFromLevel, RANK_META } from "@/lib/gamification/ranks";

/**
 * Modal naik level — muncul global dari PlayerContext saat level bergeser.
 *
 * Catatan desain: kartunya SOLID, bukan semi-transparan. Versi sebelumnya
 * memakai bg-[#0e1735]/90 di atas latar radial terang, sehingga teks emas
 * bertemu latar yang ikut menyala dan kontrasnya jatuh — di layar murid
 * tulisannya nyaris tidak terbaca.
 */
export function LevelUpModal() {
  const { levelUp, dismissLevelUp } = usePlayer();

  // Rank diturunkan dari level (fungsi murni) supaya ikon resminya bisa tampil
  // tanpa menambah field di LevelUpEvent.
  const rank = levelUp ? rankFromLevel(levelUp.levelAfter) : "BRONZE";
  const meta = RANK_META[rank];
  const naik = levelUp ? levelUp.levelAfter - levelUp.levelBefore : 0;

  return (
    <AnimatePresence>
      {levelUp && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-5 px-levelup-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismissLevelUp}
        >
          <Confetti count={90} />

          <motion.div
            className="relative w-full max-w-sm overflow-hidden rounded-[28px] p-[2px] shadow-[0_24px_70px_-12px_rgba(0,0,0,0.85)]"
            style={{ background: `linear-gradient(150deg, ${meta.color}, #ffd24a 45%, ${meta.color})` }}
            initial={{ scale: 0.75, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Kartu solid — tanpa transparansi, supaya teks selalu terbaca. */}
            <div className="relative rounded-[26px] bg-[#0b1330] px-7 pb-7 pt-8 text-center">
              {/* Cahaya lembut di belakang Zelby, tidak menyentuh area teks. */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-44"
                style={{ background: `radial-gradient(180px 120px at 50% 30%, ${meta.color}33, transparent 70%)` }}
              />

              <button
                onClick={dismissLevelUp}
                className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-1.5 text-white/70 transition hover:bg-white/20 hover:text-white"
                aria-label="Tutup"
              >
                <X size={16} />
              </button>

              <motion.div
                className="relative mx-auto mb-1 h-32 w-32"
                initial={{ scale: 0.5, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 12, delay: 0.1 }}
              >
                <Image
                  src="/arena-junior/karakter/zelby_celebrate.webp"
                  alt=""
                  width={512}
                  height={512}
                  className="h-full w-full object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.5)]"
                  priority
                />
              </motion.div>

              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#ffd24a]">
                Naik Level
              </p>

              <h2 className="mt-1 text-5xl font-black leading-none text-white drop-shadow-[0_2px_10px_rgba(255,210,74,0.35)]">
                {levelUp.levelAfter}
              </h2>

              <p className="mt-2 text-sm font-semibold text-white/75">
                {naik > 1 ? (
                  <>
                    Melompat <span className="font-black text-[#ffd24a]">{naik} level</span> sekaligus!
                  </>
                ) : (
                  <>
                    Dari level {levelUp.levelBefore} ke{" "}
                    <span className="font-black text-[#ffd24a]">{levelUp.levelAfter}</span>
                  </>
                )}
              </p>

              {/* Pangkat — ikon rank resmi, bukan sekadar teks. */}
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3 text-left">
                <RankIcon rank={rank} size={44} glow />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                    Pangkat sekarang
                  </p>
                  <p className="truncate text-base font-black" style={{ color: meta.color }}>
                    {meta.label}
                    <span className="ml-1.5 text-xs font-bold text-white/60">{meta.title}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={dismissLevelUp}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#ffd24a] to-[#f5a623] py-3.5 text-sm font-black text-[#2a1d00] shadow-lg transition hover:brightness-110 active:scale-[0.98]"
              >
                Lanjut belajar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
