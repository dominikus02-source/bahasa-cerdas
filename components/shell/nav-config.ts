import type { LucideIcon } from "lucide-react";
import { Home, BookOpen, Zap, PenLine, UserCircle } from "lucide-react";

export interface ShellNavItem { label: string; href: string; icon: LucideIcon; match?: (pathname: string) => boolean; }
export interface ShellNavGroup { title: string; items: ShellNavItem[]; }

/** IA Murid canonical: tepat 4 tujuan utama. Detail fitur hidup di hub masing-masing. */
export const STUDENT_NAV: ShellNavItem[] = [
  { label: "Beranda", href: "/murid/beranda", icon: Home, match: (p) => p === "/murid/beranda" },
  { label: "Belajar", href: "/murid/belajar", icon: BookOpen, match: (p) =>
      p.startsWith("/murid/belajar") || p.startsWith("/murid/gabung-kelas") || p.startsWith("/murid/kelasku") ||
      p.startsWith("/murid/progresku") || p.startsWith("/murid/simulasi") || p.startsWith("/murid/dokumen-latihan") ||
      p.startsWith("/murid/sertifikat") || p.startsWith("/arena/tugas") || p.startsWith("/murid/tugasku") },
  { label: "Arena", href: "/arena", icon: Zap, match: (p) => p.startsWith("/arena") && !p.startsWith("/arena/tugas") && !p.startsWith("/arena/chat") },
  { label: "Karya", href: "/murid/karya", icon: PenLine, match: (p) => p.startsWith("/murid/karya") },
  { label: "Profil", href: "/murid/profile", icon: UserCircle, match: (p) => p.startsWith("/murid/profile") },
];

/** Detail menu tidak lagi menjadi navigasi utama. Hub Belajar dan Arena menjadi pintunya. */
export const STUDENT_NAV_GROUPS: ShellNavGroup[] = [];

export function isNavActive(item: ShellNavItem, pathname: string): boolean {
  if (item.match) return item.match(pathname);
  return pathname === item.href || pathname.startsWith(item.href + "/");
}
