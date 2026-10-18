import { Check, Crown, QrCode, Landmark, Smartphone, CreditCard, ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { PAYMENT_STATUS_LABELS } from "@/lib/billing/messages";
import "./billing.css";

export function formatTanggal(value: string | Date | null | undefined, opts: { short?: boolean } = {}): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: opts.short ? "short" : "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

export function sisaHari(until: string | Date | null | undefined): number {
  if (!until) return 0;
  return Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / 86_400_000));
}

export interface PlanOption {
  id: string;
  name: string;
  price: number;
  note: string;
  badge?: string;
}

export function PlanPicker({
  options,
  value,
  onChange,
  label,
}: {
  options: PlanOption[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <div className="bp-plans" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            data-on={on}
            className="bp-plan"
            onClick={() => onChange(o.id)}
          >
            <span className="bp-plan__check" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
            <span className="bp-plan__name">{o.name}</span>
            <span className="bp-plan__price">{formatCurrency(o.price)}</span>
            <span className="bp-plan__note">{o.note}</span>
            {o.badge && <span className="bp-badge bp-badge--ok">{o.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function PriceSummary({
  planName,
  price,
  promo,
  period,
}: {
  planName: string;
  price: number;
  promo: { kode: string; hargaDiskon: number } | null;
  period: string;
}) {
  const total = promo ? promo.hargaDiskon : price;
  return (
    <div className="bp-summary" aria-live="polite">
      <div className="bp-summary__row"><span>{planName}</span><span>{formatCurrency(price)}</span></div>
      {promo && (
        <div className="bp-summary__row bp-summary__row--promo">
          <span>Promo {promo.kode}</span>
          <span>−{formatCurrency(Math.max(0, price - promo.hargaDiskon))}</span>
        </div>
      )}
      <div className="bp-summary__total">
        <div>
          <p className="bp-eyebrow" style={{ margin: 0 }}>Total bayar</p>
          <p className="bp-small" style={{ margin: "4px 0 0" }}>{period}</p>
        </div>
        <p className="bp-price" style={{ margin: 0 }}>{formatCurrency(total)}</p>
      </div>
    </div>
  );
}

export function PayMethods() {
  return (
    <>
      <div className="bp-methods" aria-label="Metode pembayaran">
        <span className="bp-method"><QrCode size={14} aria-hidden="true" /> QRIS</span>
        <span className="bp-method"><Smartphone size={14} aria-hidden="true" /> GoPay · ShopeePay</span>
        <span className="bp-method"><Landmark size={14} aria-hidden="true" /> Transfer bank</span>
        <span className="bp-method"><CreditCard size={14} aria-hidden="true" /> Kartu</span>
      </div>
      <p className="bp-secure"><ShieldCheck size={14} aria-hidden="true" /> Dibayar aman lewat Midtrans. Tanpa perpanjangan otomatis.</p>
    </>
  );
}

export function ProBadge({ label }: { label: string }) {
  return (
    <span className="bp-badge bp-badge--pro">
      <Crown size={12} aria-hidden="true" /> {label}
    </span>
  );
}

const STATUS_TONE: Record<string, string> = {
  SUCCESS: "ok",
  PENDING: "wait",
  REPLACED: "mute",
  EXPIRED: "mute",
  CANCELLED: "mute",
  FAILED: "bad",
  REFUNDED: "mute",
  NOT_FOUND: "mute",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] || "mute";
  return <span className={`bp-badge bp-badge--${tone}`}>{PAYMENT_STATUS_LABELS[status] || "Diproses"}</span>;
}
