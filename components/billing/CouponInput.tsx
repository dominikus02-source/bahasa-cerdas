"use client";

import { useState } from "react";
import { Gift, Loader2, Tag, X } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import "./billing.css";

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
  /** Kode yang bisa dipakai dengan satu ketukan (mis. Program Guru Cerdas). */
  suggestedCode?: string;
  suggestedLabel?: string;
}

export async function validateCoupon(kode: string, planId: string): Promise<{ coupon?: AppliedCoupon; error?: string }> {
  try {
    const res = await fetch("/api/billing/kupon/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kode: kode.trim(), planId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) return { error: data.error || "Kode promo tidak dikenali." };
    return {
      coupon: {
        kode: data.kupon.kode,
        nama: data.kupon.nama || null,
        diskonPersen: data.diskonPersen ?? null,
        hargaAsli: data.hargaAsli,
        hargaDiskon: data.hargaDiskon,
        hemat: data.hemat,
      },
    };
  } catch {
    return { error: "Tidak tersambung. Periksa internet lalu coba lagi." };
  }
}

export default function CouponInput({ planId, price, value, onChange, suggestedCode, suggestedLabel }: CouponInputProps) {
  const [kode, setKode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const apply = async (input: string) => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError("");
    const r = await validateCoupon(input, planId);
    setLoading(false);
    if (r.error || !r.coupon) {
      setError(r.error || "Kode promo tidak dikenali.");
      return;
    }
    onChange(r.coupon);
    setKode("");
  };

  if (value) {
    return (
      <div className="bp-promo" style={{ background: "var(--clr-accent-soft)", borderColor: "color-mix(in srgb, var(--clr-accent) 35%, transparent)" }}>
        <span className="bp-icon bp-icon--soft" aria-hidden="true"><Gift size={18} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="bp-h3" style={{ fontSize: 14 }}>Promo {value.kode} terpasang</p>
          <p className="bp-text" style={{ marginTop: 2 }}>
            Jadi <b className="bp-strong">{formatCurrency(value.hargaDiskon)}</b>{" "}
            <span className="bp-strike">{formatCurrency(value.hargaAsli || price)}</span>
          </p>
        </div>
        <button type="button" className="bp-ghost" style={{ minHeight: 44, width: 44, padding: 0 }} onClick={() => onChange(null)} aria-label="Lepas kode promo">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {suggestedCode && (
        <div className="bp-promo">
          <span className="bp-icon bp-icon--warn" aria-hidden="true"><Gift size={18} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="bp-h3" style={{ fontSize: 14 }}>{suggestedLabel || "Ada promo untukmu"}</p>
            <p className="bp-text">Kode <span className="bp-mono bp-strong">{suggestedCode.toUpperCase()}</span></p>
          </div>
          <button type="button" className="bp-chip" onClick={() => apply(suggestedCode)} disabled={loading}>
            {loading ? <Loader2 size={16} className="bp-spin" aria-hidden="true" /> : null}
            Pakai
          </button>
        </div>
      )}
      <div>
        <label htmlFor="bp-kode" className="bp-sr">Kode promo</label>
        <div className="bp-field">
          <Tag size={16} aria-hidden="true" style={{ color: "var(--clr-text-3)", flex: "0 0 auto" }} />
          <input
            id="bp-kode"
            className="bp-input"
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply(kode)}
            placeholder="Punya kode promo?"
            autoComplete="off"
            autoCapitalize="characters"
            disabled={loading}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "bp-kode-err" : undefined}
          />
          <button type="button" className="bp-chip" onClick={() => apply(kode)} disabled={!kode.trim() || loading}>
            {loading ? <Loader2 size={16} className="bp-spin" aria-hidden="true" /> : null}
            Pakai
          </button>
        </div>
        {error && <p id="bp-kode-err" role="alert" className="bp-small" style={{ color: "var(--clr-danger)", margin: "6px 4px 0" }}>{error}</p>}
      </div>
    </div>
  );
}
