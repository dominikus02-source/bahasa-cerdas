"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, FileText, Users, DollarSign, Menu as MenuIcon, X, LogOut,
  Target, Presentation, ShoppingBag, Film, Briefcase, MessageCircle,
  BarChart3, LineChart, TrendingUp, Trophy, Activity, Coins,
  Crown, Wallet, ShieldAlert, ShieldCheck, Database, Settings, Baby,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  NAV_ICON_CLASS, NAV_ICON_STROKE, NAV_ICON_ACTIVE, NAV_ICON_INACTIVE,
  NAV_LINK_BASE, NAV_LINK_ACTIVE, NAV_LINK_INACTIVE,
} from "@/components/shell/icon-tokens";

/**
 * Mobile bottom tabs — 4 quick-access items + Menu drawer.
 * Matches the new grouped sidebar structure.
 */
const TABS = [
  { label: "Tower", href: "/admin/executive", icon: Target },
  { label: "Konten", href: "/admin/bank-soal", icon: FileText },
  { label: "Pengguna", href: "/admin/users", icon: Users },
  { label: "Bayaran", href: "/admin/premium", icon: DollarSign },
];

/**
 * Full navigation for the drawer — mirrors AdminSidebar groups.
 * Grouped so mobile users can scan by category.
 */
interface FlatItem { label: string; href: string; icon: LucideIcon; group?: string; }

const ALL_ITEMS: FlatItem[] = [
  { label: "Control Tower", href: "/admin/executive", icon: Target },
  { label: "Pengguna", href: "/admin/users", icon: Users },
  // Konten
  { label: "Materi Ajar", href: "/admin/materi/generate-ppt", icon: Presentation, group: "Konten" },
  { label: "Bank Soal", href: "/admin/bank-soal", icon: FileText, group: "Konten" },
  { label: "Toko Karya", href: "/admin/karya", icon: ShoppingBag, group: "Konten" },
  { label: "Video", href: "/admin/video", icon: Film, group: "Konten" },
  { label: "Artikel", href: "/admin/artikel", icon: FileText, group: "Konten" },
  { label: "Lowongan", href: "/admin/loker", icon: Briefcase, group: "Konten" },
  { label: "Komunitas", href: "/admin/komunitas", icon: MessageCircle, group: "Konten" },
  // AI & Learning
  { label: "Analitik AI", href: "/admin/ai-analytics", icon: BarChart3, group: "AI & Learning" },
  { label: "Learning Analytics", href: "/admin/analytics", icon: LineChart, group: "AI & Learning" },
  { label: "Pemakaian Fitur", href: "/admin/feature-usage", icon: TrendingUp, group: "AI & Learning" },
  { label: "Arena BC", href: "/admin/arena", icon: Trophy, group: "AI & Learning" },
  { label: "Monitoring", href: "/admin/monitoring", icon: Activity, group: "AI & Learning" },
  { label: "Kuota AI", href: "/admin/ai-quota", icon: Coins, group: "AI & Learning" },
  // Pembayaran
  { label: "Premium Report", href: "/admin/premium", icon: Crown, group: "Pembayaran" },
  { label: "Pembayaran", href: "/admin/payments", icon: DollarSign, group: "Pembayaran" },
  { label: "Penarikan Saldo", href: "/admin/withdrawals", icon: Wallet, group: "Pembayaran" },
  { label: "Risiko Guru", href: "/admin/teacher-risk", icon: ShieldAlert, group: "Pembayaran" },
  { label: "Payout Kontrol", href: "/admin/teacher-payouts", icon: ShieldCheck, group: "Pembayaran" },
  // System
  { label: "Pusat Data", href: "/admin/data-center", icon: Database, group: "System" },
  { label: "Pengaturan", href: "/admin/pengaturan", icon: Settings, group: "System" },
  { label: "Arena Junior", href: "/junior", icon: Baby, group: "System" },
];

const GROUPS = ["Konten", "AI & Learning", "Pembayaran", "System"];

export default function AdminMobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const handleLogout = async () => {
    await createClient().auth.signOut();
    router.push("/login");
  };

  return (
    <>
      <div className="bc-mobile-nav fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] safe-area-bottom">
        <div className="grid grid-cols-5">
          {TABS.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                  active ? "text-violet-600 dark:text-violet-400" : "text-slate-500 dark:text-slate-400"
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
            className="flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium text-slate-500 dark:text-slate-400"
          >
            <MenuIcon className="w-5 h-5" />
            Menu
          </button>
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-sm bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-red-500 to-red-700 flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-sm">Menu Admin</p>
                <p className="text-[10px] text-red-100">BahasaCerdas</p>
              </div>
              <button
                type="button"
                onClick={() => setDrawer(false)}
                className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-2">
              {/* Standalone items */}
              {ALL_ITEMS.filter((item) => !item.group).map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawer(false)}
                    aria-label={item.label}
                    className={`${NAV_LINK_BASE} ${active ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE}`}
                  >
                    <item.icon className={`${NAV_ICON_CLASS} ${active ? NAV_ICON_ACTIVE : NAV_ICON_INACTIVE}`} strokeWidth={NAV_ICON_STROKE} />
                    <span className="shell-label">{item.label}</span>
                  </Link>
                );
              })}

              {/* Grouped items */}
              {GROUPS.map((groupName) => {
                const items = ALL_ITEMS.filter((item) => item.group === groupName);
                return (
                  <div key={groupName} className="mt-2">
                    <p className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{groupName}</p>
                    {items.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setDrawer(false)}
                          aria-label={item.label}
                          className={`${NAV_LINK_BASE} text-[13px] py-2 ${active ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE}`}
                        >
                          <item.icon className={`w-4 h-4 shrink-0 ${active ? NAV_ICON_ACTIVE : NAV_ICON_INACTIVE}`} strokeWidth={NAV_ICON_STROKE} />
                          <span className="shell-label">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </nav>
            <div className="p-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleLogout}
                className={`${NAV_LINK_BASE} ${NAV_LINK_INACTIVE} w-full`}
                aria-label="Keluar"
              >
                <LogOut className={`${NAV_ICON_CLASS} ${NAV_ICON_INACTIVE}`} strokeWidth={NAV_ICON_STROKE} />
                <span className="shell-label">Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
