import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getExecutiveDashboardData } from "@/lib/admin/executive";
import { evaluateFounderHealth } from "@/lib/admin/founder-health";
import { deriveInvestorGrowth } from "@/lib/admin/investor-growth";
import Link from "next/link";
import {
  Users, TrendingUp, TrendingDown, Minus, Crown, DollarSign,
  Activity, BookOpen, ArrowRight, Target,
  AlertTriangle, ShieldAlert, CheckCircle2,
  ChevronDown, ChevronRight, Zap, BarChart3,
} from "lucide-react";
import { PaymentHealthAlert } from "@/components/admin/PaymentHealthAlert";
import { LivePulseCard } from "@/components/admin/LivePulseCard";

// ════════════════════════════════════════════════════════════════════
// FOUNDER CONTROL TOWER — Executive Dashboard
//
// Server component. Queries Prisma DIRECTLY (no self-fetch from API).
// Health evaluation uses deterministic rules from founder-health.ts.
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

function HealthBadge({ status }: { status: string }) {
  if (status === "CRITICAL") return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300">🔴 Critical</span>;
  if (status === "ATTENTION") return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">🟡 Attention</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">🟢 Healthy</span>;
}

function PriorityCard({ p }: { p: { severity: string; title: string; description: string; evidence: string; actionLabel: string; href: string } }) {
  const colors = {
    P1: "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30",
    P2: "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30",
    P3: "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30",
  };
  const badges = {
    P1: "bg-red-600 text-white",
    P2: "bg-amber-500 text-white",
    P3: "bg-blue-500 text-white",
  };
  const sev = p.severity as "P1" | "P2" | "P3";
  return (
    <div className={`rounded-xl border p-4 ${colors[sev]}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${badges[sev]}`}>{p.severity}</span>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{p.title}</h3>
        </div>
        <Link href={p.href} className="shrink-0 inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
          {p.actionLabel} <ArrowRight size={10} />
        </Link>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{p.description}</p>
      <p className="text-[10px] text-slate-500 dark:text-slate-500 italic">{p.evidence}</p>
    </div>
  );
}

function MetricRow({ label, value, trend }: { label: string; value: string; trend?: number | null }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</span>
        {trend !== undefined && trend !== null && <TrendArrow value={trend} />}
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function ExecutiveDashboard() {
  const user = await getUser();
  if (!user || !user.isFounder) redirect("/login");

  const data = await getExecutiveDashboardData();

  // ── Health evaluation ──
  const latestD7Cohort = data.retention.cohorts.find((c) => c.d7Rate !== null);
  const latestD7 = latestD7Cohort?.d7Rate ?? null;
  const health = evaluateFounderHealth({
    paymentMismatchCount: data.paymentHealth.summary.totalAffected,
    paymentMismatchRevenue: data.paymentHealth.summary.totalRevenueAtRisk,
    dataQualityCriticalCount: 0, // fetched separately in data quality API
    activePremium: data.premium.active.value,
    mrrValue: data.revenue.mrr.value,
    cashCollectedAllTime: data.revenue.cashCollectedAllTime,
    premiumConversionRate: data.premium.conversionRate,
    eligibleUserCount: data.users.guru,
    dauToday: data.dauConsecutive.today,
    dauYesterday: data.dauConsecutive.yesterday,
    dauTwoDaysAgo: data.dauConsecutive.twoDaysAgo,
    latestD7Rate: latestD7,
    latestD7CohortSize: latestD7Cohort?.registered ?? 0,
    jalurCompleted7d: data.learning.jalurCompleted7d.value,
  });

  // ── Investor growth snapshot ──
  const growth = deriveInvestorGrowth(data);

  const now = new Date(data.timestamp);
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
  const dateStr = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });

  const { mrrBreakdown } = data.revenue;

  // ── Retention summary ──
  const d7Rates = data.retention.cohorts.filter((c) => c.d7Rate !== null).map((c) => c.d7Rate!);
  const d30Rates = data.retention.cohorts.filter((c) => c.d30Rate !== null).map((c) => c.d30Rate!);
  const medianD7 = d7Rates.length > 0 ? d7Rates[Math.floor(d7Rates.length / 2)] : null;
  const medianD30 = d30Rates.length > 0 ? d30Rates[Math.floor(d30Rates.length / 2)] : null;

  return (
    <div className="space-y-6">
      {/* ═══ SECTION 1: Business Health Banner ═══ */}
      <div className={`rounded-2xl border-2 p-5 ${
        health.status === "CRITICAL" ? "border-red-300 dark:border-red-700 bg-gradient-to-r from-red-50 via-red-50/50 to-white dark:from-red-950/40 dark:via-red-950/20 dark:to-slate-800/90" :
        health.status === "ATTENTION" ? "border-amber-200 dark:border-amber-700 bg-gradient-to-r from-amber-50 via-amber-50/50 to-white dark:from-amber-950/30 dark:via-amber-950/15 dark:to-slate-800/90" :
        "border-emerald-200 dark:border-emerald-700 bg-gradient-to-r from-emerald-50 via-emerald-50/50 to-white dark:from-emerald-950/30 dark:via-emerald-950/15 dark:to-slate-800/90"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              health.status === "CRITICAL" ? "bg-red-100 dark:bg-red-900/60" :
              health.status === "ATTENTION" ? "bg-amber-100 dark:bg-amber-900/60" :
              "bg-emerald-100 dark:bg-emerald-900/60"
            }`}>
              {health.status === "CRITICAL" ? <AlertTriangle size={24} className="text-red-600 dark:text-red-400" /> :
               health.status === "ATTENTION" ? <Zap size={24} className="text-amber-600 dark:text-amber-400" /> :
               <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Founder Control Tower</h1>
                <HealthBadge status={health.status} />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{health.summary}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-400 dark:text-slate-500">{dateStr}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{timeStr} WIB</p>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 2: 5 Core KPI Cards ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Link href="/admin/users" className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center"><Users size={18} className="text-white" /></div>
            <TrendArrow value={data.growth.new30d.trend} />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{formatNum(data.users.total)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total Users</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{formatNum(data.users.murid)} murid · {formatNum(data.users.guru)} guru</p>
        </Link>

        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center"><Activity size={18} className="text-white" /></div>
            <TrendArrow value={data.active.dau.trend} />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{formatNum(data.active.dau.value)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">DAU</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">WAU {formatNum(data.active.wau.value)} · MAU {formatNum(data.active.mau.value)}</p>
        </div>

        <Link href="/admin/premium" className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center"><Crown size={18} className="text-white" /></div>
            <TrendArrow value={data.premium.active.trend} />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{data.premium.active.value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Active Premium</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{data.premium.murid} murid · {data.premium.guru} guru</p>
        </Link>

        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center"><DollarSign size={18} className="text-white" /></div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{formatRp(data.revenue.mrr.value)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">MRR</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            {!data.revenue.mrr.comparisonAvailable ? "Belum tersedia trend" : ""}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center"><TrendingUp size={18} className="text-white" /></div>
            <TrendArrow value={data.revenue.cashCollected30d.trend} />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{formatRp(data.revenue.cashCollected30d.value)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cash Collected (30d)</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">All-time: {formatRp(data.revenue.cashCollectedAllTime)}</p>
        </div>
      </div>

      {/* ═══ SECTION 2B: Live Pulse (Near-Real-Time Presence) ═══ */}
      <LivePulseCard />

      {/* Payment Health Alert */}
      {data.paymentHealth.summary.totalAffected > 0 && <PaymentHealthAlert data={data.paymentHealth} />}

      {/* ═══ SECTION 3: 3-Column Founder Intelligence ═══ */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Column A: Growth */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2 text-sm"><Activity size={14} className="text-violet-500" /> Growth</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            <MetricRow label="DAU" value={formatNum(data.active.dau.value)} trend={data.active.dau.trend} />
            <MetricRow label="WAU" value={formatNum(data.active.wau.value)} trend={data.active.wau.trend} />
            <MetricRow label="MAU" value={formatNum(data.active.mau.value)} trend={data.active.mau.trend} />
            <MetricRow label="D7 Retention" value={medianD7 !== null ? `${medianD7}%` : "Belum cukup data"} />
            <MetricRow label="D30 Retention" value={medianD30 !== null ? `${medianD30}%` : "Belum cukup data"} />
            <MetricRow label="New Users (7d)" value={formatNum(data.growth.new7d.value)} trend={data.growth.new7d.trend} />
          </div>
        </div>

        {/* Column B: Revenue Mix */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2 text-sm"><DollarSign size={14} className="text-green-500" /> Revenue Mix</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            <MetricRow label="MRR Total" value={formatRp(mrrBreakdown.total)} />
            <MetricRow label="Murid Monthly" value={formatRp(mrrBreakdown.muridMonthly)} />
            <MetricRow label="Murid Yearly" value={formatRp(mrrBreakdown.muridYearly)} />
            <MetricRow label="Guru Monthly" value={formatRp(mrrBreakdown.guruMonthly)} />
            <MetricRow label="Guru Yearly" value={formatRp(mrrBreakdown.guruYearly)} />
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Tx Sukses (30d)</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{data.revenue.transactionsSuccess30d}</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-slate-500 dark:text-slate-400">Pending</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{data.revenue.transactionsPending}</span>
            </div>
          </div>
        </div>

        {/* Column C: Payment Trust */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2 text-sm"><ShieldAlert size={14} className="text-red-500" /> Payment Trust</h2>
          <div className="space-y-3">
            <div className={`flex items-center justify-between p-3 rounded-xl ${
              data.paymentHealth.summary.totalAffected === 0
                ? "bg-emerald-50 dark:bg-emerald-950/30"
                : "bg-red-50 dark:bg-red-950/30"
            }`}>
              <div className="flex items-center gap-2">
                {data.paymentHealth.summary.totalAffected === 0
                  ? <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                  : <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />}
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {data.paymentHealth.summary.totalAffected === 0 ? "Payment → Premium" : "Mismatch"}
                </span>
              </div>
              <span className={`text-sm font-bold ${
                data.paymentHealth.summary.totalAffected === 0
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-red-700 dark:text-red-300"
              }`}>
                {data.paymentHealth.summary.totalAffected === 0 ? "Healthy" : `${data.paymentHealth.summary.totalAffected}`}
              </span>
            </div>
            {data.paymentHealth.summary.totalAffected > 0 && (
              <Link href="/admin/payments" className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors">
                Investigasi Pembayaran <ArrowRight size={10} />
              </Link>
            )}
            <MetricRow label="Premium Conversion" value={`${data.premium.conversionRate}%`} />
            <MetricRow label="Trial Active" value={String(data.premium.trialActive)} />
          </div>
        </div>
      </div>

      {/* ═══ SECTION 4: Founder Priorities ═══ */}
      {health.priorities.length > 0 && (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2 text-sm"><Target size={14} className="text-red-500" /> Prioritas Founder Minggu Ini</h2>
          <div className="space-y-3">
            {health.priorities.map((p, i) => <PriorityCard key={i} p={p} />)}
          </div>
        </div>
      )}

      {/* ═══ SECTION 5: Retention (collapsed) ═══ */}
      {data.retention.cohorts.length > 0 && (
        <details className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700">
          <summary className="p-5 cursor-pointer select-none flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Retention Cohorts</h2>
              {medianD7 !== null && <span className="text-xs text-slate-500 dark:text-slate-400">D7: {medianD7}%</span>}
              {medianD30 !== null && <span className="text-xs text-slate-500 dark:text-slate-400">D30: {medianD30}%</span>}
            </div>
            <ChevronDown size={16} className="text-slate-400" />
          </summary>
          <div className="px-5 pb-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/50">
                  <th className="pb-2 font-medium">Cohort</th>
                  <th className="pb-2 font-medium text-right">Registered</th>
                  <th className="pb-2 font-medium text-right">D7 Active</th>
                  <th className="pb-2 font-medium text-right">D7 Rate</th>
                  <th className="pb-2 font-medium text-right">D30 Active</th>
                  <th className="pb-2 font-medium text-right">D30 Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.retention.cohorts.map((c) => (
                  <tr key={c.label} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                    <td className="py-2.5 font-medium text-slate-700 dark:text-slate-200">{c.label}</td>
                    <td className="py-2.5 text-right text-slate-600 dark:text-slate-300">{c.registered}</td>
                    <td className="py-2.5 text-right text-slate-600 dark:text-slate-300">{c.active7d !== null ? c.active7d : <span className="text-slate-400">—</span>}</td>
                    <td className="py-2.5 text-right">
                      <span className={`font-medium ${c.d7Rate !== null && c.d7Rate > 50 ? "text-emerald-600 dark:text-emerald-400" : c.d7Rate !== null ? "text-slate-600 dark:text-slate-300" : "text-slate-400"}`}>
                        {c.d7Rate !== null ? `${c.d7Rate}%` : <span className="text-xs">belum cukup</span>}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-slate-600 dark:text-slate-300">{c.active30d !== null ? c.active30d : <span className="text-slate-400">—</span>}</td>
                    <td className="py-2.5 text-right">
                      <span className={`font-medium ${c.d30Rate !== null && c.d30Rate > 30 ? "text-emerald-600 dark:text-emerald-400" : c.d30Rate !== null ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`}>
                        {c.d30Rate !== null ? `${c.d30Rate}%` : <span className="text-xs">belum cukup</span>}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* ═══ SECTION 6: Investor Growth Intelligence ═══ */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2 text-sm">
          <BarChart3 size={14} className="text-blue-500" /> Investor Growth Intelligence
        </h2>

        {/* Row 1: User Growth + Engagement + Monetization */}
        <div className="grid lg:grid-cols-3 gap-5 mb-5">
          {/* User Growth */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User Growth</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">Total Users</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatNum(growth.userGrowth.totalUsers)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">New (7d)</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatNum(growth.userGrowth.newUsers7d.current ?? 0)}</span>
                  <TrendArrow value={growth.userGrowth.newUsers7d.delta ?? 0} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">New (30d)</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatNum(growth.userGrowth.newUsers30d.current ?? 0)}</span>
                  <TrendArrow value={growth.userGrowth.newUsers30d.delta ?? 0} />
                </div>
              </div>
            </div>
          </div>

          {/* Engagement */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Engagement</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">DAU</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatNum(growth.engagement.dau.current ?? 0)}</span>
                  <TrendArrow value={growth.engagement.dau.delta ?? 0} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">WAU</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatNum(growth.engagement.wau.current ?? 0)}</span>
                  <TrendArrow value={growth.engagement.wau.delta ?? 0} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">MAU</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatNum(growth.engagement.mau.current ?? 0)}</span>
                  <TrendArrow value={growth.engagement.mau.delta ?? 0} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">DAU/MAU</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {growth.engagement.dauMauRatio !== null ? `${growth.engagement.dauMauRatio}%` : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Monetization */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Monetization</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">Active Premium</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{growth.monetization.activePremium}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">MRR</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatRp(growth.monetization.mrr)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">Cash (30d)</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatRp(growth.monetization.cashCollected30d.current ?? 0)}</span>
                  <TrendArrow value={growth.monetization.cashCollected30d.delta ?? 0} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">Conversion</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {growth.monetization.premiumConversion !== null ? `${growth.monetization.premiumConversion}%` : "Belum cukup data"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Revenue Growth + Learning Activity */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Revenue Growth */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Revenue Growth</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">Current MRR</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatRp(growth.revenueGrowth.currentMrr)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">MRR Trend</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {growth.revenueGrowth.available ? "Tersedia" : "Belum tersedia"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">Cash All-Time</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatRp(growth.monetization.cashCollectedAllTime)}</span>
              </div>
            </div>
          </div>

          {/* Learning Activity */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Learning Activity</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">Completions (7d)</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatNum(growth.learning.completions7d.current ?? 0)}</span>
                  <TrendArrow value={growth.learning.completions7d.delta ?? 0} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">UKBI Sessions (7d)</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatNum(growth.learning.ukbiSessions7d)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">Karya Created (7d)</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatNum(growth.learning.karya7d.current ?? 0)}</span>
                  <TrendArrow value={growth.learning.karya7d.delta ?? 0} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
