import { NextRequest, NextResponse } from "next/server";
import { getMidtransConfig, verifyMidtransSignature } from "@/lib/payments/midtrans-server";
import { processVerifiedMidtransNotification } from "@/lib/payments/midtrans-notification";

/**
 * Midtrans HTTP notification endpoint.
 *
 * Canonical URL: https://www.bahasacerdas.com/api/payment/webhook
 * (the apex domain 301-redirects and Midtrans does not follow 301/302/303).
 * Snap requests also set X-Override-Notification to this URL.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { order_id, status_code, gross_amount, signature_key } = body;

  if (!verifyMidtransSignature(order_id, status_code, gross_amount, signature_key)) {
    const cfg = getMidtransConfig();
    // Diagnostics only — never log key material or the full signature.
    console.error("[Webhook] Signature mismatch", {
      order_id,
      status_code,
      gross_amount,
      mode: cfg.isProduction ? "production" : "sandbox",
      serverKeySet: Boolean(cfg.serverKey),
      serverKeyLength: cfg.serverKey.length,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const result = await processVerifiedMidtransNotification(body);
  console.log("[Webhook] processed", {
    order_id,
    transaction_status: body.transaction_status,
    httpStatus: result.httpStatus,
  });
  return NextResponse.json(result.body, { status: result.httpStatus });
}
