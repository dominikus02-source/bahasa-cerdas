"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { LayoutDashboard, ShoppingBag, Film, FileText, Users, LogOut, Settings, ChevronRight, BarChart3, Briefcase, MessageCircle, Presentation, Bell, BellRing, X, Coins, DollarSign, Database, Activity, Wallet, Baby, TrendingUp, Trophy, LineChart, ShieldAlert, ShieldCheck, Crown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  NAV_ICON_CLASS,
  NAV_ICON_STROKE,
  NAV_ICON_ACTIVE,
  NAV_ICON_INACTIVE,
  NAV_LINK_BASE,
  NAV_LINK_ACTIVE,
  NAV_LINK_INACTIVE,
  ACTION_ICON_CLASS,
} from "@/components/shell/icon-tokens";

interface Props {
  user: { fullName: string; avatar?: string | null; id?: string };
}

export const NAV = [
  { label: "Ringkasan", href: "/admin", icon: LayoutDashboard },
  { label: "Materi Ajar", href: "/admin/materi/generate-ppt", icon: Presentation },
  { label: "Bank Soal", href: "/admin/bank-soal", icon: FileText },
  { label: "Toko Karya", href: "/admin/karya", icon: ShoppingBag },
  { label: "Video", href: "/admin/video", icon: Film },
  { label: "Artikel", href: "/admin/artikel", icon: FileText },
  { label: "Lowongan", href: "/admin/loker", icon: Briefcase },
  { label: "Komunitas", href: "/admin/komunitas", icon: MessageCircle },
  { label: "Pengguna", href: "/admin/users", icon: Users },
  // Pratinjau dasbor murid TK–SD untuk memeriksa tampilan; progres tidak disimpan.
  { label: "Arena Junior (TK–SD)", href: "/junior", icon: Baby },
  { label: "Analitik AI", href: "/admin/ai-analytics", icon: BarChart3 },
  { label: "Learning Analytics", href: "/admin/analytics", icon: LineChart },
  { label: "Arena BC", href: "/admin/arena", icon: Trophy },
  { label: "Pemakaian Fitur", href: "/admin/feature-usage", icon: TrendingUp },
  { label: "Monitoring Beban", href: "/admin/monitoring", icon: Activity },
  { label: "Kuota AI", href: "/admin/ai-quota", icon: Coins },
  { label: "Pusat Data", href: "/admin/data-center", icon: Database },
  { label: "Pembayaran", href: "/admin/payments", icon: DollarSign },
  { label: "Premium Report", href: "/admin/premium", icon: Crown },
  { label: "Penarikan Saldo", href: "/admin/withdrawals", icon: Wallet },
  { label: "Risiko Guru", href: "/admin/teacher-risk", icon: ShieldAlert },
  { label: "Payout Kontrol", href: "/admin/teacher-payouts", icon: ShieldCheck },
  { label: "Pengaturan", href: "/admin/pengaturan", icon: Settings },
  { type: "divider" as const },
  { label: "Dasbor Guru", href: "/guru/beranda", icon: ChevronRight },
  { label: "Dasbor Murid", href: "/murid/beranda", icon: ChevronRight },
];

export function AdminSidebar({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications?unread=true");
      const data = await res.json();
      setNotifs(data.notifications || []);
      setUnread(data.unreadCount || 0);
    } catch {}
  }, []);

  // 3 menit, dan berhenti saat tab ditinggalkan (dulu 30 detik tanpa henti).
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
      <div className="p-5 border-b border-slate-100 dark:border-slate-800">
        <Link href="/admin" className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-bold text-sm shrink-0">BC</div>
          <div className="min-w-0">
            <p className="shell-label font-bold text-slate-900 text-sm truncate dark:text-white">Panel Admin</p>
            <p className="shell-label text-[10px] text-slate-400">Founder</p>
          </div>
        </Link>
      </div>

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

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV.map((item: any, i) => {
          if (item.type === "divider") return <div key={i} className="h-px bg-slate-100 my-3 mx-3 dark:bg-slate-800" />;
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} aria-label={item.label} title={item.label}
              className={`${NAV_LINK_BASE} ${isActive ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE}`}>
              <Icon className={`${NAV_ICON_CLASS} ${isActive ? NAV_ICON_ACTIVE : NAV_ICON_INACTIVE}`} strokeWidth={NAV_ICON_STROKE} />
              <span className="shell-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

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
