"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { LayoutDashboard, ShoppingBag, Film, FileText, Users, LogOut, Settings, ChevronRight, BarChart3, Briefcase, MessageCircle, Presentation, Bell, BellRing, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  user: { fullName: string; avatar?: string | null; id?: string };
}

const NAV = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Materi Ajar", href: "/admin/materi/generate-ppt", icon: Presentation },
  { label: "Toko Karya", href: "/admin/karya", icon: ShoppingBag },
  { label: "Video", href: "/admin/video", icon: Film },
  { label: "Artikel", href: "/admin/artikel", icon: FileText },
  { label: "Lowongan", href: "/admin/loker", icon: Briefcase },
  { label: "Komunitas", href: "/admin/komunitas", icon: MessageCircle },
  { label: "Pengguna", href: "/admin/users", icon: Users },
  { type: "divider" as const },
  { label: "Dashboard Guru", href: "/guru/beranda", icon: ChevronRight },
  { label: "Dashboard Murid", href: "/murid/beranda", icon: ChevronRight },
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

  useEffect(() => { fetchNotifs(); const t = setInterval(fetchNotifs, 30000); return () => clearInterval(t); }, [fetchNotifs]);

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
    <aside className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0 z-50">
      <div className="p-5 border-b border-slate-100">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-bold text-sm">BC</div>
          <div>
            <p className="font-bold text-slate-900 text-sm">Admin Panel</p>
            <p className="text-[10px] text-slate-400">Founder</p>
          </div>
        </Link>
      </div>

      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-sm">
              {user.fullName.slice(0, 2).toUpperCase()}
            </div>
            <p className="text-sm font-semibold text-slate-900 truncate">{user.fullName}</p>
          </div>
          <div className="relative">
            <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2 rounded-lg hover:bg-slate-200 transition-colors">
              {unread > 0 ? <BellRing size={16} className="text-amber-500" /> : <Bell size={16} className="text-slate-400" />}
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>

            {showNotifs && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-xl z-50 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-900">Notifikasi</span>
                    {unread > 0 && (
                      <button onClick={() => markRead("all")} className="text-[10px] text-violet-600 hover:text-violet-800 font-medium">
                        Tandai semua dibaca
                      </button>
                    )}
                  </div>
                  {notifs.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">Tidak ada notifikasi</div>
                  ) : (
                    notifs.map((n) => (
                      <div key={n.id} className="px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-900">{n.title}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{n.body}</p>
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
          if (item.type === "divider") return <div key={i} className="h-px bg-slate-100 my-3 mx-3" />;
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all mb-0.5 ${
                isActive ? "text-red-700 bg-red-50 font-semibold" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}>
              <Icon size={18} className={isActive ? "text-red-500" : "text-slate-400"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <Link href="/" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors mb-1">
          <ChevronRight size={16} /> Ke Website
        </Link>
        <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors">
          <LogOut size={16} /> Keluar
        </button>
      </div>
    </aside>
  );
}
