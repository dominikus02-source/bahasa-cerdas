"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, RefreshCw, Loader2, ChevronLeft, ChevronRight,
  Crown, Users, Clock, XCircle, AlertTriangle, Sparkles,
  Shield, GraduationCap, Filter, DollarSign, TrendingUp, Repeat, AlertCircle,
} from "lucide-react";

interface PremiumUser {
  userId: string;
  fullName: string;
  email: string;
  audience: string;
  role: string;
  isPremium: boolean;
  premiumPlan: string;
  premiumUntil: string | null;
  premiumStatus: string;
  daysUntilExpiry: number | null;
  subscriptionPlan: string | null;
  amount: number | null;
  lastTransaction: {
    id: string;
    status: string;
    reference: string;
    orderId: string;
    midtransId: string | null;
    amount: number;
    createdAt: string;
  } | null;
}

interface Summary {
  totalActive: number;
  muridActive: number;
  guruActive: number;
  expiringSoon: number;
  expired: number;
  mrr: { total: number; activeMuridPremium: number; activeGuruPremium: number };
  cashCollectedByAudience: { murid: number; guru: number };
  funnel: { registered: number; activePremium: number; renewed: number };
  churnRisk: { expiringIn7d: number; expiringIn14d: number; expiringIn30d: number };
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktif",
  EXPIRING_SOON: "Segera Berakhir",
  EXPIRED: "Kadaluarsa",
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  EXPIRING_SOON: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  EXPIRED: "bg-gray-50 dark:bg-slate-800/60 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700",
};

const AUDIENCE_BADGE: Record<string, string> = {
  MURID: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  GURU: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
};

const PLAN_LABEL: Record<string, string> = {
  MURID_PREMIUM_MONTHLY: "Bulanan",
  MURID_PREMIUM_YEARLY: "Tahunan",
  GURU_PRO_MONTHLY: "Bulanan",
  GURU_PRO_YEARLY: "Tahunan",
};

const PLAN_BADGE: Record<string, string> = {
  MURID_PREMIUM_MONTHLY: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
  MURID_PREMIUM_YEARLY: "bg-violet-200 dark:bg-violet-900/60 text-violet-800 dark:text-violet-200",
  GURU_PRO_MONTHLY: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  GURU_PRO_YEARLY: "bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200",
};

export default function AdminPremiumReportPage() {
  const [data, setData] = useState<{
    summary: Summary;
    data: PremiumUser[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
    filters: Record<string, string | null>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [audience, setAudience] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [planFilter, setPlanFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<PremiumUser | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "25");
    if (audience !== "ALL") params.set("audience", audience);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (planFilter !== "ALL") params.set("plan", planFilter);
    if (search) params.set("search", search);

    const res = await fetch(`/api/admin/premium/report?${params}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [page, audience, statusFilter, planFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatRupiah = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;
  const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  const expiryLabel = (u: PremiumUser) => {
    if (!u.premiumUntil) return "-";
    if (u.premiumStatus === "EXPIRED") return "Berakhir";
    if (u.premiumStatus === "ACTIVE" || u.premiumStatus === "EXPIRING_SOON") {
      if (u.daysUntilExpiry !== null) {
        if (u.daysUntilExpiry <= 0) return "Berakhir hari ini";
        if (u.daysUntilExpiry === 1) return "Berakhir besok";
        return `${u.daysUntilExpiry} hari lagi`;
      }
    }
    return formatDate(u.premiumUntil);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Premium Report</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Laporan lengkap Premium Murid dan Guru Pro dalam satu tampilan.
          </p>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-violet-500 dark:text-violet-400" />
              <p className="text-xs text-slate-400">Total Premium Aktif</p>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data.summary.totalActive}</p>
          </div>
          <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-violet-200 dark:border-violet-800 p-4">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="w-4 h-4 text-violet-500 dark:text-violet-400" />
              <p className="text-xs text-violet-500 dark:text-violet-400">Premium Murid</p>
            </div>
            <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">{data.summary.muridActive}</p>
          </div>
          <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <p className="text-xs text-emerald-500 dark:text-emerald-400">Premium Guru</p>
            </div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{data.summary.guruActive}</p>
          </div>
          <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <p className="text-xs text-amber-500 dark:text-amber-400">Segera Berakhir</p>
            </div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{data.summary.expiringSoon}</p>
          </div>
        </div>
      )}

      {/* Premium Command Center */}
      {data?.summary?.mrr && (
        <div className="grid md:grid-cols-3 gap-4">
          {/* MRR */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-2xl border border-green-200 dark:border-green-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign size={16} className="text-green-600 dark:text-green-400" />
              <h3 className="text-sm font-semibold text-green-800 dark:text-green-200">MRR (Normalized)</h3>
            </div>
            <p className="text-3xl font-bold text-green-900 dark:text-green-100">Rp {(data.summary.mrr.total / 1000).toFixed(0)}rb</p>
            <p className="text-[10px] text-green-600 dark:text-green-400 mt-1">Dari subscription aktif (bukan cash collected)</p>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-700 dark:text-green-300">Guru Pro ({data.summary.mrr.activeGuruPremium})</span>
                <span className="font-semibold text-green-800 dark:text-green-200">{data.summary.mrr.activeGuruPremium} aktif</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-700 dark:text-green-300">Murid Premium ({data.summary.mrr.activeMuridPremium})</span>
                <span className="font-semibold text-green-800 dark:text-green-200">{data.summary.mrr.activeMuridPremium} aktif</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
              <p className="text-[10px] text-green-600 dark:text-green-400 mb-1.5">Cash Collected (all-time)</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-700 dark:text-green-300">Murid</span>
                <span className="font-semibold text-green-800 dark:text-green-200">Rp {(data.summary.cashCollectedByAudience.murid / 1000).toFixed(0)}rb</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-green-700 dark:text-green-300">Guru</span>
                <span className="font-semibold text-green-800 dark:text-green-200">Rp {(data.summary.cashCollectedByAudience.guru / 1000).toFixed(0)}rb</span>
              </div>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl border border-blue-200 dark:border-blue-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">Conversion Funnel</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-blue-700 dark:text-blue-300">Registered</span>
                  <span className="font-semibold text-blue-800 dark:text-blue-200">{data.summary.funnel.registered.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-blue-200 dark:bg-blue-800">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: "100%" }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-blue-700 dark:text-blue-300">Active Premium</span>
                  <span className="font-semibold text-blue-800 dark:text-blue-200">{data.summary.funnel.activePremium}</span>
                </div>
                <div className="h-2 rounded-full bg-blue-200 dark:bg-blue-800">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${data.summary.funnel.registered > 0 ? (data.summary.funnel.activePremium / data.summary.funnel.registered) * 100 : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-blue-700 dark:text-blue-300">Renewed</span>
                  <span className="font-semibold text-blue-800 dark:text-blue-200">{data.summary.funnel.renewed}</span>
                </div>
                <div className="h-2 rounded-full bg-blue-200 dark:bg-blue-800">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${data.summary.funnel.registered > 0 ? (data.summary.funnel.renewed / data.summary.funnel.registered) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
            <p className="mt-3 text-[10px] text-blue-600 dark:text-blue-400">
              Conversion: {data.summary.funnel.registered > 0 ? ((data.summary.funnel.activePremium / data.summary.funnel.registered) * 100).toFixed(1) : 0}%
              {" · "}Renewal: {data.summary.funnel.activePremium > 0 ? ((data.summary.funnel.renewed / data.summary.funnel.activePremium) * 100).toFixed(1) : 0}%
            </p>
          </div>

          {/* Churn Risk */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={16} className="text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">Churn Risk</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{data.summary.churnRisk.expiringIn7d}</p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">Berakhir ≤7 hari</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{data.summary.churnRisk.expiringIn14d}</p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">≤14 hari</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-amber-200 dark:border-amber-800">
                <div>
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{data.summary.churnRisk.expiringIn30d}</p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">≤30 hari</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                    {data.summary.totalActive > 0 ? ((data.summary.churnRisk.expiringIn30d / data.summary.totalActive) * 100).toFixed(0) : 0}%
                  </p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">dari total aktif</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
          <Filter size={14} className="text-slate-400" />
          <select value={audience} onChange={(e) => { setAudience(e.target.value); setPage(1); }}
            className="text-sm bg-transparent outline-none">
            <option value="ALL">Semua</option>
            <option value="MURID">Murid</option>
            <option value="GURU">Guru</option>
          </select>
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800/90">
          <option value="ALL">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="EXPIRING_SOON">Segera Berakhir</option>
          <option value="EXPIRED">Kadaluarsa</option>
        </select>
        <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800/90">
          <option value="ALL">Semua Paket</option>
          <option value="MURID_PREMIUM_MONTHLY">Murid Bulanan</option>
          <option value="MURID_PREMIUM_YEARLY">Murid Tahunan</option>
          <option value="GURU_PRO_MONTHLY">Guru Bulanan</option>
          <option value="GURU_PRO_YEARLY">Guru Tahunan</option>
        </select>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari nama / email..."
            className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800/90 w-56" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 text-xs">Nama</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 text-xs">Audience</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 text-xs">Paket</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 text-xs">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 text-xs">Berakhir</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 text-xs">Harga</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 text-xs">Pembayaran Terakhir</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 text-xs">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-16 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
              ) : data?.data.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-slate-400">Tidak ada data premium ditemukan.</td></tr>
              ) : (
                data?.data.map((u) => (
                  <tr key={u.userId} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:bg-slate-800/50/50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-xs">{u.fullName}</p>
                      <p className="text-[10px] text-slate-400">{u.email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border font-medium ${AUDIENCE_BADGE[u.audience] || ""}`}>
                        {u.audience === "MURID" ? "🎓 Murid" : "👨‍🏫 Guru"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.subscriptionPlan ? (
                        <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-medium ${PLAN_BADGE[u.subscriptionPlan] || ""}`}>
                          {u.subscriptionPlan.includes("YEARLY") ? "Tahunan" : "Bulanan"}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_BADGE[u.premiumStatus] || ""}`}>
                        {u.premiumStatus === "ACTIVE" && <Crown className="w-3 h-3 mr-1" />}
                        {u.premiumStatus === "EXPIRING_SOON" && <Clock className="w-3 h-3 mr-1" />}
                        {u.premiumStatus === "EXPIRED" && <XCircle className="w-3 h-3 mr-1" />}
                        {STATUS_LABEL[u.premiumStatus] || u.premiumStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className={u.premiumStatus === "EXPIRING_SOON" ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>
                        {expiryLabel(u)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-slate-100 text-xs">
                      {u.amount != null ? formatRupiah(u.amount) : "-"}
                    </td>
                    <td className="py-3 px-4">
                      {u.lastTransaction ? (
                        <div>
                          <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
                            u.lastTransaction.status === "SUCCESS"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              : u.lastTransaction.status === "PENDING"
                                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                : "bg-gray-50 dark:bg-slate-800/60 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700"
                          }`}>
                            {u.lastTransaction.status}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(u.lastTransaction.createdAt)}</p>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => setDetail(u)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:bg-slate-800/70 text-slate-400 hover:text-slate-600 dark:text-slate-300"
                        title="Detail">
                        <Shield size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50/50">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {((page - 1) * 25) + 1}-{Math.min(page * 25, data.pagination.total)} dari {data.pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30">
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-slate-600 dark:text-slate-300 px-2">{page} / {data.pagination.totalPages}</span>
              <button onClick={() => setPage(Math.min(data.pagination.totalPages, page + 1))} disabled={page >= data.pagination.totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detail && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setDetail(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl z-50 w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Detail Premium</h2>
              <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:bg-slate-800/70 text-slate-400">
                <XCircle size={18} />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Nama</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{detail.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Email</span>
                <span className="text-xs text-slate-700 dark:text-slate-200">{detail.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Audience</span>
                <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border font-medium ${AUDIENCE_BADGE[detail.audience] || ""}`}>
                  {detail.audience === "MURID" ? "🎓 Murid" : "👨‍🏫 Guru"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Status Premium</span>
                <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_BADGE[detail.premiumStatus] || ""}`}>
                  {STATUS_LABEL[detail.premiumStatus] || detail.premiumStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Plan DB</span>
                <span>{detail.premiumPlan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Paket Transaksi</span>
                <span>{detail.subscriptionPlan || "-"}</span>
              </div>
              {detail.premiumUntil && (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Berakhir</span>
                  <span>
                    {formatDate(detail.premiumUntil)}
                    {detail.daysUntilExpiry !== null && detail.daysUntilExpiry > 0 && (
                      <span className="text-xs text-slate-400 ml-1">({detail.daysUntilExpiry} hari lagi)</span>
                    )}
                  </span>
                </div>
              )}
              {detail.amount != null && (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Harga</span>
                  <span className="font-semibold">{formatRupiah(detail.amount)}</span>
                </div>
              )}

              {detail.lastTransaction && (
                <>
                  <div className="h-px bg-slate-100 dark:bg-slate-700 my-3" />
                  <p className="font-semibold text-slate-700 dark:text-slate-200 text-xs mb-2">Pembayaran Terakhir</p>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Status</span>
                    <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                      detail.lastTransaction.status === "SUCCESS"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                    }`}>
                      {detail.lastTransaction.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Order ID</span>
                    <span className="font-mono text-xs text-slate-700 dark:text-slate-200">{detail.lastTransaction.orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Tanggal</span>
                    <span className="text-xs">{formatDate(detail.lastTransaction.createdAt)}</span>
                  </div>
                  {detail.lastTransaction.midtransId && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Midtrans ID</span>
                      <span className="font-mono text-xs">{detail.lastTransaction.midtransId}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
