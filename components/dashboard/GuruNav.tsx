"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Sparkles, Store, Gamepad2, Users, BookOpen, ClipboardCheck,
  Bot, UserRound, CalendarDays, Shield, ChevronDown, Menu, X, LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavLink {
  label: string;
  href: string;
  sub?: { label: string; href: string }[];
}

interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  links: NavLink[];
  founderOnly?: boolean;
}

/**
 * Teacher Experience V3 — GIM GURU (Teacher Game Center).
 * Guru dan murid berbagi game engine yang sama, tetapi memiliki dashboard dan
 * perjalanan masing-masing. Submenu GIM memakai route /guru/game/* — tidak
 * pernah diarahkan ke /arena.
 */
export const GURU_NAV: NavGroup[] = [
  {
    id: "beranda",
    label: "Beranda",
    icon: Home,
    links: [{ label: "Beranda", href: "/guru/beranda" }],
  },
  {
    id: "panggung",
    label: "Panggung Literasi",
    icon: Sparkles,
    links: [{ label: "Panggung Literasi", href: "/guru/feed-karya" }],
  },
  {
    id: "toko",
    label: "Toko Karya",
    icon: Store,
    links: [
      { label: "Jual Karya", href: "/guru/toko-karya" },
      { label: "Jelajahi Karya", href: "/marketplace" },
      { label: "Pendapatan", href: "/guru/pengaturan/saldo" },
    ],
  },
  {
    id: "gim",
    label: "Gim",
    icon: Gamepad2,
    links: [
      { label: "Semua Permainan", href: "/guru/game" },
      { label: "Tantangan Harian", href: "/guru/game#solo" },
      { label: "Peringkat Guru", href: "/guru/game/leaderboard" },
      { label: "Lencana Guru", href: "/guru/game/achievement" },
    ],
  },
  {
    id: "kelasku",
    label: "Kelasku",
    icon: Users,
    links: [
      { label: "Dashboard Kelas", href: "/guru/kelasku" },
      { label: "Tugas", href: "/guru/tugas-murid" },
      { label: "Buku Nilai", href: "/guru/gradebook" },
      {
        label: "Penilaian",
        href: "/guru/penilaian",
        sub: [
          { label: "Input Massal", href: "/guru/penilaian/input-massal" },
          { label: "Nilai Kuis", href: "/guru/penilaian/kuis" },
          { label: "Rapor", href: "/guru/penilaian/rapor" },
        ],
      },
      { label: "Data Siswa", href: "/guru/data-siswa" },
      { label: "Pengumuman", href: "/guru/kelasku" },
    ],
  },
  {
    id: "alat-ajar",
    label: "Alat Ajar",
    icon: BookOpen,
    links: [
      { label: "Bank Soal", href: "/guru/bank-soal" },
      { label: "Materi Ajar", href: "/guru/materi-ajar" },
      { label: "Buku Ajar", href: "/guru/panduan-guru" },
      { label: "Video Pembelajaran", href: "/guru/video-belajar" },
      { label: "Kuis", href: "/guru/kuis" },
      { label: "Soal", href: "/guru/soal" },
      { label: "Artikel", href: "/guru/artikel" },
    ],
  },
  {
    id: "ujian",
    label: "Simulasi & Tes",
    icon: ClipboardCheck,
    links: [
      { label: "Simulasi UKBI", href: "/guru/simulasi/ukbi" },
      { label: "Simulasi TKA", href: "/guru/simulasi/tka" },
      { label: "BIGT", href: "/guru/bigt" },
      { label: "Hasil Simulasi", href: "/guru/hasil-simulasi" },
      { label: "Tinjau Simulasi", href: "/guru/tinjau-simulasi" },
      { label: "Dokumen Latihan Murid", href: "/guru/dokumen-latihan" },
    ],
  },
  {
    id: "ai",
    label: "Alat AI",
    icon: Bot,
    links: [{ label: "Alat AI", href: "/guru/ai-tools" }],
  },
  {
    id: "komunitas",
    label: "Komunitas",
    icon: Users,
    links: [{ label: "Komunitas", href: "/guru/komunitas" }],
  },
  {
    id: "kalender",
    label: "Kalender",
    icon: CalendarDays,
    links: [{ label: "Kalender Kegiatan", href: "/guru/olimpiade" }],
  },
  {
    id: "akun",
    label: "Akun Saya",
    icon: UserRound,
    links: [
      { label: "Ringkasan Akun", href: "/guru/akun" },
      { label: "Profil", href: "/guru/profile" },
      { label: "Berlangganan", href: "/guru/berlangganan" },
      { label: "Notifikasi", href: "/guru/notifikasi" },
      { label: "Pengaturan", href: "/guru/pengaturan" },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    icon: Shield,
    founderOnly: true,
    links: [{ label: "Panel Admin", href: "/admin" }],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/guru/beranda" && pathname === "/guru/beranda") return true;
  return pathname.startsWith(href);
}

function NavLinks({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const active = group.links.some((l) => isActive(pathname, l.href));

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`group flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-all duration-200 text-gray-600 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 hover:text-emerald-700 ${
          active && open ? "text-emerald-700" : ""
        }`}
      >
        <group.icon className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
        <span className="font-medium flex-1 text-left">{group.label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="ml-7 mb-2 flex flex-col gap-0.5 border-l border-emerald-100/70 pl-3">
          {group.links.map((link) => {
            const linkActive = isActive(pathname, link.href);
            return (
              <div key={link.href}>
                <Link
                  href={link.href}
                  onClick={onNavigate}
                  className={`block rounded-lg py-1.5 px-3 text-xs transition-all ${
                    linkActive
                      ? "bg-emerald-50 text-emerald-700 font-semibold"
                      : "text-gray-500 hover:text-emerald-600 hover:bg-emerald-50/50"
                  }`}
                >
                  {link.label}
                </Link>
                {link.sub && (
                  <div className="ml-3 flex flex-col gap-0.5 mt-0.5">
                    {link.sub.map((s) => (
                      <Link
                        key={s.href}
                        href={s.href}
                        onClick={onNavigate}
                        className="block rounded-lg py-1 px-3 text-[11px] text-gray-400 hover:text-emerald-600 hover:bg-emerald-50/50"
                      >
                        {s.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Daftar nav lengkap — dipakai sidebar desktop & drawer mobile. */
export function GuruNavList({
  isFounder,
  onNavigate,
}: {
  isFounder: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="py-4 px-3 flex-1 overflow-y-auto">
      {GURU_NAV.filter((g) => !g.founderOnly || isFounder).map((group) => (
        <NavLinks key={group.id} group={group} pathname={pathname} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

/** Bottom nav mobile guru (lg:hidden) + tombol menu drawer. */
export function GuruMobileNav({ isFounder }: { isFounder: boolean }) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  const tabs = [
    { label: "Beranda", href: "/guru/beranda", icon: Home },
    { label: "Panggung", href: "/guru/feed-karya", icon: Sparkles },
    { label: "Gim", href: "/guru/game", icon: Gamepad2 },
    { label: "Akun", href: "/guru/akun", icon: UserRound },
  ];

  return (
    <>
      <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                  active ? "text-emerald-600" : "text-gray-400"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium text-gray-400"
          >
            <Menu className="w-5 h-5" />
            Menu
          </button>
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-sm bg-white shadow-2xl flex flex-col">
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-emerald-600 to-green-600 flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-sm">Menu Guru</p>
                <p className="text-[10px] text-emerald-200">BahasaCerdas</p>
              </div>
              <button
                type="button"
                onClick={() => setDrawer(false)}
                className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <GuruNavList isFounder={isFounder} onNavigate={() => setDrawer(false)} />
            <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-2">
              <Link
                href="/guru/beranda"
                className="text-[10px] text-gray-400 font-medium"
              >
                v3 Teacher Center
              </Link>
              <Link
                href="/guru/ai-tools"
                className="text-[10px] text-emerald-600 font-semibold"
              >
                Buka Alat AI
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { LogOut };
