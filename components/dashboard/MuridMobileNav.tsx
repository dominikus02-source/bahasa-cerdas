"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import {
  Home, BookOpen, Gamepad2, BarChart3, Menu as MenuIcon, X,
  GraduationCap, PenSquare, Users, Coins, CalendarCheck, ClipboardCheck,
  FileText, Award, ExternalLink, Trophy, Calendar, User, Settings,
} from "lucide-react";

// Primary bottom-nav destinations (thumb-reachable). The 5th opens the full menu.
const PRIMARY = [
  { href: "/murid/beranda", label: "Beranda", icon: Home },
  { href: "/murid/tugasku", label: "Tugasku", icon: BookOpen },
  { href: "/murid/game", label: "Gim", icon: Gamepad2 },
  { href: "/murid/progresku", label: "Kemajuan", icon: BarChart3 },
];

// Full menu — mirrors the desktop sidebar so nothing is unreachable on mobile.
const GROUPS: { title: string; items: { href: string; label: string; icon: any }[] }[] = [
  {
    title: "Menu Utama",
    items: [
      { href: "/murid/beranda", label: "Beranda", icon: Home },
      { href: "/arena/jalur-cerdas", label: "Arena", icon: GraduationCap },
      { href: "/murid/karya/tulis", label: "Tulis Karya", icon: PenSquare },
      { href: "/murid/tugasku", label: "Tugasku", icon: BookOpen },
      { href: "/murid/gabung-kelas", label: "Gabung Kelas", icon: Users },
      { href: "/murid/game", label: "Gim", icon: Gamepad2 },
      { href: "/murid/toko-koin", label: "Toko Koin", icon: Coins },
      { href: "/murid/kuest-harian", label: "Quest Harian", icon: CalendarCheck },
    ],
  },
  {
    title: "Simulasi & Ujian",
    items: [
      { href: "/murid/simulasi/ukbi", label: "Simulasi UKBI", icon: ClipboardCheck },
      { href: "/murid/simulasi/tka", label: "Simulasi TKA", icon: FileText },
      { href: "/murid/dokumen-latihan", label: "Dokumen Hasil Latihan", icon: Award },
      { href: "/murid/bigt", label: "BIGT", icon: ExternalLink },
    ],
  },
  {
    title: "Event & Progress",
    items: [
      { href: "/murid/olimpiade/info", label: "Info Lomba", icon: Trophy },
      { href: "/murid/olimpiade/kalender", label: "Kalender", icon: Calendar },
      { href: "/murid/progresku", label: "Kemajuanku", icon: BarChart3 },
      { href: "/murid/profile", label: "Profil", icon: User },
      { href: "/murid/pengaturan", label: "Pengaturan", icon: Settings },
    ],
  },
];

export default function MuridMobileNav({ fullName }: { fullName?: string }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const isActive = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-white/95 backdrop-blur-xl border-b border-gray-100">
        <Link href="/murid/beranda" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">B</div>
          <span className="font-bold text-sm text-gray-900">Dasbor Murid</span>
        </Link>
        <NotificationBell />
      </div>

      {/* Bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-xl safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-1">
          {PRIMARY.map((item) => {
            const aktif = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${aktif ? "text-violet-600" : "text-gray-400"}`}>
                <item.icon className="w-5 h-5" />
                <span className={`text-[10px] ${aktif ? "font-bold" : "font-medium"}`}>{item.label}</span>
              </Link>
            );
          })}
          <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-gray-400">
            <MenuIcon className="w-5 h-5" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </nav>

      {/* Full-menu drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[82%] max-w-xs bg-white shadow-2xl flex flex-col animate-in slide-in-from-right">
            <div className="flex items-center justify-between px-5 h-14 bg-gradient-to-r from-violet-600 to-purple-600 text-white">
              <span className="font-bold text-sm truncate">{fullName || "Menu"}</span>
              <button onClick={() => setOpen(false)} aria-label="Tutup menu"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto py-3 px-2">
              {GROUPS.map((g) => (
                <div key={g.title} className="mb-3">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1">{g.title}</div>
                  {g.items.map((item) => {
                    const aktif = isActive(item.href);
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 ${aktif ? "bg-violet-50 text-violet-700 font-semibold" : "text-gray-600 hover:bg-gray-50"}`}>
                        <item.icon className="w-4 h-4 shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-100">
              <LogoutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
