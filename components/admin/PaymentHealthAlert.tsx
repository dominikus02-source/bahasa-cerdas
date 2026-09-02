"use client";

import { useState } from "react";
import { ShieldAlert, ArrowRight, Loader2, CheckCircle2, X } from "lucide-react";

interface AffectedUser {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  totalPaid: number;
  transactions: {
    id: string;
    type: string;
    amount: number;
    reference: string | null;
    orderId: string | null;
    createdAt: string;
  }[];
}

interface PaymentHealthData {
  summary: {
    totalAffected: number;
    totalRevenueAtRisk: number;
    affectedByRole: { murid: number; guru: number };
  };
  affectedUsers: AffectedUser[];
}

function formatRp(v: number): string {
  if (v >= 1_000_000) return `Rp${(v / 1_000_000).toFixed(1)}jt`;
  if (v >= 1_000) return `Rp${Math.round(v / 1_000)}rb`;
  return `Rp${v}`;
}

export function PaymentHealthAlert({ data }: { data: PaymentHealthData }) {
  const [expanded, setExpanded] = useState(false);
  const [fixingUser, setFixingUser] = useState<string | null>(null);
  const [fixResult, setFixResult] = useState<{ userId: string; status: string; message: string } | null>(null);
  const [confirmUser, setConfirmUser] = useState<AffectedUser | null>(null);
  const [confirmTx, setConfirmTx] = useState<AffectedUser["transactions"][0] | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (data.summary.totalAffected === 0) return null;

  async function handleFix(user: AffectedUser, tx: AffectedUser["transactions"][0]) {
    setConfirmUser(user);
    setConfirmTx(tx);
    setReason("");
    setExpanded(true);
  }

  async function executeFix() {
    if (!confirmUser || !confirmTx || !reason.trim()) return;
    setLoading(true);
    setFixingUser(confirmUser.userId);
    try {
      const res = await fetch("/api/admin/analytics/payment-health/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: confirmTx.id, reason: reason.trim() }),
      });
      const result = await res.json();
      setFixResult({
        userId: confirmUser.userId,
        status: result.status || (res.ok ? "fixed" : "error"),
        message: result.message || result.error || "Unknown result",
      });
      setConfirmUser(null);
      setConfirmTx(null);
    } catch {
      setFixResult({ userId: confirmUser.userId, status: "error", message: "Network error" });
      setConfirmUser(null);
      setConfirmTx(null);
    } finally {
      setLoading(false);
      setFixingUser(null);
    }
  }

  return (
    <div className="bg-gradient-to-r from-red-50 via-red-50/50 to-white dark:from-red-950/40 dark:via-red-950/20 dark:to-slate-800/90 rounded-2xl border-2 border-red-300 dark:border-red-700 p-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/60 flex items-center justify-center shrink-0">
          <ShieldAlert size={24} className="text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-red-800 dark:text-red-200">⚠️ Payment Without Entitlement</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white animate-pulse">
              {data.summary.totalAffected} AFFECTED
            </span>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400">
            {data.summary.totalAffected} user membayar SUCCESS tapi premium tidak aktif.
            Cash at risk: {formatRp(data.summary.totalRevenueAtRisk)}.
            {" "}
            <span className="font-medium">
              ({data.summary.affectedByRole.murid} murid · {data.summary.affectedByRole.guru} guru)
            </span>
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {data.affectedUsers.slice(0, 3).map((u) => (
              <span key={u.userId} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full text-[10px]">
                {u.fullName} — {formatRp(u.totalPaid)}
              </span>
            ))}
            {data.summary.totalAffected > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full text-[10px]">
                +{data.summary.totalAffected - 3} lainnya
              </span>
            )}
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-red-400 hover:text-red-600 shrink-0 mt-1">
          <ArrowRight size={16} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
        </button>
      </div>

      {/* Fix result feedback */}
      {fixResult && (
        <div className={`mt-3 p-3 rounded-xl text-xs ${fixResult.status === "fixed" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" : fixResult.status === "already_active" ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800" : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"}`}>
          <div className="flex items-center gap-2">
            {fixResult.status === "fixed" ? <CheckCircle2 size={14} /> : null}
            <span className="font-medium">{fixResult.message}</span>
          </div>
          <button onClick={() => setFixResult(null)} className="mt-1 text-[10px] underline opacity-70">Dismiss</button>
        </div>
      )}

      {/* Expanded detail table */}
      {expanded && (
        <div className="mt-4 pt-3 border-t border-red-200 dark:border-red-800">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-red-600 dark:text-red-400">
                  <th className="pb-1 font-medium">User</th>
                  <th className="pb-1 font-medium">Role</th>
                  <th className="pb-1 font-medium">Total Dibayar</th>
                  <th className="pb-1 font-medium">Transaksi</th>
                  <th className="pb-1 font-medium">isPremium</th>
                  <th className="pb-1 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.affectedUsers.map((u) => (
                  <tr key={u.userId} className="border-t border-red-100 dark:border-red-900/50">
                    <td className="py-1.5">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{u.fullName}</p>
                      <p className="text-[10px] text-slate-400">{u.email}</p>
                    </td>
                    <td className="py-1.5 text-slate-600 dark:text-slate-300">{u.role}</td>
                    <td className="py-1.5 font-semibold text-red-700 dark:text-red-300">{formatRp(u.totalPaid)}</td>
                    <td className="py-1.5 text-slate-500 dark:text-slate-400">
                      {u.transactions.map((t) => (
                        <span key={t.id} className="block">{t.reference || t.type} — {new Date(t.createdAt).toLocaleDateString("id-ID")}</span>
                      ))}
                    </td>
                    <td className="py-1.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                        ❌ false
                      </span>
                    </td>
                    <td className="py-1.5 text-right">
                      {u.transactions.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleFix(u, t)}
                          disabled={loading && fixingUser === u.userId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-medium disabled:opacity-50"
                        >
                          {loading && fixingUser === u.userId ? <Loader2 size={10} className="animate-spin" /> : <ShieldAlert size={10} />}
                          Fix Entitlement
                        </button>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      {confirmUser && confirmTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setConfirmUser(null); setConfirmTx(null); }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/60 flex items-center justify-center">
                <ShieldAlert size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Fix Premium Entitlement</h3>
                <p className="text-[10px] text-slate-500">Tindakan ini akan mengaktifkan premium untuk user ini.</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">User</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{confirmUser.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email</span>
                <span className="text-slate-700 dark:text-slate-300">{confirmUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction</span>
                <span className="text-slate-700 dark:text-slate-300">{confirmTx.reference || confirmTx.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="font-medium text-red-600 dark:text-red-400">{formatRp(confirmTx.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="text-slate-700 dark:text-slate-300">{new Date(confirmTx.createdAt).toLocaleDateString("id-ID")}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Alasan Remediasi *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Contoh: Webhook gagal mengaktifkan premium setelah pembayaran sukses"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setConfirmUser(null); setConfirmTx(null); }}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
              >
                Batal
              </button>
              <button
                onClick={executeFix}
                disabled={!reason.trim() || loading}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <ShieldAlert size={12} />}
                Fix Entitlement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
