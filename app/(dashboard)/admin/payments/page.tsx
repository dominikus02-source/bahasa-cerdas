"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, RefreshCw, Loader2, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, XCircle, AlertTriangle, Shield,
  DollarSign, ShoppingBag, Eye, Sparkles,
} from "lucide-react";

interface PaymentTransaction {
  id: string;
  orderId: string | null;
  amount: number;
  status: string;
  planId: string | null;
  createdAt: string;
  updatedAt: string;
  midtransId: string | null;
  user: {
    id: string;
    fullName: string;
    email: string;
    isPremium: boolean;
    premiumPlan: string;
    premiumUntil: string | null;
  };
  premiumActivated: boolean;
}

interface Stats {
  total: number;
  allTimeRevenue: number;
  success: number;
  pending: number;
  failed: number;
  revenueThisMonth: number;
  revenueAllTime: number;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  SUCCESS: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  PENDING: <Clock className="w-4 h-4 text-amber-500" />,
  FAILED: <XCircle className="w-4 h-4 text-red-500" />,
  CANCELLED: <XCircle className="w-4 h-4 text-gray-400" />,
  EXPIRED: <XCircle className="w-4 h-4 text-gray-400" />,
};

const STATUS_BADGE: Record<string, string> = {
  SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
  CANCELLED: "bg-gray-50 text-gray-500 border-gray-200",
  EXPIRED: "bg-gray-50 text-gray-500 border-gray-200",
};

export default function AdminPaymentsPage() {
  const [data, setData] = useState<{ transactions: PaymentTransaction[]; stats: Stats; pagination: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [detail, setDetail] = useState<PaymentTransaction | null>(null);
  const [manualActivateId, setManualActivateId] = useState<string | null>(null);
  const [manualReason, setManualReason] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState("");
  const [health, setHealth] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (planFilter) params.set("planId", planFilter);

    const res = await fetch(`/api/admin/payments?${params}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [page, search, statusFilter, planFilter, sortBy, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    fetch("/api/admin/payments/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {});
  }, []);

  const handleManualActivate = async () => {
    if (!manualActivateId) return;
    setManualLoading(true);
    setManualError("");
    const res = await fetch("/api/admin/payments/manual-activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId: manualActivateId, reason: manualReason }),
    });
    const result = await res.json();
    if (res.ok) {
      setManualActivateId(null);
      setManualReason("");
      fetchData();
    } else {
      setManualError(result.error || "Gagal");
    }
    setManualLoading(false);
  };

  const formatRupiah = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;
  const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pembayaran</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola transaksi Guru Pro dan pantau pendapatan.</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Stats */}
      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-400 mb-1">Total Transaksi</p>
            <p className="text-xl font-bold text-slate-900">{data.stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 p-4">
            <p className="text-xs text-emerald-500 mb-1">Sukses</p>
            <p className="text-xl font-bold text-emerald-700">{data.stats.success}</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-4">
            <p className="text-xs text-amber-500 mb-1">Menunggu</p>
            <p className="text-xl font-bold text-amber-700">{data.stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-4">
            <p className="text-xs text-red-500 mb-1">Gagal/Batal</p>
            <p className="text-xl font-bold text-red-700">{data.stats.failed}</p>
          </div>
          <div className="bg-white rounded-xl border border-violet-200 p-4">
            <p className="text-xs text-violet-500 mb-1">Bulan Ini</p>
            <p className="text-lg font-bold text-violet-700">{formatRupiah(data.stats.revenueThisMonth)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-400 mb-1">Total Pendapatan</p>
            <p className="text-lg font-bold text-slate-900">{formatRupiah(data.stats.revenueAllTime)}</p>
          </div>
        </div>
      )}

      {/* Health Banner */}
      {health && (health.pendingOlder30Min > 0 || health.paymentWithoutPremium > 0 || health.premiumWithoutLedger > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-900 flex items-center gap-2">
            <AlertTriangle size={16} /> Payment Health
          </p>
          <div className="flex flex-wrap gap-3 text-xs">
            {health.pendingOlder30Min > 0 && (
              <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-lg">{health.pendingOlder30Min} MENUNGGU &gt;30 menit</span>
            )}
            {health.paymentWithoutPremium > 0 && (
              <span className="bg-red-100 text-red-700 px-2 py-1 rounded-lg">{health.paymentWithoutPremium} bayar sukses tanpa PRO</span>
            )}
            {health.premiumWithoutLedger > 0 && (
              <span className="bg-red-100 text-red-700 px-2 py-1 rounded-lg">{health.premiumWithoutLedger} PRO tanpa ledger</span>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari user / email / orderId..."
            className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white w-64"
          />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white">
          <option value="">Semua Status</option>
          <option value="SUCCESS">Sukses</option>
          <option value="PENDING">Menunggu</option>
          <option value="FAILED">Gagal</option>
          <option value="CANCELLED">Batal</option>
          <option value="EXPIRED">Kadaluarsa</option>
        </select>
        <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white">
          <option value="">Semua Paket</option>
          <option value="GURU_PRO_MONTHLY">Bulanan</option>
          <option value="GURU_PRO_YEARLY">Tahunan</option>
        </select>
        <button onClick={() => { setSortDir(sortDir === "desc" ? "asc" : "desc"); }} className="text-xs text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2">
          {sortDir === "desc" ? "Terbaru" : "Terlama"}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-600 text-xs">Tanggal</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 text-xs">User</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 text-xs">Paket</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-600 text-xs">Jumlah</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 text-xs">Status</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 text-xs">PRO?</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 text-xs">Order ID</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 text-xs">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-16 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
              ) : data?.transactions.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-slate-400">Belum ada transaksi.</td></tr>
              ) : (
                data?.transactions.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-xs text-slate-500">{formatDate(t.createdAt)}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900 text-xs">{t.user.fullName}</p>
                      <p className="text-[10px] text-slate-400">{t.user.email}</p>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {t.planId === "GURU_PRO_YEARLY" ? "Tahunan" : t.planId === "GURU_PRO_MONTHLY" ? "Bulanan" : "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900 text-xs">{formatRupiah(t.amount)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[t.status] || "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        {STATUS_ICON[t.status]} {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {t.premiumActivated ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="py-3 px-4 text-[10px] text-slate-400 font-mono">{t.orderId}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setDetail(t)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Detail">
                          <Eye size={14} />
                        </button>
                        {t.status === "PENDING" && (
                          <button onClick={() => { setManualActivateId(t.id); setManualReason(""); setManualError(""); }} className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-500 hover:text-amber-700" title="Aktivasi Manual">
                            <Shield size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              {((page - 1) * 20) + 1}-{Math.min(page * 20, data.pagination.total)} dari {data.pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30">
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-slate-600 px-2">{page} / {data.pagination.totalPages}</span>
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
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">Detail Transaksi</h2>
              <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><XCircle size={18} /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Transaction ID</span><span className="font-mono text-xs text-slate-700">{detail.id}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Order ID</span><span className="font-mono text-xs text-slate-700">{detail.orderId}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Paket</span><span>{detail.planId === "GURU_PRO_YEARLY" ? "Tahunan" : "Bulanan"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Jumlah</span><span className="font-semibold">{formatRupiah(detail.amount)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span>
                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[detail.status] || ""}`}>{STATUS_ICON[detail.status]} {detail.status}</span>
              </div>
              <div className="flex justify-between"><span className="text-slate-500">User</span><span className="font-medium">{detail.user.fullName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="text-xs">{detail.user.email}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Premium Aktif?</span>
                {detail.user.isPremium ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
              </div>
              {detail.user.premiumUntil && <div className="flex justify-between"><span className="text-slate-500">Premium Sampai</span><span>{formatDate(detail.user.premiumUntil)}</span></div>}
              <div className="flex justify-between"><span className="text-slate-500">Dibuat</span><span className="text-xs">{formatDate(detail.createdAt)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Diperbarui</span><span className="text-xs">{formatDate(detail.updatedAt)}</span></div>
              {detail.midtransId && <div className="flex justify-between"><span className="text-slate-500">Midtrans ID</span><span className="font-mono text-xs">{detail.midtransId}</span></div>}
            </div>
            {detail.status === "PENDING" && (
              <button onClick={() => { setDetail(null); setManualActivateId(detail.id); setManualReason(""); setManualError(""); }} className="mt-4 w-full bg-amber-500 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-amber-600">
                <Shield className="w-4 h-4 inline mr-1" /> Aktivasi Manual
              </button>
            )}
          </div>
        </>
      )}

      {/* Manual Activate Modal */}
      {manualActivateId && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setManualActivateId(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
              <div>
                <h2 className="font-bold text-slate-900">Aktivasi Manual</h2>
                <p className="text-xs text-slate-500">Hanya untuk situasi darurat (webhook gagal)</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Transaksi ini akan ditandai SUCCESS dan user akan diaktifkan PRO.
            </p>

            {manualError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 mb-4">{manualError}</div>
            )}

            <div className="mb-4">
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Alasan <span className="text-red-500">*</span>
                <span className="text-slate-400 font-normal ml-1">(maks. 300 karakter)</span>
              </label>
              <textarea
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
                maxLength={300}
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm resize-none"
                placeholder="Contoh: User sudah bayar via transfer tapi webhook tidak terkirim..."
              />
              <p className="text-[10px] text-slate-400 mt-1 text-right">{manualReason.length}/300</p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setManualActivateId(null)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Batal</button>
              <button onClick={handleManualActivate} disabled={manualLoading || !manualReason.trim()} className="flex-1 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50">
                {manualLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Aktivasi PRO"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
