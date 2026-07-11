import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"

export async function GET() {
  try {
    const user = await getUser()
    if (!user || (user.role !== "GURU" && !user.isFounder)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const levels = await db.learningLevel.findMany({
      where: { type: "PANDUAN" },
      orderBy: { level: "asc" },
      include: {
        units: {
          where: { isActive: true },
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            subtitle: true,
            topik: true,
            grade: true,
            semester: true,
            kd: true,
            order: true,
            isActive: true,
          },
        },
      },
    })

    return NextResponse.json({ data: levels })
  } catch (error) {
    console.error("GET /api/guru/panduan error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
