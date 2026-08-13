import type { LucideIcon } from "lucide-react";
import { House, UserRound, Zap, PenLine, MessageCircle, Settings } from "lucide-react";

export interface ShellNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  match?: (pathname: string) => boolean;
}

/** Canonical nav Murid/Arena/Obrolan — SATU sidebar untuk SEMUA produk student (Phase 3 & 4 UNIFIED SHELL). */
export const STUDENT_NAV: ShellNavItem[] = [
  {
    label: "Beranda",
    href: "/murid/beranda",
    icon: House,
    match: (p) => p === "/murid/beranda",
  },
  {
    label: "Profil",
    href: "/murid/profile",
    icon: UserRound,
    match: (p) => p === "/murid/profile" || p.startsWith("/murid/profile/"),
  },
  {
    label: "Arena",
    href: "/arena",
    icon: Zap,
    match: (p) => p.startsWith("/arena") && !p.startsWith("/arena/chat"),
  },
  {
    label: "Karya",
    href: "/murid/karya",
    icon: PenLine,
    match: (p) => p.startsWith("/murid/karya"),
  },
  {
    label: "Obrolan",
    href: "/arena/chat",
    icon: MessageCircle,
    match: (p) => p.startsWith("/arena/chat"),
  },
  {
    label: "Pengaturan",
    href: "/murid/pengaturan",
    icon: Settings,
    match: (p) => p === "/murid/pengaturan",
  },
];

export function isNavActive(item: ShellNavItem, pathname: string): boolean {
  if (item.match) return item.match(pathname);
  return pathname === item.href || pathname.startsWith(item.href + "/");
}