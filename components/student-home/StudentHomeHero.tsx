"use client";

import Link from "next/link";
import { Coins, Flame, Sparkles, Zap } from "lucide-react";
import { RankChip } from "@/components/gamification/RankChip";
import UserAvatar from "@/components/arena/UserAvatar";
import { nameColorStyle } from "@/lib/cosmetics";
import { XpProgressBar } from "@/components/arena/player/xp-progress-bar";
import { useHomeData } from "./home-data";

export function StudentHomeHero() {
  const { profile: data, me, profileFailed, refresh } = useHomeData();

  if (profileFailed) {
    return (
      <div className="px-1 py-5 text-center">
        <p className="text-sm text-[var(--px-text-dim)]">Gagal memuat profilmu.</p>
        <button
          type="button"
          onClick={refresh}
          className="mt-2 text-xs font-bold text-[var(--px-gold)] hover:underline"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-1 py-5 space-y-3">
        <div className="flex items-center gap-4">
          <div className="px-skeleton rounded-full" style={{ width: 56, height: 56 }} />
          <div className="flex-1 space-y-2">
            <div className="px-skeleton rounded-lg" style={{ width: "45%", height: 16 }} />
            <div className="px-skeleton rounded-lg" style={{ width: "60%", height: 10 }} />
          </div>
        </div>
        <div className="px-skeleton rounded-lg" style={{ width: "100%", height: 12 }} />
      </div>
    );
  }

  const profile = data.profile;

  const name = me?.displayName || me?.fullName || "Murid";
  const sub = me?.school || me?.city || "BahasaCerdas";

  return (
    <section aria-label="Profil saya" className="px-1 py-2 md:py-4">
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative shrink-0">
            <UserAvatar
              size={48}
              avatar={profile.avatar || me?.avatar || undefined}
              initials={name.charAt(0).toUpperCase()}
              className="ring-1 ring-[var(--px-gold)]/50"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[var(--px-navy)] flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-[var(--px-text)] truncate" style={nameColorStyle(me?.equippedNameColor, true)}>{name}</h1>
              <RankChip rank={profile.rank as never} size={18} showTitle={false} compact />
            </div>
            <p className="text-xs text-[var(--px-text-dim)] truncate">{sub}</p>
            <p className="text-xs text-[var(--px-text-faint)] mt-1">Halo! Siap belajar hari ini?</p>
          </div>
        </div>

        <div className="md:ml-auto shrink-0 flex flex-col gap-3 md:items-end">
          <div className="flex flex-wrap gap-2">
            <span className="px-chip gap-1.5" title="Rentetan harian">
              <Flame size={13} className="text-[var(--px-gold)]" />
              <span className="font-bold">{profile.streak}</span>
              <span className="text-[var(--px-text-faint)]">hari</span>
            </span>
            <span className="px-chip gap-1.5" title="Koin">
              <Coins size={13} className="text-[var(--px-gold)]" />
              <span className="font-bold">{profile.coin.toLocaleString("id-ID")}</span>
            </span>
            <span className="px-chip gap-1.5" title="XP minggu ini">
              <Zap size={13} className="text-[var(--px-royal-2)]" />
              <span className="font-bold">{profile.weeklyXp.toLocaleString("id-ID")}</span>
              <span className="text-[var(--px-text-faint)]">XP</span>
            </span>
          </div>
          <div className="w-full md:w-[320px]">
            <XpProgressBar profile={profile} compact />
          </div>
          <Link
            href="/murid/profile"
            className="text-[11px] font-bold text-[var(--px-gold)] hover:underline self-start md:self-end"
            aria-label="Lihat profil lengkap"
          >
            <Sparkles size={11} className="inline mr-1" />
            Lihat Profil →
          </Link>
        </div>
      </div>
    </section>
  );
}
