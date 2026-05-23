"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Zap } from "lucide-react";
import { useUserStore } from "@/store";
import { useSearchParams } from "next/navigation";

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
  const [showMidtrans, setShowMidtrans] = useState(false);
  const [status, setStatus] = useState<"default" | "success" | "failed">("default");
  const searchParams = useSearchParams();

  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam === "success") {
      setStatus("success");
    }
  }, [searchParams]);

  useEffect(() => {
    const merchantId = process.env.NEXT_PUBLIC_MIDTRANS_MERCHANT_ID;
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
    
    if (!merchantId || !clientKey) {
      console.error("Midtrans config missing");
      return;
    }

    const isProd = window.location.hostname === "bahasacerdas.com";
    const script = document.createElement("script");
    script.src = isProd ? "https://app.midtrans.com/snap/snap.js" : "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", clientKey);
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleUpgrade = async (plan: "monthly" | "yearly") => {
    setLoading(true);
    try {
      const res = await fetch("/api/payment/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();

      if (data.token) {
        if (window.snap) {
          window.snap.pay(data.token, {
            onSuccess: () => setStatus("success"),
            onPending: () => setLoading(false),
            onError: () => setStatus("failed"),
            onClose: () => setLoading(false),
          });
        } else {
          alert("Midtrans tidak加载. Pastikan koneksi internet.");
          setStatus("failed");
        }
      } else {
        console.error("No token:", data);
        setStatus("failed");
      }
    } catch (err) {
      console.error("Error:", err);
      setStatus("failed");
    }
    setLoading(false);
  };

  if (status === "success" || user.isPremium || user.isFounder) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center mx-auto mb-4">
          <Crown className="h-10 w-10 text-black" />
        </div>
        <h1 className="text-2xl font-bold">Kamu sudah PRO!</h1>
        <p className="mt-2 text-gray-600">Selamat menikmati semua fitur premium.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center mx-auto mb-4">
          <Crown className="h-8 w-8 text-black" />
        </div>
        <h1 className="text-2xl font-bold">Upgrade ke BahasaCerdas PRO</h1>
        <p className="mt-2 text-gray-600">Unlock semua fitur dan akses unlimited AI</p>
      </div>

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
            <Zap className="h-4 w-4" /> {loading ? "Memproses..." : "Pilih Tahunan — Rp 399.000"}
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
            Pilih Bulanan — Rp 49.000
          </Button>
        </Card>

        <div className="text-center text-xs text-gray-400">
          Pembayaran aman via Midtrans (Transfer, QRIS, VA, e-wallet)
        </div>
      </div>
    </div>
  );
}
