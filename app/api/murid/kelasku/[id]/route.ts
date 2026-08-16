import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { getLearnerState } from "@/lib/learner-state/service";
import { profileFromLearnerState } from "@/lib/diagnostic/profile";
import { buildPersonalizedAction } from "@/lib/diagnostic/personalization";
import { DIAGNOSTIC_SKILL_LABELS } from "@/lib/diagnostic/config";

/**
 * GET /api/murid/kelasku/[id] — Detail kelas SISI MURID (BC Classroom).
 * Satu request agregat: info kelas + aktivitas (materi/tugas/latihan/
 * pengumuman) + status submission murid ini. Server-authoritative:
 * membership divalidasi; submission hanya milik user ini.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: user.id } },
      include: {
        group: {
          include: {
            teacher: { select: { id: true, fullName: true, avatar: true } },
            _count: { select: { members: true } },
          },
        },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: "Anda tidak tergabung di kelas ini" }, { status: 403 });
    }

    const group = membership.group;

    const [materis, quizAssignments, penugasans, pengumuman] = await Promise.all([
      db.materiKirim.findMany({
        where: { groupId: id },
        select: {
          id: true,
          createdAt: true,
          teacher: { select: { fullName: true } },
          materi: { select: { id: true, title: true, description: true, fileUrl: true, fileType: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      db.quizAssignment.findMany({
        where: { groupId: id },
        select: {
          id: true,
          dueDate: true,
          isPublished: true,
          assignedAt: true,
          notes: true,
          quiz: {
            select: {
              id: true,
              title: true,
              description: true,
              type: true,
              timeLimit: true,
              _count: { select: { questions: true } },
            },
          },
        },
        orderBy: { assignedAt: "desc" },
        take: 30,
      }),
      db.penugasan.findMany({
        where: { groupId: id },
        select: {
          id: true,
          judul: true,
          deskripsi: true,
          jenis: true,
          tenggat: true,
          createdAt: true,
          submissions: { where: { userId: user.id }, select: { status: true, score: true, praktikUrl: true, praktikNilai: true, praktikDinilai: true, praktikCatatan: true, completedAt: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      db.pengumuman.findMany({
        where: { groupId: id },
        select: { id: true, judul: true, deskripsi: true, pinned: true, createdAt: true, tenggat: true },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        take: 30,
      }),
    ]);

    // Status submission murid ini (hanya milik user — bukan submission siswa lain).
    const submissionByAssignment = await db.quizSubmission.findMany({
      where: { userId: user.id, assignment: { groupId: id } },
      select: { assignmentId: true, status: true, score: true, attemptNumber: true, submittedAt: true },
    });
    const quizStatus = new Map(submissionByAssignment.map((s) => [s.assignmentId, s]));

    // STEP 6.3 — insight personal murid (reuse personalization 4E.2 + learner
    // state). Server-derived; "Belum cukup data" bila evidence sedikit —
    // never menyebut murid lemah tanpa bukti.
    let insight: {
      hasEvidence: boolean;
      text: string | null;
      title: string | null;
      targetSkillLabel: string | null;
      actionType: string | null;
    } | null = null;
    try {
      const states = await getLearnerState(user.id);
      const profile = profileFromLearnerState(states, Object.keys(DIAGNOSTIC_SKILL_LABELS));
      const action = buildPersonalizedAction(profile, "LEARNER_STATE");
      insight = {
        hasEvidence: states.some((s) => s.attemptCount > 0),
        text: profile.insightText,
        title: action.title,
        targetSkillLabel: action.targetSkillLabel,
        actionType: action.actionType,
      };
    } catch {
      insight = null;
    }

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        grade: group.grade,
        accessCode: group.accessCode,
        memberCount: group._count.members,
        teacher: group.teacher,
      },
      materi: materis.map((m) => ({
        id: m.id,
        materiId: m.materi.id,
        title: m.materi.title,
        description: m.materi.description,
        fileUrl: m.materi.fileUrl,
        fileType: m.materi.fileType,
        guru: m.teacher.fullName,
        createdAt: m.createdAt,
      })),
      tugas: penugasans.map((p) => {
        const s = p.submissions[0];
        let status = "BELUM_DIKERJAKAN";
        let nilai: number | null = null;
        let feedback: string | null = null;
        // STEP 6.6 — link/file terkirim (praktikUrl) = "Sudah dikumpulkan"
        // walau status teknis IN_PROGRESS (konsisten dengan hitungan guru).
        if (s?.praktikUrl) {
          if (s.praktikDinilai) { status = "DINILAI"; nilai = s.praktikNilai ?? s.score ?? null; }
          else status = "SUDAH_DIKUMPULKAN";
        } else if (s?.status === "IN_PROGRESS") {
          status = "SEDANG_DIKERJAKAN";
        } else if (s?.status === "COMPLETED") {
          if (s.praktikDinilai) { status = "DINILAI"; nilai = s.praktikNilai ?? s.score ?? null; }
          else status = "SUDAH_DIKUMPULKAN";
        }
        if (s?.praktikCatatan) feedback = s.praktikCatatan;
        return {
          id: p.id,
          judul: p.judul,
          deskripsi: p.deskripsi,
          jenis: p.jenis,
          tenggat: p.tenggat,
          createdAt: p.createdAt,
          status,
          nilai,
          feedback,
        };
      }),
      latihan: quizAssignments
        .filter((a) => a.quiz.type === "LATIHAN" || a.quiz.type === "TUGAS" || a.quiz.type === "UJIAN")
        .map((a) => {
          const s = quizStatus.get(a.id);
          let status = "BELUM_DIKERJAKAN";
          let nilai: number | null = null;
          if (s?.status === "IN_PROGRESS") status = "SEDANG_DIKERJAKAN";
          else if (s?.status === "SUBMITTED") status = "SUDAH_DIKUMPULKAN";
          else if (s?.status === "GRADED") { status = "DINILAI"; nilai = s.score ?? null; }
          return {
            id: a.id,
            quizId: a.quiz.id,
            title: a.quiz.title,
            description: a.quiz.description,
            jumlahSoal: a.quiz._count.questions,
            tenggat: a.dueDate,
            notes: a.notes,
            status,
            nilai,
          };
        }),
      pengumuman: pengumuman.map((p) => ({
        id: p.id,
        judul: p.judul,
        deskripsi: p.deskripsi,
        pinned: p.pinned,
        createdAt: p.createdAt,
        tenggat: p.tenggat,
      })),
      insight,
    });
  } catch (error) {
    console.error("GET /api/murid/kelasku/[id] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
