import { NextResponse } from "next/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import {
  isAllowedGoogleRole,
  isRoleIntentConfigured,
  signRoleIntent,
  intentSetCookie,
} from "@/lib/auth/role-intent";

/**
 * POST /api/auth/role-intent { role: "GURU" | "MURID" }
 *
 * Seals an explicit role choice (made in a controlled UI) into a short-lived,
 * HMAC-signed httpOnly cookie that the OAuth callback consumes exactly once.
 * Only allowlisted roles are accepted; anything else is rejected, never stored.
 */
export async function POST(req: Request) {
  const rl = await rateLimitRoute(req, { maxRequests: 20, windowSeconds: 60, identifier: "role-intent" });
  if (rl) return rl;

  let role: unknown;
  try {
    role = (await req.json()).role;
  } catch {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  if (!isAllowedGoogleRole(role)) {
    return NextResponse.json({ error: "Peran tidak valid" }, { status: 400 });
  }

  const sealed = signRoleIntent(role);
  if (!sealed) {
    return NextResponse.json(
      { error: "Layanan peran belum dikonfigurasi. Coba lagi nanti." },
      { status: 503 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", intentSetCookie(sealed));
  return res;
}
