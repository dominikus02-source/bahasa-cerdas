import { getUser } from "@/lib/supabase/server";
import { levelFromXp } from "@/lib/gamification/levels"
import { rankFromLevel, RANK_META } from "@/lib/gamification/ranks"
import { RankChip } from "@/components/gamification/RankChip"
import { redirect } from "next/navigation";
import Link from "next/link";
import AIFloatingButton from "@/components/shared/AIFloatingButton";
import { BackHome } from "@/components/shared/BackHome";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { ShellSidebarToggle } from "@/components/dashboard/ShellSidebarToggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import MuridMobileNav from "@/components/dashboard/MuridMobileNav";
import { InstallBanner } from "@/components/InstallBanner";
import { IconTarget } from "@/lib/icons";
import UserAvatar from "@/components/arena/UserAvatar";
import { ShellNavList } from "@/components/shell/ShellNavList";
import { RoleSections } from "@/components/shell/RoleSections";

export default async function MuridLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  // 4.2.2 — Guru boleh mengintip Student Shell sebagai mode pratinjau
  // (role tetap GURU). Hanya selain Murid/Guru/Founder yang dipindahkan.
  if (user.role !== "MURID" && user.role !== "GURU" && !user.isFounder) {
    redirect("/guru/beranda");
  }

  if (user.role === "MURID" && !user.onboarded) {
    redirect("/onboarding");
  }

  // Rank resmi diturunkan dari XP — User.league sudah tidak ditulis lagi.
  const rank = rankFromLevel(levelFromXp(user.xp || 0))

  return (
 <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 dark:from-slate-950 dark:via-[#0b1220] dark:to-[#1e1b4b]">
 <aside className="shell-aside w-64 h-screen bg-white/80 backdrop-blur-xl border-r border-gray-100/50 hidden md:flex md:flex-col fixed left-0 top-0 shadow-xl shadow-gray-100/50 dark:bg-slate-900/80 dark:border-slate-800 dark:shadow-none">
 <div className="p-5 border-b border-gray-100 dark:border-slate-800/50 bg-gradient-to-r from-violet-600 to-purple-600">
          <Link href="/murid/beranda" className="flex items-center gap-3 min-w-0">
            <img src="/brand/bc2026-icon.png" alt="" className="h-12 w-12 shrink-0 object-contain drop-shadow-md" />
            <div className="min-w-0">
              <span className="shell-label font-bold text-white text-sm block truncate">BahasaCerdas</span>
              <p className="shell-label text-[10px] text-violet-200">Dasbor Murid</p>
            </div>
          </Link>
        </div>

 <div className="shell-user px-4 py-4 border-b border-gray-100/50 bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:border-slate-800 dark:from-slate-800/60 dark:to-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="shell-label text-sm font-bold text-gray-900 truncate dark:text-slate-200">{user.fullName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <IconTarget size={16} className="text-violet-500 dark:text-violet-400 shrink-0" />
                <RankChip rank={rank} size={14} showTitle={false} compact />
              </div>
            </div>
          </div>
        </div>

        <ShellNavList />

        <RoleSections role={user.role} isFounder={user.isFounder} />

 <div className="p-3 border-t border-gray-100/50 bg-gray-50/50 dark:border-slate-800 dark:bg-slate-900/70 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <LogoutButton />
          </div>
          <ShellSidebarToggle />
        </div>
      </aside>

      <div className="shell-main flex-1 min-w-0 md:ml-64 flex flex-col">
 <header className="shrink-0 sticky top-0 z-30 flex items-center justify-between gap-2 px-4 md:px-6 h-14 bg-white/80 backdrop-blur-xl border-b border-gray-100/50 dark:bg-slate-900/80 dark:border-slate-800">
          <BackHome />
          <div className="flex items-center gap-1 md:gap-2">
            <UserAvatar
              size={36}
              avatar={user.avatar}
              initials={user.fullName?.charAt(0).toUpperCase() || "M"}
              gradient="from-violet-500 to-purple-600"
              textClassName="text-sm"
              className="hidden md:flex shadow-md"
            />
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 bg-transparent">
          {children}
        </main>
      </div>

      <MuridMobileNav fullName={user.fullName} role={user.role} isFounder={user.isFounder} isPremium={user.isPremium} />
      <InstallBanner />
      <AIFloatingButton />
    </div>
  );
}