import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { consumeRecoveryLimit, recoveryRedirect, RECOVERY_FAILURE, RECOVERY_SUCCESS } from "@/lib/auth/password-recovery";
import { getForwardedIp } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
    }
    const raw = body && typeof body === "object" && "email" in body ? body.email : null;
    const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Masukkan alamat email yang valid." }, { status: 400 });
    }
    const retryAfter = await consumeRecoveryLimit(email, getForwardedIp(req.headers) || "unknown");
    if (retryAfter) return NextResponse.json({ error: "Terlalu banyak permintaan. Silakan coba lagi nanti.", retryAfter }, {
      status: 429, headers: { "Retry-After": String(retryAfter) },
    });
    // Auth is the source of truth, not the application profile table. Supabase
    // deliberately returns success for unknown emails; preserve that behavior.
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: recoveryRedirect() });
    if (error) {
      console.error("[password-recovery] Provider failure", { code: error.code, status: error.status });
      if (error.status === 429) return NextResponse.json({ error: "Terlalu banyak permintaan. Tunggu beberapa menit lalu coba lagi.", retryAfter: 60 }, {
        status: 429, headers: { "Retry-After": "60" },
      });
      return NextResponse.json({ error: RECOVERY_FAILURE }, { status: 503 });
    }
    return NextResponse.json({ message: RECOVERY_SUCCESS }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[password-recovery] Configuration or service failure", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: RECOVERY_FAILURE }, { status: 503 });
  }
}
