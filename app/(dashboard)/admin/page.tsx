import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, ShoppingBag, Film, FileText, BookOpen, TrendingUp } from "lucide-react";

async function getStats() {
  try {
    const [users, karya, video, artikel, kamus] = await Promise.all([
      db.user.count(),
      db.karya.count({ where: { isPublished: true } }),
      db.video.count({ where: { isPublished: true } }),
      db.artikel.count({ where: { isPublished: true } }),
      db.kamusEntry.count(),
    ]);
    return { users, karya, video, artikel, kamus };
  } catch { return { users: 0, karya: 0, video: 0, artikel: 0, kamus: 0 }; }
}

export default async function AdminPage() {
  const user = await getUser();
  if (!user || !user.isFounder) redirect("/login");

  const stats = await getStats();

  const cards = [
    { label: "Total Pengguna", value: stats.users, icon: Users, color: "from-blue-500 to-blue-600", href: "/admin/users" },
    { label: "Karya Terbit", value: stats.karya, icon: ShoppingBag, color: "from-emerald-500 to-emerald-600", href: "/admin/karya" },
    { label: "Video Publik", value: stats.video, icon: Film, color: "from-violet-500 to-purple-600", href: "/admin/video" },
    { label: "Artikel", value: stats.artikel, icon: FileText, color: "from-red-500 to-red-600", href: "/admin/artikel" },
    { label: "Entri Kamus", value: stats.kamus, icon: BookOpen, color: "from-amber-500 to-orange-600", href: "/admin/kamus" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
        <p className="text-slate-500 mt-1">Selamat datang, {user.fullName} — Founder</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href}
              className="bg-white rounded-2xl p-5 border border-slate-200 hover:shadow-lg transition-shadow">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
                <Icon size={20} className="text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-red-500" /> Navigasi Cepat
          </h2>
          <div className="space-y-2">
            <Link href="/guru/beranda" className="block p-3 rounded-xl bg-emerald-50 text-emerald-700 font-medium text-sm hover:bg-emerald-100 transition-colors">
              → Dashboard Guru
            </Link>
            <Link href="/murid/beranda" className="block p-3 rounded-xl bg-violet-50 text-violet-700 font-medium text-sm hover:bg-violet-100 transition-colors">
              → Dashboard Murid
            </Link>
            <Link href="/marketplace" className="block p-3 rounded-xl bg-red-50 text-red-700 font-medium text-sm hover:bg-red-100 transition-colors">
              → Toko Karya (Publik)
            </Link>
            <Link href="/admin" className="block p-3 rounded-xl bg-slate-50 text-slate-700 font-medium text-sm hover:bg-slate-100 transition-colors">
              → Admin Panel
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Users size={18} className="text-blue-500" /> Info Founder
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Nama</span>
              <span className="font-medium text-slate-900">{user.fullName}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Status</span>
              <span className="font-medium text-emerald-600">Founder Premium</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Role</span>
              <span className="font-medium text-slate-900">Admin</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
