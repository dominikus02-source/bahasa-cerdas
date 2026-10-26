"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Bell, Compass, House, LayoutGrid, Library, UserRound } from "lucide-react";
import {
  NAV_ICON_CLASS,
  NAV_ICON_INACTIVE,
  NAV_ICON_STROKE,
  NAV_LINK_BASE,
  NAV_LINK_INACTIVE,
} from "@/components/shell/icon-tokens";

/** Aktif di dasbor UMUM = pil biru (aksen audiens umum, tokens.css §4). */
const UMUM_LINK_ACTIVE = "bg-bc-aud-soft text-bc-aud font-semibold";
const UMUM_ICON_ACTIVE = "text-bc-aud";

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Rute yang membuat item aktif (exact). Item anchor (#) tidak pernah aktif. */
  match?: string;
  mobile?: boolean;
}

/**
 * Navigasi dasbor UMUM — semua tujuan di dalam /umum (tanpa area guru/murid).
 * Mobile (bar bawah) = 4 item sesuai desain: Beranda · Semua Produk ·
 * Jelajahi · Akun. Notifikasi lewat lonceng header, Koleksi lewat menu akun.
 */
export const UMUM_DASHBOARD_NAV: NavItem[] = [
  { key: "beranda", label: "Beranda", href: "/umum", icon: House, match: "/umum", mobile: true },
  { key: "produk", label: "Semua Produk", href: "/umum#produk", icon: LayoutGrid, mobile: true },
  { key: "jelajahi", label: "Jelajahi", href: "/umum#gim", icon: Compass, mobile: true },
  { key: "koleksi", label: "Koleksi Saya", href: "/umum/koleksi", icon: Library, match: "/umum/koleksi" },
  { key: "notifikasi", label: "Notifikasi", href: "/umum/notifikasi", icon: Bell, match: "/umum/notifikasi" },
  { key: "akun", label: "Akun", href: "/umum/pengaturan", icon: UserRound, match: "/umum/pengaturan", mobile: true },
];

const MOBILE_SHORT: Record<string, string> = {};

function useActive() {
  const pathname = usePathname() ?? "";
  return (item: NavItem) => !!item.match && pathname === item.match;
}

function UnreadDot({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-bc-danger px-1.5 text-[11px] font-bold leading-5 text-bc-on-brand">
      {count > 99 ? "99+" : count}
      <span className="sr-only"> notifikasi belum dibaca</span>
    </span>
  );
}

export function UmumSidebarNav({ unread = 0 }: { unread?: number }) {
  const isActive = useActive();
  return (
    <nav aria-label="Navigasi dasbor umum" className="px-4 py-2">
      {UMUM_DASHBOARD_NAV.map((item) => {
        const active = isActive(item);
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`${NAV_LINK_BASE} !rounded-bc-ctl !py-3 ${active ? UMUM_LINK_ACTIVE : NAV_LINK_INACTIVE} focus-visible:outline focus-visible:outline-2 focus-visible:outline-bc-focus`}
          >
            <Icon className={`${NAV_ICON_CLASS} ${active ? UMUM_ICON_ACTIVE : NAV_ICON_INACTIVE}`} strokeWidth={NAV_ICON_STROKE} aria-hidden />
            <span className="font-medium">{item.label}</span>
            {item.key === "notifikasi" && <UnreadDot count={unread} />}
          </Link>
        );
      })}
    </nav>
  );
}

export function UmumMobileBottomNav({ unread = 0 }: { unread?: number }) {
  const isActive = useActive();
  const items = UMUM_DASHBOARD_NAV.filter((i) => i.mobile);
  return (
    <nav
      aria-label="Navigasi utama dasbor umum"
      className="bc-mobile-nav fixed inset-x-0 bottom-0 z-40 border-t border-bc-line bg-bc-surface/[.97] shadow-[0_-10px_28px_-18px_var(--clr-line-strong)] safe-area-bottom lg:hidden"
    >
      <div className="grid grid-cols-4 items-end px-1 pb-2 pt-1.5">
        {items.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          const label = MOBILE_SHORT[item.key] ?? item.label;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={item.key === "notifikasi" && unread > 0 ? `${item.label} (${unread} belum dibaca)` : item.label}
              className={`relative flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1 rounded-bc-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-bc-focus ${
                active ? "text-bc-aud" : "text-bc-text-3 hover:text-bc-text"
              }`}
            >
              <span className={`relative grid h-7 w-11 place-items-center rounded-full ${active ? "bg-bc-aud-soft" : ""}`}>
                <Icon size={20} strokeWidth={active ? 2.4 : 2} aria-hidden />
                {item.key === "notifikasi" && unread > 0 && (
                  <span aria-hidden className="absolute right-1.5 top-0.5 h-2 w-2 rounded-full bg-bc-danger" />
                )}
              </span>
              <span className={`max-w-full truncate px-0.5 text-[10.5px] leading-tight ${active ? "font-bold" : "font-semibold"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
