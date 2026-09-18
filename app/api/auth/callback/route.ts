import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  try {
    const code = requestUrl.searchParams.get("code");
    const token_hash = requestUrl.searchParams.get("token_hash");
    const type = requestUrl.searchParams.get("type");
    const next = requestUrl.searchParams.get("next") ?? "/";

    const clearIntent = intentClearCookie();
    const clearOn = (res: NextResponse) => {
      res.headers.append("Set-Cookie", clearIntent);
      return res;
    };
    const roleSelectionUrl = `${requestUrl.origin}/auth/pilih-peran${
      typeof next === "string" && next !== "/" && isSafeNext(next)
        ? `?next=${encodeURIComponent(next)}`
        : ""
    }`;

    // ── PKCE code exchange ──
    if (code) {
      const supabase = await createClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error("[auth/callback] exchangeCodeForSession FAILED:", exchangeError.message, "| code present:", !!code, "| next:", next);
        // Recovery-specific: redirect to reset page with error so user sees
        // "Link Tidak Valid" instead of silently failing.
        if (next === "/reset-password") {
          return NextResponse.redirect(`${requestUrl.origin}/reset-password?error=exchange_failed`);
        }
        return NextResponse.redirect(`${requestUrl.origin}/login?error=auth`);
      }
      console.log("[auth/callback] exchangeCodeForSession OK | next:", next);

      // ── Google provisioning (authentication only — role from intent/selection)
      // Existing User → preserve role, intent ignored. Safe specific `next`
      // honored; "/" resolves to the role dashboard (never landing).
      // New User + valid intent → created once with the intent role.
      // New User without intent → role selection (NEVER silent MURID).
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) {
          const existing = await findApplicationUser({ supabaseId: user.id, email: user.email });
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

          if (decision.action === "create") {
            await provisionGoogleUser({
              supabaseId: user.id,
              email: user.email,
              fullName:
                (user.user_metadata?.full_name as string) ||
                user.email.split("@")[0] ||
                "User",
              role: decision.role,
            });
            return clearOn(
              NextResponse.redirect(`${requestUrl.origin}${dashboardForRole(decision.role)}`)
            );
          }

          if (decision.action === "needs-selection") {
            return clearOn(NextResponse.redirect(roleSelectionUrl));
          }
          // preserve → existing role kept; converge on the role-aware
          // destination (safe `next` honored, "/" → dashboard).
          if (decision.action === "preserve" && existing) {
            return clearOn(
              NextResponse.redirect(
                `${requestUrl.origin}${resolvePostAuthDestination(existing.role, next)}`
              )
            );
          }
        }
      } catch (e) {
        console.error("[auth/callback] provisioning check failed:", e);
      }
      // Fall through to recovery/next/role-based handling below.
      // (clearOn applied to each redirect so the single-use intent is consumed.)
      if (next === "/reset-password") {
        return clearOn(NextResponse.redirect(`${requestUrl.origin}/reset-password`));
      }
      if (isSafeNext(next)) {
        return clearOn(NextResponse.redirect(`${requestUrl.origin}${next}`));
      }
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const dbUser = await findApplicationUser({
            supabaseId: user.id,
            email: user.email ?? "",
          });
          if (dbUser) {
            return clearOn(
              NextResponse.redirect(`${requestUrl.origin}${dashboardForRole(dbUser.role)}`)
            );
          }
          // Authenticated but no application User → role selection, not "/".
          return clearOn(NextResponse.redirect(`${requestUrl.origin}/auth/pilih-peran`));
        }
      } catch {
        // Fall through to default
      }
      return NextResponse.redirect(`${requestUrl.origin}/`);
    }

    if (token_hash && type) {
      return NextResponse.redirect(`${requestUrl.origin}/confirm?token_hash=${token_hash}&type=${type}`);
    }

    // ── Recovery flow (no code exchange — honor directly) ──
    if (next === "/reset-password") {
      return NextResponse.redirect(`${requestUrl.origin}/reset-password`);
    }

    // ── Valid internal next param ──
    if (isSafeNext(next)) {
      return NextResponse.redirect(`${requestUrl.origin}${next}`);
    }

    // ── Role-based redirect ──
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const dbUser = await findApplicationUser({
          supabaseId: user.id,
          email: user.email ?? "",
        });
        if (dbUser) {
          return NextResponse.redirect(`${requestUrl.origin}${dashboardForRole(dbUser.role)}`);
        }
        // Authenticated but no application User → role selection, not "/".
        return NextResponse.redirect(`${requestUrl.origin}/auth/pilih-peran`);
      }
    } catch {
      // Fall through to default
    }

    return NextResponse.redirect(`${requestUrl.origin}/`);
  } catch (error) {
    console.error("[auth/callback] UNEXPECTED ERROR:", error);
    return NextResponse.redirect(`${requestUrl.origin}/login?error=auth`);
  }
}
