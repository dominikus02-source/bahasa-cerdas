import { createHmac, timingSafeEqual } from "crypto";
import { timestampSkewMs } from "@/lib/roblox/config";

/**
 * HMAC server Roblox.
 *
 * String yang ditandatangani: `{timestamp}.{rawBody}`
 * timestamp = milidetik Unix, 13 digit.
 * signature = HMAC-SHA256, base64url tanpa padding.
 */
export function signRobloxRequest(rawBody: string, timestamp: string, secret: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("base64url");
}

export function verifyRobloxSignature(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
  now = Date.now(),
  secret = process.env.ROBLOX_SERVER_SECRET,
  skewMs = timestampSkewMs(),
): boolean {
  if (!secret || !timestamp || !signature) return false;
  if (!/^\d{13}$/.test(timestamp)) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > skewMs) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature, "base64url");
  } catch {
    return false;
  }
  if (received.length !== expected.length) return false;
  return timingSafeEqual(received, expected);
}
