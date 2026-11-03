import { NextRequest, NextResponse } from "next/server";
import { accountContext, accountFailure, AccountError } from "@/lib/account/security";
import { db } from "@/lib/db";
import { publicOrigin } from "@/lib/http/origin";
export async function POST(req: NextRequest) {
  let userId: string | undefined;
  try {
    const { user, supabase } = await accountContext(req);
    userId = user.id;
    const account = await db.user.findUnique({ where: { supabaseId: user.id }, select: { role: true } });
    const next =
      account?.role === "GURU"
        ? "/guru/pengaturan"
        : account?.role === "UMUM"
          ? "/umum/pengaturan"
          : "/murid/pengaturan";
    // SSR client persists the PKCE verifier cookie for the email callback.
    const { error } = await supabase.auth.signInWithOtp({ email: user.email!, options: { shouldCreateUser: false, emailRedirectTo: `${publicOrigin(req)}/api/auth/callback?next=${encodeURIComponent(next)}` } });
    if (error) throw new AccountError("Kode belum dapat dikirim. Coba lagi nanti.", 503);
    return NextResponse.json({ message: "Periksa email akunmu. Masukkan kode di sini, atau buka tautan lalu pilih ‘Sudah membuka tautan email’ dan lanjutkan dalam 5 menit." });
  } catch (error) { const f = accountFailure(error, { route: "account.verify", userId }); return NextResponse.json({ error: f.error }, { status: f.status }); }
}
