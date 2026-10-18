import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { reconcileMidtransOrder } from "@/lib/payments/midtrans-reconcile";

export const dynamic = "force-dynamic";

const ORDER_ID_RE = /^[A-Za-z0-9._~-]{4,64}$/;

/**
 * POST /api/billing/reconcile { orderId }
 *
 * Called by the Snap popup callbacks and /payment/finish. Verifies the order
 * with Midtrans server-side and activates idempotently via the webhook's own
 * processor. Only the order's owner (or ADMIN/founder) may trigger it.
 */
export async function POST(req: NextRequest) {
  const user: any = await getUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });

  let orderId: unknown;
  try {
    ({ orderId } = await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_ORDER" }, { status: 400 });
  }
  if (typeof orderId !== "string" || !ORDER_ID_RE.test(orderId)) {
    return NextResponse.json({ ok: false, error: "INVALID_ORDER" }, { status: 400 });
  }

  const outcome = await reconcileMidtransOrder(orderId, {
    userId: user.id,
    allowAnyOwner: user.role === "ADMIN" || user.isFounder === true,
  });

  if (!outcome.ok) {
    const httpStatus =
      outcome.error === "FORBIDDEN" || outcome.error === "UNKNOWN_ORDER" ? 404
      : outcome.error === "MIDTRANS_UNAVAILABLE" ? 503
      : 502;
    return NextResponse.json(outcome, { status: httpStatus });
  }
  return NextResponse.json(outcome);
}
