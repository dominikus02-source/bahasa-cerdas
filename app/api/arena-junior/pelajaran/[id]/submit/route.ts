import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"
import { rateLimitRoute } from "@/lib/rate-limit"
import { aksesArenaJunior, GRADES } from "@/lib/arena-junior/kurikulum"
import {
  acakOpsi,
  bacaIsiPelajaran,
  benihPercobaan,
  bintangDari,
  nilaiJawaban,
} from "@/lib/arena-junior/soal"

/**
 * Menerima jawaban murid, menilainya DI SERVER, lalu menyimpan hasilnya.
 *
 * Klien tidak pernah mengirim nilai — hanya pilihan jawabannya. Kunci jawaban
 * tidak pernah meninggalkan server sebelum soal dijawab.
 *
 * XP hanya diberikan pada kelulusan PERTAMA; mengulang memperbarui nilai
 * terbaik tetapi memberi 0 XP, supaya XP tidak bisa dipanen.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimitRoute(req, {
    maxRequests: 30,
    windowSeconds: 60,
    identifier: "arena-junior-submit",
  })
  if (limited) return limited

  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: lessonId } = await params

  let body: { jawaban?: unknown; percobaan?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 })
  }
  const jawabanMurid =
    body.jawaban && typeof body.jawaban === "object" && !Array.isArray(body.jawaban)
      ? (body.jawaban as Record<string, unknown>)
      : null
  if (!jawabanMurid) {
    return NextResponse.json({ error: 'Field "jawaban" harus berupa objek' }, { status: 400 })
  }

  const pelajaran = await db.arenaJuniorLesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      grade: true,
      xpReward: true,
      isActive: true,
      content: true,
    },
  })

  if (!pelajaran || !pelajaran.isActive) {
    return NextResponse.json({ error: "Pelajaran tidak ditemukan" }, { status: 404 })
  }

  const akses = await aksesArenaJunior(user, pelajaran.grade)
  if (
    akses.mode === "butuh-kelas" ||
    (akses.mode === "murid" && GRADES.indexOf(pelajaran.grade) > GRADES.indexOf(akses.grade))
  ) {
    return NextResponse.json({ error: "Pelajaran ini di luar jenjangmu" }, { status: 403 })
  }
  // Guru/admin/founder yang meninjau tampilan: dinilai seperti biasa, tapi
  // tidak ada baris progres maupun XP yang ditulis. Tanpa ini, memeriksa
  // tampilan akan mengotori data dan menambah XP akun peninjau.
  const pratinjau = akses.mode === "pratinjau"

  const isi = bacaIsiPelajaran(pelajaran.content)
  if (!isi) {
    return NextResponse.json({ error: "Soal pelajaran ini belum tersedia" }, { status: 409 })
  }

  const sebelumnya = pratinjau
    ? null
    : await db.arenaJuniorProgress.findUnique({
        where: { userId_lessonId: { userId: user.id, lessonId } },
        select: { completed: true, bestScore: true, attempts: true },
      })

  // Urutan opsi diacak per percobaan. Nilai `percobaan` yang dipakai halaman
  // harus sama dengan yang berlaku sekarang, kalau tidak permutasinya berbeda
  // dan penilaian akan salah. Ini juga yang menutup celah "jawab asal → baca
  // kunci di pembahasan → ulangi dengan contekan": kunci percobaan lalu tidak
  // cocok lagi dengan urutan percobaan berikutnya.
  const percobaanSekarang = (sebelumnya?.attempts ?? 0) + 1
  const percobaanKlien = Number(body.percobaan)
  if (!Number.isInteger(percobaanKlien) || percobaanKlien !== percobaanSekarang) {
    return NextResponse.json(
      {
        error: "Soalnya sudah diperbarui. Muat ulang halaman lalu coba lagi ya.",
        percobaanSekarang,
      },
      { status: 409 },
    )
  }

  const soalPercobaan = acakOpsi(isi.soal, benihPercobaan(user.id, lessonId, percobaanSekarang))

  // Semua soal wajib dijawab. Tanpa syarat ini, mengirim `{}` akan
  // mengembalikan seluruh kunci jawaban (dipakai untuk pembahasan) tanpa murid
  // mengerjakan apa pun — lalu tinggal diulang untuk memanen XP.
  const belumDijawab = soalPercobaan.filter((s) => typeof jawabanMurid[s.id] !== "string")
  if (belumDijawab.length > 0) {
    return NextResponse.json(
      {
        error: "Semua soal harus dijawab dulu",
        belumDijawab: belumDijawab.length,
        total: soalPercobaan.length,
      },
      { status: 400 },
    )
  }

  const hasil = nilaiJawaban(soalPercobaan, jawabanMurid)

  const sudahPernahLulus = sebelumnya?.completed ?? false
  const xpBaru = hasil.lulus && !sudahPernahLulus ? pelajaran.xpReward : 0
  const bestScore = Math.max(hasil.nilai, sebelumnya?.bestScore ?? 0)

  if (!pratinjau) {
    await db.arenaJuniorProgress.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId } },
      create: {
        userId: user.id,
        lessonId,
        completed: hasil.lulus,
        score: hasil.nilai,
        bestScore,
        stars: hasil.bintang,
        xpEarned: xpBaru,
        attempts: 1,
        completedAt: hasil.lulus ? new Date() : null,
      },
      update: {
        completed: sudahPernahLulus || hasil.lulus,
        score: hasil.nilai,
        bestScore,
        // Bintang mengikuti nilai TERBAIK, jadi mengulang dengan nilai lebih
        // jelek tidak menurunkan bintang yang sudah didapat.
        stars: bintangDari(bestScore),
        xpEarned: { increment: xpBaru },
        attempts: { increment: 1 },
        ...(hasil.lulus && !sudahPernahLulus ? { completedAt: new Date() } : {}),
      },
    })

    if (xpBaru > 0) {
      await db.user.update({
        where: { id: user.id },
        data: { xp: { increment: xpBaru }, lastActiveAt: new Date() },
      })
    }
  }

  return NextResponse.json({
    nilai: hasil.nilai,
    benar: hasil.benar,
    total: hasil.total,
    lulus: hasil.lulus,
    bintang: hasil.bintang,
    xpDiberikan: pratinjau ? 0 : xpBaru,
    pratinjau,
    rincian: hasil.rincian,
  })
}
