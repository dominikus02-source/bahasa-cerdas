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
      const objects = await db.$queryRaw<{ bucket_id: string; name: string }[]>`SELECT bucket_id, name FROM storage.objects WHERE owner_id = ${user.id} OR owner = ${user.id}::uuid OR (COALESCE(owner_id, '') = '' AND owner IS NULL AND split_part(name, '/', 2) = ${account.id})`;
      await anonymizeAccount(account.id, user.id);
      try {
        for (const bucket of new Set(objects.map(o => o.bucket_id))) {
          const paths = objects.filter(o => o.bucket_id === bucket).map(o => o.name);
          for (let start = 0; start < paths.length; start += 100) {
            const { error } = await admin.storage.from(bucket).remove(paths.slice(start, start + 100));
            if (error) throw error;
          }
        }
        const { error: revokeError } = await admin.auth.admin.signOut(session.access_token, "global");
        if (revokeError) throw revokeError;
        const { error } = await admin.auth.admin.deleteUser(user.id);
        if (error) throw error;
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
