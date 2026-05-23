"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Zap, AlertCircle, Loader2 } from "lucide-react";
import { useUserStore } from "@/store";
import { getSnapScriptUrl } from "@/lib/midtrans";

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options?: { onSuccess: Function; onPending: Function; onError: Function; onClose: Function }) => void;
    };
  }
}

export default function PremiumPage() {
  const user = useUserStore();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"default" | "success" | "failed">("default");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "success") {
      setStatus("success");
    }
  }, []);

  useEffect(() => {
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
    if (!clientKey) return;
    const script = document.createElement("script");
    script.src = getSnapScriptUrl();
    script.setAttribute("data-client-key", clientKey);
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const handleUpgrade = async (plan: "monthly" | "yearly") => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/payment/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Gagal membuat invoice. Coba lagi.");
        setLoading(false);
        return;
      }

      if (data.token) {
        if (window.snap) {
          window.snap.pay(data.token, {
            onSuccess: () => setStatus("success"),
            onPending: () => setLoading(false),
            onError: () => { setErrorMsg("Pembayaran gagal. Silakan coba lagi."); setLoading(false); },
            onClose: () => { if (status !== "success") setLoading(false); },
          });
        } else {
          setTimeout(() => {
            if (!window.snap) {
              setErrorMsg("Gagal memuat Midtrans. Refresh halaman dan coba lagi.");
              setLoading(false);
            }
          }, 3000);
        }
      } else {
        setErrorMsg("Gagal memproses pembayaran.");
        setLoading(false);
      }
    } catch (err) {
      setErrorMsg("Terjadi kesalahan. Silakan coba lagi.");
      setLoading(false);
    }
  };

  if (status === "success" || user.isPremium || user.isFounder) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Crown className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Kamu sudah PRO!</h1>
        <p className="mt-2 text-gray-500">Selamat menikmati semua fitur premium.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Crown className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Upgrade ke BahasaCerdas PRO</h1>
        <p className="mt-2 text-gray-500">Unlock semua fitur dan akses unlimited AI</p>
      </div>

      {errorMsg && (
        <div className="max-w-lg mx-auto mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" /> {errorMsg}
        </div>
      )}

      <div className="max-w-lg mx-auto space-y-4">
        <Card className="p-6 border-2 border-blue-200 bg-blue-50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Badge variant="warning" className="mb-1">BEST VALUE</Badge>
              <h2 className="text-xl font-bold">Tahunan</h2>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-700">Rp 399.000</p>
              <p className="text-sm text-gray-500">hemat Rp 189.000</p>
            </div>
          </div>
          <ul className="space-y-2 text-sm mb-4">
            {["Akses AI unlimited", "Jual karya berbayar", "Export PDF", "Data siswa lengkap"].map((f) => (
              <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> {f}</li>
            ))}
          </ul>
          <Button onClick={() => handleUpgrade("yearly")} disabled={loading} className="w-full bg-blue-600">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</> : <><Zap className="h-4 w-4" /> Pilih Tahunan — Rp 399.000</>}
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Bulanan</h2>
            <div className="text-right">
              <p className="text-2xl font-bold">Rp 49.000</p>
              <p className="text-sm text-gray-500">per bulan</p>
            </div>
          </div>
          <Button onClick={() => handleUpgrade("monthly")} disabled={loading} variant="outline" className="w-full">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</> : "Pilih Bulanan — Rp 49.000"}
          </Button>
        </Card>

        <div className="text-center text-xs text-gray-400">
          Pembayaran aman via Midtrans (Transfer, QRIS, VA, e-wallet)
        </div>
      </div>
    </div>
  );
}
