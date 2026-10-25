import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { BRAND_ICON, BRAND_ICON_DARK } from "@/lib/brand";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { UmumMobileBottomNav, UmumSidebarNav } from "@/components/umum/UmumDashboardNav";

export interface UmumShellUser {
  id: string;
  fullName: string;
  nickname?: string | null;
  avatar?: string | null;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "BC";
}

/** Avatar akun: foto profil bila ada, selain itu inisial. Dekoratif (label di tautan). */
export function UmumAvatar({ user, size = 36 }: { user: UmumShellUser; size?: number }) {
  const name = user.nickname || user.fullName;
  if (user.avatar && /^https?:\/\//.test(user.avatar)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatar eksternal (Google/Supabase), ukuran kecil
      <img src={user.avatar} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} referrerPolicy="no-referrer" />
    );
  }
  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full bg-bc-violet-soft text-xs font-bold text-bc-violet" style={{ width: size, height: size }}>
      {initials(name)}
    </span>
  );
}

/**
 * Kerangka dasbor UMUM: header (logo, tema, avatar/Akun — bukan "Masuk"),
 * sidebar desktop, nav bawah mobile. Panggil hanya dari halaman yang sudah
 * lolos requireUmumPage().
 */
export async function UmumShell({ user, children }: { user: UmumShellUser; children: ReactNode }) {
  const unread = await db.notifikasi
    .count({ where: { userId: user.id, isRead: false } })
    .catch(() => 0);
  const name = user.nickname || user.fullName;

  return (
    <div className="min-h-screen bg-bc-bg text-bc-text">
      <a
        href="#konten-umum"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-bc-sm focus:bg-bc-surface focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-bc-2"
      >
        Lewati ke konten
      </a>
      <header className="sticky top-0 z-30 border-b border-bc-line bg-bc-bg/95">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            href="/umum"
            className="flex min-w-0 items-center gap-2.5 rounded-bc-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bc-focus"
            aria-label="Beranda dasbor BahasaCerdas"
          >
            <Image src={BRAND_ICON_DARK} alt="" width={36} height={36} className="h-9 w-9 object-contain dark:hidden" />
            <Image src={BRAND_ICON} alt="" width={36} height={36} className="hidden h-9 w-9 object-contain dark:inline" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold tracking-tight">BahasaCerdas</span>
              <span className="block truncate text-xs text-bc-text-3">Dasbor Umum</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Link
              href="/umum/pengaturan"
              aria-label={`Akun: ${name}`}
              className="flex h-10 items-center gap-2 rounded-full border border-bc-line bg-bc-surface py-1 pl-1 pr-1 transition-colors hover:bg-bc-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bc-focus sm:pr-3"
            >
              <UmumAvatar user={user} size={32} />
              <span className="hidden max-w-[10rem] truncate text-sm font-semibold sm:inline">Akun</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col border-r border-bc-line lg:flex" aria-label="Menu dasbor">
          <div className="flex-1 overflow-y-auto">
            <UmumSidebarNav unread={unread} />
          </div>
          <div className="border-t border-bc-line p-3">
            <LogoutButton />
          </div>
        </aside>
        <main id="konten-umum" className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          {children}
        </main>
      </div>

      <UmumMobileBottomNav unread={unread} />
    </div>
  );
}
