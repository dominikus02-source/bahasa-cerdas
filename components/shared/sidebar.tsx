"use client";

import { cn } from "@/lib/utils";
import { useUserStore } from "@/store";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Users,
  Gamepad2,
  GraduationCap,
  Trophy,
  Settings,
  CreditCard,
  ShoppingBag,
  Star,
  Crown,
  Video,
  BarChart3,
  Calendar,
  Award,
} from "lucide-react";

const guruNavItems = [
  { href: "/guru/beranda", label: "Beranda", icon: LayoutDashboard },
  { href: "/guru/bank-soal", label: "Bank Soal", icon: BookOpen },
  { href: "/guru/rpp-modul", label: "RPP & Modul", icon: FileText },
  { href: "/guru/kuis-game", label: "Kuis Game", icon: Gamepad2 },
  { href: "/guru/toko-karya", label: "Toko Karya", icon: ShoppingBag },
  { href: "/guru/data-siswa", label: "Data Siswa", icon: Users },
  { href: "/guru/video-belajar", label: "Video", icon: Video },
  { href: "/guru/competency", label: "Kompetensi", icon: Award, subItems: [
    { href: "/guru/ukbi", label: "UKBI", icon: FileText },
    { href: "/guru/tka-guru", label: "TKA Guru", icon: FileText },
    { href: "/guru/tka-utbk", label: "TKA UTBK", icon: FileText },
  ]},
  { href: "/guru/olimpiade", label: "Olimpiade", icon: Trophy, subItems: [
    { href: "/guru/olimpiade/info", label: "Info Lomba", icon: Calendar },
    { href: "/guru/olimpiade/kalender", label: "Kalender", icon: Calendar },
  ]},
  { href: "/guru/pengaturan", label: "Pengaturan", icon: Settings, subItems: [
    { href: "/guru/pengaturan/premium", label: "Upgrade Premium", icon: Crown },
    { href: "/guru/pengaturan/saldo", label: "Saldo", icon: CreditCard },
  ]},
];

const muridNavItems = [
  { href: "/murid/beranda", label: "Beranda", icon: LayoutDashboard },
  { href: "/murid/tugasku", label: "Tugasku", icon: BookOpen },
  { href: "/murid/kuis-game", label: "Kuis Game", icon: Gamepad2 },
  { href: "/murid/progresku", label: "Progres", icon: BarChart3 },
  { href: "/murid/competency", label: "Kompetensi", icon: GraduationCap, subItems: [
    { href: "/murid/ukbi", label: "Simulasi UKBI", icon: FileText },
    { href: "/murid/tka-guru", label: "TKA Guru", icon: FileText },
    { href: "/murid/tka-utbk", label: "TKA UTBK", icon: FileText },
  ]},
  { href: "/murid/olimpiade", label: "Olimpiade", icon: Trophy, subItems: [
    { href: "/murid/olimpiade/info", label: "Info Lomba", icon: Calendar },
    { href: "/murid/olimpiade/kalender", label: "Kalender", icon: Calendar },
  ]},
  { href: "/murid/pengaturan", label: "Pengaturan", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useUserStore();
  const navItems = user.role === "guru" ? guruNavItems : muridNavItems;

  const leagueColors = {
    BRONZE: "from-amber-600 to-amber-800",
    SILVER: "from-gray-300 to-gray-500",
    GOLD: "from-yellow-400 to-amber-500",
    DIAMOND: "from-cyan-400 to-blue-500",
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white/95 backdrop-blur-sm">
      <div className="flex h-full flex-col">
        <div className="border-b p-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold text-lg">
              BC
            </div>
            <div>
              <span className="font-bold text-gray-900">BahasaCerdas</span>
              {user.isFounder && (
                <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-2 py-0.5 text-[10px] font-bold text-black">
                  FOUNDER
                </span>
              )}
            </div>
          </Link>
        </div>

        {user.role === "murid" && (
          <div className="border-b p-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${leagueColors[user.league as keyof typeof leagueColors] || leagueColors.BRONZE} flex items-center justify-center`}>
                <Star className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold">{user.fullName || "Murid"}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="capitalize">{user.league?.toLowerCase()}</span>
                  <span>Lv.{user.level}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-blue-600">{user.xp.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">XP</p>
              </div>
            </div>
            {user.streak > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-orange-500">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-orange-500">🔥</span>
                {user.streak} day streak
              </div>
            )}
          </div>
        )}

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
                {item.subItems && (
                  <ul className="ml-8 mt-1 space-y-1">
                    {item.subItems.map((sub) => (
                      <li key={sub.href}>
                        <Link
                          href={sub.href}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors",
                            pathname === sub.href
                              ? "bg-blue-50 text-blue-700"
                              : "text-gray-500 hover:bg-gray-50"
                          )}
>
                          {sub.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {user.role === "guru" && !user.isPremium && !user.isFounder && (
          <div className="border-t p-4">
            <Link
              href="/guru/pengaturan/premium"
              className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-gold-400 to-gold-600 p-3 text-black shadow-lg"
            >
              <Crown className="h-5 w-5" />
              <div>
                <p className="text-xs font-bold">Upgrade ke PRO</p>
                <p className="text-[10px] opacity-80">Unlimited akses AI</p>
              </div>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}