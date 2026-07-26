"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, TrendingUp, Wallet, ArrowUpRight, DollarSign, Loader2 } from "lucide-react";

export default function SaldoPage() {
  const [saldo, setSaldo] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  useEffect(() => {
    fetch("/api/guru/earnings")
      .then(r => r.json())
      .then(d => {
        setSaldo(d.saldo || 0);
        setTotalEarned(d.totalEarned || 0);
      })
      .catch(() => {});
  }, []);

  const handleWithdraw = () => {
    setShowModal(true);
  };

  const confirmWithdraw = async () => {
    if (!withdrawAmount || parseInt(withdrawAmount) <= 0) return;
    setLoading(true);
    
    try {
      const res = await fetch("/api/guru/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseInt(withdrawAmount) })
      });
      
      if (res.ok) {
        alert("Permintaan penarikan saldo berhasil! Saldo akan masuk ke rekening Anda dalam 1-3 hari kerja.");
        setShowModal(false);
        setWithdrawAmount("");
        // Refresh saldo
        fetch("/api/guru/earnings").then(r => r.json()).then(d => {
          setSaldo(d.saldo || 0);
        });
      } else {
        const data = await res.json();
        alert(data.error || "Gagal menarik saldo");
      }
    } catch (e) {
      alert("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <a href="/guru/pengaturan" className="hover:underline">Pengaturan</a>
          <span>/</span>
          <span>Saldo</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Saldo</h1>
        <p className="mt-1 text-sm text-gray-600">Kelola earnings dari penjualan karya</p>
      </div>

      <Card className="p-6 mb-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
        <p className="text-sm opacity-80">Saldo Tersedia</p>
        <p className="text-4xl font-bold mt-1">Rp {saldo.toLocaleString("id")}</p>
        <p className="text-sm opacity-80 mt-2">Total Earned: Rp {totalEarned.toLocaleString("id")}</p>
        <Button 
          onClick={handleWithdraw}
          disabled={saldo <= 0}
          variant="secondary" 
          className="mt-4 bg-white/20 border-0 text-white hover:bg-white/30 disabled:opacity-50"
        >
          <ArrowUpRight className="h-4 w-4" /> Cairkan Saldo
        </Button>
      </Card>

      {/* Riwayat Penarikan */}
      <Card className="p-6 mb-6">
        <h2 className="font-semibold mb-4">Riwayat Penarikan</h2>
        <div className="text-center py-8 text-gray-400">
          <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Belum ada riwayat penarikan</p>
        </div>
      </Card>

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
            <h3 className="font-bold text-lg mb-4">Cairkan Saldo</h3>
            <p className="text-sm text-gray-500 mb-4">Saldo tersedia: Rp {saldo.toLocaleString("id")}</p>
            <input
              type="number"
              placeholder="Masukkan jumlah penarikan"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
            />
            <div className="flex gap-3">
              <Button onClick={() => setShowModal(false)} variant="outline" className="flex-1">
                Batal
              </Button>
              <Button 
                onClick={confirmWithdraw} 
                disabled={loading || !withdrawAmount || parseInt(withdrawAmount) > saldo}
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