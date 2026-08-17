"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Award, Bell, ChevronRight, History, Trophy } from "lucide-react";
import { usePlayerProfile } from "./player-context";
import { PlayerHeader } from "./player-header";
import { GlassCard, Skeleton } from "./ui";

/**
 * PROFIL PEMAIN — ARENA 2.0.
 *
 * Satu halaman = satu pertanyaan: "Seberapa jauh perkembangan saya?"
 * Jawabannya ada di PlayerHeader (avatar, nama, rank, level, XP + progress
 * bar). Di bawahnya hanya NAVIGASI kompak menuju halaman lain — leaderboard,
 * badge, riwayat — plus tautan tersier Prestasi/Notifikasi. Semua statistik
 * detail, misi, liga, dan pencapaian tetap hidup di route masing-masing.
 */
export function PlayerDashboard({ name }: { name: string }) {
  const profile = usePlayerProfile();

  if (!profile) {
    return (
      <div className="space-y-4 px-4 py-5">
        <div className="px-skeleton h-44 rounded-2xl" />
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  const nav = [
    {
      href: "/arena/player/leaderboard",
      icon: Trophy,
      title: "Leaderboard",
      desc: "Posisimu dan teman-temanmu",
      tint: "text-amber-400",
    },
    {
      href: "/arena/player/badges",
      icon: Award,
      title: "Badge",
      desc: "Pencapaian dari perjalananmu",
      tint: "text-[var(--px-gold)]",
    },
    {
      href: "/arena/player/history",
      icon: History,
      title: "Riwayat",
      desc: "XP, koin, dan aktivitasmu",
      tint: "text-sky-300",
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-4 px-4 py-5">
      <PlayerHeader name={name} profile={profile} />

      <section aria-label="Navigasi profil" className="grid gap-3 md:grid-cols-3">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className="group min-w-0">
            <GlassCard pressable className="h-full p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--px-glass)]">
                  <n.icon size={20} className={n.tint} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-[var(--px-text)]">{n.title}</p>
                  <p className="truncate text-[11px] text-[var(--px-text-dim)]">{n.desc}</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-[var(--px-text-faint)] transition-transform group-hover:translate-x-0.5" />
              </div>
            </GlassCard>
          </Link>
        ))}
      </section>

      <div className="flex items-center justify-center gap-5 pt-1 text-xs font-semibold text-[var(--px-text-dim)]">
        <Link href="/arena/player/achievements" className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--px-text)]">
          <Award size={14} className="text-[var(--px-gold)]" /> Prestasi
        </Link>
        <Link href="/arena/player/notifications" className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--px-text)]">
          <Bell size={14} /> Notifikasi
        </Link>
      </div>
    </motion.div>
  );
}
