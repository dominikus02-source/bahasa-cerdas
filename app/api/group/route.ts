import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent, getTeacherGroups } from "@/lib/teacher/students";
import { awardGuruXp } from "@/lib/gamification/teacher-xp";
import { getUniqueAccessCode } from "@/lib/classroom/access-code";
import {
  recordProductEvent,
  PRODUCT_EVENT_F4_CODE_SHARED,
  PRODUCT_EVENT_F8_TEACHER_SESSION,
  dayKeyWIB,
} from "@/lib/analytics/product-event-store";

function isTeacherOrHigher(user: { role: string; isFounder: boolean }): boolean {
  return isTeacherOrStudent(user);
}

export async function GET(req: NextRequest) {
  try {
    const dbUser = await getUser();
    if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isTeacherOrHigher(dbUser)) {
      return NextResponse.json({ error: "Hanya guru yang bisa mengakses" }, { status: 403 });
    }

    const groups = await getTeacherGroups(dbUser.id);

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("GET /api/group error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan saat memuat kelas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || !isTeacherOrHigher(dbUser)) {
      return NextResponse.json({ error: "Hanya guru yang bisa membuat kelas" }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Format data tidak valid" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const grade = typeof body.grade === "string" ? body.grade.trim() : "";
    const tahunAjaran = typeof body.tahunAjaran === "string" ? body.tahunAjaran.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "Nama kelas wajib diisi", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (!grade) {
      return NextResponse.json({ error: "Tingkat/kelas wajib dipilih", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (!tahunAjaran) {
      return NextResponse.json({ error: "Tahun ajaran wajib diisi", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const code = await getUniqueAccessCode();

    const group = await db.group.create({
      data: {
        name,
        description: description || null,
        grade,
        tahunAjaran,
        accessCode: code,
        teacherId: dbUser.id,
      },
    });

    // XP Guru saat membuat kelas baru — best-effort, idempotent (referensi unik).
    try {
      await awardGuruXp({
        guruId: dbUser.id,
        sumber: "GURU_KELAS",
        reference: `kelas-create-${group.id}`,
        metadata: { groupId: group.id, nama: name },
      });
    } catch (err) {
      console.error("GURU_KELAS XP error:", err);
    }

    // P0 #7 — Operational Teacher Experiment capture hooks (best-effort, fire-and-forget).
    // F4: kode kelas dibuat/dibagikan — sekali-per-grup (logicalKey deterministik).
    void recordProductEvent({
      actorId: dbUser.id,
      event: PRODUCT_EVENT_F4_CODE_SHARED,
      entityType: "Group",
      entityId: group.id,
      logicalKey: `group-${group.id}-code-shared`,
      props: { grade, tahunAjaran },
    });
    // F8: sesi guru (guru mengembalikan platform / mengambil aksi) — sekali-per-hari WIB.
    void recordProductEvent({
      actorId: dbUser.id,
      event: PRODUCT_EVENT_F8_TEACHER_SESSION,
      entityType: "Group",
      entityId: group.id,
      logicalKey: `teacher-${dbUser.id}-${dayKeyWIB()}`,
      props: { action: "class_created" },
    });

    return NextResponse.json({ group, code: group.accessCode }, { status: 201 });
  } catch (error) {
    console.error("POST /api/group error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan saat membuat kelas" }, { status: 500 });
  }
}
