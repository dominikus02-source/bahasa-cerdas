"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Users, DollarSign, Menu as MenuIcon, X, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NAV } from "@/components/admin/AdminSidebar";
import type { LucideIcon } from "lucide-react";
import {
  NAV_ICON_CLASS,
  NAV_ICON_STROKE,
  NAV_ICON_ACTIVE,
  NAV_ICON_INACTIVE,
  NAV_LINK_BASE,
  NAV_LINK_ACTIVE,
  NAV_LINK_INACTIVE,
} from "@/components/shell/icon-tokens";

type AdminNavItem = { label: string; href: string; icon: LucideIcon } | { type: "divider" };

const isDivider = (item: AdminNavItem): item is { type: "divider" } => "type" in item && item.type === "divider";

/**
 * STEP 5.0 — MOBILE NAVIGATION CONSOLIDATION.
 * AdminMobileNav: bottom navigation mobile untuk Panel Admin (md:hidden).
 * Konsisten dengan student/guru mobile nav: bar tetap di bawah, safe-area
 * aware, ikon+label, active state jelas, primary <= 4 + Menu drawer berisi
 * daftar lengkap ADMIN nav (reuse NAV dari AdminSidebar — no duplicate config).
 */
const TABS = [
  { label: "Ringkasan", href: "/admin", icon: LayoutDashboard },
  { label: "Bank Soal", href: "/admin/bank-soal", icon: FileText },
  { label: "Pengguna", href: "/admin/users", icon: Users },
  { label: "Bayaran", href: "/admin/payments", icon: DollarSign },
];

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
              {(NAV as AdminNavItem[]).map((item, i) => {
                if (isDivider(item)) return <div key={i} className="h-px bg-slate-100 my-3 mx-3 dark:bg-slate-800" />;
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawer(false)}
                    aria-label={item.label}
                    title={item.label}
                    className={`${NAV_LINK_BASE} ${active ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE}`}
                  >
                    <Icon className={`${NAV_ICON_CLASS} ${active ? NAV_ICON_ACTIVE : NAV_ICON_INACTIVE}`} strokeWidth={NAV_ICON_STROKE} />
                    <span className="shell-label">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleLogout}
                className={`${NAV_LINK_BASE} ${NAV_LINK_INACTIVE} w-full`}
                aria-label="Keluar"
                title="Keluar"
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
