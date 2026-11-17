import { Prisma } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/admin/guard";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

const review = z.object({
  studentAuthId: z.string().uuid().transform((id) => id.toLowerCase()),
  guardianAuthId: z.string().uuid().transform((id) => id.toLowerCase()),
  studentLabel: z.string().trim().min(1).max(100),
  reviewReference: z.string().trim().regex(/^[A-Za-z0-9_-]{6,64}$/),
  verifiedUntil: z.string().datetime().transform((value) => new Date(value)),
  ageChecked: z.literal(true),
  guardianRelationshipChecked: z.literal(true),
});

export const GET = withAdmin(async (request: Request) => {
  const rawId = new URL(request.url).searchParams.get("studentAuthId");
  const parsedId = z.string().uuid().safeParse(rawId);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Masukkan ID akun murid yang valid." }, { status: 400 });
  }
  const consent = await db.studentGuardianConsent.findUnique({
    where: { studentAuthId: parsedId.data },
    select: {
      studentAuthId: true, guardianAuthId: true, studentLabel: true, status: true,
      verifiedUntil: true, noticeVersion: true, decidedAt: true,
    },
  });
  if (!consent) return NextResponse.json({ error: "Catatan persetujuan belum tersedia." }, { status: 404 });
  return NextResponse.json(consent, { headers: { "Cache-Control": "private, no-store" } });
});

export const POST = withAdmin(async (request: Request) => {
  // Record the authenticated reviewer independently of the browser input.
  const reviewer = await getUser();
  if (!reviewer?.isFounder && reviewer?.role !== "ADMIN") {
    return NextResponse.json({ error: "Akses peninjau diperlukan." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Gunakan data JSON." }, { status: 415 });
  }
  const parsed = review.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data tinjauan belum lengkap." }, { status: 400 });
  const { studentAuthId, guardianAuthId, studentLabel, reviewReference, verifiedUntil } = parsed.data;
  if (studentAuthId === guardianAuthId || verifiedUntil <= new Date()) {
    return NextResponse.json({ error: "Akun harus berbeda dan verifikasi masih harus berlaku." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Layanan verifikasi belum tersedia." }, { status: 503 });
  const auth = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }).auth.admin;
  const identities = await Promise.all([auth.getUserById(studentAuthId), auth.getUserById(guardianAuthId)]);
  if (identities.some(({ data, error }) => error || !data.user?.email_confirmed_at)) {
    return NextResponse.json({ error: "Kedua akun harus memiliki email yang sudah dikonfirmasi." }, { status: 422 });
  }
  try {
    await db.studentGuardianConsent.create({
      data: { studentAuthId, guardianAuthId, studentLabel, reviewReference, verifiedUntil, reviewedBy: reviewer.id },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Akun murid sudah memiliki catatan persetujuan." }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json({ status: "PENDING" }, { status: 201 });
});
