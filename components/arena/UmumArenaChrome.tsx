"use client";

/**
 * UMUM ARENA CHROME — navigasi & gerbang rute untuk peran UMUM di /arena.
 *
 * UMUM (pengguna umum non-sekolah) memakai shell Arena yang sama, tetapi
 * hanya melihat tujuan di allowlist (lib/auth/roles.ts → isUmumArenaPath):
 * NARA, Gim solo, dan Jalur Cerdas (BIGT = tautan eksternal). Navigasi Murid (Beranda/
 * Belajar/Karya/Profil murid) TIDAK ditampilkan.
 *
 * UmumRouteGate melengkapi guard server di app/arena/layout.tsx: layout
 * tidak dirender ulang pada navigasi klien, jadi rute di luar allowlist
 * yang dibuka lewat <Link> dicegat di sini (konten tidak dirender, lalu
 * router.replace ke beranda UMUM — tujuan yang selalu diizinkan → tanpa loop).
 */

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Sparkles, Gamepad2, Route } from "lucide-react";
import { isUmumArenaPath, UMUM_HOME } from "@/lib/auth/roles";
import {
  NAV_ICON_CLASS,
  NAV_ICON_STROKE,
  NAV_ICON_ACTIVE,
  NAV_ICON_INACTIVE,
  NAV_LINK_BASE,
  NAV_LINK_ACTIVE,
  NAV_LINK_INACTIVE,
} from "@/components/shell/icon-tokens";

interface UmumNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Aktif bila pathname sama atau di bawah salah satu prefix ini. */
  prefixes: string[];
}

export const UMUM_NAV: UmumNavItem[] = [
  { label: "NARA", href: "/arena/ai", icon: Sparkles, prefixes: ["/arena/ai"] },
  { label: "Gim", href: "/arena/game", icon: Gamepad2, prefixes: ["/arena/game"] },
  { label: "Jalur Cerdas", href: "/arena/jalur-cerdas", icon: Route, prefixes: ["/arena/jalur-cerdas"] },
];

function isActive(item: UmumNavItem, pathname: string): boolean {
  return item.prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Sidebar web untuk UMUM (pengganti ShellNavList murid). */
export function UmumNavList() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Navigasi pengguna umum">
      <div className="space-y-1">
        {UMUM_NAV.map((item) => {
          const active = isActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              title={item.label}
              className={`${NAV_LINK_BASE} ${active ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE}`}
            >
              <Icon
                className={`${NAV_ICON_CLASS} ${active ? NAV_ICON_ACTIVE : NAV_ICON_INACTIVE}`}
                strokeWidth={NAV_ICON_STROKE}
              />
              <span className="shell-label font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Nav bawah mobile (web & APK) untuk UMUM — semua tujuan di dalam /arena. */
export function UmumMobileNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav
      className="bc-mobile-nav md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-bc-line bg-bc-surface/[.97] shadow-[0_-10px_28px_-18px_var(--clr-line-strong)] safe-area-bottom"
      aria-label="Navigasi utama pengguna umum"
    >
      <div className="grid grid-cols-3 items-end px-1.5 pt-1.5 pb-2">
        {UMUM_NAV.map((item) => {
          const active = isActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={`relative min-w-0 min-h-[52px] flex flex-col items-center justify-center gap-1 rounded-bc-sm transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bc-focus ${
                active ? "text-bc-violet" : "text-bc-text-3 hover:text-bc-text"
              }`}
            >
              <span className={`grid place-items-center shrink-0 w-12 h-7 rounded-full transition-colors duration-150 ${active ? "bg-bc-violet-soft" : ""}`}>
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className={`h-5 max-w-full px-0.5 flex items-center justify-center text-[10.5px] leading-[1.05] text-center ${active ? "font-bold" : "font-semibold"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Gerbang rute klien untuk UMUM. Rute di luar allowlist tidak dirender dan
 * diarahkan ke beranda UMUM.
 */
export function UmumRouteGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const allowed = isUmumArenaPath(pathname);

  useEffect(() => {
    if (!allowed) router.replace(UMUM_HOME);
  }, [allowed, router]);

  if (!allowed) return null;
  return <>{children}</>;
}
