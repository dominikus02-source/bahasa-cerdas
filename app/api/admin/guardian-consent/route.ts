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

const classReview = z.object({
  groupId: z.string().trim().min(1).max(100),
  students: z.array(review.pick({
    reviewReference: true,
    verifiedUntil: true,
    ageChecked: true,
    guardianRelationshipChecked: true,
  }).extend({
    studentUserId: z.string().trim().min(1).max(100),
    guardianAuthorityChecked: z.literal(true),
  })).min(1).max(20),
}).refine(({ students }) => new Set(students.map((student) => student.studentUserId)).size === students.length);

async function linkClass(
  input: z.infer<typeof classReview>,
  reviewedBy: string,
  auth: ReturnType<typeof createClient>["auth"]["admin"],
) {
  const group = await db.group.findUnique({
    where: { id: input.groupId, isActive: true },
    select: {
      teacher: { select: { role: true, supabaseId: true, email: true } },
      members: {
        where: { userId: { in: input.students.map((student) => student.studentUserId) } },
        select: { user: { select: { id: true, role: true, supabaseId: true, fullName: true, email: true } } },
      },
    },
  });
  if (!group) return NextResponse.json({ error: "Kelas aktif tidak ditemukan." }, { status: 404 });
  const { teacher, members } = group;
  const guardianAuthId = teacher.supabaseId;
  if (teacher.role !== "GURU" || !guardianAuthId || teacher.email.endsWith("@account.invalid")) {
    return NextResponse.json({ error: "Guru pengelola kelas harus memiliki akun aktif." }, { status: 422 });
  }

  const students = new Map(members.map(({ user }) => [user.id, user]));
  const now = new Date();
  const records: Prisma.StudentGuardianConsentCreateManyInput[] = [];
  for (const checked of input.students) {
    const student = students.get(checked.studentUserId);
    if (!student?.supabaseId || student.role !== "MURID" || student.email.endsWith("@account.invalid")
      || student.supabaseId === guardianAuthId || checked.verifiedUntil <= now) {
      return NextResponse.json({ error: "Setiap murid harus merupakan anggota kelas aktif dengan hasil verifikasi yang masih berlaku." }, { status: 422 });
    }
    records.push({
      studentAuthId: student.supabaseId,
      guardianAuthId,
      studentLabel: student.fullName,
      reviewReference: checked.reviewReference,
      verifiedUntil: checked.verifiedUntil,
      reviewedBy,
    });
  }

  const identities = await Promise.all([guardianAuthId, ...records.map((record) => record.studentAuthId)]
    .map((id) => auth.getUserById(id)));
  if (identities.some(({ data, error }) => error || !data.user?.email_confirmed_at)) {
    return NextResponse.json({ error: "Guru dan murid harus memiliki email yang sudah dikonfirmasi." }, { status: 422 });
  }

  try {
    await db.studentGuardianConsent.createMany({ data: records });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Salah satu murid sudah memiliki catatan persetujuan. Penautan kelompok dibatalkan." }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json({ status: "PENDING", linked: records.length }, { status: 201 });
}

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
  const body = await request.json().catch(() => null);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const auth = url && key
    ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }).auth.admin
    : null;
  if (body && typeof body === "object" && "groupId" in body) {
    const parsedClass = classReview.safeParse(body);
    if (!parsedClass.success) return NextResponse.json({ error: "Lengkapi tinjauan untuk setiap murid dalam kelas." }, { status: 400 });
    if (!auth) return NextResponse.json({ error: "Layanan verifikasi belum tersedia." }, { status: 503 });
    return linkClass(parsedClass.data, reviewer.id, auth);
  }

  const parsed = review.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Data tinjauan belum lengkap." }, { status: 400 });
  const { studentAuthId, guardianAuthId, studentLabel, reviewReference, verifiedUntil } = parsed.data;
  if (studentAuthId === guardianAuthId || verifiedUntil <= new Date()) {
    return NextResponse.json({ error: "Akun harus berbeda dan verifikasi masih harus berlaku." }, { status: 400 });
  }

  if (!auth) return NextResponse.json({ error: "Layanan verifikasi belum tersedia." }, { status: 503 });
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
