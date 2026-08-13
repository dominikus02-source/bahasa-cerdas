"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Wallet, Clock, CheckCircle2, XCircle, Send, AlertCircle } from "lucide-react";

type Penarikan = {
  id: string;
  amount: number;
  status: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  notes: string | null;
  createdAt: string;
  processedAt: string | null;
  user: { id: string; fullName: string; email: string; saldo: number };
};

const STATUS_META: Record<string, { label: string; kelas: string; Icon: typeof Clock }> = {
  PENDING: { label: "Menunggu", kelas: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800", Icon: Clock },
  APPROVED: { label: "Disetujui", kelas: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800", Icon: CheckCircle2 },
  TRANSFERRED: { label: "Ditransfer", kelas: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800", Icon: CheckCircle2 },
  REJECTED: { label: "Ditolak", kelas: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800", Icon: XCircle },
};

const TAB = ["PENDING", "APPROVED", "TRANSFERRED", "REJECTED", "SEMUA"] as const;

const rupiah = (v: number) => `Rp ${v.toLocaleString("id")}`;
const tanggal = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function AdminWithdrawalsPage() {
  const [items, setItems] = useState<Penarikan[]>([]);
  const [ringkasan, setRingkasan] = useState({ jumlahTertunda: 0, nominalTertunda: 0 });
  const [tab, setTab] = useState<(typeof TAB)[number]>("PENDING");
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState<string | null>(null);
  const [error, setError] = useState("");

  const muat = useCallback(async () => {
    setMemuat(true);
    try {
      const res = await fetch(`/api/admin/withdrawals?status=${tab}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      setItems(d.items || []);
      setRingkasan(d.ringkasan || { jumlahTertunda: 0, nominalTertunda: 0 });
    } catch {
      setError("Gagal memuat data penarikan.");
    } finally {
      setMemuat(false);
    }
  }, [tab]);

  useEffect(() => { muat(); }, [muat]);

  const ubahStatus = async (id: string, status: string, perluCatatan = false) => {
    let notes: string | null = null;
    if (perluCatatan) {
      notes = window.prompt("Alasan penolakan (akan dikirim ke guru):");
      if (notes === null) return; // dibatalkan
    }
    if (status === "TRANSFERRED" && !window.confirm("Tandai sudah ditransfer? Pastikan transfer benar-benar sudah dilakukan.")) return;

    setProses(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Gagal memproses.");
        return;
      }
      await muat();
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setProses(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Penarikan Saldo</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Tinjau dan proses pencairan saldo guru</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
            <Clock size={16} />
            <span className="text-xs font-semibold uppercase tracking-wide">Menunggu diproses</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{ringkasan.jumlahTertunda}</p>
        </div>
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <Wallet size={16} />
            <span className="text-xs font-semibold uppercase tracking-wide">Total nominal tertunda</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{rupiah(ringkasan.nominalTertunda)}</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TAB.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              tab === t ? "bg-slate-900 text-white" : "bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            {t === "SEMUA" ? "Semua" : STATUS_META[t]?.label || t}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {memuat ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-slate-300" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700">
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Tidak ada penarikan pada status ini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((w) => {
            const meta = STATUS_META[w.status] || STATUS_META.PENDING;
            const sibuk = proses === w.id;
            return (
              <div key={w.id} className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{w.user.fullName}</p>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${meta.kelas}`}>
                        <meta.Icon size={11} /> {meta.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{w.user.email}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200 mt-2">
                      <span className="font-semibold">{w.bankName}</span> &middot; {w.accountNumber} &middot; a.n. {w.accountHolder}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Diajukan {tanggal(w.createdAt)}
                      {w.processedAt && ` · diproses ${tanggal(w.processedAt)}`}
                      {` · sisa saldo guru ${rupiah(w.user.saldo)}`}
                    </p>
                    {w.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">Catatan: {w.notes}</p>}
                  </div>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 shrink-0">{rupiah(w.amount)}</p>
                </div>

                {(w.status === "PENDING" || w.status === "APPROVED") && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                    {w.status === "PENDING" && (
                      <button
                        onClick={() => ubahStatus(w.id, "APPROVED")}
                        disabled={sibuk}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                      >
                        {sibuk ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Setujui
                      </button>
                    )}
                    {w.status === "APPROVED" && (
                      <button
                        onClick={() => ubahStatus(w.id, "TRANSFERRED")}
                        disabled={sibuk}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {sibuk ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Tandai Sudah Ditransfer
                      </button>
                    )}
                    <button
                      onClick={() => ubahStatus(w.id, "REJECTED", true)}
                      disabled={sibuk}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800/90 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-50 dark:bg-red-950/40 disabled:opacity-50"
                    >
                      <XCircle size={13} /> Tolak &amp; Kembalikan Saldo
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
