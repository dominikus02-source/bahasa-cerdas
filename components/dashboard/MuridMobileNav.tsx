"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { BackHome } from "@/components/shared/BackHome";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { VerifiedBadge } from "@/components/arena/UserName";
import {
  Home, Menu as MenuIcon, X, Bell,
  GraduationCap, User, PenLine, MessageCircle, Settings, Shield, Zap, Gem, Gamepad2,
} from "lucide-react";
import {
  NAV_ICON_CLASS,
  NAV_ICON_STROKE,
  NAV_ICON_ACTIVE,
  NAV_ICON_INACTIVE,
} from "@/components/shell/icon-tokens";
import { getRoleNavItems, type RoleNavItem } from "@/components/shell/navigation-context";

const PRIMARY = [
  { href: "/murid/beranda", label: "Beranda", icon: Home },
  { href: "/arena", label: "Arena", icon: Zap },
  { href: "/main-bersama/join", label: "Main Bersama", icon: Gamepad2 },
  { href: "/murid/karya", label: "Karya", icon: PenLine },
];

const DRAWER_ITEMS: { href: string; label: string; icon: any }[] = [
  { href: "/murid/beranda", label: "Beranda", icon: Home },
  { href: "/murid/profile", label: "Profil", icon: User },
  { href: "/arena", label: "Arena", icon: Zap },
  { href: "/main-bersama/join", label: "Main Bersama", icon: Gamepad2 },
  { href: "/murid/karya", label: "Karya", icon: PenLine },
  { href: "/arena/chat", label: "Obrolan", icon: MessageCircle },
  { href: "/murid/premium", label: "Premium", icon: Gem },
  { href: "/murid/pengaturan", label: "Pengaturan", icon: Settings },
];

export default function MuridMobileNav({ fullName, role, isFounder, isPremium }: { fullName: string; role: string; isFounder: boolean; isPremium?: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = () => {
      fetch("/api/notifikasi?unread=true")
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.unreadCount) setUnreadCount(d.unreadCount); })
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");
  const close = () => setMenuOpen(false);
  const roleItems = getRoleNavItems({ role, isFounder, pathname: pathname ?? "" });
  const roleGroups: { section: RoleNavItem["section"]; items: RoleNavItem[] }[] = [];
  for (const item of roleItems) {
    const group = roleGroups.find((g) => g.section === item.section);
    if (group) group.items.push(item);
    else roleGroups.push({ section: item.section, items: [item] });
  }

  return (
    <>
      {/* Bottom Nav — 6 kolom presisi. Main Bersama mendapat slot pusat
          yang tetap, bukan terdorong item lain atau label panjang. */}
      <nav className="bc-mobile-nav md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-100/80 bg-white/94 backdrop-blur-xl safe-area-bottom dark:bg-slate-900/94 dark:border-slate-800">
        <div className="grid grid-cols-6 items-end px-1.5 pt-1.5 pb-2">
          {PRIMARY.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            const mainTogether = label === "Main Bersama";
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={`relative min-w-0 min-h-[52px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all duration-150 ${mainTogether ? "-mt-3" : ""} ${active ? "text-violet-600 dark:text-violet-300" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
              >
                <span
                  className={`grid place-items-center shrink-0 transition-all duration-150 ${mainTogether ? "w-10 h-10 rounded-2xl border shadow-lg " + (active ? "bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white border-white/70 shadow-violet-500/25 dark:border-slate-800" : "bg-white text-violet-600 border-violet-100 shadow-slate-300/45 dark:bg-slate-800 dark:text-violet-300 dark:border-slate-700") : "w-7 h-7"}`}
                >
                  <Icon size={mainTogether ? 21 : 20} strokeWidth={mainTogether ? 2.35 : 2} />
                </span>
                {mainTogether ? (
                  <span className="text-[9px] leading-[0.95] font-extrabold text-center tracking-[-0.01em]">
                    Main<br />Bersama
                  </span>
                ) : (
                  <span className="text-[9.5px] leading-none font-semibold whitespace-nowrap">{label}</span>
                )}
                {active && !mainTogether ? (
                  <span className="absolute bottom-0 w-1 h-1 rounded-full bg-current" aria-hidden />
                ) : null}
              </Link>
            );
          })}

          <Link
            href="/arena/notifikasi"
            aria-label="Notifikasi"
            className={`relative min-w-0 min-h-[52px] flex flex-col items-center justify-center gap-1 rounded-xl transition-colors ${isActive("/arena/notifikasi") ? "text-violet-600 dark:text-violet-300" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
          >
            <div className="relative grid place-items-center w-7 h-7">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-0.5 bg-red-500 text-white text-[8.5px] leading-none font-bold rounded-full flex items-center justify-center shadow ring-2 ring-white dark:ring-slate-900">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[9.5px] leading-none font-semibold whitespace-nowrap">Notif</span>
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Buka menu"
            className="min-w-0 min-h-[52px] flex flex-col items-center justify-center gap-1 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <span className="grid place-items-center w-7 h-7">
              <MenuIcon size={20} />
            </span>
            <span className="text-[9.5px] leading-none font-semibold whitespace-nowrap">Menu</span>
          </button>
        </div>
      </nav>

      {/* Full Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-[24px] max-h-[85vh] overflow-y-auto shadow-2xl pb-20 dark:bg-slate-900">
            <div className="sticky top-0 bg-white z-10 flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-100 dark:bg-slate-900 dark:border-slate-800">
              <BackHome iconOnly className="shrink-0 -ml-1" />
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {fullName?.charAt(0)?.toUpperCase() || "M"}
                </div>
                <span className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-slate-100 truncate">{fullName}<VerifiedBadge isFounder={isFounder} isPremium={isPremium} size={14} /></span>
              </div>
              <ThemeToggle />
              <button onClick={close} className="p-2 hover:bg-gray-100 rounded-xl transition-colors dark:hover:bg-slate-800">
                <X size={20} className="text-gray-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="px-4 py-3 space-y-1">
              {DRAWER_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link key={href} href={href} onClick={close}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active ? "bg-violet-50 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200" : "text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon className={`${NAV_ICON_CLASS} ${active ? NAV_ICON_ACTIVE : NAV_ICON_INACTIVE}`} strokeWidth={NAV_ICON_STROKE} />
                    {label}
                  </Link>
                );
              })}
            </div>

            {roleGroups.map(({ section, items }) => (
              <div key={section} className="px-4 pt-2 mt-2 border-t border-gray-100 dark:border-slate-800">
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                  {section === "guru" ? "Mode Guru" : "Akses Founder"}
                </p>
                {items.map((item) => {
                  const Icon = item.id === "dashboard-guru" ? GraduationCap : Shield;
                  return (
                    <Link key={item.id} href={item.href} aria-label={item.ariaLabel} title={item.title} onClick={close}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800">
                      <Icon className={`${NAV_ICON_CLASS} ${NAV_ICON_INACTIVE}`} strokeWidth={NAV_ICON_STROKE} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}

            <div className="px-4 pt-3 pb-6 border-t border-gray-100 dark:border-slate-800">
              <LogoutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}