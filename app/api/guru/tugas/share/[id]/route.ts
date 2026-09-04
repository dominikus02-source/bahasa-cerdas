import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"
import { isTeacherOrStudent } from "@/lib/teacher/students"

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser()
    if (!user || !isTeacherOrStudent(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const token = await db.taskShareToken.findFirst({
      where: { id, createdById: user.id },
    })
    if (!token) {
      return NextResponse.json({ error: "Token tidak ditemukan" }, { status: 404 })
    }

    await db.taskShareToken.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/guru/tugas/share/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
