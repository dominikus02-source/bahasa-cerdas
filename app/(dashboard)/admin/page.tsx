import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, ShoppingBag, Film, FileText, TrendingUp, Crown, GraduationCap, Activity } from "lucide-react";

async function getStats() {
  try {
    const [
      totalUsers,
      premiumUsers,
      muridUsers,
      karya,
      video,
      artikel,
      recentUsers,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { isPremium: true } }),
      db.user.count({ where: { role: "MURID" } }),
      db.karya.count({ where: { isPublished: true } }),
      db.video.count({ where: { isPublished: true } }),
      db.artikel.count({ where: { isPublished: true } }),
      db.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, fullName: true, email: true, role: true, isPremium: true, createdAt: true },
      }),
    ]);

    const activeUsers = await db.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    return {
      totalUsers,
      premiumUsers,
      muridUsers,
      activeUsers,
      karya,
      video,
      artikel,
      recentUsers,
    };
  } catch {
    return {
      totalUsers: 0,
      premiumUsers: 0,
      muridUsers: 0,
      activeUsers: 0,
      karya: 0,
      video: 0,
      artikel: 0,
      recentUsers: [],
    };
  }
}

function PieChart({ data }: { data: { label: string; value: number; color: string; percent?: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <p className="text-sm text-slate-400 text-center py-8">Belum ada data</p>;

  let cumulativePercent = 0;
  const radius = 80;
  const cx = 100;
  const cy = 100;

  const segments = data.map((d) => {
    const percent = (d.value / total) * 100;
    const startAngle = (cumulativePercent / 100) * 360;
    cumulativePercent += percent;
    const endAngle = (cumulativePercent / 100) * 360;

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArc = percent > 50 ? 1 : 0;

    const path = [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      "Z",
    ].join(" ");

    return { ...d, path, percent };
  });

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 200" className="w-48 h-48">
        {segments.map((seg, i) => (
          <path
            key={i}
            d={seg.path}
            fill={seg.color}
            stroke="white"
            strokeWidth="2"
          />
        ))}
        <circle cx={cx} cy={cy} r="40" fill="white" />
        <text x={cx} y={cy - 6} textAnchor="middle" className="text-lg font-bold" fill="#1e293b">
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="text-xs" fill="#64748b">
          Total
        </text>
      </svg>
      <div className="grid grid-cols-1 gap-2 mt-4 w-full">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-slate-600 flex-1">{d.label}</span>
            <span className="font-semibold text-slate-900">{d.value}</span>
            <span className="text-slate-400">({Math.round(d.percent ?? 0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function AdminPage() {
  const user = await getUser();
  if (!user || !user.isFounder) redirect("/login");

  const stats = await getStats();

  const cards = [
    { label: "Total Pengguna", value: stats.totalUsers, icon: Users, color: "from-blue-500 to-blue-600", href: "/admin/users" },
    { label: "Karya Terbit", value: stats.karya, icon: ShoppingBag, color: "from-emerald-500 to-emerald-600", href: "/admin/karya" },
    { label: "Video Publik", value: stats.video, icon: Film, color: "from-violet-500 to-purple-600", href: "/admin/video" },
    { label: "Artikel", value: stats.artikel, icon: FileText, color: "from-red-500 to-red-600", href: "/admin/artikel" },
  ];

  const pieData = [
    { label: "Siswa (Murid)", value: stats.muridUsers, color: "#8b5cf6" },
    { label: "Premium", value: stats.premiumUsers, color: "#f59e0b" },
    { label: "Aktif (30 hari)", value: stats.activeUsers, color: "#10b981" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
        <p className="text-slate-500 mt-1">Selamat datang, {user.fullName} — Founder</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
            <TrendingUp size={18} className="text-emerald-500" /> Statistik Pengguna
          </h2>
          <PieChart data={pieData} />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Activity size={18} className="text-blue-500" /> Pengguna Terbaru
          </h2>
          {stats.recentUsers.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada pengguna</p>
          ) : (
            <div className="space-y-3">
              {stats.recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${u.role === "MURID" ? "bg-violet-500" : "bg-emerald-500"}`}>
                    {u.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{u.fullName}</p>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {u.isPremium && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium flex items-center gap-0.5">
                        <Crown size={8} /> PRO
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${u.role === "MURID" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {u.role === "MURID" ? "Murid" : "Guru"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
