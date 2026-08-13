"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  Award,
  Bell,
  ChevronRight,
  Coins,
  History,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { usePlayerProfile } from "./player-context";
import LogoutButton from "@/components/arena/LogoutButton";
import { AktifkanNotifikasi } from "@/components/arena/AktifkanNotifikasi";
import { PlayerHeader } from "./player-header";
import { RankCard } from "./rank-card";
import { StreakCard } from "./streak-card";
import { DailyQuestCard } from "./daily-quest-card";
import { WeeklyChampionCard } from "./weekly-champion-card";
import { BadgeGrid } from "./badge-grid";
import { AchievementGrid } from "./achievement-grid";
import { LeaderboardPanel } from "./leaderboard-panel";
import { LearningFeedback } from "./learning-feedback";
import { NotificationCenter } from "./notification-center";
import { GlassCard, formatId, Skeleton } from "./ui";

/** Dashboard utama pemain BC Arena. */
export function PlayerDashboard({ name }: { name: string; avatar?: string | null }) {
  const profile = usePlayerProfile();

  if (!profile) {
    return (
      <div className="space-y-4 px-4 py-5">
        <div className="px-skeleton h-40 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-4 px-4 py-5">
      <PlayerHeader name={name} profile={profile} />

      {/* Quick stat chips */}
      <div className="grid grid-cols-3 gap-2">
        <StatChip icon={<Zap size={15} className="text-sky-300" />} label="XP" value={formatId(profile.totalXp)} />
        <StatChip icon={<Coins size={15} className="text-[var(--px-gold)]" />} label="Koin" value={formatId(profile.coin)} />
        <StatChip icon={<Trophy size={15} className="text-amber-300" />} label="Rank" value={profile.rankLabel} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <RankCard profile={profile} />
        <StreakCard streak={profile.streak} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <DailyQuestCard compact />
          <WeeklyChampionCard profile={profile} />
        </div>
        <div className="space-y-4">
          <GlassCard className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-extrabold text-[var(--px-text)]">
                <Award size={16} className="text-[var(--px-gold)]" />
                Lencana
              </h3>
              <Link href="/arena/player/badges" className="text-xs font-bold text-[var(--px-royal-2)] hover:underline">
                Lihat semua
              </Link>
            </div>
            <BadgeGrid limit={6} />
          </GlassCard>
          <GlassCard className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-extrabold text-[var(--px-text)]">
                <Target size={16} className="text-[var(--px-gold)]" />
                Pencapaian
              </h3>
              <Link href="/arena/player/achievements" className="text-xs font-bold text-[var(--px-royal-2)] hover:underline">
                Lihat semua
              </Link>
            </div>
            <AchievementGrid limit={4} />
          </GlassCard>
        </div>
      </div>

      <LearningFeedback profile={profile} />

      <LeaderboardPanel compact />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NotificationCenter compact />
        <GlassCard className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-extrabold text-[var(--px-text)]">
              <History size={16} className="text-[var(--px-gold)]" />
              Riwayat
            </h3>
            <Link href="/arena/player/history" className="flex items-center text-xs font-bold text-[var(--px-royal-2)] hover:underline">
              Lihat <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
 <Link href="/arena/player/history?tab=xp" className="flex items-center justify-between rounded-xl border border-[var(--px-border)] bg-white/[0.04] p-3 hover:bg-white/[0.08]">
              <span className="flex items-center gap-2 text-sm font-bold text-[var(--px-text)]">
                <Zap size={15} className="text-sky-300" /> Riwayat XP
              </span>
              <ChevronRight size={16} className="text-[var(--px-text-faint)]" />
            </Link>
 <Link href="/arena/player/history?tab=koin" className="flex items-center justify-between rounded-xl border border-[var(--px-border)] bg-white/[0.04] p-3 hover:bg-white/[0.08]">
              <span className="flex items-center gap-2 text-sm font-bold text-[var(--px-text)]">
                <Coins size={15} className="text-[var(--px-gold)]" /> Riwayat Koin
              </span>
              <ChevronRight size={16} className="text-[var(--px-text-faint)]" />
            </Link>
 <Link href="/arena/player/notifications" className="flex items-center justify-between rounded-xl border border-[var(--px-border)] bg-white/[0.04] p-3 hover:bg-white/[0.08]">
              <span className="flex items-center gap-2 text-sm font-bold text-[var(--px-text)]">
                <Bell size={15} className="text-amber-300" /> Notifikasi
              </span>
              <ChevronRight size={16} className="text-[var(--px-text-faint)]" />
            </Link>
 <Link href="/arena/player/leaderboard" className="flex items-center justify-between rounded-xl border border-[var(--px-border)] bg-white/[0.04] p-3 hover:bg-white/[0.08]">
              <span className="flex items-center gap-2 text-sm font-bold text-[var(--px-text)]">
                <Activity size={15} className="text-emerald-300" /> Papan Peringkat Penuh
              </span>
              <ChevronRight size={16} className="text-[var(--px-text-faint)]" />
            </Link>
            <AktifkanNotifikasi />
            {/* In the APK the top bar has no logout icon, so this row is the only
                way out. It lives here rather than in the header for the same
                reason Duolingo buries account actions in the profile: a phone
                shared with children should not put "sign out" next to the bell. */}
            <LogoutButton variant="row" />
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <GlassCard className="flex flex-col items-center gap-1 p-3">
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--px-text-faint)]">
        {icon} {label}
      </span>
      <span className="truncate text-base font-black text-[var(--px-text)]">{value}</span>
    </GlassCard>
  );
}
