import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";
import { db } from "@/lib/db";
import { getIdentityUser } from "@/lib/supabase/server";
import { sameOrigin, jsonBody, privacyFailure } from "@/lib/compliance/http";
import { anonymizeAccount } from "@/lib/account/deletion";
import { finishDeletion } from "@/lib/compliance/deletion-job";

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const actor = await getIdentityUser();
    if (!actor || (actor.role !== "ADMIN" && !actor.isFounder)) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }
    const { requestId, evidenceRef } = z.object({
      requestId: z.string(),
      evidenceRef: z.string().trim().min(10).max(300),
    }).strict().parse(await jsonBody(req));

    const pr = await db.privacyRequest.findUniqueOrThrow({ where: { id: requestId } });
    if (pr.type !== "DELETE_ACCOUNT" || !pr.guardianId || !["RECEIVED","PROCESSING"].includes(pr.status)) {
      return NextResponse.json({ error: "Permintaan penghapusan wali tidak valid atau sudah selesai." }, { status: 409 });
    }
    const guardian = await db.guardianRequest.findFirst({
      where: { childId: pr.userId, guardianId: pr.guardianId, status: "VERIFIED" },
      select: { id: true },
    });
    if (!guardian) return NextResponse.json({ error: "Kewenangan wali tidak lagi terverifikasi." }, { status: 409 });

    const target = await db.user.findUniqueOrThrow({ where: { id: pr.userId } });
    if (target.email.endsWith("@account.invalid")) {
      return NextResponse.json({ error: "Akun sudah dinonaktifkan; gunakan antrean retry bila cleanup belum selesai." }, { status: 409 });
    }
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    if (!key) return NextResponse.json({ error: "Konfigurasi penghapusan belum tersedia." }, { status: 503 });

    const objects = await db.$queryRaw<{ bucket_id:string; name:string }[]>`
      SELECT bucket_id, name
      FROM storage.objects
      WHERE owner_id = ${target.supabaseId}
         OR owner = ${target.supabaseId}::uuid
         OR (COALESCE(owner_id, '') = '' AND owner IS NULL
             AND (split_part(name, '/', 2) = ${target.id}
                  OR (bucket_id = 'student-private' AND split_part(name, '/', 1) = ${target.id})))
    `;

    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession:false, autoRefreshToken:false } });
    await anonymizeAccount(target.id, target.supabaseId, objects);
    await finishDeletion(target.id, admin);

    await db.$transaction(async tx => {
      await tx.privacyRequest.update({ where: { id: pr.id }, data: {
        status: "COMPLETED",
        assignedTo: actor.id,
        decision: "Akun anak dihapus atas permintaan wali terverifikasi.",
        evidenceRef,
        completedAt: new Date(),
      }});
      await tx.complianceAudit.create({ data: {
        subjectId: target.id,
        actorId: actor.id,
        action: "GUARDIAN_REQUESTED_ACCOUNT_DELETION_COMPLETED",
        reference: pr.id,
      }});
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({ ok: true });
  } catch (e) { return privacyFailure(e); }
}
