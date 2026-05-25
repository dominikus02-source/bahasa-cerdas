import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const user = await getUser()
  if (!user || (user.role !== "GURU" && !user.isFounder)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { unitId, groupIds, judul, deskripsi, tenggat } = await req.json()

  if (!unitId || !groupIds?.length || !judul) {
    return NextResponse.json({ error: "unitId, groupIds, dan judul diperlukan" }, { status: 400 })
  }

  const unit = await db.learningUnit.findUnique({
    where: { id: unitId },
    include: { level: true },
  })
  if (!unit || unit.level.type !== "PANDUAN") {
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 404 })
  }

  const groups = await db.group.findMany({
    where: { id: { in: groupIds }, teacherId: user.id },
  })
  if (groups.length !== groupIds.length) {
    return NextResponse.json({ error: "Beberapa kelas tidak ditemukan" }, { status: 404 })
  }

  const penugasans = await Promise.all(
    groupIds.map((groupId: string) =>
      db.penugasan.create({
        data: {
          unitId,
          groupId,
          teacherId: user.id,
          judul,
          deskripsi: deskripsi || null,
          tenggat: tenggat ? new Date(tenggat) : null,
        },
      })
    )
  )

  return NextResponse.json({ data: penugasans })
}
