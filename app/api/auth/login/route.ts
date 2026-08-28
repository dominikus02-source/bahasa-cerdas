import { NextRequest, NextResponse } from "next/server";
import { createLoginClient } from "@/lib/supabase/server-login";
import cache from "@/lib/redis";
import { db } from "@/lib/db";

/**
 * POST /api/auth/login
 *
 * Server-side login endpoint. Routes authentication through our server
 * WITHOUT forwarding the client IP to Supabase Auth.
 *
 * Rate limiting strategy (two layers):
 *
 * 1. Per-EMAIL (all attempts): 10 per 10 minutes
 *    → Protects individual accounts from brute-force
 *    → Keyed by normalized email address
 *
 * 2. Per-IP (FAILED attempts only): 30 per 10 minutes
 *    → Protects against credential stuffing from one source
 *    → School-safe: normal school traffic has many DIFFERENT emails
 *      with mostly SUCCESSFUL logins, so the failed-attempt counter
 *      stays low even with 100+ students
 *    → Credential stuffing has many FAILURES from one IP → blocked
 *
 * IMPORTANT: Per-IP limit tracks ONLY failed attempts.
 * Successful logins from a school IP do NOT count toward this limit.
 * This is the key design that makes it school-safe.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── Extract client IP for failed-attempt tracking ──
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // ── Layer 1: Per-email rate limit (all attempts) ──
    // Protects individual accounts from brute-force regardless of source IP.
    if (cache) {
      try {
        const rlKey = `login-attempts:${normalizedEmail}`;
        const current = await cache.get<number>(rlKey);
        const MAX_LOGIN = 10;
        const WINDOW = 600; // 10 minutes

        if (current !== null && current >= MAX_LOGIN) {
          return NextResponse.json(
            {
              error: "Terlalu banyak percobaan login. Tunggu beberapa menit lalu coba lagi.",
              retryAfter: WINDOW,
            },
            { status: 429 }
          );
        }

        if (current === null) {
          await cache.set(rlKey, 1, WINDOW);
        } else {
          await cache.set(rlKey, current + 1, WINDOW);
        }
      } catch {
        // Redis unavailable — fail-open, proceed with login
      }
    }

    // ── Layer 2: Per-IP failed-attempt rate limit (BEFORE auth call) ──
    // Check if this IP has too many recent failures. If so, block early
    // to avoid hitting Supabase Auth at all.
    if (cache && clientIp !== "unknown") {
      try {
        const failKey = `login-fail-ip:${clientIp}`;
        const failCount = await cache.get<number>(failKey);
        const MAX_IP_FAILS = 30;
        const IP_WINDOW = 600; // 10 minutes

        if (failCount !== null && failCount >= MAX_IP_FAILS) {
          return NextResponse.json(
            {
              error: "Terlalu banyak percobaan dari jaringan ini. Tunggu beberapa menit lalu coba lagi.",
              retryAfter: IP_WINDOW,
            },
            { status: 429 }
          );
        }
      } catch {
        // Redis unavailable — fail-open
      }
    }

    // ── Supabase Auth (via server, NO sb-forwarded-for) ──
    const supabase = await createLoginClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      // ── Track FAILED attempt per IP ──
      // Only failures increment the IP counter. Successful logins do NOT.
      // This is what makes it school-safe: 100 students logging in
      // successfully = 0 IP failures = no blocking.
      if (cache && clientIp !== "unknown") {
        try {
          const failKey = `login-fail-ip:${clientIp}`;
          const current = await cache.get<number>(failKey);
          if (current === null) {
            await cache.set(failKey, 1, 600);
          } else {
            await cache.set(failKey, current + 1, 600);
          }
        } catch {
          // Ignore
        }
      }

      // Map Supabase errors to friendly messages
      const message =
        error.message === "Invalid login credentials"
          ? "Email atau kata sandi salah"
          : error.message === "Email not confirmed"
          ? "Email belum dikonfirmasi. Cek inbox/spam kamu."
          : error.status === 429
          ? "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi."
          : error.message;

      return NextResponse.json(
        { error: message },
        { status: error.status || 401 }
      );
    }

    if (!data.session || !data.user) {
      return NextResponse.json({ error: "Gagal masuk" }, { status: 401 });
    }

    // ── Ensure user exists in our DB ──
    let dbUser = null;
    try {
      dbUser = await db.user.findUnique({
        where: { supabaseId: data.user.id },
      });

      if (!dbUser) {
        dbUser = await db.user.create({
          data: {
            supabaseId: data.user.id,
            email: data.user.email || normalizedEmail,
            fullName:
              data.user.user_metadata?.full_name ||
              normalizedEmail.split("@")[0],
            role: (data.user.user_metadata?.role as any) || "MURID",
          },
        });
      }
    } catch {
      // DB error — still return session, let /api/user/me handle DB sync
    }

    // ── Reset per-email rate limit on SUCCESSFUL login ──
    if (cache) {
      try {
        await cache.set(`login-attempts:${normalizedEmail}`, 0, 600);
      } catch {
        // Ignore
      }
    }

    // ── Response ──
    // Supabase SSR library already set cookies via cookieStore.set() in
    // createLoginClient(). Next.js includes Set-Cookie headers automatically.
    return NextResponse.json({
      session: data.session,
      user: dbUser
        ? {
            id: dbUser.id,
            email: dbUser.email,
            fullName: dbUser.fullName,
            role: dbUser.role,
            isFounder: dbUser.isFounder,
          }
        : null,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
