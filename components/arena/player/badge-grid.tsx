"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { BadgeIcon } from "@/components/gamification/BadgeIcon";
import { RARITY_META, type BadgeView } from "@/lib/gamification/client-types";

/** Grid badge — koleksi badge + status unlock. */
export function BadgeGrid({ limit }: { limit?: number }) {
  const [badges, setBadges] = useState<BadgeView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/player/badges", { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat badge");
      const data = await res.json();
      setBadges(data.badges);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!badges) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="px-skeleton h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  const unlocked = badges.filter((b) => b.unlocked);
  const visible = limit ? badges.slice(0, limit) : badges;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--px-text-dim)]">
          {unlocked.length}/{badges.length} lencana terbuka
        </p>
        {limit && badges.length > limit && (
          <p className="text-xs font-semibold text-[var(--px-text-faint)]">Lihat semua</p>
        )}
      </div>

      {error && <p className="mb-3 text-xs text-rose-300">{error}</p>}

      <div className="grid grid-cols-3 gap-3">
        {visible.map((b, i) => {
          const rarity = RARITY_META[b.rarity] ?? RARITY_META.GOLD;
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-[var(--px-border)] bg-white/[0.05] p-3 text-center"
              title={b.description}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${b.unlocked ? "" : "grayscale opacity-40"}`}
                style={{ boxShadow: b.unlocked ? `0 0 18px -2px ${rarity.color}66` : undefined }}
              >
                {b.unlocked ? <BadgeIcon icon={b.icon} size={44} alt={b.name} /> : <Lock size={18} />}
              </div>
              <p className="line-clamp-1 w-full text-[10px] font-bold leading-tight" style={{ color: b.unlocked ? rarity.color : undefined }}>
                {b.name}
              </p>
              <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--px-text-faint)]">
                {b.unlocked ? rarity.label : "Terkunci"}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
