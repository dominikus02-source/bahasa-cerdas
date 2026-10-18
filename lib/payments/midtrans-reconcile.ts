import { db } from "@/lib/db";
import {
  fetchMidtransTransactionStatus,
  verifyMidtransSignature,
} from "@/lib/payments/midtrans-server";
import { processVerifiedMidtransNotification } from "@/lib/payments/midtrans-notification";

export type ReconcileOutcome =
  | { ok: true; status: "SUCCESS"; activated: boolean; orderId: string }
  | { ok: true; status: "PENDING" | "FAILED" | "EXPIRED" | "CANCELLED" | "NOT_FOUND" | "REFUNDED"; orderId: string; midtransStatus?: string }
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
    status: (["PENDING", "FAILED", "EXPIRED", "CANCELLED", "REFUNDED"].includes(finalStatus) ? finalStatus : "PENDING") as any,
    orderId,
    midtransStatus: String(status.transaction_status || ""),
  };
}
