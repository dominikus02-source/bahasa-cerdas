import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getExecutiveDashboardData } from "@/lib/admin/executive";
import Link from "next/link";
import {
  Users, TrendingUp, TrendingDown, Minus, Crown, DollarSign,
  Activity, BookOpen, Sparkles, BrainCircuit, ArrowRight, Target,
  UserPlus, Repeat, GraduationCap, PenLine, AlertTriangle, ShieldAlert,
} from "lucide-react";
import { PaymentHealthAlert } from "@/components/admin/PaymentHealthAlert";

// ════════════════════════════════════════════════════════════════════
// FOUNDER CONTROL TOWER — Executive Dashboard
//
// Server component. Queries Prisma DIRECTLY (no self-fetch from API).
// Previous architecture fetched /api/admin/analytics/executive which
// failed on Vercel when NEXT_PUBLIC_SITE_URL was missing/incorrect.
// ════════════════════════════════════════════════════════════════════

function formatRp(v: number): string {
  if (v <= 0) return "Rp0";
  if (v >= 1_000_000_000) return `Rp${(v / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1_000_000) return `Rp${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}jt`;
  if (v >= 1_000) return `Rp${Math.round(v / 1_000)}rb`;
  return `Rp${v}`;
}

function formatNum(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return v.toLocaleString("id-ID");
}

function TrendArrow({ value }: { value: number }) {
  if (value === 0) return <span className="inline-flex items-center gap-0.5 text-xs text-slate-400"><Minus size={12} /> 0%</span>;
  if (value > 0) return <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"><TrendingUp size={12} /> +{value}%</span>;
  return <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-500 dark:text-red-400"><TrendingDown size={12} /> {value}%</span>;
}

function KpiCard({
  label, value, subtitle, icon: Icon, color, trend, href,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  trend?: number;
  href?: string;
}) {
  const card = (
    <div className={`bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow ${href ? "cursor-pointer" : ""}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon size={18} className="text-white" />
        </div>
        {trend !== undefined && <TrendArrow value={trend} />}
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
      {subtitle && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  );

  if (href) return <Link href={href}>{card}</Link>;
  return card;
}

function MetricRow({ label, value, trend }: { label: string; value: string; trend?: number }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</span>
        {trend !== undefined && <TrendArrow value={trend} />}
      </div>
    </div>
  );
}



export const dynamic = "force-dynamic";

export default async function ExecutiveDashboard() {
  const user = await getUser();
  if (!user || !user.isFounder) redirect("/login");

  const data = await getExecutiveDashboardData();

  const now = new Date(data.timestamp);
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
  const dateStr = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Target size={24} className="text-emerald-600 dark:text-emerald-400" />
            Founder Control Tower
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{dateStr} — {timeStr} WIB</p>
        </div>
      </div>

      {/* Row 1: Core KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Users" value={formatNum(data.users.total)} subtitle={`${formatNum(data.users.murid)} murid · ${formatNum(data.users.guru)} guru`} icon={Users} color="from-blue-500 to-blue-600" trend={data.growth.new30d.trend} href="/admin/users" />
        <KpiCard label="Active Users (DAU)" value={formatNum(data.active.dau.value)} subtitle={`WAU ${formatNum(data.active.wau.value)} · MAU ${formatNum(data.active.mau.value)}`} icon={Activity} color="from-violet-500 to-purple-600" trend={data.active.dau.trend} />
        <KpiCard label="New Users (7d)" value={formatNum(data.growth.new7d.value)} subtitle={`${formatNum(data.growth.new30d.value)} bulan ini`} icon={UserPlus} color="from-emerald-500 to-emerald-600" trend={data.growth.new7d.trend} />
        <KpiCard label="Active Premium" value={String(data.premium.active.value)} subtitle={`${data.premium.conversionRate}% conversion · ${data.premium.trialActive} trial`} icon={Crown} color="from-amber-500 to-amber-600" trend={data.premium.active.trend} href="/admin/premium" />
      </div>

      {/* Row 2: Revenue + Learning */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="MRR (Bulan Ini)" value={formatRp(data.revenue.mrr.value)} subtitle={`${data.revenue.transactionsSuccess30d} transaksi sukses`} icon={DollarSign} color="from-green-500 to-green-600" trend={data.revenue.mrr.trend} href="/admin/payments" />
        <KpiCard label="Cash Collected (30d)" value={formatRp(data.revenue.cashCollected30d.value)} subtitle={`All-time: ${formatRp(data.revenue.cashCollectedAllTime)}`} icon={TrendingUp} color="from-teal-500 to-teal-600" trend={data.revenue.cashCollected30d.trend} />
        <KpiCard label="Jalur Cerdas (7d)" value={formatNum(data.learning.jalurCompleted7d.value)} subtitle={`${data.learning.ukbiSessions7d} UKBI sessions`} icon={BookOpen} color="from-indigo-500 to-indigo-600" trend={data.learning.jalurCompleted7d.trend} href="/admin/analytics" />
        <KpiCard label="Karya Siswa (7d)" value={formatNum(data.content.karya7d.value)} subtitle={`${data.ai.generations7d} AI generations`} icon={PenLine} color="from-pink-500 to-pink-600" trend={data.content.karya7d.trend} href="/arena/feed" />
      </div>

      {/* Payment Health Alert */}
      {data.paymentHealth.summary.totalAffected > 0 && <PaymentHealthAlert data={data.paymentHealth} />}

      {/* Row 3: Detailed metrics */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2 text-sm"><Activity size={14} className="text-violet-500" /> Engagement</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            <MetricRow label="DAU / Total" value={`${data.users.total > 0 ? Math.round((data.active.dau.value / data.users.total) * 100) : 0}%`} />
            <MetricRow label="WAU / Total" value={`${data.users.total > 0 ? Math.round((data.active.wau.value / data.users.total) * 100) : 0}%`} />
            <MetricRow label="MAU / Total" value={`${data.users.total > 0 ? Math.round((data.active.mau.value / data.users.total) * 100) : 0}%`} />
            <MetricRow label="DAU Trend" value="" trend={data.active.dau.trend} />
            <MetricRow label="WAU Trend" value="" trend={data.active.wau.trend} />
            <MetricRow label="MAU Trend" value="" trend={data.active.mau.trend} />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2 text-sm"><Crown size={14} className="text-amber-500" /> Premium Funnel</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            <MetricRow label="Guru Total" value={String(data.users.guru)} />
            <MetricRow label="Trial Active" value={String(data.premium.trialActive)} />
            <MetricRow label="Pro Active" value={String(data.premium.active.value)} trend={data.premium.active.trend} />
            <MetricRow label="Conversion Rate" value={`${data.premium.conversionRate}%`} />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2 text-sm"><DollarSign size={14} className="text-green-500" /> Financial Overview</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            <MetricRow label="MRR (Normalized)" value={formatRp(data.revenue.mrr.value)} trend={data.revenue.mrr.trend} />
            <MetricRow label="Cash Collected (30d)" value={formatRp(data.revenue.cashCollected30d.value)} trend={data.revenue.cashCollected30d.trend} />
            <MetricRow label="All-Time Cash Collected" value={formatRp(data.revenue.cashCollectedAllTime)} />
            <MetricRow label="Transactions (30d)" value={String(data.revenue.transactionsSuccess30d)} />
            <MetricRow label="Pending Payments" value={String(data.revenue.transactionsPending)} />
          </div>
        </div>
      </div>

      {/* Row 4: Retention cohorts */}
      {data.retention.cohorts.length > 0 && (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2 text-sm"><Repeat size={14} className="text-blue-500" /> Retention Cohorts</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/50">
                  <th className="pb-2 font-medium">Cohort</th>
                  <th className="pb-2 font-medium text-right">Registered</th>
                  <th className="pb-2 font-medium text-right">Active (D7)</th>
                  <th className="pb-2 font-medium text-right">D7 Rate</th>
                  <th className="pb-2 font-medium text-right">Active (D30)</th>
                  <th className="pb-2 font-medium text-right">D30 Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.retention.cohorts.map((c: { label: string; registered: number; active7d: number; active30d: number }) => (
                  <tr key={c.label} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                    <td className="py-2.5 font-medium text-slate-700 dark:text-slate-200">{c.label}</td>
                    <td className="py-2.5 text-right text-slate-600 dark:text-slate-300">{c.registered}</td>
                    <td className="py-2.5 text-right text-slate-600 dark:text-slate-300">{c.active7d}</td>
                    <td className="py-2.5 text-right"><span className={`font-medium ${c.registered > 0 && c.active7d / c.registered > 0.5 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-300"}`}>{c.registered > 0 ? Math.round((c.active7d / c.registered) * 100) : 0}%</span></td>
                    <td className="py-2.5 text-right text-slate-600 dark:text-slate-300">{c.active30d}</td>
                    <td className="py-2.5 text-right"><span className={`font-medium ${c.registered > 0 && c.active30d / c.registered > 0.3 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>{c.registered > 0 ? Math.round((c.active30d / c.registered) * 100) : 0}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        {[
          { href: "/admin/users", label: "Pengguna", icon: Users },
          { href: "/admin/premium", label: "Premium", icon: Crown },
          { href: "/admin/payments", label: "Pembayaran", icon: DollarSign },
          { href: "/admin/analytics", label: "Learning Analytics", icon: BookOpen },
          { href: "/admin/ai-analytics", label: "AI Analytics", icon: BrainCircuit },
          { href: "/admin/arena", label: "Arena BC", icon: GraduationCap },
        ].map((link) => (
          <Link key={link.href} href={link.href} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
            <link.icon size={12} />
            {link.label}
            <ArrowRight size={10} className="text-slate-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}
