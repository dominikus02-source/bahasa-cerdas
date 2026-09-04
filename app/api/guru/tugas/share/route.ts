import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"
import { isTeacherOrStudent } from "@/lib/teacher/students"

function generateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join("")
}

export async function GET(req: Request) {
  try {
    const user = await getUser()
    if (!user || !isTeacherOrStudent(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const groupId = searchParams.get("groupId")
    if (!groupId) {
      return NextResponse.json({ error: "groupId diperlukan" }, { status: 400 })
    }

    const tokens = await db.taskShareToken.findMany({
      where: { groupId, createdById: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        penugasan: { select: { id: true, judul: true } },
      },
    })

    const data = tokens.map((t) => ({
      id: t.id,
      token: t.token,
      taskType: t.taskType,
      quizId: t.quizId,
      penugasanId: t.penugasanId,
      judul: t.penugasan?.judul ?? null,
      url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.bahasacerdas.com"}/t/${t.token}`,
      createdAt: t.createdAt,
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error("GET /api/guru/tugas/share error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUser()
    if (!user || !isTeacherOrStudent(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { taskType, quizId, penugasanId, groupId } = await req.json()

    if (!taskType || !groupId) {
      return NextResponse.json({ error: "taskType dan groupId diperlukan" }, { status: 400 })
    }
    if (taskType !== "QUIZ" && taskType !== "PENUGASAN") {
      return NextResponse.json({ error: "taskType harus QUIZ atau PENUGASAN" }, { status: 400 })
    }
    if (taskType === "QUIZ" && !quizId) {
      return NextResponse.json({ error: "quizId diperlukan untuk QUIZ" }, { status: 400 })
    }
    if (taskType === "PENUGASAN" && !penugasanId) {
      return NextResponse.json({ error: "penugasanId diperlukan untuk PENUGASAN" }, { status: 400 })
    }

    // Verify group belongs to teacher
    const group = await db.group.findFirst({
      where: { id: groupId, teacherId: user.id },
    })
    if (!group) {
      return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 })
    }

    // Verify task exists and belongs to teacher
    if (taskType === "QUIZ") {
      const quiz = await db.quiz.findFirst({
        where: { id: quizId, creatorId: user.id },
      })
      if (!quiz) {
        return NextResponse.json({ error: "Latihan tidak ditemukan" }, { status: 404 })
      }
    } else {
      const penugasan = await db.penugasan.findFirst({
        where: { id: penugasanId, teacherId: user.id, groupId },
      })
      if (!penugasan) {
        return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 })
      }
    }

    // Check for existing token for this task in this group
    const existing = await db.taskShareToken.findFirst({
      where: {
        taskType,
        groupId,
        ...(taskType === "QUIZ" ? { quizId } : { penugasanId }),
      },
    })
    if (existing) {
      return NextResponse.json({
        data: {
          id: existing.id,
          token: existing.token,
          url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.bahasacerdas.com"}/t/${existing.token}`,
        },
      })
    }

    // Create new token
    const token = generateToken()
    const created = await db.taskShareToken.create({
      data: {
        token,
        taskType,
        quizId: taskType === "QUIZ" ? quizId : null,
        penugasanId: taskType === "PENUGASAN" ? penugasanId : null,
        groupId,
        createdById: user.id,
      },
    })

    return NextResponse.json({
      data: {
        id: created.id,
        token: created.token,
        url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.bahasacerdas.com"}/t/${created.token}`,
      },
    })
  } catch (error) {
    console.error("POST /api/guru/tugas/share error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
