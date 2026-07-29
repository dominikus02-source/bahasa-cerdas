import { db } from "@/lib/db"
import { arenaJuniorGradeFor } from "@/lib/kurikulum/jenjang"
import type { ArenaJuniorGrade } from "@prisma/client"

export const GRADES = ["TK", "K1", "K2", "K3", "K4", "K5", "K6"] as const

export const LABEL_JENJANG: Record<ArenaJuniorGrade, string> = {
  TK: "TK",
  K1: "Kelas 1",
  K2: "Kelas 2",
  K3: "Kelas 3",
  K4: "Kelas 4",
  K5: "Kelas 5",
  K6: "Kelas 6",
}

/**
 * Jenjang Arena Junior seorang murid, diturunkan dari kelas yang diikutinya.
 * Bukan dari input klien — supaya jenjang tidak bisa diubah lewat URL.
 */
export async function jenjangMurid(userId: string): Promise<ArenaJuniorGrade | null> {
  const memberships = await db.groupMember.findMany({
    where: { userId },
    select: { group: { select: { grade: true, isActive: true } } },
    orderBy: { joinedAt: "desc" },
    take: 20,
  })

  return (
    memberships
      .filter((m) => m.group?.isActive)
      .map((m) => arenaJuniorGradeFor(m.group?.grade))
      .find((g): g is ArenaJuniorGrade => g !== null) ?? null
  )
}

export type PelajaranJalur = Awaited<ReturnType<typeof ambilKurikulum>>["stages"][number]["units"][number]["lessons"][number]

/**
 * Kurikulum untuk seorang murid: jenjangnya sendiri + semua jenjang di bawahnya.
 *
 * Aturan kunci ("turun bebas, naik bertahap"):
 *  - Jenjang DI BAWAH jenjang murid: terbuka semua. Ini jalur remedial — anak
 *    yang belum lancar membaca harus bisa mundur ke dasar tanpa dihalangi.
 *  - Jenjang MURID SENDIRI: berurutan; pelajaran ke-n terbuka bila pelajaran
 *    sebelumnya sudah selesai.
 *  - Jenjang DI ATASNYA: tidak dikirim sama sekali (bukan digembok), supaya
 *    jalurnya tidak jadi pajangan panjang yang tak bisa disentuh.
 *
 * Status kunci selalu dihitung di server.
 */
export async function ambilKurikulum(userId: string, grade: ArenaJuniorGrade) {
  const gradesTersedia = GRADES.slice(0, GRADES.indexOf(grade) + 1) as ArenaJuniorGrade[]

  const [lessons, progressRows] = await Promise.all([
    db.arenaJuniorLesson.findMany({
      where: { grade: { in: gradesTersedia }, isActive: true },
      orderBy: [{ stageOrder: "asc" }, { unitOrder: "asc" }, { lessonOrder: "asc" }],
      // `content` sengaja tidak diambil: berisi soal + kunci jawaban.
      select: {
        id: true,
        grade: true,
        stageOrder: true,
        stageTitle: true,
        unitOrder: true,
        unitTitle: true,
        lessonOrder: true,
        title: true,
        subtitle: true,
        estimatedMinutes: true,
        xpReward: true,
        questionCount: true,
        lessonType: true,
        characterHint: true,
        themeColor: true,
        icon: true,
      },
    }),
    db.arenaJuniorProgress.findMany({
      where: { userId, lesson: { grade: { in: gradesTersedia } } },
      select: {
        lessonId: true,
        completed: true,
        bestScore: true,
        stars: true,
        attempts: true,
        xpEarned: true,
        completedAt: true,
      },
    }),
  ])

  const progressByLesson = new Map(progressRows.map((p) => [p.lessonId, p]))

  let previousCompleted = true
  const withState = lessons.map((lesson) => {
    const progress = progressByLesson.get(lesson.id)
    const completed = progress?.completed ?? false
    const jenjangSendiri = lesson.grade === grade
    const locked = jenjangSendiri ? !previousCompleted : false
    if (jenjangSendiri) previousCompleted = completed
    return {
      ...lesson,
      locked,
      completed,
      bestScore: progress?.bestScore ?? 0,
      stars: progress?.stars ?? 0,
      attempts: progress?.attempts ?? 0,
    }
  })

  type Pelajaran = (typeof withState)[number]
  const stages: Array<{
    grade: ArenaJuniorGrade
    stageOrder: number
    stageTitle: string
    themeColor: string | null
    icon: string | null
    jenjangMurid: boolean
    units: Array<{ unitOrder: number; unitTitle: string; lessons: Pelajaran[] }>
  }> = []

  for (const lesson of withState) {
    let stage = stages.find((s) => s.stageOrder === lesson.stageOrder)
    if (!stage) {
      stage = {
        grade: lesson.grade,
        stageOrder: lesson.stageOrder,
        stageTitle: lesson.stageTitle,
        themeColor: lesson.themeColor,
        icon: lesson.icon,
        jenjangMurid: lesson.grade === grade,
        units: [],
      }
      stages.push(stage)
    }
    let unit = stage.units.find((u) => u.unitOrder === lesson.unitOrder)
    if (!unit) {
      unit = { unitOrder: lesson.unitOrder, unitTitle: lesson.unitTitle, lessons: [] }
      stage.units.push(unit)
    }
    unit.lessons.push(lesson)
  }

  const milikJenjang = withState.filter((l) => l.grade === grade)
  // "Lanjutkan" selalu menunjuk ke jenjang murid sendiri, bukan pengulangan di
  // jenjang bawah — supaya tombol utama tetap mendorong maju.
  const berikutnya = milikJenjang.find((l) => !l.completed && !l.locked) ?? null

  // Misi harian dihitung dari data nyata: pelajaran yang diselesaikan hari ini.
  const awalHariIni = new Date()
  awalHariIni.setHours(0, 0, 0, 0)
  const selesaiHariIni = progressRows.filter(
    (p) => p.completed && p.completedAt && p.completedAt >= awalHariIni
  ).length

  return {
    grade,
    stages,
    ringkasan: {
      totalPelajaran: milikJenjang.length,
      selesai: milikJenjang.filter((l) => l.completed).length,
      totalPelajaranTersedia: withState.length,
      selesaiSemua: withState.filter((l) => l.completed).length,
      xpTerkumpul: progressRows.reduce((sum, p) => sum + p.xpEarned, 0),
      selesaiHariIni,
      targetHarian: 2,
      pelajaranBerikutnya: berikutnya?.id ?? null,
      judulBerikutnya: berikutnya?.title ?? null,
      karakterBerikutnya: berikutnya?.characterHint ?? "zelby",
    },
  }
}
