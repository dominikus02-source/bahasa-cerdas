"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  ShoppingBag, Film, FileText, Users, LogOut, Settings,
  ChevronRight, BarChart3, Briefcase, MessageCircle, Presentation,
  Bell, BellRing, X, Coins, DollarSign, Database, Activity, Wallet,
  TrendingUp, Trophy, LineChart, ShieldAlert, ShieldCheck,
  Crown, Target, ChevronDown, Beaker,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  NAV_ICON_CLASS, NAV_ICON_STROKE, NAV_ICON_ACTIVE, NAV_ICON_INACTIVE,
  NAV_LINK_BASE, NAV_LINK_ACTIVE, NAV_LINK_INACTIVE, ACTION_ICON_CLASS,
} from "@/components/shell/icon-tokens";

/* ── Navigation data model ────────────────────────────────────────── */

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

type NavEntry = NavItem | NavGroup | { type: "divider" };

function isGroup(e: NavEntry): e is NavGroup {
  return "items" in e;
}

function isItem(e: NavEntry): e is NavItem {
  return "href" in e && !isGroup(e);
}

/**
 * PRIMARY NAVIGATION — 7 top-level areas.
 *
 * Hierarchy communicates: Founder → Business → Product → Operations.
 * Every existing route is preserved; only the sidebar layout changes.
 *
 * 1. Control Tower      — standalone, founder intelligence
 * 2. Pengguna            — standalone, user management
 * 3. Premium & Revenue   — business/financial intelligence
 * 4. Content             — content management (group)
 * 5. Learning & Analytics — product learning analytics (group)
 * 6. AI & Platform       — AI usage diagnostics (group)
 * 7. System & Operations — low-frequency operational tools (group)
 */
const NAV: NavEntry[] = [
  // ── 1. Founder intelligence ──
  { label: "Control Tower", href: "/admin/executive", icon: Target },
  { label: "Founder Lab", href: "/admin/lab", icon: Beaker },

  // ── 2. User management ──
  { label: "Pengguna", href: "/admin/users", icon: Users },

  // ── 3. Business / financial intelligence ──
  {
    label: "Premium & Revenue",
    icon: Crown,
    items: [
      { label: "Premium Report", href: "/admin/premium", icon: Crown },
      { label: "Pembayaran", href: "/admin/payments", icon: DollarSign },
      { label: "Payout Kontrol", href: "/admin/teacher-payouts", icon: ShieldCheck },
      { label: "Penarikan Saldo", href: "/admin/withdrawals", icon: Wallet },
      { label: "Risiko Guru", href: "/admin/teacher-risk", icon: ShieldAlert },
    ],
  },

  // ── 4. Content management ──
  {
    label: "Content",
    icon: Presentation,
    items: [
      { label: "Materi Ajar", href: "/admin/materi/generate-ppt", icon: Presentation },
      { label: "Bank Soal", href: "/admin/bank-soal", icon: FileText },
      { label: "Toko Karya", href: "/admin/karya", icon: ShoppingBag },
      { label: "Video", href: "/admin/video", icon: Film },
      { label: "Artikel", href: "/admin/artikel", icon: FileText },
    ],
  },

  // ── 5. Product learning analytics ──
  {
    label: "Learning & Analytics",
    icon: LineChart,
    items: [
      { label: "Learning Analytics", href: "/admin/analytics", icon: LineChart },
      { label: "Arena BC", href: "/admin/arena", icon: Trophy },
    ],
  },

  // ── 6. AI usage diagnostics ──
  {
    label: "AI & Platform",
    icon: BarChart3,
    items: [
      { label: "Analitik AI", href: "/admin/ai-analytics", icon: BarChart3 },
      { label: "Pemakaian Fitur", href: "/admin/feature-usage", icon: TrendingUp },
      { label: "Kuota AI", href: "/admin/ai-quota", icon: Coins },
    ],
  },

  // ── 7. Low-frequency operational tools ──
  {
    label: "System & Operations",
    icon: Database,
    items: [
      { label: "Monitoring", href: "/admin/monitoring", icon: Activity },
      { label: "Komunitas", href: "/admin/komunitas", icon: MessageCircle },
      { label: "Lowongan", href: "/admin/loker", icon: Briefcase },
      { label: "Pusat Data", href: "/admin/data-center", icon: Database },
      { label: "Pengaturan", href: "/admin/pengaturan", icon: Settings },
    ],
  },

  { type: "divider" },
  { label: "Dasbor Guru", href: "/guru/beranda", icon: ChevronRight },
  { label: "Dasbor Murid", href: "/murid/beranda", icon: ChevronRight },
];

/* ── Helper: does this group contain the active route? ──────────── */

function groupHasActiveItem(group: NavGroup, pathname: string): boolean {
  return group.items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );
}

/* ── Component ──────────────────────────────────────────────────── */

interface Props {
  user: { fullName: string; avatar?: string | null; id?: string };
}

export function AdminSidebar({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);

  // Track which groups are expanded. Initialize with the group containing
  // the current route so the user always sees their location.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const entry of NAV) {
      if (isGroup(entry) && groupHasActiveItem(entry, pathname)) {
        initial[entry.label] = true;
      }
    }
    return initial;
  });

  // Re-sync when pathname changes (e.g. after navigation).
  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const entry of NAV) {
        if (isGroup(entry) && groupHasActiveItem(entry, pathname) && !next[entry.label]) {
          next[entry.label] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [pathname]);

  const toggleGroup = useCallback((label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }, []);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications?unread=true");
      const data = await res.json();
      setNotifs(data.notifications || []);
      setUnread(data.unreadCount || 0);
    } catch {}
  }, []);

  // 3 min poll, pauses when tab hidden.
  useEffect(() => {
    fetchNotifs();
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchNotifs();
    }, 180000);
    return () => clearInterval(t);
  }, [fetchNotifs]);

  const markRead = async (id: string) => {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchNotifs();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-0 flex-1 flex flex-col bg-white dark:bg-slate-900/80">
      {/* ── Brand ── */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800">
        <Link href="/admin/executive" className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-bold text-sm shrink-0">BC</div>
          <div className="min-w-0">
            <p className="shell-label font-bold text-slate-900 text-sm truncate dark:text-white">Panel Admin</p>
            <p className="shell-label text-[10px] text-slate-400">Founder</p>
          </div>
        </Link>
      </div>

      {/* ── User + Notifications ── */}
      <div className="shell-user px-4 py-3 border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user.fullName.slice(0, 2).toUpperCase()}
            </div>
            <p className="shell-label text-sm font-semibold text-slate-900 truncate dark:text-slate-100">{user.fullName}</p>
          </div>
          <div className="relative">
            <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2 rounded-lg hover:bg-slate-200 transition-colors dark:hover:bg-slate-700" aria-label={unread > 0 ? `Notifikasi (${unread} belum dibaca)` : "Notifikasi"}>
              {unread > 0 ? <BellRing className={`${ACTION_ICON_CLASS} text-amber-500 dark:text-amber-400`} /> : <Bell className={`${ACTION_ICON_CLASS} text-slate-400`} />}
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>

            {showNotifs && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                <div className="absolute left-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-slate-200 shadow-xl z-50 max-h-96 overflow-y-auto dark:bg-slate-900 dark:border-slate-700">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifikasi</span>
                    {unread > 0 && (
                      <button onClick={() => markRead("all")} className="text-[10px] text-violet-600 dark:text-violet-400 hover:text-violet-800 font-medium">
                        Tandai semua dibaca
                      </button>
                    )}
                  </div>
                  {notifs.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">Tidak ada notifikasi</div>
                  ) : (
                    notifs.map((n) => (
                      <div key={n.id} className="px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 dark:hover:bg-slate-800/60 dark:border-slate-800/60">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{n.title}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{n.body}</p>
                            <p className="text-[9px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                          {!n.isRead && (
                            <button onClick={() => markRead(n.id)} className="shrink-0 p-1 rounded hover:bg-slate-200">
                              <X size={10} className="text-slate-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV.map((entry, i) => {
          // Divider
          if ("type" in entry && entry.type === "divider") {
            return <div key={i} className="h-px bg-slate-100 my-3 mx-3 dark:bg-slate-800" />;
          }

          // Standalone item (Control Tower, Pengguna, Guru/Murid links)
          if (isItem(entry)) {
            const Icon = entry.icon;
            const isActive = pathname === entry.href;
            return (
              <Link key={entry.href} href={entry.href} aria-label={entry.label} title={entry.label}
                className={`${NAV_LINK_BASE} ${isActive ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE}`}>
                <Icon className={`${NAV_ICON_CLASS} ${isActive ? NAV_ICON_ACTIVE : NAV_ICON_INACTIVE}`} strokeWidth={NAV_ICON_STROKE} />
                <span className="shell-label">{entry.label}</span>
              </Link>
            );
          }

          // Group (collapsible)
          if (isGroup(entry)) {
            const isOpen = openGroups[entry.label] ?? false;
            const hasActive = groupHasActiveItem(entry, pathname);
            const Icon = entry.icon;
            const GroupIcon = ChevronDown;

            return (
              <div key={entry.label} className="mb-1">
                {/* Group header button */}
                <button
                  onClick={() => toggleGroup(entry.label)}
                  className={`${NAV_LINK_BASE} w-full ${hasActive ? "text-violet-700 dark:text-violet-300" : NAV_LINK_INACTIVE}`}
                  aria-expanded={isOpen}
                >
                  <Icon className={`${NAV_ICON_CLASS} ${hasActive ? NAV_ICON_ACTIVE : NAV_ICON_INACTIVE}`} strokeWidth={NAV_ICON_STROKE} />
                  <span className="shell-label flex-1 text-left">{entry.label}</span>
                  <GroupIcon
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-0" : "-rotate-90"} ${hasActive ? "text-violet-500" : "text-slate-400"}`}
                    strokeWidth={2}
                  />
                </button>

                {/* Group items */}
                {isOpen && (
                  <div className="ml-3 pl-3 border-l border-slate-100 dark:border-slate-800">
                    {entry.items.map((item) => {
                      const ItemIcon = item.icon;
                      const itemActive = pathname === item.href;
                      return (
                        <Link key={item.href} href={item.href} aria-label={item.label} title={item.label}
                          className={`${NAV_LINK_BASE} text-[13px] py-2 ${itemActive ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE}`}>
                          <ItemIcon className={`w-4 h-4 shrink-0 ${itemActive ? NAV_ICON_ACTIVE : NAV_ICON_INACTIVE}`} strokeWidth={NAV_ICON_STROKE} />
                          <span className="shell-label">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800">
        <Link href="/" className="shell-link flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors mb-1 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60">
          <ChevronRight className={`${ACTION_ICON_CLASS} shrink-0`} /> <span className="shell-label">Ke Website</span>
        </Link>
        <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-500/10">
          <LogOut className={`${ACTION_ICON_CLASS} shrink-0`} /> <span className="shell-label">Keluar</span>
        </button>
      </div>
    </div>
  );
}
