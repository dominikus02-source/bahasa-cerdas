import { NextRequest, NextResponse } from "next/server";
import { createLoginClient } from "@/lib/supabase/server-login";
import cache from "@/lib/redis";
import { db } from "@/lib/db";

/**
 * POST /api/auth/login
 *
 * Server-side login endpoint. Routes authentication through our server
 * WITHOUT forwarding the client IP to Supabase Auth. This means:
 *
 * 1. Supabase Auth rate-limits per Vercel egress IP (distributed across
 *    many IPs) instead of per school NAT IP.
 * 2. 100+ students from one school can all log in without triggering 429.
 * 3. Brute-force protection is handled by our own per-email rate limit.
 *
 * Rate limit: 10 login attempts per email per 10 minutes (Upstash Redis).
 * If Redis is unavailable, rate limit is bypassed (fail-open).
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

    // ── Per-email rate limit (brute-force protection) ──
    // Key by email, NOT by IP. This protects individual accounts from
    // brute-force while allowing many students from the same school IP.
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

    // ── Supabase Auth (via server, NO sb-forwarded-for) ──
    const supabase = await createLoginClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
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

    // ── Reset rate limit on successful login ──
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
