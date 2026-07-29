import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, ShoppingBag, Film, FileText, TrendingUp, Activity, AlertTriangle, DollarSign, BarChart3, BookOpen, Clock, Sparkles, BrainCircuit, Zap } from "lucide-react";
import { TrendBadge, UserGrowthChart, MiniBarChart } from "@/components/admin/AdminCharts";

async function getStats() {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeek = new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers, premiumUsers, muridUsers, guruUsers,
      totalKarya, totalVideo, totalArtikel, totalPembelian,
      userThisWeek, userLastWeek,
      karyaThisWeek, karyaLastWeek,
      videoThisWeek, videoLastWeek,
      artikelThisWeek, artikelLastWeek,
      pembelianThisWeek, pembelianLastWeek,
      activeUsers,
      pendingKomunitas, pendingLoker,
      draftKarya, publishedKarya,
      todayUsers,
      totalRevenue,
      pendingWithdrawals,
      draftVideo,
      recentUsers,

      aiRequestsToday,
      aiRequestsWeek,
      aiSavedToday,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { isPremium: true } }),
      db.user.count({ where: { role: "MURID" } }),
      db.user.count({ where: { role: "GURU" } }),

      db.studentKarya.count(),
      db.video.count({ where: { isPublished: true } }),
      db.artikel.count({ where: { isPublished: true } }),
      db.pembelian.count({ where: { status: "PAID" } }),

      db.user.count({ where: { createdAt: { gte: weekAgo } } }),
      db.user.count({ where: { createdAt: { gte: lastWeek, lt: weekAgo } } }),

      db.studentKarya.count({ where: { createdAt: { gte: weekAgo } } }),
      db.studentKarya.count({ where: { createdAt: { gte: lastWeek, lt: weekAgo } } }),

      db.video.count({ where: { createdAt: { gte: weekAgo } } }),
      db.video.count({ where: { createdAt: { gte: lastWeek, lt: weekAgo } } }),

      db.artikel.count({ where: { createdAt: { gte: weekAgo } } }),
      db.artikel.count({ where: { createdAt: { gte: lastWeek, lt: weekAgo } } }),

      db.pembelian.count({ where: { createdAt: { gte: weekAgo }, status: "PAID" } }),
      db.pembelian.count({ where: { createdAt: { gte: lastWeek, lt: weekAgo }, status: "PAID" } }),

      db.user.count({ where: { createdAt: { gte: monthAgo } } }),

      db.community.count({ where: { status: "PENDING" } }),
      db.loker.count({ where: { isApproved: false } }),

      db.studentKarya.count({ where: { isFeatured: false } }),
      db.studentKarya.count({ where: { isFeatured: true } }),

      db.user.count({ where: { createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } }),

      db.pembelian.aggregate({ _sum: { amount: true }, where: { status: "PAID" } }),

      db.withdrawal.findMany({ where: { status: "PENDING" }, select: { amount: true } }),

      db.video.count({ where: { isPublished: false } }),

      db.user.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, fullName: true, email: true, role: true, isPremium: true, createdAt: true } }),

      db.aIUsage.count({ where: { createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } }),
      db.aIUsage.count({ where: { createdAt: { gte: weekAgo } } }),
      db.aiSavedResult.count({ where: { createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } }),
    ]);

    const pct = (cur: number, prev: number) =>
      prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

    // 12 rentang mingguan (sama untuk tren user & karya)
    const weekRanges = Array.from({ length: 12 }, (_, idx) => {
      const i = 11 - idx;
      const start = new Date(); start.setDate(start.getDate() - start.getDay() - i * 7); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 7);
      return { label: start.toLocaleDateString("id-ID", { day: "numeric", month: "short" }), start, end };
    });

    // Sebelumnya 28 query dijalankan sekuensial (~1 dtk+ latensi DB). Sekarang paralel.
    const [
      totalPaymentsToday,
      totalPaymentsPending,
      totalPaymentsSuccess,
      paymentsRevenueAgg,
      userTrendCounts,
      karyaTrendCounts,
    ] = await Promise.all([
      db.transaksi.count({ where: { type: "PREMIUM_UPGRADE", createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } } }),
      db.transaksi.count({ where: { type: "PREMIUM_UPGRADE", status: "PENDING" } }),
      db.transaksi.count({ where: { type: "PREMIUM_UPGRADE", status: "SUCCESS" } }),
      db.transaksi.aggregate({ _sum: { amount: true }, where: { type: "PREMIUM_UPGRADE", status: "SUCCESS" } }),
      Promise.all(weekRanges.map((w) => db.user.count({ where: { createdAt: { gte: w.start, lt: w.end } } }))),
      Promise.all(weekRanges.map((w) => db.studentKarya.count({ where: { createdAt: { gte: w.start, lt: w.end } } }))),
    ]);

    const totalPaymentsRevenue = paymentsRevenueAgg._sum.amount || 0;
    const totalWithdrawalPending = pendingWithdrawals.reduce((s, w) => s + w.amount, 0);
    const userTrend = weekRanges.map((w, i) => ({ week: w.label, count: userTrendCounts[i] }));
    const karyaTrend = weekRanges.map((w, i) => ({ week: w.label, count: karyaTrendCounts[i] }));

    return {
      totals: { users: totalUsers, premium: premiumUsers, murid: muridUsers, guru: guruUsers, karya: totalKarya, video: totalVideo, artikel: totalArtikel, pembelian: totalPembelian, revenue: totalRevenue._sum.amount || 0, withdrawalPending: totalWithdrawalPending },
      trends: {
        user: { thisWeek: userThisWeek, lastWeek: userLastWeek, pct: pct(userThisWeek, userLastWeek), weekly: userTrend },
        karya: { thisWeek: karyaThisWeek, lastWeek: karyaLastWeek, pct: pct(karyaThisWeek, karyaLastWeek), weekly: karyaTrend },
        video: { thisWeek: videoThisWeek, lastWeek: videoLastWeek, pct: pct(videoThisWeek, videoLastWeek) },
        artikel: { thisWeek: artikelThisWeek, lastWeek: artikelLastWeek, pct: pct(artikelThisWeek, artikelLastWeek) },
        revenue: { thisWeek: pembelianThisWeek, lastWeek: pembelianLastWeek, pct: pct(pembelianThisWeek, pembelianLastWeek) },
      },
      pending: { komunitas: pendingKomunitas, loker: pendingLoker, withdrawals: pendingWithdrawals.length },
      content: { draftKarya, publishedKarya, draftVideo },
      growth: { today: todayUsers, active: activeUsers },
      recentUsers,
      ai: { today: aiRequestsToday, week: aiRequestsWeek, savedToday: aiSavedToday },
      payments: { today: totalPaymentsToday, pending: totalPaymentsPending, success: totalPaymentsSuccess, revenue: totalPaymentsRevenue },
    };
  } catch (e) {
    console.error("Stats error:", e);
    return {
      totals: { users: 0, premium: 0, murid: 0, guru: 0, karya: 0, video: 0, artikel: 0, pembelian: 0, revenue: 0, withdrawalPending: 0 },
      trends: { user: { thisWeek: 0, lastWeek: 0, pct: 0, weekly: [] }, karya: { thisWeek: 0, lastWeek: 0, pct: 0, weekly: [] }, video: { thisWeek: 0, lastWeek: 0, pct: 0 }, artikel: { thisWeek: 0, lastWeek: 0, pct: 0 }, revenue: { thisWeek: 0, lastWeek: 0, pct: 0 } },
      pending: { komunitas: 0, loker: 0, withdrawals: 0 },
      content: { draftKarya: 0, publishedKarya: 0, draftVideo: 0 },
      growth: { today: 0, active: 0 },
      recentUsers: [],
      payments: { today: 0, pending: 0, success: 0, revenue: 0 },
      ai: { today: 0, week: 0, savedToday: 0 },
    };
  }
}

// "Rp0rb" terbaca janggal, dan `.toFixed(0)` tidak pernah menyesuaikan satuan —
// Rp5.000.000 pun tetap tertulis "Rp5000rb". Dipakai untuk semua kartu revenue
// di halaman ini supaya formatnya konsisten.
function formatRupiahRingkas(v: number): string {
  if (v <= 0) return "Rp0";
  if (v >= 1_000_000) return `Rp${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}jt`;
  if (v >= 1_000) return `Rp${Math.round(v / 1_000)}rb`;
  return `Rp${v}`;
}

function PieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="text-sm text-slate-400 text-center py-8">Belum ada data</p>;

  let cum = 0;
  const segs = data.map(d => {
    const pct = (d.value / total) * 100;
    const sa = (cum / 100) * 360; cum += pct;
    const ea = (cum / 100) * 360;
    const sr = ((sa - 90) * Math.PI) / 180, er = ((ea - 90) * Math.PI) / 180;
    const r = 80;
    return { ...d, path: `M 100 100 L ${100 + r * Math.cos(sr)} ${100 + r * Math.sin(sr)} A ${r} ${r} 0 ${pct > 50 ? 1 : 0} 1 ${100 + r * Math.cos(er)} ${100 + r * Math.sin(er)} Z`, pct };
  });

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 200" className="w-44 h-44">
        {segs.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2" />)}
        <circle cx={100} cy={100} r="40" fill="white" />
        <text x={100} y={94} textAnchor="middle" className="text-lg font-bold" fill="#1e293b">{total}</text>
        <text x={100} y={110} textAnchor="middle" className="text-xs" fill="#64748b">Total</text>
      </svg>
      <div className="grid grid-cols-1 gap-1.5 mt-3 w-full">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-slate-600 flex-1">{d.label}</span>
            <span className="font-semibold text-slate-900">{d.value}</span>
            <span className="text-slate-400">({Math.round((d.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function AdminPage() {
  const user = await getUser();
  if (!user || !user.isFounder) redirect("/login");

  const s = await getStats();

  const mainCards = [
    { label: "Total Pengguna", value: s.totals.users, icon: Users, color: "from-blue-500 to-blue-600", href: "/admin/users", trend: s.trends.user.pct },
    { label: "Karya Siswa", value: s.totals.karya, icon: Sparkles, color: "from-violet-500 to-purple-600", href: "/arena/feed", trend: s.trends.karya.pct },
    { label: "Video Publik", value: s.totals.video, icon: Film, color: "from-emerald-500 to-emerald-600", href: "/admin/video", trend: s.trends.video.pct },
    { label: "Artikel", value: s.totals.artikel, icon: FileText, color: "from-red-500 to-red-600", href: "/admin/artikel", trend: s.trends.artikel.pct },
    { label: "Transaksi", value: s.totals.pembelian, icon: ShoppingBag, color: "from-amber-500 to-amber-600", href: "/admin", trend: s.trends.revenue.pct },
    // Sebelumnya cuma penjualan marketplace (s.totals.revenue) — kartu paling
    // menonjol di dashboard ini bisa menampilkan "Rp0rb" walau ada pengguna
    // Premium yang sungguhan membayar lewat langganan (s.payments.revenue).
    // Founder yang sekilas melihat kartu ini bisa salah simpul platform tidak
    // menghasilkan apa-apa. Sekarang keduanya digabung jadi satu total nyata.
    { label: "Pendapatan", value: formatRupiahRingkas(s.totals.revenue + s.payments.revenue), icon: DollarSign, color: "from-green-500 to-green-600", href: "/admin/payments" },
  ];

  // Murid/Guru/Admin itu peran yang saling lepas (satu pengguna cuma satu
  // peran), jadi jumlahnya otomatis sama dengan Total Pengguna. Premium
  // sebelumnya ikut dimasukkan sebagai "irisan" keempat padahal dia status
  // yang menempel di Murid atau Guru yang sama — itu sebabnya donatnya dulu
  // menunjukkan "1059 Total" padahal Total Pengguna sebenarnya 1024: murid
  // premium kehitung dua kali (sekali di "Murid", sekali lagi di "Premium").
  const totalAdmin = s.totals.users - s.totals.murid - s.totals.guru;
  const pieData = [
    { label: "Murid", value: s.totals.murid, color: "#8b5cf6" },
    { label: "Guru", value: s.totals.guru, color: "#10b981" },
    ...(totalAdmin > 0 ? [{ label: "Admin", value: totalAdmin, color: "#64748b" }] : []),
  ];
  const premiumPct = s.totals.users > 0 ? Math.round((s.totals.premium / s.totals.users) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
          <p className="text-slate-500 text-sm mt-1">Selamat datang, {user.fullName}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg">
            <Activity size={14} /> {s.growth.today} baru hari ini
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
            <Users size={14} /> {s.growth.active} aktif (30h)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {mainCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href}
              className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md transition-shadow">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center mb-2.5`}>
                <Icon size={16} className="text-white" />
              </div>
              <p className="text-lg font-bold text-slate-900">{card.value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{card.label}</p>
              {"trend" in card && card.trend !== undefined && (
                <div className="mt-1"><TrendBadge value={card.trend} /></div>
              )}
            </Link>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp size={16} className="text-violet-500" /> Pertumbuhan Pengguna
            </h2>
            <span className="text-xs text-slate-400">12 minggu terakhir</span>
          </div>
          {s.trends.user.weekly.length > 0 ? <UserGrowthChart data={s.trends.user.weekly} /> : <p className="text-sm text-slate-400 text-center py-8">Belum ada data</p>}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-emerald-500" /> Statistik Pengguna
          </h2>
          <PieChart data={pieData} />
          {/* Premium bukan irisan donat di atas — dia status yang menempel di
              Murid/Guru yang sama, jadi ditampilkan terpisah sebagai persentase
              dari total, bukan seolah kategori keempat yang saling lepas. */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
            <span className="flex items-center gap-1.5 text-slate-500">
              <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-amber-500" /> Pengguna Premium
            </span>
            <span className="font-semibold text-slate-900">{s.totals.premium} ({premiumPct}%)</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm">
            <AlertTriangle size={14} className="text-amber-500" /> Perlu Moderasi
          </h3>
          <div className="space-y-2">
            <Link href="/admin/komunitas" className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors">
              <span className="text-xs text-amber-800">Komunitas</span>
              <span className="text-sm font-bold text-amber-900">{s.pending.komunitas}</span>
            </Link>
            <Link href="/admin/loker" className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
              <span className="text-xs text-blue-800">Lowongan</span>
              <span className="text-sm font-bold text-blue-900">{s.pending.loker}</span>
            </Link>
            {/* Dulu <div> mati — angkanya tampil tapi tidak ada cara membuka
                daftarnya, dan memang belum ada halamannya sama sekali. */}
            <Link href="/admin/withdrawals" className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors">
              <span className="text-xs text-emerald-800">Penarikan Saldo</span>
              <span className="text-sm font-bold text-emerald-900">{s.pending.withdrawals}</span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm">
            <BookOpen size={14} className="text-violet-500" /> Karya Siswa
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-violet-50">
              <span className="text-xs text-violet-800">Minggu ini</span>
              <span className="text-sm font-bold text-violet-900">+{s.trends.karya.thisWeek}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
              <span className="text-xs text-slate-600">Minggu lalu</span>
              <span className="text-sm font-bold text-slate-900">{s.trends.karya.lastWeek}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
              <span className="text-xs text-slate-600">Trend</span>
              <span className="text-sm font-bold text-slate-900"><TrendBadge value={s.trends.karya.pct} /></span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm">
            <Clock size={14} className="text-orange-500" /> Draft vs Published
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-orange-50">
              <span className="text-xs text-orange-800">Karya Draft</span>
              <span className="text-sm font-bold text-orange-900">{s.content.draftKarya}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50">
              <span className="text-xs text-emerald-800">Karya Terbit</span>
              <span className="text-sm font-bold text-emerald-900">{s.content.publishedKarya}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
              <span className="text-xs text-slate-600">Video Draft</span>
              <span className="text-sm font-bold text-slate-900">{s.content.draftVideo}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm">
            {/* Diberi label eksplisit "Marketplace" — kartu "Ringkasan
                Pembayaran Pro" di bawah menunjukkan revenue langganan
                Premium, angka yang sama sekali berbeda. Dua kartu bernama
                sama "Pendapatan" tanpa penjelasan ruang lingkup gampang
                dibaca sebagai angka yang sama, padahal bukan. */}
            <DollarSign size={14} className="text-green-500" /> Pendapatan Marketplace
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-green-50">
              <span className="text-xs text-green-800">Total revenue</span>
              <span className="text-sm font-bold text-green-900">{formatRupiahRingkas(s.totals.revenue)}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50">
              <span className="text-xs text-blue-800">Minggu ini</span>
              <span className="text-sm font-bold text-blue-900">+{s.trends.revenue.thisWeek}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50">
              <span className="text-xs text-amber-800">Withdrawal pending</span>
              <span className="text-sm font-bold text-amber-900">{formatRupiahRingkas(s.totals.withdrawalPending)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Usage Widget */}
      <Link href="/admin/ai-analytics"
        className="block bg-gradient-to-r from-red-50 via-white to-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <BrainCircuit size={16} className="text-red-500" /> Ringkasan AI Hari Ini
          </h2>
          <span className="text-[10px] text-red-600 font-medium flex items-center gap-1">
            <BarChart3 size={12} /> Lihat Detail
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xl font-bold text-slate-900">{s.ai.today}</p>
            <p className="text-[10px] text-slate-500">Request (hari ini)</p>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{s.ai.week}</p>
            <p className="text-[10px] text-slate-500">Request (7 hari)</p>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{s.ai.savedToday}</p>
            <p className="text-[10px] text-slate-500">Tersimpan (hari ini)</p>
          </div>
        </div>
      </Link>

      <Link href="/admin/payments"
        className="block bg-gradient-to-r from-amber-50 via-white to-white rounded-2xl border border-amber-200 p-5 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <DollarSign size={16} className="text-amber-500" /> Ringkasan Pembayaran Pro
          </h2>
          <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
            <BarChart3 size={12} /> Lihat Detail
          </span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-xl font-bold text-slate-900">{s.payments.today}</p>
            <p className="text-[10px] text-slate-500">Hari Ini</p>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{s.payments.pending}</p>
            <p className="text-[10px] text-slate-500">Menunggu</p>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{s.payments.success}</p>
            <p className="text-[10px] text-slate-500">Sukses Total</p>
          </div>
          <div>
            <p className="text-xl font-bold text-amber-700">{formatRupiahRingkas(s.payments.revenue)}</p>
            <p className="text-[10px] text-slate-500">Pendapatan Premium</p>
          </div>
        </div>
      </Link>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Activity size={16} className="text-blue-500" /> Pengguna Terbaru
          </h2>
          {s.recentUsers.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Belum ada pengguna</p>
          ) : (
            <div className="space-y-2">
              {s.recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${u.role === "MURID" ? "bg-violet-500" : "bg-emerald-500"}`}>
                    {u.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{u.fullName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {u.isPremium && <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">PRO</span>}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${u.role === "MURID" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {u.role === "MURID" ? "Murid" : "Guru"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-violet-500" /> Tren Karya (12 minggu)
          </h2>
          {s.trends.karya.weekly.length > 0 ? <MiniBarChart data={s.trends.karya.weekly} /> : <p className="text-sm text-slate-400 text-center py-8">Belum ada data</p>}
        </div>
      </div>
    </div>
  );
}
