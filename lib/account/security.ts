import { createClient as createIsolatedClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security";
import type { NextRequest } from "next/server";

export class AccountError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function validatePassword(current: unknown, next: unknown) {
  if (typeof next !== "string" || next.length < 8 || next.length > 128) throw new AccountError("Password baru harus 8–128 karakter.");
  if (next === current) throw new AccountError("Password baru harus berbeda dari password lama.");
  return next;
}
export async function accountContext(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin || origin !== req.nextUrl.origin) throw new AccountError("Permintaan tidak valid. Muat ulang halaman.", 403);
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.email) throw new AccountError("Silakan masuk kembali.", 401);
  if (!(await checkRateLimit(`account:${user.id}`, "account")).allowed) throw new AccountError("Terlalu banyak percobaan. Coba lagi dalam satu menit.", 429);
  // Account mutation must respect MFA when the account has verified factors.
  if (user.factors?.some(f => f.status === "verified")) {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.currentLevel !== "aal2") throw new AccountError("Verifikasi autentikasi dua langkah terlebih dahulu.", 403);
  }
  return { supabase, user };
}
export function isolatedAuth() {
  return createIsolatedClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
export async function reauthenticate(user: { id: string; email?: string }, body: { currentPassword?: unknown; verificationCode?: unknown; oauthReauth?: unknown; emailReauth?: unknown }, authenticated?: Awaited<ReturnType<typeof createClient>>) {
  if ((body.oauthReauth === true || body.emailReauth === true) && authenticated) {
    const { data, error } = await authenticated.auth.getClaims();
    const methods = data?.claims?.amr as { method: string; timestamp: number }[] | undefined;
    const now = Math.floor(Date.now() / 1000);
    const method = body.oauthReauth === true ? "oauth" : "otp";
    if (error || data?.claims?.sub !== user.id || !methods?.some(m => m.method === method && m.timestamp <= now && now - m.timestamp < 300)) throw new AccountError(method === "oauth" ? "Masuk kembali dengan Google untuk memverifikasi akun." : "Buka tautan verifikasi email yang baru lalu kembali ke pengaturan.", 403);
    const { data: sessionData } = await authenticated.auth.getSession();
    if (!sessionData.session) throw new AccountError("Silakan masuk kembali.", 401);
    return { verifier: authenticated, session: sessionData.session, cleanup: async () => {} };
  }
  const verifier = isolatedAuth();
  const result = typeof body.verificationCode === "string" && /^\d{6,10}$/.test(body.verificationCode)
    ? await verifier.auth.verifyOtp({ email: user.email!, token: body.verificationCode, type: "email" })
    : typeof body.currentPassword === "string" && body.currentPassword.length <= 128
      ? await verifier.auth.signInWithPassword({ email: user.email!, password: body.currentPassword })
      : null;
  if (!result || result.error || result.data.user?.id !== user.id || !result.data.session) {
    await verifier.auth.signOut({ scope: "local" });
    throw new AccountError("Password atau kode verifikasi tidak benar.", 403);
  }
  return { verifier, session: result.data.session, cleanup: async () => { await verifier.auth.signOut({ scope: "local" }); } };
}
export function accountFailure(error: unknown) {
  return { error: error instanceof AccountError ? error.message : "Layanan akun sedang bermasalah. Silakan coba lagi.", status: error instanceof AccountError ? error.status : 500 };
}

export async function readAccountBody(req: NextRequest): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > 2048) throw new AccountError("Permintaan terlalu besar.");
  try {
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid");
    return body as Record<string, unknown>;
  } catch { throw new AccountError("Data permintaan tidak valid."); }
}
