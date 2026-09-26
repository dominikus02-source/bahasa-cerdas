import type { LucideIcon } from "lucide-react";
import {
  Home,
  User,
  Zap,
  PenLine,
  MessageCircle,
  Settings,
  Gem,
  Gamepad2,
  ClipboardList,
  School,
  BookOpenCheck,
  Award,
  TrendingUp,
} from "lucide-react";

export interface ShellNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  match?: (pathname: string) => boolean;
}

export interface ShellNavGroup {
  title: string;
  items: ShellNavItem[];
}

/** IA Murid canonical: 4 tujuan utama + menu sekunder yang dikelompokkan. */
export const STUDENT_NAV: ShellNavItem[] = [
  {
    label: "Beranda",
    href: "/murid/beranda",
    icon: Home,
    match: (p) => p === "/murid/beranda",
  },
  {
    label: "Arena",
    href: "/arena",
    icon: Zap,
    match: (p) => p.startsWith("/arena") && !p.startsWith("/arena/chat"),
  },
  {
    label: "Main Bersama",
    href: "/main-bersama/join",
    icon: Gamepad2,
    match: (p) => p.startsWith("/main-bersama"),
  },
  {
    label: "Karya",
    href: "/murid/karya",
    icon: PenLine,
    match: (p) => p.startsWith("/murid/karya"),
  },
];

export const STUDENT_NAV_GROUPS: ShellNavGroup[] = [
  {
    title: "Belajar",
    items: [
      {
        label: "Kelas",
        href: "/murid/gabung-kelas",
        icon: School,
        match: (p) => p.startsWith("/murid/gabung-kelas") || p.startsWith("/murid/kelasku"),
      },
      {
        label: "Tugas",
        href: "/murid/tugasku",
        icon: ClipboardList,
        match: (p) => p.startsWith("/murid/tugasku"),
      },
      {
        label: "Progres",
        href: "/murid/progresku",
        icon: TrendingUp,
        match: (p) => p.startsWith("/murid/progresku"),
      },
    ],
  },
  {
    title: "Ujian & Hasil",
    items: [
      {
        label: "Simulasi UKBI",
        href: "/murid/simulasi/ukbi",
        icon: BookOpenCheck,
        match: (p) => p.startsWith("/murid/simulasi/ukbi"),
      },
      {
        label: "Simulasi TKA",
        href: "/murid/simulasi/tka",
        icon: BookOpenCheck,
        match: (p) => p.startsWith("/murid/simulasi/tka"),
      },
      {
        label: "BIGT",
        href: "/murid/bigt",
        icon: BookOpenCheck,
        match: (p) => p.startsWith("/murid/bigt"),
      },
      {
        label: "Sertifikat",
        href: "/murid/sertifikat",
        icon: Award,
        match: (p) => p.startsWith("/murid/sertifikat"),
      },
    ],
  },
  {
    title: "Akun",
    items: [
      {
        label: "Profil",
        href: "/murid/profile",
        icon: User,
        match: (p) => p === "/murid/profile" || p.startsWith("/murid/profile/"),
      },
      {
        label: "Obrolan",
        href: "/arena/chat",
        icon: MessageCircle,
        match: (p) => p.startsWith("/arena/chat"),
      },
      {
        label: "Premium",
        href: "/murid/premium",
        icon: Gem,
        match: (p) => p === "/murid/premium" || p.startsWith("/murid/premium/"),
      },
      {
        label: "Pengaturan",
        href: "/murid/pengaturan",
        icon: Settings,
        match: (p) => p === "/murid/pengaturan" || p.startsWith("/murid/pengaturan/"),
      },
    ],
  },
];

export function isNavActive(item: ShellNavItem, pathname: string): boolean {
  if (item.match) return item.match(pathname);
  return pathname === item.href || pathname.startsWith(item.href + "/");
}
