import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  ROLE_INTENT_COOKIE,
  dashboardForRole,
  intentClearCookie,
  isSafeNext,
  resolveGoogleProvisioning,
  resolvePostAuthDestination,
  verifyRoleIntent,
} from "@/lib/auth/role-intent";
import { findApplicationUser, provisionGoogleUser } from "@/lib/auth/google-provision";

/**
 * GET /auth/callback — Google (dan pemulihan) OAuth callback.
 *
 * PRODUCT RULE: Google is authentication only.
 * - Existing application User → role preserved (only backfill supabaseId),
 *   pending intent ignored. Safe specific `next` honored; "/" resolves to
 *   the role dashboard (never the public landing page).
 * - New User + valid pending intent → provisioned ONCE with the intent role,
 *   intent consumed, role-based redirect.
 * - New User WITHOUT valid intent → NEVER silently created as MURID.
 *   Session stays authenticated, user is routed to /auth/pilih-peran to choose.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next") ?? "/";

  const clearIntent = intentClearCookie();
  const withClearedIntent = (res: NextResponse) => {
    res.headers.append("Set-Cookie", clearIntent);
    return res;
  };
  const roleSelectionUrl = `${requestUrl.origin}/auth/pilih-peran${
    typeof next === "string" && next !== "/" && isSafeNext(next)
      ? `?next=${encodeURIComponent(next)}`
      : ""
  }`;

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // Sync Prisma User record for OAuth logins (Google, etc.)
    if (data?.user?.email) {
      const existing = await findApplicationUser({
        supabaseId: data.user.id,
        email: data.user.email,
      });

      const cookieHeader = request.headers.get("cookie") ?? "";
      const intentValue = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${ROLE_INTENT_COOKIE}=`))
        ?.slice(ROLE_INTENT_COOKIE.length + 1);
      const decision = resolveGoogleProvisioning({
        existingRole: existing?.role ?? null,
        intentRole: verifyRoleIntent(intentValue ? decodeURIComponent(intentValue) : null),
      });

      if (decision.action === "preserve" && existing) {
        if (existing.supabaseId !== data.user.id) {
          await db.user.update({
            where: { id: existing.id },
            data: { supabaseId: data.user.id },
          });
        }
        // Existing user: role preserved. Never fall back to the public
        // landing page — "/" (or absent/unsafe next) resolves to dashboard.
        return withClearedIntent(
          NextResponse.redirect(
            `${requestUrl.origin}${resolvePostAuthDestination(existing.role, next)}`
          )
        );
      }

      if (decision.action === "create") {
        await provisionGoogleUser({
          supabaseId: data.user.id,
          email: data.user.email,
          fullName:
            (data.user.user_metadata?.full_name as string) ||
            data.user.email.split("@")[0] ||
            "User",
          role: decision.role,
        });
        return withClearedIntent(
          NextResponse.redirect(`${requestUrl.origin}${dashboardForRole(decision.role)}`)
        );
      }

      // New user, no valid intent → role selection (no silent MURID row).
      return withClearedIntent(NextResponse.redirect(roleSelectionUrl));
    }
  }

  if (token_hash && type) {
    return NextResponse.redirect(`${requestUrl.origin}/confirm?token_hash=${token_hash}&type=${type}`);
  }

  return NextResponse.redirect(`${requestUrl.origin}${next}`);
}
