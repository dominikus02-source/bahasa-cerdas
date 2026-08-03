"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePlayer } from "./player-context";
import { BadgeIcon } from "@/components/gamification/BadgeIcon";

const TYPE_META = {
  XP: { label: "XP", icon: "⚡", tint: "border-sky-400/50 bg-sky-500/10 text-sky-300" },
  COIN: { label: "Koin", icon: "🪙", tint: "border-[var(--px-gold)]/50 bg-[var(--px-gold)]/10 text-[var(--px-gold)]" },
  BADGE: { label: "Lencana", icon: "🏅", tint: "border-amber-400/50 bg-amber-500/10 text-amber-300" },
  ACHIEVEMENT: { label: "Pencapaian", icon: "🏆", tint: "border-violet-400/50 bg-violet-500/10 text-violet-300" },
  LEVEL_UP: { label: "Level Up", icon: "🎉", tint: "border-emerald-400/50 bg-emerald-500/10 text-emerald-300" },
  RANK_UP: { label: "Rank Baru", icon: "🏆", tint: "border-[var(--px-gold)]/60 bg-[var(--px-gold)]/15 text-[var(--px-gold)]" },
} as const;

/** Popup reward berurutan (queue) — muncul di atas layar, auto-hilang. */
export function RewardPopupQueue() {
  const { popups, dequeuePopup } = usePlayer();
  const current = popups[0];

  return (
    <div className="pointer-events-none fixed left-1/2 top-16 z-[90] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2">
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.id}
            className="pointer-events-auto"
            initial={{ opacity: 0, y: -18, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
          >
            <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 backdrop-blur-md ${TYPE_META[current.type]?.tint ?? "bg-white/10"} bg-[#0e1735]/85`}>
              <BadgeIcon icon={current.icon ?? "🏅"} size={34} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-white">{current.title}</p>
                {current.body && <p className="truncate text-xs text-[var(--px-text-dim)]">{current.body}</p>}
              </div>
              <button
                className="pointer-events-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-[var(--px-text-dim)] hover:text-white"
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
