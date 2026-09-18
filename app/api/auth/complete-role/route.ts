import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import {
  dashboardForRole,
  intentClearCookie,
  isAllowedGoogleRole,
  resolvePostAuthDestination,
} from "@/lib/auth/role-intent";
import { findApplicationUser, provisionGoogleUser } from "@/lib/auth/google-provision";

/**
 * POST /api/auth/complete-role { role: "GURU" | "MURID" }
 *
 * Completes application provisioning for a Google-authenticated session that
 * has no application User yet (the role-selection step). The role comes from
 * an explicit in-session choice and is validated against the allowlist.
 *
 * - Existing application User → role preserved, intent ignored (idempotent:
 *   refresh/retry can never duplicate or flip the role).
 * - New User → created once with the chosen role.
 */
export async function POST(req: Request) {
  const rl = await rateLimitRoute(req, { maxRequests: 10, windowSeconds: 60, identifier: "complete-role" });
  if (rl) return rl;

  let body: { role?: unknown; next?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }
  if (!isAllowedGoogleRole(body.role)) {
    return NextResponse.json({ error: "Peran tidak valid" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser || !authUser.email) {
    return NextResponse.json({ error: "Sesi tidak valid. Silakan login ulang." }, { status: 401 });
  }

  const existing = await findApplicationUser({ supabaseId: authUser.id, email: authUser.email });
  const res = NextResponse.json({
    ok: true,
    role: existing ? existing.role : body.role,
    // Existing users keep their role; safe specific `next` honored, "/"
    // resolves to the dashboard (never the public landing page).
    redirect: existing
      ? resolvePostAuthDestination(existing.role, body.next)
      : dashboardForRole(body.role),
  });
  res.headers.append("Set-Cookie", intentClearCookie());

  if (existing) return res;

  await provisionGoogleUser({
    supabaseId: authUser.id,
    email: authUser.email,
    fullName:
      (authUser.user_metadata?.full_name as string) ||
      authUser.email.split("@")[0] ||
      "User",
    role: body.role,
  });
  return res;
}

/**
 * GET /api/auth/complete-role — provisioning status for the role-selection page.
 * Never creates. { session: bool, provisioned: bool, role, redirect }
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser || !authUser.email) {
    return NextResponse.json({ session: false, provisioned: false });
  }
  const existing = await findApplicationUser({ supabaseId: authUser.id, email: authUser.email });
  if (!existing) return NextResponse.json({ session: true, provisioned: false });
  return NextResponse.json({
    session: true,
    provisioned: true,
    role: existing.role,
    redirect: dashboardForRole(existing.role),
  });
}
