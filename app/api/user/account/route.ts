import { finishDeletion } from "@/lib/compliance/deletion-job";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { accountContext, reauthenticate, AccountError, readAccountBody, accountFailure } from "@/lib/account/security";
import { anonymizeAccount } from "@/lib/account/deletion";

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, user } = await accountContext(req);
    const body = await readAccountBody(req);
    if (body.confirmation !== "HAPUS AKUN") throw new AccountError("Ketik HAPUS AKUN untuk melanjutkan.");
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    if (!key) throw new AccountError("Penghapusan akun belum tersedia. Hubungi pengelola.", 503);
    const account = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!account) throw new AccountError("Akun tidak ditemukan.", 404);
    const { cleanup, session } = await reauthenticate(user, body, supabase);
    try {
      const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: verifiedAccount, error: adminError } = await admin.auth.admin.getUserById(user.id);
      if (adminError || verifiedAccount.user?.id !== user.id) throw new AccountError("Penghapusan akun belum tersedia. Hubungi pengelola.", 503);
      // Preflight the ownership query before changing application data. Storage
      // deletion must use its API, never DELETE directly from storage.objects.
      const objects = await db.$queryRaw<{ bucket_id: string; name: string }[]>`SELECT bucket_id, name FROM storage.objects WHERE owner_id = ${user.id} OR owner = ${user.id}::uuid OR (COALESCE(owner_id, '') = '' AND owner IS NULL AND (split_part(name, '/', 2) = ${account.id} OR (bucket_id = 'student-private' AND split_part(name, '/', 1) = ${account.id})))`;
      await anonymizeAccount(account.id, user.id, objects);
      try {
        await finishDeletion(account.id, admin, session.access_token);
      } catch {
        // Tombstone already denies app access, even for unexpired JWTs. The
        // same endpoint can safely retry cleanup using the still-valid JWT.
        throw new AccountError("Akun sudah dinonaktifkan, tetapi penghapusan akhir belum selesai. Ulangi penghapusan atau hubungi pengelola.", 503);
      }
      await supabase.auth.signOut({ scope: "local" });
      return NextResponse.json({ message: "Akun telah dihapus.", signOut: true });
    } finally { await cleanup(); }
  } catch (error) { const f = accountFailure(error); return NextResponse.json({ error: f.error }, { status: f.status }); }
}
