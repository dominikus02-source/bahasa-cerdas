import { getUser } from "@/lib/supabase/server";
import { levelFromXp } from "@/lib/gamification/levels"
import { rankFromLevel, RANK_META } from "@/lib/gamification/ranks"
import { RankChip } from "@/components/gamification/RankChip"
import { redirect } from "next/navigation";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import AIFloatingButton from "@/components/shared/AIFloatingButton";
import { BackButton } from "@/components/shared/BackButton";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { ShellSidebarToggle } from "@/components/dashboard/ShellSidebarToggle";
import { ThemeSegmented } from "@/components/theme/theme-segmented";
import MuridMobileNav from "@/components/dashboard/MuridMobileNav";
import { InstallBanner } from "@/components/InstallBanner";
import { IconTarget } from "@/lib/icons";
import UserAvatar from "@/components/arena/UserAvatar";

const MenuIcon = ({ path, label, href }: { path: string; label: string; href: string }) => (
  <Link href={href} className="shell-link group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-all duration-200 text-gray-600 hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50 hover:text-violet-700 dark:text-slate-300 dark:hover:from-slate-800 dark:hover:to-slate-800 dark:hover:text-white">
    <svg className="w-5 h-5 text-gray-400 group-hover:text-violet-500 transition-colors dark:text-slate-500 dark:group-hover:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span className="shell-label font-medium group-hover:text-violet-700 dark:group-hover:text-white">{label}</span>
  </Link>
);

export default async function MuridLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  // 4.2.1 — Guru boleh mengintip Student Shell sebagai mode pratinjau
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
        <div className="px-3 pt-3 pb-1 flex items-center justify-between">
          <BackButton fallback="/murid/beranda" />
        </div>

        <div className="p-5 pt-3 border-b border-gray-100/50 bg-gradient-to-r from-violet-600 to-purple-600">
          <div className="flex items-center justify-between gap-2">
            <Link href="/murid/beranda" className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-sm border border-white/20 shadow-lg shrink-0">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"/></svg>
              </div>
              <div className="min-w-0">
                <span className="shell-label font-bold text-white text-sm block truncate">BahasaCerdas</span>
                <p className="shell-label text-[10px] text-violet-200">Dasbor Murid</p>
              </div>
            </Link>
            <ShellSidebarToggle />
          </div>
        </div>

        <div className="shell-user px-4 py-4 border-b border-gray-100/50 bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:border-slate-800 dark:from-slate-800/60 dark:to-slate-800/40">
          <div className="flex items-center gap-3">
            {/* Sidebar ini dulu selalu menampilkan inisial — foto murid tidak
                pernah dirender sama sekali, bukan gagal dimuat. */}
            <UserAvatar
              size={48}
              avatar={user.avatar}
              initials={user.fullName?.charAt(0).toUpperCase() || "M"}
              gradient="from-violet-500 to-purple-600"
              textClassName="text-lg"
              className="shadow-lg shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="shell-label text-sm font-bold text-gray-900 truncate dark:text-slate-200">{user.fullName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <IconTarget size={16} className="text-violet-500 shrink-0" />
                <RankChip rank={rank} size={14} showTitle={false} compact />
              </div>
            </div>
            <NotificationBell />
          </div>
        </div>

        <nav className="py-4 px-3 flex-1 overflow-y-auto">
          <MenuIcon path="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" label="Beranda" href="/murid/beranda" />
          <MenuIcon path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" label="Profil" href="/murid/profile" />
          <MenuIcon path="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" label="Arena" href="/arena" />
          <MenuIcon path="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" label="Karya" href="/murid/karya" />
          <MenuIcon path="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" label="Obrolan" href="/arena/chat" />
          <div className="border-t border-gray-100/50 my-2 dark:border-slate-800" />
          <MenuIcon path="M12 15a3 3 0 100-6 3 3 0 000 6zm7.4-3a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" label="Pengaturan" href="/murid/pengaturan" />
        </nav>

        {user.role === "GURU" && !user.isFounder && (
          <div className="px-3 mb-2">
            <div className="h-px bg-gray-100 mx-3 mb-2 dark:bg-slate-800" />
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2 dark:text-slate-500">Mode Guru</div>
            <Link href="/guru/beranda" prefetch={false} className="shell-link group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-all duration-200 text-gray-600 hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50 hover:text-violet-700 dark:text-slate-300 dark:hover:from-slate-800 dark:hover:to-slate-800 dark:hover:text-white">
              <GraduationCap className="w-5 h-5 text-gray-400 group-hover:text-violet-500 transition-colors dark:text-slate-500 dark:group-hover:text-violet-400" />
              <span className="shell-label font-medium group-hover:text-violet-700 dark:group-hover:text-white">Dashboard Guru</span>
            </Link>
          </div>
        )}

        {user.isFounder && (
          <div className="px-3 mb-2">
            <div className="h-px bg-gray-100 mx-3 mb-2 dark:bg-slate-800" />
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2 dark:text-slate-500">Akses Founder</div>
            <Link href="/guru/beranda" prefetch={false} className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-all duration-200 text-gray-600 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:from-slate-800 dark:hover:to-slate-800 dark:hover:text-white">
              <svg className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition-colors dark:text-slate-500 dark:group-hover:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-medium group-hover:text-emerald-700 dark:group-hover:text-white">Dasbor Guru</span>
            </Link>
            <Link href="/admin" prefetch={false} className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-all duration-200 text-gray-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 hover:text-red-700 dark:text-slate-300 dark:hover:from-slate-800 dark:hover:to-slate-800 dark:hover:text-white">
              <svg className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors dark:text-slate-500 dark:group-hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-medium group-hover:text-red-700 dark:group-hover:text-white">Panel Admin</span>
            </Link>
          </div>
        )}

        <div className="p-3 border-t border-gray-100/50 bg-gray-50/50 dark:border-slate-800 dark:bg-slate-900/70 space-y-2">
          <ThemeSegmented />
          <LogoutButton />
        </div>
      </aside>

      <MuridMobileNav fullName={user.fullName} />
      <InstallBanner />

      <main className="shell-main flex-1 min-w-0 md:ml-64 p-4 md:p-8 pb-24 md:pb-8 bg-transparent">
        {children}
      </main>
      <AIFloatingButton />
    </div>
  );
}
