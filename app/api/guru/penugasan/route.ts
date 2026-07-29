import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"
import { buildLatihan, buildKuis, resolvePraktik } from "@/lib/penugasan-content"

const JENIS_VALUES = ["MATERI", "LATIHAN", "PRAKTIK", "KUIS"]

// List the teacher's assignments with submission progress (for the review page).
export async function GET() {
  try {
    const user = await getUser()
    if (!user || (user.role !== "GURU" && !user.isFounder)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const penugasans = await db.penugasan.findMany({
      where: { teacherId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        unit: { select: { title: true } },
        group: { select: { name: true, _count: { select: { members: true } } } },
        submissions: { select: { status: true, praktikUrl: true, praktikDinilai: true } },
      },
    })

    const data = penugasans.map((p) => {
      const done = p.submissions.filter((s) => s.status === "COMPLETED").length
      const praktikMasuk = p.submissions.filter((s) => s.praktikUrl).length
      const praktikBelumDinilai = p.submissions.filter((s) => s.praktikUrl && !s.praktikDinilai).length
      return {
        id: p.id,
        judul: p.judul,
        jenis: p.jenis,
        unitTitle: p.unit.title,
        groupName: p.group.name,
        totalMurid: p.group._count.members,
        selesai: done,
        tenggat: p.tenggat,
        createdAt: p.createdAt,
        praktikMasuk,
        praktikBelumDinilai,
      }
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error("GET /api/guru/penugasan error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUser()
    if (!user || (user.role !== "GURU" && !user.isFounder)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { unitId, groupIds, judul, deskripsi, tenggat, jenis } = await req.json()

    if (!unitId || !groupIds?.length || !judul) {
      return NextResponse.json({ error: "unitId, groupIds, dan judul diperlukan" }, { status: 400 })
    }

    const jenisFinal = JENIS_VALUES.includes(jenis) ? jenis : "MATERI"

    const unit = await db.learningUnit.findUnique({
      where: { id: unitId },
      include: { level: true },
    })
    if (!unit || unit.level.type !== "PANDUAN") {
      return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 404 })
    }

    // Pastikan unit benar-benar punya konten untuk jenis yang dipilih.
    let content: any = {}
    try { content = unit.content ? JSON.parse(unit.content) : {} } catch { content = {} }
    if (jenisFinal === "LATIHAN" && buildLatihan(content).length === 0) {
      return NextResponse.json({ error: "Unit ini belum punya soal Latihan" }, { status: 400 })
    }
    if (jenisFinal === "PRAKTIK" && !resolvePraktik(content)) {
      return NextResponse.json({ error: "Unit ini belum punya materi Praktik" }, { status: 400 })
    }
    if (jenisFinal === "KUIS" && buildKuis(content).length === 0) {
      return NextResponse.json({ error: "Unit ini belum punya soal Kuis" }, { status: 400 })
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
            jenis: jenisFinal,
            tenggat: tenggat ? new Date(tenggat) : null,
          },
        })
      )
    )

    return NextResponse.json({ data: penugasans })
  } catch (error) {
    console.error("POST /api/guru/penugasan error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
