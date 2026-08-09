import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"
import { allGrades } from "@/data/buku-panduan"
import { isTeacherOrStudent } from "@/lib/teacher/students"

export async function GET() {
  try {
    const user = await getUser()
    if (!user || !isTeacherOrStudent(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbLevels = await db.learningLevel.findMany({
      where: { type: "PANDUAN" },
      orderBy: { level: "asc" },
      take: 50,
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
      // Nomor urut mengikuti chapterNumber supaya angka di lingkaran sama dengan
      // "Bab N" pada judul. Rumus lama (si * 10 + ci + 1) membuat semester 2
      // tampil 11-15 padahal judulnya Bab 6-10.
      units: grade.semesters.flatMap((sem) =>
        sem.chapters.map((ch) => ({
          id: ch.id,
          title: ch.title,
          subtitle: null,
          topik: ch.description,
          grade: grade.grade,
          semester: sem.semester,
          kd: ch.kd,
          order: ch.chapterNumber,
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
