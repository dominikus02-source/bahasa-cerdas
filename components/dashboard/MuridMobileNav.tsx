"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { BackHome } from "@/components/shared/BackHome";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  Home, Menu as MenuIcon, X, Bell,
  GraduationCap, User, PenLine, MessageCircle, Settings, Shield, Zap,
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
  { href: "/murid/karya", label: "Karya", icon: PenLine },
  { href: "/murid/profile", label: "Profil", icon: User },
];

const DRAWER_ITEMS: { href: string; label: string; icon: any }[] = [
  { href: "/murid/beranda", label: "Beranda", icon: Home },
  { href: "/murid/profile", label: "Profil", icon: User },
  { href: "/arena", label: "Arena", icon: Zap },
  { href: "/murid/karya", label: "Karya", icon: PenLine },
  { href: "/arena/chat", label: "Obrolan", icon: MessageCircle },
  { href: "/murid/pengaturan", label: "Pengaturan", icon: Settings },
];

export default function MuridMobileNav({ fullName, role, isFounder }: { fullName: string; role: string; isFounder: boolean }) {
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
      {/* Bottom Nav */}
      <nav className="bc-mobile-nav md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-xl border-t border-gray-100/80 safe-area-bottom dark:bg-slate-900/90 dark:border-slate-800">
        <div className="flex items-center justify-around py-2">
          {PRIMARY.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors ${active ? "text-violet-600 dark:text-violet-300" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}>
                <Icon size={20} />
                <span className="text-[10px] font-semibold">{label}</span>
              </Link>
            );
          })}
          <Link href="/arena/notifikasi" className="relative flex flex-col items-center gap-0.5 py-1 px-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <div className="relative">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold">Notif</span>
          </Link>
          <button onClick={() => setMenuOpen(true)} className="flex flex-col items-center gap-0.5 py-1 px-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <MenuIcon size={20} />
            <span className="text-[10px] font-semibold">Menu</span>
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
                <span className="font-bold text-gray-900 dark:text-slate-100 truncate">{fullName}</span>
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