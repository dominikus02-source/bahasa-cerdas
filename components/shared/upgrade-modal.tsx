"use client";

import { useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, Check } from "lucide-react";
import { getSnapScriptUrl } from "@/lib/midtrans";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
  used?: number;
  limit?: number;
}

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options?: { onSuccess: Function; onPending: Function; onError: Function; onClose: Function }) => void;
    };
  }
}

export function UpgradeModal({ isOpen, onClose, feature, used, limit }: UpgradeModalProps) {
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
    try {
      const res = await fetch("/api/payment/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.token && window.snap) {
        window.snap.pay(data.token, {
          onSuccess: () => { onClose(); window.location.reload(); },
          onPending: () => {},
          onError: () => alert("Pembayaran gagal. Silakan coba lagi."),
          onClose: () => {},
        });
      }
    } catch (error) {
      console.error("Upgrade error:", error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-gold-400 to-gold-600 shadow-lg">
          <Crown className="h-8 w-8 text-black" />
        </div>
        <h2 className="text-2xl font-bold">Upgrade ke PRO</h2>
        {feature && (
          <p className="mt-2 text-sm text-muted-foreground">
            Kamu sudah menggunakan {used}/{limit} {feature} gratis bulan ini.
            <br />Upgrade untuk akses unlimited!
          </p>
        )}
      </div>

      <div className="mt-6 space-y-3">
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="warning" className="mb-1">BEST VALUE</Badge>
              <p className="font-bold">Tahunan</p>
              <p className="text-xs text-muted-foreground">Hemat Rp 189.000</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-700">Rp 399rb</p>
              <p className="text-xs text-muted-foreground">/tahun</p>
            </div>
          </div>
          <Button onClick={() => handleUpgrade("yearly")} className="mt-3 w-full bg-blue-600 hover:bg-blue-700">
            Pilih Tahunan
          </Button>
        </div>

        <div className="rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">Bulanan</p>
              <p className="text-xs text-muted-foreground">Per bulan</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">Rp 49rb</p>
              <p className="text-xs text-muted-foreground">/bulan</p>
            </div>
          </div>
          <Button onClick={() => handleUpgrade("monthly")} variant="outline" className="mt-3 w-full">
            Pilih Bulanan
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-lg bg-gray-50 p-4">
        <p className="mb-2 text-sm font-semibold">Benefit PRO:</p>
        <ul className="space-y-2 text-xs text-muted-foreground">
          {[
            "Generate RPP & Soal AI unlimited",
            "Koreksi esai dengan AI",
            "Jual karya di toko (bisa dapat income)",
            "Export laporan PDF",
            "Data siswa lengkap",
            "Akses semua fitur premium",
          ].map((benefit, i) => (
            <li key={i} className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              {benefit}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}