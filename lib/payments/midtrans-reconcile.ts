import { db } from "@/lib/db";
import {
  fetchMidtransTransactionStatus,
  verifyMidtransSignature,
} from "@/lib/payments/midtrans-server";
import { processVerifiedMidtransNotification } from "@/lib/payments/midtrans-notification";

export type ReconcileOutcome =
  | { ok: true; status: "SUCCESS"; activated: boolean; orderId: string }
  | { ok: true; status: "PENDING" | "FAILED" | "EXPIRED" | "CANCELLED" | "NOT_FOUND" | "REFUNDED" | "REPLACED"; orderId: string; midtransStatus?: string }
  | { ok: false; error: "FORBIDDEN" | "UNKNOWN_ORDER" | "MIDTRANS_UNVERIFIED" | "MIDTRANS_UNAVAILABLE" | "PROCESSING_FAILED"; orderId: string };

/**
 * Pull-based activation: ask Midtrans for the order status server-side and,
 * if it is settlement/capture, run the SAME idempotent processor the webhook
 * uses. Used by the finish page and Snap popup callbacks so a lost/rejected
 * HTTP notification never leaves a paid user on FREE.
 *
 * The browser never supplies status or amount — only an order id that must
 * belong to `userId` (unless `allowAnyOwner` for admin tooling).
 */
export async function reconcileMidtransOrder(
  orderId: string,
  opts: { userId?: string; allowAnyOwner?: boolean } = {}
): Promise<ReconcileOutcome> {
  const transaksi = await db.transaksi.findFirst({
    where: { orderId },
    select: { id: true, userId: true, status: true },
  });
  if (!transaksi) return { ok: false, error: "UNKNOWN_ORDER", orderId };
  if (!opts.allowAnyOwner && transaksi.userId !== opts.userId) {
    return { ok: false, error: "FORBIDDEN", orderId };
  }
  if (transaksi.status === "SUCCESS") {
    return { ok: true, status: "SUCCESS", activated: false, orderId };
  }
  if (transaksi.status === "REFUNDED") {
    return { ok: true, status: "REFUNDED", orderId };
  }

  let status: Record<string, any> | null;
  try {
    status = await fetchMidtransTransactionStatus(orderId);
  } catch (err: any) {
    console.error("[Reconcile] Midtrans status lookup failed", { orderId, message: err?.message });
    return { ok: false, error: "MIDTRANS_UNAVAILABLE", orderId };
  }
  if (!status) return { ok: true, status: "NOT_FOUND", orderId };

  // Defense in depth: the status payload is signed exactly like a notification.
  if (
    status.order_id !== orderId ||
    !verifyMidtransSignature(status.order_id, status.status_code, status.gross_amount, status.signature_key)
  ) {
    console.error("[Reconcile] Midtrans status signature invalid", { orderId });
    return { ok: false, error: "MIDTRANS_UNVERIFIED", orderId };
  }

  const result = await processVerifiedMidtransNotification(status);
  if (result.httpStatus !== 200) {
    console.error("[Reconcile] processing failed", { orderId, httpStatus: result.httpStatus, body: result.body });
    return { ok: false, error: "PROCESSING_FAILED", orderId };
  }

  const after = await db.transaksi.findFirst({ where: { orderId }, select: { status: true } });
  const finalStatus = after?.status ?? transaksi.status;
  console.log("[Reconcile] done", { orderId, midtransStatus: status.transaction_status, finalStatus });
  if (finalStatus === "SUCCESS") return { ok: true, status: "SUCCESS", activated: true, orderId };
  return {
    ok: true,
    status: (["PENDING", "FAILED", "EXPIRED", "CANCELLED", "REFUNDED", "REPLACED"].includes(finalStatus) ? finalStatus : "PENDING") as "PENDING",
    orderId,
    midtransStatus: String(status.transaction_status || ""),
  };
}

// ── Status publik (halaman /payment/finish, tanpa sesi) ────────────────

export type PublicPaymentStatus =
  | "SUCCESS"
  | "PENDING"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUNDED"
  | "REPLACED"
  | "NOT_FOUND";

export interface PublicPaymentView {
  orderId: string;
  status: PublicPaymentStatus;
  /** "PREMIUM_UPGRADE" | "MURID_PREMIUM" | "KARYA_PURCHASE" | lainnya */
  kind: "GURU_PRO" | "MURID_PREMIUM" | "UMUM_PREMIUM" | "KARYA" | "LAIN";
  planLabel: string | null;
  /** Hanya diisi bila penonton adalah pemilik pesanan. */
  owner: null | {
    amount: number;
    hargaAsli: number | null;
    kuponKode: string | null;
    premiumUntil: string | null;
    isPremium: boolean;
    /** Premium Umum: dana diterima tapi menunggu verifikasi manual founder. */
    manualReview?: boolean;
  };
}

const PLAN_LABELS: Record<string, string> = {
  GURU_PRO_MONTHLY: "Guru Pro Bulanan",
  GURU_PRO_YEARLY: "Guru Pro Tahunan",
  MURID_PREMIUM_MONTHLY: "Premium Bulanan",
  MURID_PREMIUM_YEARLY: "Premium Tahunan",
  UMUM_PREMIUM_MONTHLY: "Premium Umum Bulanan",
  UMUM_PREMIUM_YEARLY: "Premium Umum Tahunan",
};

const KNOWN: PublicPaymentStatus[] = ["SUCCESS", "PENDING", "FAILED", "EXPIRED", "CANCELLED", "REFUNDED", "REPLACED"];

/** Satu panggilan Midtrans per pesanan per 15 detik (per proses). */
const lastPull = new Map<string, number>();
const PULL_INTERVAL_MS = 15_000;
const PULL_WINDOW_MS = 72 * 60 * 60 * 1000;

/**
 * Status pesanan untuk halaman hasil pembayaran. Aman dibuka tanpa login:
 * pengunjung anonim/bukan pemilik hanya melihat status + nama paket —
 * nominal, kupon, dan masa aktif hanya untuk pemilik.
 *
 * Bila pesanan masih menunggu, status ditarik dari Midtrans (diverifikasi
 * tanda tangannya) dan diaktifkan idempoten lewat prosesor webhook.
 */
export async function getPublicPaymentStatus(
  orderId: string,
  viewer: { id: string } | null
): Promise<PublicPaymentView> {
  const find = () =>
    db.transaksi.findFirst({
      where: { orderId },
      select: { id: true, userId: true, type: true, status: true, amount: true, metadata: true, createdAt: true },
    });
  let trx = await find();
  if (!trx) return { orderId, status: "NOT_FOUND", kind: "LAIN", planLabel: null, owner: null };

  const waiting = trx.status === "PENDING" || trx.status === "REPLACED" || trx.status === "EXPIRED";
  const recent = Date.now() - new Date(trx.createdAt).getTime() < PULL_WINDOW_MS;
  const last = lastPull.get(orderId) ?? 0;
  if (waiting && recent && Date.now() - last > PULL_INTERVAL_MS) {
    lastPull.set(orderId, Date.now());
    if (lastPull.size > 5000) lastPull.clear();
    await reconcileMidtransOrder(orderId, { allowAnyOwner: true }).catch((err) => {
      console.error("[PaymentStatus] reconcile failed", { orderId, message: (err as Error)?.message });
    });
    trx = (await find()) ?? trx;
  }

  const meta = (trx.metadata || {}) as Record<string, unknown>;
  const planId = typeof meta.planId === "string" ? meta.planId : null;
  const kind: PublicPaymentView["kind"] =
    trx.type === "PREMIUM_UPGRADE" ? "GURU_PRO" : trx.type === "MURID_PREMIUM" ? "MURID_PREMIUM" : trx.type === "UMUM_PREMIUM" ? "UMUM_PREMIUM" : trx.type === "KARYA_PURCHASE" ? "KARYA" : "LAIN";
  const status = (KNOWN.includes(trx.status as PublicPaymentStatus) ? trx.status : "PENDING") as PublicPaymentStatus;

  let owner: PublicPaymentView["owner"] = null;
  if (viewer && viewer.id === trx.userId) {
    const user = await db.user.findUnique({
      where: { id: trx.userId },
      select: { isPremium: true, premiumUntil: true },
    });
    owner = {
      amount: trx.amount,
      hargaAsli: typeof meta.hargaAsli === "number" ? meta.hargaAsli : null,
      kuponKode: typeof meta.kuponKode === "string" ? meta.kuponKode : null,
      premiumUntil: user?.premiumUntil ? user.premiumUntil.toISOString() : null,
      isPremium: Boolean(user?.isPremium),
      ...(trx.type === "UMUM_PREMIUM" && meta.needsManualReview === true ? { manualReview: true } : {}),
    };
  }

  return {
    orderId,
    status,
    kind,
    planLabel: planId ? PLAN_LABELS[planId] ?? null : kind === "KARYA" ? "Karya" : null,
    owner,
  };
}
