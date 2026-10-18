/**
 * Midtrans payment → Premium activation gate.
 *
 * Regression for 19 Oct 2026: a settled Guru Pro payment never activated
 * because the dashboard notification URL used the apex domain, which
 * 301-redirects to www, and Midtrans does not follow 301/302/303.
 *
 *  A. Signature verification (official formula, constant-time, strict input)
 *  B. Amount parsing ("1000.00" → 1000)
 *  C. Callback URLs always on canonical www host
 *  D. Snap request forces X-Override-Notification + callbacks.finish
 *  E. Webhook + reconcile wiring (static)
 *
 * No DB, no network.
 */
import crypto from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, name: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`  ✗ FAIL: ${name}`);
  }
}

const FAKE_KEY = "Mid-server-TESTKEYTESTKEYTESTKEY00";

async function main() {
  process.env.MIDTRANS_SERVER_KEY = FAKE_KEY;
  process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY = "Mid-client-TESTCLIENT";
  process.env.MIDTRANS_IS_PRODUCTION = "true";
  process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION = "true";
  delete process.env.MIDTRANS_NOTIFICATION_URL;
  delete process.env.MIDTRANS_PUBLIC_BASE_URL;

  const m = await import("../lib/payments/midtrans-server");

  // A. Signature
  console.log("A. Signature verification");
  const sig = crypto.createHash("sha512").update("PM-E68Z5G-cmqxh3uo" + "200" + "1000.00" + FAKE_KEY).digest("hex");
  assert(m.computeMidtransSignature("PM-E68Z5G-cmqxh3uo", "200", "1000.00", FAKE_KEY) === sig, "formula = sha512(order+status+gross+key)");
  assert(m.verifyMidtransSignature("PM-E68Z5G-cmqxh3uo", "200", "1000.00", sig) === true, "valid signature accepted");
  assert(m.verifyMidtransSignature("PM-E68Z5G-cmqxh3uo", "200", "1000.00", sig.toUpperCase()) === true, "hex case-insensitive");
  assert(m.verifyMidtransSignature("PM-E68Z5G-cmqxh3uo", "200", "49000.00", sig) === false, "tampered amount rejected");
  assert(m.verifyMidtransSignature("PM-OTHER", "200", "1000.00", sig) === false, "tampered order rejected");
  assert(m.verifyMidtransSignature("PM-E68Z5G-cmqxh3uo", "201", "1000.00", sig) === false, "tampered status rejected");
  assert(m.verifyMidtransSignature("PM-E68Z5G-cmqxh3uo", "200", "1000.00", "x") === false, "garbage signature rejected");
  assert(m.verifyMidtransSignature("PM-E68Z5G-cmqxh3uo", "200", "1000.00", undefined) === false, "missing signature rejected");
  assert(m.verifyMidtransSignature(undefined, "200", "1000.00", sig) === false, "missing order rejected");
  assert(m.verifyMidtransSignature("PM-E68Z5G-cmqxh3uo", "200", "1000.00", sig, "") === false, "empty server key never verifies");

  // B. Amount
  console.log("B. Amount parsing");
  assert(m.parseMidtransAmount("1000.00") === 1000, "1000.00 → 1000");
  assert(m.parseMidtransAmount("49000.00") === 49000, "49000.00 → 49000");
  assert(Number.isNaN(m.parseMidtransAmount("abc")), "garbage → NaN (never equals local amount)");

  // C. URLs
  console.log("C. Callback URLs");
  process.env.NEXT_PUBLIC_SITE_URL = "https://www.bahasacerdas.com";
  assert(m.getMidtransNotificationUrl() === "https://www.bahasacerdas.com/api/payment/webhook", "www notification URL");
  process.env.NEXT_PUBLIC_SITE_URL = "https://bahasacerdas.com/";
  assert(m.getMidtransNotificationUrl() === "https://www.bahasacerdas.com/api/payment/webhook", "apex normalised to www (apex 301s)");
  assert(m.getMidtransFinishUrl() === "https://www.bahasacerdas.com/payment/finish", "finish URL on www");
  process.env.NEXT_PUBLIC_SITE_URL = "http://0.0.0.0:3000";
  assert(m.getMidtransNotificationUrl() === "https://www.bahasacerdas.com/api/payment/webhook", "internal origin falls back to canonical");
  process.env.MIDTRANS_NOTIFICATION_URL = "https://bahasacerdas.com/api/payment/webhook";
  assert(m.getMidtransNotificationUrl() === "https://www.bahasacerdas.com/api/payment/webhook", "explicit apex override normalised");
  delete process.env.MIDTRANS_NOTIFICATION_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://www.bahasacerdas.com";

  // D. Snap request
  console.log("D. Snap request");
  let captured: { url: string; init: any } | null = null;
  const realFetch = globalThis.fetch;
  (globalThis as any).fetch = async (url: string, init: any) => {
    captured = { url, init };
    return new Response(JSON.stringify({ token: "tok", redirect_url: "https://app.midtrans.com/snap/v4/x" }), { status: 201 });
  };
  try {
    const r = await m.createMidtransSnapTransaction({ orderId: "PM-TEST-1", amount: 1000, fullName: "Guru", email: "g@example.com" });
    assert(r.token === "tok", "snap token returned");
  } finally {
    globalThis.fetch = realFetch;
  }
  const c = captured as { url: string; init: any } | null;
  assert(!!c && c.url === "https://app.midtrans.com/snap/v1/transactions", "production snap endpoint");
  assert(c?.init?.headers?.["X-Override-Notification"] === "https://www.bahasacerdas.com/api/payment/webhook", "X-Override-Notification forced to www webhook");
  const sent = c ? JSON.parse(c.init.body) : {};
  assert(sent?.callbacks?.finish === "https://www.bahasacerdas.com/payment/finish", "callbacks.finish set");
  assert(sent?.transaction_details?.gross_amount === 1000, "gross_amount = charged (coupon) amount");

  // E. Wiring
  console.log("E. Wiring");
  const root = join(__dirname, "..");
  const read = (p: string) => readFileSync(join(root, p), "utf8");
  const webhook = read("app/api/payment/webhook/route.ts");
  assert(webhook.includes("verifyMidtransSignature(") && webhook.includes("processVerifiedMidtransNotification("), "webhook verifies then uses shared processor");
  assert(webhook.indexOf("verifyMidtransSignature(") < webhook.indexOf("processVerifiedMidtransNotification(body)"), "signature checked before processing");
  assert(!/computed:|probe/.test(webhook), "webhook does not log computed signatures");
  const proc = read("lib/payments/midtrans-notification.ts");
  assert(proc.includes("grossAmount !== transaksi.amount"), "strict amount match retained (no tolerance)");
  assert(proc.includes('fraud === "challenge"'), "capture+challenge does not activate");
  assert(proc.includes('status: { not: "SUCCESS" }'), "atomic claim-first idempotency retained");
  const rec = read("lib/payments/midtrans-reconcile.ts");
  assert(rec.includes("transaksi.userId !== opts.userId"), "reconcile enforces order ownership");
  assert(rec.includes("verifyMidtransSignature(status.order_id"), "reconcile verifies Midtrans status signature");
  assert(rec.includes("fetchMidtransTransactionStatus("), "reconcile reads status from Midtrans server-side");
  const finish = read("app/payment/finish/page.tsx");
  assert(finish.includes("getPublicPaymentStatus(") && !finish.includes("transaction_status ==="), "finish page verifies server-side, ignores query status");
  const guru = read("app/(dashboard)/guru/berlangganan/page.tsx");
  assert(guru.includes("await reconcilePayment(orderId)") && guru.includes("onSuccess: () => { if (orderId) void showOrder("), "guru Snap callbacks reconcile");

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
