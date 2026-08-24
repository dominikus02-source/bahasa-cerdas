"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Gift, Loader2, Tag, X } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export interface AppliedCoupon {
  kode: string;
  nama: string | null;
  diskonPersen: number | null;
  hargaAsli: number;
  hargaDiskon: number;
  hemat: number;
}

interface CouponInputProps {
  planId: string;
  price: number;
  value: AppliedCoupon | null;
  onChange: (coupon: AppliedCoupon | null) => void;
}

export default function CouponInput({ planId, price, value, onChange }: CouponInputProps) {
  const [kode, setKode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const apply = async () => {
    if (!kode.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/billing/kupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kode: kode.trim(), planId }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setError(data.error || "Kode kupon tidak valid.");
        return;
      }
      onChange({
        kode: data.kupon.kode,
        nama: data.kupon.nama || null,
        diskonPersen: data.diskonPersen,
        hargaAsli: data.hargaAsli,
        hargaDiskon: data.hargaDiskon,
        hemat: data.hemat,
      });
      setKode("");
    } catch {
      setError("Tidak bisa memvalidasi kupon. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
    }
  };

  if (value) {
    const isFixed = value.diskonPersen == null;
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
          {isFixed ? <Gift className="w-4 h-4 text-white" /> : <Check className="w-4 h-4 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-emerald-900 uppercase">{value.kode}</p>
            {value.nama && <span className="text-xs text-emerald-700">{value.nama}</span>}
            {!isFixed && <Badge variant="warning" className="text-[10px] py-0">Diskon {value.diskonPersen}%</Badge>}
          </div>
          {isFixed ? (
            <p className="text-xs text-emerald-700 mt-1">
              Harga khusus <strong>{formatCurrency(value.hargaDiskon)}</strong>
              <span className="line-through ml-1 text-emerald-400">{formatCurrency(value.hargaAsli)}</span>
              {value.hemat > 0 && <span> · hemat {formatCurrency(value.hemat)}</span>}
            </p>
          ) : (
            <p className="text-xs text-emerald-700 mt-1">
              {formatCurrency(value.hargaAsli)} → <strong>{formatCurrency(value.hargaDiskon)}</strong>
              {value.hemat > 0 && <span> (hemat {formatCurrency(value.hemat)})</span>}
            </p>
          )}
        </div>
        <button
          onClick={() => onChange(null)}
          className="text-emerald-500 hover:text-emerald-700 shrink-0"
          aria-label="Hapus kupon"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={kode}
            onChange={(e) => setKode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            placeholder="Kode kupon (mis. BCGURUCERDAS1000)"
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 placeholder:text-gray-400"
            disabled={loading}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={apply}
          disabled={!kode.trim() || loading}
          className="shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pakai"}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
      {value && (
        <p className="text-xs text-emerald-600 mt-1.5">
          Kupon berlaku — total akan dikurangi otomatis.
        </p>
      )}
    </div>
  );
}
