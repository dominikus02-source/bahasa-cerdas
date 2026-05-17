"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Film, FileText, Users, LogOut, Settings, ChevronRight, BarChart3, Briefcase, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  user: { fullName: string; avatar?: string | null };
}

const NAV = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0">
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
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-sm">
            {user.fullName.slice(0, 2).toUpperCase()}
          </div>
          <p className="text-sm font-semibold text-slate-900 truncate">{user.fullName}</p>
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
