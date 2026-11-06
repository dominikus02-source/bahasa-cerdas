import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { getTeacherStudentIds, isTeacherOrStudent } from "@/lib/teacher/students"
import type { AttemptAnswerDetails } from "@/lib/types/snapshot"

export async function PUT(req: NextRequest) {
  try {
    const teacher = await getUser()
    if (!teacher) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!isTeacherOrStudent(teacher)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const body = await req.json()
    const progresId = typeof body.progresId === "string" ? body.progresId : ""
    const questionId = typeof body.questionId === "string" ? body.questionId : ""
    const note = typeof body.note === "string" ? body.note.trim() : ""
    if (!progresId || note.length > 3000 || questionId.length > 200) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 })
    const studentIds = await getTeacherStudentIds(teacher.id)
    const attempt = await db.progresKompetensi.findFirst({
      where: { id: progresId, userId: { in: studentIds }, status: "COMPLETED" },
      select: { answerDetails: true },
    })
    if (!attempt) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
    const details = attempt.answerDetails as unknown as AttemptAnswerDetails | null
    if (questionId && !details?.snapshot?.questions.some((q) => q.id === questionId)) {
      return NextResponse.json({ error: "Nomor soal tidak valid" }, { status: 400 })
    }
    if (!note) {
      await db.simulationTeacherFeedback.deleteMany({ where: { progresId, teacherId: teacher.id, questionId } })
    } else {
      await db.simulationTeacherFeedback.upsert({
        where: { progresId_teacherId_questionId: { progresId, teacherId: teacher.id, questionId } },
        create: { progresId, teacherId: teacher.id, questionId, note },
        update: { note },
      })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[simulation feedback]", error)
    return NextResponse.json({ error: "Gagal menyimpan catatan" }, { status: 500 })
  }
}
