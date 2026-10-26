/**
 * Konfirmasi ketik untuk aksi admin berisiko (uang & massal).
 *
 * Dipakai bersama oleh server (lib/admin/guard.ts) dan klien
 * (components/admin/TypedConfirm.tsx). Klien yang sudah mendapat konfirmasi
 * mengirim header `x-admin-confirm: KONFIRMASI`; tanpa header itu server
 * menolak dengan 428 CONFIRM_REQUIRED. Ini bukan pengganti otorisasi — hanya
 * rem terakhir agar klik tak sengaja/CSRF tidak memindahkan uang.
 */
export const ADMIN_CONFIRM_HEADER = "x-admin-confirm";
export const ADMIN_CONFIRM_PHRASE = "KONFIRMASI";

/** Pola path (tanpa query) + metode yang wajib konfirmasi ketik. */
const CONFIRM_RULES: { method: string; pattern: RegExp }[] = [
  // Uang
  { method: "PATCH", pattern: /^\/api\/admin\/withdrawals\/[^/]+$/ },
  { method: "PATCH", pattern: /^\/api\/admin\/teacher-commissions\/withdrawals\/[^/]+$/ },
  { method: "POST", pattern: /^\/api\/admin\/teacher-commissions\/payouts\/[^/]+\/(retry|reconcile)$/ },
  { method: "POST", pattern: /^\/api\/admin\/teacher-commissions\/(payout-control|payout-safety|canary|backfill)$/ },
  { method: "POST", pattern: /^\/api\/admin\/teacher-commissions\/pre-canary\/decision$/ },
  { method: "POST", pattern: /^\/api\/admin\/payments\/manual-activate$/ },
  { method: "POST", pattern: /^\/api\/admin\/analytics\/(payment-health\/fix|reconciliation)$/ },
  { method: "POST", pattern: /^\/api\/admin\/teacher-risk\/[^/]+\/decision$/ },
  // Massal / akses
  { method: "PATCH", pattern: /^\/api\/admin\/users$/ },
  { method: "POST", pattern: /^\/api\/admin\/bank-soal\/import$/ },
  { method: "POST", pattern: /^\/api\/admin\/(make-founder|revoke-founder)$/ },
];

export function requiresTypedConfirm(method: string, pathname: string): boolean {
  const m = method.toUpperCase();
  return CONFIRM_RULES.some((r) => r.method === m && r.pattern.test(pathname));
}
