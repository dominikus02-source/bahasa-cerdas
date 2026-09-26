"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Wallet, ArrowUpRight, DollarSign, Loader2, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";

const MINIMAL_PENARIKAN = 50_000;

type Penarikan = {
  id: string;
  amount: number;
  status: string;
  bankName: string;
  accountNumber: string;
  notes: string | null;
  processedAt: string | null;
  createdAt: string;
};

type Rincian = {
  id: string;
  itemTitle: string;
  itemType: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: string;
  soldAt: string;
};

const STATUS_META: Record<string, { label: string; kelas: string; Icon: typeof Clock }> = {
  PENDING: { label: "Menunggu diproses", kelas: "bg-amber-50 text-amber-700 border-amber-100", Icon: Clock },
  APPROVED: { label: "Disetujui", kelas: "bg-blue-50 text-blue-700 border-blue-100", Icon: CheckCircle2 },
  TRANSFERRED: { label: "Sudah ditransfer", kelas: "bg-emerald-50 text-emerald-700 border-emerald-100", Icon: CheckCircle2 },
  REJECTED: { label: "Ditolak", kelas: "bg-red-50 text-red-700 border-red-100", Icon: XCircle },
};

const rupiah = (v: number) => `Rp ${v.toLocaleString("id")}`;
const tanggal = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export default function SaldoPage() {
  const [saldo, setSaldo] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [rekeningLengkap, setRekeningLengkap] = useState(true);
  const [penarikan, setPenarikan] = useState<Penarikan[]>([]);
  const [rincian, setRincian] = useState<Rincian[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [error, setError] = useState("");

  const muat = useCallback(async () => {
    try {
      const res = await fetch("/api/guru/earnings");
      if (!res.ok) throw new Error();
      const d = await res.json();
      setSaldo(d.saldo || 0);
      setTotalEarned(d.totalEarned || 0);
      setRekeningLengkap(Boolean(d.rekeningLengkap));
      setPenarikan(d.penarikan || []);
      setRincian(d.rincian || []);
    } catch {
      setError("Gagal memuat data saldo. Coba muat ulang halaman.");
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => { muat(); }, [muat]);

  const adaPenarikanBerjalan = penarikan.some(p => p.status === "PENDING" || p.status === "APPROVED");
  const nominal = parseInt(withdrawAmount || "0", 10);
  const nominalValid = nominal >= MINIMAL_PENARIKAN && nominal <= saldo;

  const confirmWithdraw = async () => {
    if (!nominalValid || loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/guru/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: nominal }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Gagal menarik saldo.");
        return;
      }

      setShowModal(false);
      setWithdrawAmount("");
      await muat();
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/guru/pengaturan" className="hover:underline">Pengaturan</Link>
          <span>/</span>
          <span>Saldo</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Saldo</h1>
        <p className="mt-1 text-sm text-gray-600">Kelola pendapatan dari penjualan karya</p>
      </div>

      {error && !showModal && (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <Card className="p-6 mb-6 bc-guru-hero text-white">
        <p className="text-sm opacity-80">Saldo Tersedia</p>
        <p className="text-4xl font-bold mt-1">{memuat ? "…" : rupiah(saldo)}</p>
        <p className="text-sm opacity-80 mt-2">Total pendapatan: {memuat ? "…" : rupiah(totalEarned)}</p>
        <Button
          onClick={() => { setError(""); setShowModal(true); }}
          disabled={memuat || saldo < MINIMAL_PENARIKAN || !rekeningLengkap || adaPenarikanBerjalan}
          variant="secondary"
          className="mt-4 bg-white/20 border-0 text-white hover:bg-white/30 disabled:opacity-50"
        >
          <ArrowUpRight className="h-4 w-4" /> Cairkan Saldo
        </Button>

        {/* Alasan tombol nonaktif dijelaskan, supaya tidak terasa seperti bug. */}
        {!memuat && !rekeningLengkap && (
          <p className="text-xs mt-2 opacity-90">
            Lengkapi data rekening di{" "}
            <Link href="/guru/profile" className="underline font-semibold">Profil</Link>{" "}
            untuk bisa mencairkan saldo.
          </p>
        )}
        {!memuat && rekeningLengkap && adaPenarikanBerjalan && (
          <p className="text-xs mt-2 opacity-90">Ada penarikan yang sedang diproses. Tunggu sampai selesai ya.</p>
        )}
        {!memuat && rekeningLengkap && !adaPenarikanBerjalan && saldo < MINIMAL_PENARIKAN && (
          <p className="text-xs mt-2 opacity-90">Penarikan minimal {rupiah(MINIMAL_PENARIKAN)}.</p>
        )}
      </Card>

      {/* Riwayat Penarikan — sebelumnya dipaku kosong tanpa fetch apa pun. */}
      <Card className="p-6 mb-6">
        <h2 className="font-semibold mb-4">Riwayat Penarikan</h2>
        {memuat ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : penarikan.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Belum ada riwayat penarikan</p>
          </div>
        ) : (
          <div className="space-y-2">
            {penarikan.map((p) => {
              const meta = STATUS_META[p.status] || STATUS_META.PENDING;
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{rupiah(p.amount)}</p>
                    <p className="text-xs text-gray-500">
                      {p.bankName} &middot; {p.accountNumber} &middot; {tanggal(p.createdAt)}
                    </p>
                    {p.notes && <p className="text-xs text-gray-400 mt-0.5">{p.notes}</p>}
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${meta.kelas}`}>
                    <meta.Icon size={12} /> {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Rincian penjualan — supaya angka saldo bisa ditelusuri asalnya. */}
      {rincian.length > 0 && (
        <Card className="p-6 mb-6">
          <h2 className="font-semibold mb-4">Penjualan Terakhir</h2>
          <div className="space-y-2">
            {rincian.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{r.itemTitle}</p>
                  <p className="text-xs text-gray-500">{tanggal(r.soldAt)} &middot; {r.itemType}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-emerald-600">+{rupiah(r.netAmount)}</p>
                  <p className="text-[11px] text-gray-400">dari {rupiah(r.grossAmount)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Tips Mendapatkan Saldo</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg border">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">Jual Karya Berkualitas</p>
              <p className="text-xs text-gray-500">Rencana Pembelajaran, modul, dan soal yang dibuat dengan baik akan lebih laku</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg border">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium">Upgrade ke PRO</p>
              <p className="text-xs text-gray-500">Akun PRO bisa mengatur harga untuk karya berbayar</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Modal Penarikan */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="font-bold text-lg mb-1">Cairkan Saldo</h3>
            <p className="text-sm text-gray-500 mb-4">
              Saldo tersedia: {rupiah(saldo)} &middot; minimal {rupiah(MINIMAL_PENARIKAN)}
            </p>
            <input
              type="number"
              placeholder="Masukkan jumlah penarikan"
              value={withdrawAmount}
              onChange={(e) => { setWithdrawAmount(e.target.value); setError(""); }}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {withdrawAmount && !nominalValid && (
              <p className="text-xs text-amber-600 mt-2">
                {nominal > saldo
                  ? "Jumlah melebihi saldo yang tersedia."
                  : `Penarikan minimal ${rupiah(MINIMAL_PENARIKAN)}.`}
              </p>
            )}
            {error && (
              <p className="text-xs text-red-600 mt-2 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {error}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-3">
              Dana masuk ke rekening terdaftar dalam 1–3 hari kerja setelah disetujui admin.
            </p>
            <div className="flex gap-3 mt-4">
              <Button onClick={() => { setShowModal(false); setError(""); }} variant="outline" className="flex-1">
                Batal
              </Button>
              <Button
                onClick={confirmWithdraw}
                disabled={loading || !nominalValid}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Konfirmasi"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
