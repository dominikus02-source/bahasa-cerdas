import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"

export async function GET(req: Request, { params }: { params: Promise<{ unitId: string }> }) {
  try {
    const user = await getUser()
    if (!user || (user.role !== "GURU" && !user.isFounder)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { unitId } = await params

    const unit = await db.learningUnit.findUnique({
      where: { id: unitId },
      include: {
        level: true,
      },
    })

    if (!unit || unit.level.type !== "PANDUAN") {
      return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 404 })
    }

    return NextResponse.json({ data: unit })
  } catch (error) {
    console.error("GET /api/guru/panduan/[unitId] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
