/**
 * Halaman transaksi & alur status pembayaran (Oktober 2026).
 *
 *  A. Status Pro: catatan langganan lama yang sudah berakhir tidak menimpa
 *     premiumUntil berbayar yang masih berlaku.
 *  B. Pesan kesalahan per kode (Indonesia), label status termasuk REPLACED.
 *  C. /payment/finish publik, status dicek server, rincian hanya untuk pemilik.
 *  D. Checkout: pesanan lama → REPLACED, galat jalan pintas pendiri dicatat
 *     & ditampilkan, kupon tidak dihitung saat checkout.
 *  E. Kupon dihitung saat lunas, sekali saja (idempoten).
 *  F. UI: cek ulang otomatis + "Cek lagi", murid ikut menunggu konfirmasi,
 *     tanpa kata Inggris / warna hex / blur di halaman yang disentuh.
 *
 * Tanpa DB, tanpa jaringan.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { resolveIdentity } from "../lib/account/identity";
import { PAYMENT_ERROR_MESSAGES, PAYMENT_STATUS_LABELS, paymentErrorMessage } from "../lib/billing/messages";

let passed = 0;
let failed = 0;
function assert(cond: boolean, name: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`  ✗ FAIL: ${name}`);
  }
}
const read = (p: string) => readFileSync(join(__dirname, "..", p), "utf8");

// ── A. Status Pro ──────────────────────────────────────────
const now = new Date("2026-10-19T00:00:00Z");
const paidFlag = { role: "GURU", isPremium: true, premiumPlan: "PRO", premiumUntil: "2026-11-17T18:49:00Z" };
assert(resolveIdentity({ ...paidFlag, subscriptions: [] }, now).isPremium, "A1 paid flag alone → Pro");
assert(
  resolveIdentity({ ...paidFlag, subscriptions: [{ status: "EXPIRED", currentPeriodStart: "2025-01-01", currentPeriodEnd: "2025-02-01" }] }, now).isPremium,
  "A2 old expired subscription does not override valid paid expiry"
);
assert(
  resolveIdentity({ ...paidFlag, subscriptions: [{ status: "CANCELLED", currentPeriodStart: "2025-01-01", currentPeriodEnd: "2025-06-01" }] }, now).isPremium,
  "A3 old cancelled subscription (period ended) does not override valid paid expiry"
);
assert(
  !resolveIdentity({ ...paidFlag, subscriptions: [{ status: "CANCELLED", currentPeriodStart: "2026-10-01", currentPeriodEnd: "2026-12-01" }] }, now).isPremium,
  "A4 cancelled subscription still covering now revokes the flag"
);
assert(!resolveIdentity({ ...paidFlag, premiumUntil: "2026-10-01T00:00:00Z" }, now).isPremium, "A5 expired premiumUntil → not Pro");
assert(
  resolveIdentity({ role: "MURID", isPremium: false, subscriptions: [{ status: "ACTIVE", currentPeriodStart: "2026-10-01", currentPeriodEnd: "2026-11-01" }] }, now).plan === "MURID_PREMIUM",
  "A6 active subscription → Premium murid"
);

// ── B. Pesan ───────────────────────────────────────────────
const codes = new Set<string>();
for (const f of ["app/api/billing/checkout/route.ts", "app/api/marketplace/purchase/route.ts"]) {
  for (const m of read(f).matchAll(/err\("([A-Z_]+)"/g)) codes.add(m[1]);
}
for (const c of codes) assert(Boolean(PAYMENT_ERROR_MESSAGES[c]), `B1 message for ${c}`);
const english = /\b(please|failed|error|login|checkout|upgrade|update|payment|order|credit|trial|free)\b/i;
for (const [c, msg] of Object.entries(PAYMENT_ERROR_MESSAGES)) assert(!english.test(msg) && msg.length <= 70, `B2 short Indonesian message for ${c}`);
assert(paymentErrorMessage("CHECKOUT_INVALID_COUPON", "Kupon sudah kedaluwarsa.") === "Kupon sudah kedaluwarsa.", "B3 coupon server detail passes through");
assert(paymentErrorMessage("MIDTRANS_UNAUTHORIZED", "Kredensial salah") === PAYMENT_ERROR_MESSAGES.MIDTRANS_UNAUTHORIZED, "B4 internal detail not shown");
assert(PAYMENT_STATUS_LABELS.REPLACED === "Diganti pesanan baru", "B5 REPLACED label");
assert(paymentErrorMessage("??", null).length > 0, "B6 unknown code has fallback");

// ── C. Halaman hasil publik ────────────────────────────────
const proxy = read("lib/supabase/proxy.ts");
assert(proxy.includes('"/payment"') && !proxy.includes('"/payment/"'), "C1 /payment is a public path (prefix match uses p + '/')");
const finish = read("app/payment/finish/page.tsx");
assert(finish.includes("getPublicPaymentStatus(orderId") && !finish.includes("redirect("), "C2 finish page checks status server-side without login redirect");
const status = read("app/api/billing/status/route.ts");
assert(status.includes("no-store") && status.includes("ORDER_ID_RE.test"), "C3 status API validates id, no-store");
const rec = read("lib/payments/midtrans-reconcile.ts");
assert(rec.includes("viewer && viewer.id === trx.userId"), "C4 owner-only details");
assert(/owner = \{[\s\S]*amount[\s\S]*premiumUntil/.test(rec) && !/return \{[^}]*email/.test(rec), "C5 non-owner gets no account data");
assert(rec.includes("PULL_INTERVAL_MS") && rec.includes("PULL_WINDOW_MS"), "C6 public Midtrans pull is throttled + time-boxed");
const view = read("components/billing/PaymentStatusPanel.tsx");
assert(view.includes("Masuk untuk melihat akun"), "C7 logged-out CTA");

// ── D. Checkout ────────────────────────────────────────────
const co = read("app/api/billing/checkout/route.ts");
assert(co.includes('status: "REPLACED"') && co.includes("replacedByOrderId"), "D1 stale pending → REPLACED with link to new order");
assert(!/status:\s*"EXPIRED"/.test(co), "D2 checkout never marks old orders EXPIRED");
assert(co.includes("Founder/admin bypass update failed") && co.includes('err("CHECKOUT_DB_FAILED", "Gagal mengaktifkan akun uji'), "D3 founder bypass error logged + returned");
assert(!co.includes("kuponPemakaian.create") && !co.includes("jumlahTerpakai"), "D4 coupon not counted at checkout");

// ── E. Kupon saat lunas ────────────────────────────────────
const proc = read("lib/payments/midtrans-notification.ts");
const claim = proc.indexOf('status: { not: "SUCCESS" }');
const kupon = proc.indexOf("tx.kuponPemakaian.create");
assert(claim > 0 && kupon > claim, "E1 coupon recorded after the settlement claim");
assert(/kuponPemakaian\.findFirst\(\{[\s\S]{0,200}transaksiId/.test(proc), "E2 coupon usage deduped by transaksiId");
assert(proc.includes("jumlahTerpakai: { increment: 1 }"), "E3 coupon counter incremented at settlement");
assert(proc.includes('"REPLACED"'), "E4 processor knows REPLACED");

// ── F. UI ──────────────────────────────────────────────────
assert(/setTimeout\(check, elapsed < 2 \* 60_000 \? 5_000 : 15_000\)/.test(view) && view.includes("Cek lagi"), "F1 auto re-check while pending + Cek lagi");
const murid = read("app/(dashboard)/murid/premium/page.tsx");
assert(murid.includes("PaymentStatusPanel") && murid.includes("/api/user/me?fresh=1"), "F2 murid waits for confirmation with fresh profile");
const guru = read("app/(dashboard)/guru/berlangganan/page.tsx");
assert(/\[plan, coupon, refreshUser, showOrder\]/.test(guru), "F3 guru pay callback lists all hook deps");
const ui = [
  "app/(dashboard)/guru/berlangganan/page.tsx",
  "app/(dashboard)/murid/premium/page.tsx",
  "app/checkout/page.tsx",
  "app/orders/page.tsx",
  "components/billing/PaymentStatusPanel.tsx",
  "components/billing/PaymentFinishView.tsx",
  "components/billing/PaymentHistory.tsx",
  "components/billing/CouponInput.tsx",
  "components/billing/parts.tsx",
  "components/guru/SidebarPremiumBadge.tsx",
];
const banned = /\b(Checkout|Upgrade|Update|Login|Trial|Free|Order ID|e-Wallet|VA|Founder|credit)\b/;
for (const f of ui) {
  const src = read(f);
  const text = [...src.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)].map((m) => m[1]).join(" | ");
  const quoted = [...src.matchAll(/"([^"\n]*\s[^"\n]*)"/g)].map((m) => m[1]).filter((s) => !/^[a-z-]+( [a-z-]+)*$/.test(s)).join(" | ");
  assert(!banned.test(text) && !banned.test(quoted), `F4 no English copy in ${f}`);
  assert(!/#[0-9a-fA-F]{3,8}\b/.test(src.replace(/\/\/.*$/gm, "")), `F5 no hex colours in ${f}`);
  assert(!/backdrop-blur|blur-3xl|slate-|gray-|emerald-|amber-|red-\d/.test(src), `F6 tokens only, no blur in ${f}`);
}
const css = read("components/billing/billing.css");
assert(!/#[0-9a-fA-F]{3,8}\b/.test(css) && !css.includes("backdrop-filter"), "F7 billing.css uses tokens only, no blur");
assert(css.includes("prefers-reduced-motion") && css.includes("(hover: hover) and (pointer: fine)"), "F8 motion respects reduced-motion; hover only on pointer devices");
assert(!read("app/checkout/page.tsx").includes("onPending: () => { setSuccess(true)"), "F9 marketplace pending is not shown as success");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
