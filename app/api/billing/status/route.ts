import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getPublicPaymentStatus } from "@/lib/payments/midtrans-reconcile";

export const dynamic = "force-dynamic";

const ORDER_ID_RE = /^[A-Za-z0-9._~-]{4,64}$/;

/**
 * GET /api/billing/status?orderId=…
 * Publik (dipakai /payment/finish saat sesi habis). Bukan pemilik hanya
 * menerima status + nama paket; rincian akun hanya untuk pemilik.
 */
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId") || "";
  if (!ORDER_ID_RE.test(orderId)) {
    return NextResponse.json({ ok: false, error: "INVALID_ORDER" }, { status: 400 });
  }
  const user = (await getUser().catch(() => null)) as { id: string } | null;
  const view = await getPublicPaymentStatus(orderId, user ? { id: user.id } : null);
  return NextResponse.json({ ok: true, ...view }, { headers: { "Cache-Control": "no-store" } });
}
