"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, AlertCircle, Loader2, X, Shield, CreditCard, Calendar, Clock, Info, Landmark, Smartphone } from "lucide-react";
import { getSnapScriptUrl } from "@/lib/midtrans";

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options?: {
        onSuccess: Function;
        onPending: Function;
        onError: Function;
        onClose: Function;
      }) => void;
    };
  }
}

const FEATURES = [
  { free: true, pro: true, label: "AI Tools (Buat RPP, Soal, PPT, dll)" },
  { free: true, pro: true, label: "Bank Soal & Kuis" },
  { free: true, pro: true, label: "KelasKu & Buku Panduan" },
  { free: true, pro: true, label: "Buku Nilai & Rapor" },
  { free: false, pro: true, label: "500 Kredit AI per bulan (Free: 30)" },
  { free: false, pro: true, label: "Export PDF, DOCX, PPTX" },
  { free: false, pro: true, label: "Jual Karya di Marketplace" },
  { free: false, pro: true, label: "Prioritas support" },
];

interface UserInfo {
  isPremium: boolean;
  premiumPlan: string;
  premiumUntil: string | null;
}

export default function BerlanggananPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"default" | "success" | "failed">("default");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"GURU_PRO_MONTHLY" | "GURU_PRO_YEARLY">("GURU_PRO_YEARLY");
  const [snapReady, setSnapReady] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "success") {
      setStatus("success");
    }
  }, []);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) => {
        setUserInfo({
          isPremium: d.isPremium || d.user?.isPremium || false,
          premiumPlan: d.premiumPlan || d.user?.premiumPlan || "FREE",
          premiumUntil: d.premiumUntil || d.user?.premiumUntil || null,
        });
        if (d.isPremium || d.user?.isPremium) {
          setStatus("success");
        }
      })
      .catch(() => {})
      .finally(() => setUserLoading(false));
  }, []);

  useEffect(() => {
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
    if (!clientKey) return;
    const script = document.createElement("script");
    script.src = getSnapScriptUrl();
    script.setAttribute("data-client-key", clientKey);
    script.onload = () => setSnapReady(true);
    script.onerror = () => console.warn("[Snap] Failed to load Midtrans Snap.js");
    document.body.appendChild(script);
    return () => {
      const el = document.querySelector(`script[src="${getSnapScriptUrl()}"]`);
      if (el) el.remove();
    };
  }, []);

  const handleUpgrade = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan }),
      });
      const result = await res.json();

      if (!res.ok) {
        if (res.status === 409 && result.existingOrderId) {
          setErrorMsg("Masih ada pembayaran yang tertunda. Selesaikan atau tunggu 5 menit.");
        } else {
          setErrorMsg(result.error || "Gagal memproses. Coba lagi.");
        }
        setLoading(false);
        return;
      }

      if (result.bypass) {
        setStatus("success");
        setLoading(false);
        return;
      }

      if (result.token) {
        const openSnap = () => {
          if (window.snap) {
            window.snap.pay(result.token, {
              onSuccess: () => { setStatus("success"); setLoading(false); },
              onPending: () => setLoading(false),
              onError: () => { setErrorMsg("Pembayaran gagal. Silakan coba lagi."); setLoading(false); },
              onClose: () => { if (status !== "success") setLoading(false); },
            });
          } else {
            setErrorMsg("Gagal memuat Midtrans. Refresh halaman dan coba lagi.");
            setLoading(false);
          }
        };

        if (window.snap) {
          openSnap();
        } else {
          // Poll for Snap.js readiness, up to 10 detik
          let attempts = 0;
          const poll = setInterval(() => {
            attempts++;
            if (window.snap) {
              clearInterval(poll);
              openSnap();
            } else if (attempts >= 20) {
              clearInterval(poll);
              setErrorMsg("Gagal memuat Midtrans. Refresh halaman dan coba lagi.");
              setLoading(false);
            }
          }, 500);
        }
      } else {
        setTimeout(() => {
          if (!window.snap) {
            setErrorMsg("Gagal memuat Midtrans. Refresh halaman dan coba lagi.");
            setLoading(false);
          }
        }, 3000);
      }
    } catch (err) {
      setErrorMsg("Terjadi kesalahan. Silakan coba lagi.");
      setLoading(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  const isPremium = userInfo?.isPremium || false;
  const premiumUntil = userInfo?.premiumUntil;
  const daysLeft = premiumUntil
    ? Math.max(0, Math.ceil((new Date(premiumUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const isExpiring = daysLeft > 0 && daysLeft <= 7;
  const isExpired = isPremium && daysLeft === 0;
  const premiumSince = premiumUntil && daysLeft > 0 ? new Date(premiumUntil).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : null;

  // Success / Premium Active state
  if (status === "success" && isPremium) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Premium Active Banner */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-8 text-white text-center shadow-xl">
          <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Kamu PRO Aktif!</h1>
          <p className="mt-2 text-emerald-100">Berlaku hingga {premiumSince}</p>
        </div>

        {/* Renewal Reminder */}
        {isExpiring && (
          <Card className="p-4 border-amber-200 bg-amber-50">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">PRO akan berakhir dalam {daysLeft} hari</p>
                <p className="text-xs text-amber-700 mt-1">
                  Perpanjang sekarang agar akses AI Tools tetap 500 kredit/bulan tanpa terputus.
                </p>
                <p className="text-xs text-amber-600 mt-2 bg-amber-100 rounded-lg p-2">
                  Jika anda masih aktif PRO, pembelian baru akan <strong>memperpanjang</strong> masa aktif anda.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Expired */}
        {isExpired && (
          <Card className="p-4 border-red-200 bg-red-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-red-700 text-sm">Masa PRO telah berakhir</p>
                <p className="text-xs text-red-600 mt-1">Anda tetap bisa menggunakan Guru Free dengan 30 kredit/bulan.</p>
              </div>
            </div>
          </Card>
        )}

        {/* Perpanjang CTA */}
        <Card className="p-6">
          <h3 className="font-bold text-gray-900 mb-4">Perpanjang PRO</h3>

          <div className="flex items-center justify-center gap-2 bg-gray-100 rounded-xl p-1 w-fit mx-auto mb-6">
            <button onClick={() => setSelectedPlan("GURU_PRO_MONTHLY")}
              className={`px-5 py-2 rounded-lg text-sm font-medium ${selectedPlan === "GURU_PRO_MONTHLY" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
              Bulanan — Rp 49.000
            </button>
            <button onClick={() => setSelectedPlan("GURU_PRO_YEARLY")}
              className={`px-5 py-2 rounded-lg text-sm font-medium ${selectedPlan === "GURU_PRO_YEARLY" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
              Tahunan — Rp 399.000
              <Badge variant="warning" className="ml-1.5 text-[10px] py-0">HEMAT</Badge>
            </button>
          </div>

          <Button onClick={handleUpgrade} disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Zap className="w-4 h-4 mr-1.5" />}
            {loading ? "Memproses..." : "Perpanjang PRO"}
          </Button>
        </Card>

        {/* Support Note */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Butuh bantuan?</p>
              <p className="text-xs text-blue-700 mt-1">
                Jika pembayaran berhasil tetapi akun PRO belum aktif dalam 5 menit,
                hubungi admin dengan menyertakan email akun dan nomor transaksi.
              </p>
            </div>
          </div>
        </Card>

        <div className="text-center">
          <a href="/guru/ai-tools" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
            Mulai menggunakan Alat AI →
          </a>
        </div>
      </div>
    );
  }

  // Success but premium not yet confirmed by webhook
  if (status === "success" && !isPremium) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Crown className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Pembayaran Berhasil Diproses!</h1>
        <p className="mt-2 text-gray-500">
          Pembayaran sedang dikonfirmasi. Akun PRO akan aktif dalam beberapa saat.
        </p>
        <Card className="mt-6 p-4 bg-amber-50 border-amber-200 text-left">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Menunggu konfirmasi</p>
              <p className="text-xs text-amber-700 mt-1">
                Jika status belum berubah dalam 5 menit, refresh halaman atau hubungi admin dengan menyertakan email akun dan nomor transaksi.
              </p>
            </div>
          </div>
        </Card>
        <div className="mt-8">
          <a href="/guru/ai-tools"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-xl font-semibold">
            <Zap className="w-4 h-4" /> Mulai menggunakan Alat AI
          </a>
        </div>
      </div>
    );
  }

  // Pricing page
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="text-center py-6">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Crown className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Pilih Paketmu</h1>
        <p className="mt-3 text-gray-500 max-w-md mx-auto">
          Dapatkan akses penuh ke AI Tools, export dokumen, dan 500 kredit AI setiap bulan.
        </p>
      </div>

      {errorMsg && (
        <div className="max-w-lg mx-auto rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" /> {errorMsg}
        </div>
      )}

      <div className="flex items-center justify-center gap-2 bg-gray-100 rounded-xl p-1 w-fit mx-auto">
        <button onClick={() => setSelectedPlan("GURU_PRO_MONTHLY")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${selectedPlan === "GURU_PRO_MONTHLY" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          Bulanan
        </button>
        <button onClick={() => setSelectedPlan("GURU_PRO_YEARLY")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${selectedPlan === "GURU_PRO_YEARLY" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          Tahunan
          <Badge variant="warning" className="ml-2 text-[10px] py-0">HEMAT Rp 189K</Badge>
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 border-2 border-gray-100">
          <div className="mb-6"><h2 className="text-xl font-bold text-gray-900">Gratis</h2><p className="text-sm text-gray-500 mt-1">Untuk memulai</p></div>
          <p className="text-3xl font-bold text-gray-900 mb-6">Rp 0</p>
          <ul className="space-y-3 mb-8">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-2 text-sm">
                {f.free ? <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> : <X className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />}
                <span className={f.free ? "text-gray-700" : "text-gray-400"}>{f.label}</span>
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full" disabled>Paket Saat Ini</Button>
        </Card>

        <Card className="p-6 border-2 border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/50 relative overflow-hidden">
          <div className="absolute top-0 right-0"><div className="bg-gradient-to-l from-amber-400 to-orange-400 text-white text-[10px] font-bold px-4 py-1 rounded-bl-lg shadow">POPULER</div></div>
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1"><h2 className="text-xl font-bold text-gray-900">PRO</h2><Crown className="w-5 h-5 text-amber-500" /></div>
            <p className="text-sm text-gray-500 mt-1">Untuk guru profesional</p>
          </div>
          {selectedPlan === "GURU_PRO_YEARLY" ? (
            <div className="mb-6">
              <p className="text-3xl font-bold text-gray-900">Rp 399.000</p>
              <p className="text-sm text-gray-500">per tahun (Rp 33.250/bln)</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">Hemat Rp 189.000 dari bulanan</p>
            </div>
          ) : (
            <div className="mb-6">
              <p className="text-3xl font-bold text-gray-900">Rp 49.000</p>
              <p className="text-sm text-gray-500">per bulan</p>
            </div>
          )}
          <ul className="space-y-3 mb-8">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /><span className="text-gray-700">{f.label}</span></li>
            ))}
          </ul>
          <Button onClick={handleUpgrade} disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-white shadow-lg shadow-amber-200/50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Zap className="w-4 h-4 mr-1.5" />}
            {loading ? "Memproses..." : "Langganan Sekarang"}
          </Button>
        </Card>
      </div>

      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400"><Shield className="w-4 h-4" /> Pembayaran aman via Midtrans</div>
        <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> Kartu</span>
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> QRIS</span>
          <span className="flex items-center gap-1"><Landmark className="w-3.5 h-3.5" /> VA</span>
          <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" /> e-Wallet</span>
        </div>
      </div>

      <Card className="p-6">
        <h3 className="font-bold text-gray-900 mb-6 text-center">Bandingkan Fitur</h3>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100">
            <th className="text-left py-3 font-semibold text-gray-600">Fitur</th>
            <th className="text-center py-3 font-semibold text-gray-600 w-20">Gratis</th>
            <th className="text-center py-3 font-semibold text-amber-600 w-20">PRO</th>
          </tr></thead>
          <tbody>
            {FEATURES.map((f) => (
              <tr key={f.label} className="border-b border-gray-50">
                <td className="py-3 text-gray-700">{f.label}</td>
                <td className="text-center py-3">{f.free ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-gray-300 mx-auto" />}</td>
                <td className="text-center py-3"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </Card>

      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Butuh bantuan?</p>
            <p className="text-xs text-blue-700 mt-1">
              Jika pembayaran berhasil tetapi akun PRO belum aktif dalam 5 menit,
              hubungi admin dengan menyertakan email akun dan nomor transaksi.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-gray-900 mb-4">Ketentuan Pembayaran</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <p>• Pembayaran diproses melalui <strong>Midtrans</strong> yang aman.</p>
          <p>• Paket <strong>Bulanan</strong> berlaku <strong>30 hari</strong> sejak pembayaran berhasil.</p>
          <p>• Paket <strong>Tahunan</strong> berlaku <strong>365 hari</strong> sejak pembayaran berhasil.</p>
          <p>• Pembayaran bersifat <strong>sekali bayar</strong> dan tidak diperpanjang otomatis.</p>
          <p>• Jika PRO masih aktif, pembelian baru akan <strong>memperpanjang</strong> masa aktif Anda.</p>
          <p>• Setelah masa PRO habis, akun kembali ke <strong>Guru Free</strong> (30 kredit AI/bulan).</p>
          <p>• Kredit AI mengikuti paket yang aktif — PRO: 500/bulan, Free: 30/bulan.</p>
          <p>• Jika pembayaran berhasil tetapi PRO belum aktif dalam 5 menit, <a href="/guru/bantuan/pembayaran" className="text-blue-600 hover:underline">hubungi bantuan</a>.</p>
        </div>
      </Card>
    </div>
  );
}
