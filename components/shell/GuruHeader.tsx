import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { NaraHeaderLink } from "@/components/shared/AIFloatingButton";
import { BrandMark } from "@/components/shared/BrandMark";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { FounderDashboardSwitcher } from "@/components/shared/FounderDashboardSwitcher";
import { RankChip } from "@/components/gamification/RankChip";
import type { rankFromLevel } from "@/lib/gamification/ranks";
import { VerifiedBadge } from "@/components/arena/UserName";
import UserAvatar from "@/components/arena/UserAvatar";

/**
 * Header Teacher Shell (/guru/*). Hanya tampilan: autentikasi & RBAC tetap di
 * app/(dashboard)/guru/layout.tsx. Dipisah agar bisa dirender di fixture QA
 * visual lokal (app/qa-fixture, hanya BC_QA_FIXTURE=1 di dev).
 */
export interface GuruHeaderUser {
  fullName?: string | null;
  avatar?: string | null;
  email?: string | null;
  isFounder: boolean;
  isPremium?: boolean;
  badgeKind?: Parameters<typeof VerifiedBadge>[0]["badgeKind"];
  level?: number | null;
}

export function GuruHeader({ user, rank }: { user: GuruHeaderUser; rank: ReturnType<typeof rankFromLevel> }) {
  return (
    <header className="shrink-0 sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-blue-100/80 bg-white/88 px-4 backdrop-blur-xl md:px-6 dark:border-blue-950/70 dark:bg-[color-mix(in_srgb,var(--bc-guru-header-night)_92%,transparent)]">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <BrandMark href="/guru/beranda" />
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-500/20">
            <GraduationCap className="h-4 w-4" strokeWidth={2} />
          </span>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Guru</span>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
        <FounderDashboardSwitcher user={user} compact />
        <Link
          href="/guru/profile"
          className={`group min-h-11 min-w-11 items-center gap-2 rounded-xl px-1 py-1 transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/50 ${user.isFounder ? "hidden lg:flex" : "flex"}`}
          aria-label="Buka profil guru"
        >
          <UserAvatar
            size={36}
            avatar={user.avatar}
            initials={user.fullName?.charAt(0).toUpperCase() || "G"}
            gradient="from-blue-600 to-sky-500"
            textClassName="text-sm"
            className="shrink-0 shadow-md"
          />
          <span className="hidden min-w-0 text-left lg:block">
            <span className="flex items-center gap-1.5">
              <span className="max-w-[190px] truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                {user.fullName}
              </span>
              <VerifiedBadge isFounder={user.isFounder} isPremium={user.isPremium} badgeKind={user.badgeKind} size={13} />
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
              <span>Guru</span>
              <span aria-hidden>•</span>
              <RankChip rank={rank} size={11} showTitle={false} compact />
              <span aria-hidden>•</span>
              <span>Tkt {user.level}</span>
            </span>
          </span>
        </Link>
        {user.isFounder ? (
          <div className="hidden lg:flex"><NaraHeaderLink /></div>
        ) : <NaraHeaderLink />}
        <NotificationBell allHref="/guru/notifikasi" />
        <ThemeToggle />
        {/* Keluar dipindah ke Profil & Pengaturan agar navbar tidak overlap. */}
      </div>
    </header>
  );
}
