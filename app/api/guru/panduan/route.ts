import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"
import { allGrades } from "@/data/buku-panduan"

export async function GET() {
  try {
    const user = await getUser()
    if (!user || (user.role !== "GURU" && !user.isFounder)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbLevels = await db.learningLevel.findMany({
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

    const sdGrades = allGrades.filter(g => ["I","II","III","IV","V","VI"].includes(g.grade))

    const sdLevels = sdGrades.map((grade, idx) => ({
      id: `sd-guide-${grade.grade.toLowerCase()}`,
      level: 13 + idx * 2,
      type: "PANDUAN" as const,
      title: `Kelas ${grade.grade} - ${grade.label}`,
      description: `Buku Panduan Guru Kelas ${grade.grade} SD Fase ${grade.phase}`,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      units: grade.semesters.flatMap((sem, si) =>
        sem.chapters.map((ch, ci) => ({
          id: ch.id,
          title: ch.title,
          subtitle: null,
          topik: ch.description,
          grade: grade.grade,
          semester: sem.semester,
          kd: ch.kd,
          order: (si * 10) + ci + 1,
          isActive: true,
        }))
      ),
    }))

    const merged = [...sdLevels, ...dbLevels]

    return NextResponse.json({ data: merged })
  } catch (error) {
    console.error("GET /api/guru/panduan error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
