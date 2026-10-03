import { NextRequest, NextResponse } from "next/server";
import { accountContext, reauthenticate, validatePassword, readAccountBody, accountFailure, AccountError } from "@/lib/account/security";

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await accountContext(req);
    const body = await readAccountBody(req);
    const newPassword = validatePassword(body.currentPassword, body.newPassword);
    const { verifier, cleanup } = await reauthenticate(user, body, supabase);
    try {
      // Fresh verification satisfies secure password change; preserve AAL2 for MFA users.
      const updater = user.factors?.some(f => f.status === "verified") ? supabase : verifier;
      const { error } = await updater.auth.updateUser({ password: newPassword, ...(typeof body.nonce === "string" ? { nonce: body.nonce } : {}) });
      if (error) throw new AccountError(error.code === "reauthentication_needed" ? "Verifikasi tambahan diperlukan. Masuk kembali lalu ulangi." : "Password ditolak. Gunakan password kuat yang belum pernah dipakai.");
      const { error: logoutError } = await supabase.auth.signOut({ scope: "global" });
      if (logoutError) return NextResponse.json({ message: "Password berhasil diubah. Keluar lalu masuk kembali; pencabutan sesi lain belum berhasil.", signOut: true, revocationPending: true });
      return NextResponse.json({ message: "Password berhasil diubah. Silakan masuk kembali.", signOut: true });
    } finally { await cleanup(); }
  } catch (error) {
    const failure = accountFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
