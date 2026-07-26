"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import {
  Home, BarChart3, Menu as MenuIcon, X,
  GraduationCap, Coins, ClipboardCheck,
  FileText, Award, ExternalLink, Trophy, Calendar, User,
} from "lucide-react";

const PRIMARY = [
  { href: "/murid/beranda", label: "Beranda", icon: Home },
  { href: "/arena", label: "Arena", icon: GraduationCap },
  { href: "/murid/profile", label: "Profil", icon: User },
  { href: "/murid/progresku", label: "Kemajuan", icon: BarChart3 },
];

const GROUPS: { title: string; items: { href: string; label: string; icon: any }[] }[] = [
  {
    title: "Menu Utama",
    items: [
      { href: "/murid/beranda", label: "Beranda", icon: Home },
      { href: "/murid/profile", label: "Profil", icon: User },
      { href: "/arena", label: "Arena", icon: GraduationCap },
      { href: "/murid/toko-koin", label: "Toko Koin", icon: Coins },
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
    ],
  },
];

export default function MuridMobileNav({ fullName }: { fullName: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  return (
    <>
      {/* Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-xl border-t border-gray-100/80 safe-area-bottom">
        <div className="flex items-center justify-around py-2">
          {PRIMARY.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors ${active ? "text-violet-600" : "text-gray-500 hover:text-gray-700"}`}>
                <Icon size={20} />
                <span className="text-[10px] font-semibold">{label}</span>
              </Link>
            );
          })}
          <button onClick={() => setMenuOpen(true)} className="flex flex-col items-center gap-0.5 py-1 px-3 text-gray-500 hover:text-gray-700">
            <MenuIcon size={20} />
            <span className="text-[10px] font-semibold">Menu</span>
          </button>
        </div>
      </nav>

      {/* Full Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-[24px] max-h-[85vh] overflow-y-auto shadow-2xl pb-20">
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                  {fullName?.charAt(0)?.toUpperCase() || "M"}
                </div>
                <span className="font-bold text-gray-900">{fullName}</span>
              </div>
              <button onClick={() => setMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="px-4 py-3 space-y-5">
              {GROUPS.map(group => (
                <div key={group.title}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">{group.title}</p>
                  {group.items.map(({ href, label, icon: Icon }) => {
                    const active = isActive(href);
                    return (
                      <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          active ? "bg-violet-50 text-violet-700" : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <Icon size={18} className={active ? "text-violet-500" : "text-gray-400"} />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="px-4 pt-3 pb-6 border-t border-gray-100">
              <LogoutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
