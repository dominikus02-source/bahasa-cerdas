import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { Bell } from "lucide-react";
import { db } from "@/lib/db";
import { BRAND_ICON, BRAND_ICON_DARK } from "@/lib/brand";
import {
  UmumMobileBottomNav,
  UmumSidebarNav,
} from "@/components/umum/UmumDashboardNav";
import { UmumAvatar } from "@/components/umum/UmumAvatar";
import { UmumAccountMenu, UmumSearch } from "@/components/umum/UmumTopBar";

export { UmumAvatar };

export interface UmumShellUser {
  id: string;
  fullName: string;
  nickname?: string | null;
  avatar?: string | null;
}

function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/umum"
      className={`flex min-w-0 items-center gap-2.5 rounded-bc-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bc-focus ${className}`}
      aria-label="Beranda dasbor BahasaCerdas"
    >
      <Image
        src={BRAND_ICON_DARK}
        alt=""
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 object-contain dark:hidden"
      />
      <Image
        src={BRAND_ICON}
        alt=""
        width={40}
        height={40}
        className="hidden h-10 w-10 shrink-0 object-contain dark:inline"
      />
      <span className="min-w-0">
        <span className="block truncate text-[17px] font-extrabold leading-tight tracking-tight text-bc-text">
          BahasaCerdas
        </span>
        <span className="block truncate text-xs text-bc-text-3">
          Dunia Bahasa Indonesia
        </span>
      </span>
    </Link>
  );
}

/** Lonceng → /umum/notifikasi, titik merah hanya bila ada notifikasi belum dibaca (data nyata). */
function BellLink({ unread }: { unread: number }) {
  return (
    <Link
      href="/umum/notifikasi"
      aria-label={
        unread > 0 ? `Notifikasi (${unread} belum dibaca)` : "Notifikasi"
      }
      data-testid="umum-bell"
      className="relative grid h-11 w-11 place-items-center rounded-full text-bc-text-2 transition-colors hover:bg-bc-surface-2 hover:text-bc-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bc-focus"
    >
      <Bell size={22} aria-hidden />
      {unread > 0 && (
        <span
          aria-hidden
          className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-bc-danger px-1 text-[10px] font-bold leading-none text-bc-on-brand ring-2 ring-bc-surface"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

/** Kartu ajakan di bawah sidebar — menuju halaman /tentang (rute publik yang ada). */
function PromoCard() {
  return (
    <div className="relative overflow-hidden rounded-bc-card border border-bc-line bg-[image:var(--bc-umum-promo)] p-4">
      <p className="relative z-10 max-w-[10.5rem] text-sm font-extrabold leading-snug text-bc-text">
        Jadilah bagian dari masa depan Bahasa Indonesia
      </p>
      <p className="relative z-10 mt-2 max-w-[9.5rem] text-xs leading-relaxed text-bc-text-2">
        Dukung ekosistem BahasaCerdas untuk pendidikan, karya, dan inovasi.
      </p>
      <Link
        href="/tentang"
        className="relative z-10 mt-4 inline-flex h-9 items-center rounded-full bg-bc-navy px-4 text-xs font-bold text-bc-on-navy transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bc-focus"
      >
        Pelajari lebih lanjut
      </Link>
      <Image
        src="/images/umum/umum-promo.webp"
        alt=""
        width={150}
        height={318}
        sizes="64px"
        className="pointer-events-none absolute -bottom-3 right-1 h-[118px] w-auto opacity-95"
      />
    </div>
  );
}

/**
 * Kerangka dasbor UMUM (desain pendiri 2026-10-26): sidebar desktop (logo,
 * nav, kartu ajakan), bar atas (cari, lonceng, menu akun — bukan "Masuk"),
 * header ringkas + nav bawah di mobile. Panggil hanya dari halaman yang sudah
 * lolos requireUmumPage().
 */
export async function UmumShell({
  user,
  children,
  searchQuery = "",
}: {
  user: UmumShellUser;
  children: ReactNode;
  searchQuery?: string;
}) {
  const unread = await db.notifikasi
    .count({ where: { userId: user.id, isRead: false } })
    .catch(() => 0);
  const name = user.nickname || user.fullName;

  return (
    <div data-audience="umum" className="min-h-screen bg-bc-bg text-bc-text">
      <a
        href="#konten-umum"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-bc-sm focus:bg-bc-surface focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-bc-2"
      >
        Lewati ke konten
      </a>
      <div className="flex">
        <aside
          className="hidden w-64 shrink-0 border-r border-bc-line bg-bc-surface lg:block"
          aria-label="Menu dasbor"
        >
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="flex h-20 items-center px-6">
              <Logo />
            </div>
            <div className="flex-1 overflow-y-auto">
              <UmumSidebarNav unread={unread} />
            </div>
            <div className="p-4">
              <PromoCard />
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-bc-line bg-bc-surface/95 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:px-6 lg:h-20 lg:px-8">
              <Logo className="lg:hidden" />
              <div className="hidden max-w-md flex-1 md:block">
                <UmumSearch defaultValue={searchQuery} />
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
                <BellLink unread={unread} />
                <UmumAccountMenu
                  user={{
                    fullName: user.fullName,
                    nickname: user.nickname,
                    avatar: user.avatar,
                  }}
                />
              </div>
            </div>
          </header>
          <main
            id="konten-umum"
            aria-label={`Dasbor ${name}`}
            className="mx-auto max-w-[1240px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-6"
          >
            {children}
          </main>
        </div>
      </div>

      <UmumMobileBottomNav unread={unread} />
    </div>
  );
}
