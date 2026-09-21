import type { LucideIcon } from "lucide-react";
import { Home, User, Zap, PenLine, MessageCircle, Settings, Gem, Gamepad2 } from "lucide-react";

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
    icon: Home,
    match: (p) => p === "/murid/beranda",
  },
  {
    label: "Profil",
    href: "/murid/profile",
    icon: User,
    match: (p) => p === "/murid/profile" || p.startsWith("/murid/profile/"),
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
    match: (p) => p === "/murid/premium",
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