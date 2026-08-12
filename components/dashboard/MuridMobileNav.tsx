"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { BackButton } from "@/components/shared/BackButton";
import {
  Home, Menu as MenuIcon, X, Bell,
  GraduationCap, User, PenLine, MessageCircle, Settings,
} from "lucide-react";

const PRIMARY = [
  { href: "/murid/beranda", label: "Beranda", icon: Home },
  { href: "/arena", label: "Arena", icon: GraduationCap },
  { href: "/murid/karya", label: "Karya", icon: PenLine },
  { href: "/murid/profile", label: "Profil", icon: User },
];

const DRAWER_ITEMS: { href: string; label: string; icon: any }[] = [
  { href: "/murid/beranda", label: "Beranda", icon: Home },
  { href: "/murid/profile", label: "Profil", icon: User },
  { href: "/arena", label: "Arena", icon: GraduationCap },
  { href: "/murid/karya", label: "Karya", icon: PenLine },
  { href: "/arena/chat", label: "Obrolan", icon: MessageCircle },
  { href: "/murid/pengaturan", label: "Pengaturan", icon: Settings },
];

export default function MuridMobileNav({ fullName }: { fullName: string }) {
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

  return (
    <>
      {/* Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-xl border-t border-gray-100/80 safe-area-bottom dark:bg-slate-900/90 dark:border-slate-800">
        <div className="flex items-center justify-around py-2">
          {PRIMARY.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors ${active ? "text-violet-600 dark:text-violet-300" : "text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"}`}>
                <Icon size={20} />
                <span className="text-[10px] font-semibold">{label}</span>
              </Link>
            );
          })}
          <Link href="/arena/notifikasi" className="relative flex flex-col items-center gap-0.5 py-1 px-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200">
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
          <button onClick={() => setMenuOpen(true)} className="flex flex-col items-center gap-0.5 py-1 px-3 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200">
            <MenuIcon size={20} />
            <span className="text-[10px] font-semibold">Menu</span>
          </button>
        </div>
      </nav>

      {/* Full Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-[24px] max-h-[85vh] overflow-y-auto shadow-2xl pb-20 dark:bg-slate-900">
            <div className="sticky top-0 bg-white z-10 flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-100 dark:bg-slate-900 dark:border-slate-800">
              <BackButton fallback="/murid/beranda" iconOnly className="shrink-0 -ml-1" />
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {fullName?.charAt(0)?.toUpperCase() || "M"}
                </div>
                <span className="font-bold text-gray-900 dark:text-slate-100 truncate">{fullName}</span>
              </div>
              <button onClick={() => setMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors dark:hover:bg-slate-800">
                <X size={20} className="text-gray-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="px-4 py-3 space-y-1">
              {DRAWER_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active ? "bg-violet-50 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200" : "text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon size={18} className={active ? "text-violet-500 dark:text-violet-300" : "text-gray-400 dark:text-slate-500"} />
                    {label}
                  </Link>
                );
              })}
            </div>

            <div className="px-4 pt-3 pb-6 border-t border-gray-100 dark:border-slate-800">
              <LogoutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
