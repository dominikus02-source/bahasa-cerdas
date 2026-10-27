import Link from "next/link";
import type { ReactNode } from "react";
import { RankChip } from "@/components/gamification/RankChip";
import type { rankFromLevel } from "@/lib/gamification/ranks";
import AIFloatingButton from "@/components/shared/AIFloatingButton";
import { MuridBackBottom } from "@/components/dashboard/MuridBackBottom";
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

/**
 * Kerangka Student Shell (/murid/*): sidebar, header global, nav bawah.
 * Hanya tampilan — autentikasi & pengalihan tetap di
 * app/(dashboard)/murid/layout.tsx. Dipisah agar bisa dipratinjau dengan
 * data contoh (/pratinjau/shell, BC_UI_PREVIEW=1).
 */
export interface MuridShellUser {
  fullName?: string | null;
  avatar?: string | null;
  role: string;
  isFounder: boolean;
}

export function MuridShellFrame({
  user,
  rank,
  children,
}: {
  user: MuridShellUser;
  rank: ReturnType<typeof rankFromLevel>;
  children: ReactNode;
}) {
  return (
 <div className="bc-murid-dashboard flex min-h-screen ui-app-bg">
 <aside className="shell-aside w-64 h-screen bg-bc-surface border-r border-bc-line hidden md:flex md:flex-col fixed left-0 top-0 shadow-bc-1">
 <div className="p-5 bg-bc-murid">
          <Link href="/murid/beranda" className="flex items-center gap-3 min-w-0">
            <img src="/brand/bc2026-icon.png" alt="" className="h-12 w-12 shrink-0 object-contain drop-shadow-md" />
            <div className="min-w-0">
              <span className="shell-label font-extrabold text-bc-on-brand text-sm block truncate">BahasaCerdas</span>
              <p className="shell-label text-[11px] font-semibold text-bc-on-brand/80">Dasbor Murid</p>
            </div>
          </Link>
        </div>

 <div className="shell-user px-4 py-4 border-b border-bc-line bg-bc-tint">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="shell-label text-sm font-bold text-bc-text truncate">{user.fullName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <IconTarget size={16} className="text-bc-violet shrink-0" />
                <RankChip rank={rank} size={14} showTitle={false} compact />
              </div>
            </div>
          </div>
        </div>

        <ShellNavList />

        <RoleSections role={user.role} isFounder={user.isFounder} />

 <div className="p-3 border-t border-bc-line bg-bc-surface-2 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <LogoutButton />
          </div>
          <ShellSidebarToggle />
        </div>
      </aside>

      <div className="shell-main flex-1 min-w-0 md:ml-64 flex flex-col">
 <header className="shrink-0 sticky top-0 z-30 flex items-center justify-between gap-2 px-4 md:px-6 h-14 bg-bc-surface/95 border-b border-bc-line">
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
          <MuridBackBottom />
        </main>
      </div>

      <MuridMobileNav />
      <InstallBanner />
      <AIFloatingButton />
    </div>
  );
}
