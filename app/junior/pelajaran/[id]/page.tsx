import Link from "next/link"
import Image from "next/image"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, Clock, Sparkles } from "lucide-react"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"
import { aksesArenaJunior, GRADES, LABEL_JENJANG } from "@/lib/arena-junior/kurikulum"
import { gambarKarakter, PROFIL, normalkanKarakter } from "@/lib/arena-junior/karakter"
import { acakOpsi, bacaIsiPelajaran, benihPercobaan, sanitasiSoal } from "@/lib/arena-junior/soal"
import { Pemutar } from "./pemutar"

export const dynamic = "force-dynamic"

export default async function PelajaranPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) redirect("/auth/arena-login")

  const { id } = await params

  const pelajaran = await db.arenaJuniorLesson.findUnique({
      where: { id },
      select: {
        id: true,
        grade: true,
        title: true,
        subtitle: true,
        stageTitle: true,
        unitTitle: true,
        estimatedMinutes: true,
        xpReward: true,
        questionCount: true,
        characterHint: true,
        isActive: true,
        // Hanya dipakai untuk mengecek soal sudah ada atau belum; isinya
        // (termasuk kunci jawaban) tidak pernah dikirim ke klien.
        content: true,
      },
  })

  if (!pelajaran || !pelajaran.isActive) notFound()

  // Peninjau (guru/admin/founder) boleh membuka jenjang mana pun — jenjang
  // pelajaran itu sendiri yang dipakai. Murid dibatasi jenjangnya sendiri
  // atau di bawahnya.
  const akses = await aksesArenaJunior(user, pelajaran.grade)
  if (akses.mode === "butuh-kelas") redirect("/junior")
  if (
    akses.mode === "murid" &&
    GRADES.indexOf(pelajaran.grade) > GRADES.indexOf(akses.grade)
  ) {
    redirect("/junior")
  }
  const pratinjau = akses.mode === "pratinjau"

  const profil = PROFIL[normalkanKarakter(pelajaran.characterHint)]
  const isi = bacaIsiPelajaran(pelajaran.content)

  // Soal sudah ada → langsung mainkan. Kunci jawaban disaring di server dulu;
  // yang menyeberang ke browser hanya `SoalAman`.
  if (isi) {
    // Nomor percobaan yang akan dikerjakan sekarang. Urutan opsi diacak dari
    // nomor ini, jadi kunci yang terlihat di pembahasan percobaan sebelumnya
    // tidak berlaku lagi di percobaan berikutnya.
    // Pratinjau tidak menyimpan progres, jadi selalu percobaan pertama.
    const progres = pratinjau
      ? null
      : await db.arenaJuniorProgress.findUnique({
          where: { userId_lessonId: { userId: user.id, lessonId: pelajaran.id } },
          select: { attempts: true },
        })
    const percobaan = (progres?.attempts ?? 0) + 1
    const diacak = acakOpsi(isi.soal, benihPercobaan(user.id, pelajaran.id, percobaan))

    return (
      <Pemutar
        pelajaranId={pelajaran.id}
        judul={pelajaran.title}
        karakter={pelajaran.characterHint}
        percobaan={percobaan}
        soal={sanitasiSoal(diacak)}
      />
    )
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <Link
        href="/junior"
        className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Kembali ke jalur
      </Link>

      <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
        <Image
          src={gambarKarakter(pelajaran.characterHint, "happy")}
          alt=""
          width={256}
          height={256}
          className="mx-auto h-32 w-32 object-contain"
          priority
        />

        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">
          {LABEL_JENJANG[pelajaran.grade]} · {pelajaran.unitTitle}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-800">{pelajaran.title}</h1>
        {pelajaran.subtitle && <p className="mt-1 text-slate-600">{pelajaran.subtitle}</p>}

        <div className="mt-4 flex justify-center gap-4 text-sm font-semibold text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" aria-hidden />
            {pelajaran.estimatedMinutes} menit
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="h-4 w-4 text-[#FFD54A]" aria-hidden />
            {pelajaran.xpReward} XP
          </span>
        </div>

        <div className="mt-6 rounded-2xl bg-[#FFF1D2] p-5">
          <p className="font-bold text-[#8B5A2B]">Soalnya sedang disiapkan</p>
          <p className="mt-1 text-sm text-[#8B5A2B]/80">
            {profil.nama} masih menyusun {pelajaran.questionCount} soal untuk pelajaran ini.
            Sementara ini kamu bisa mencoba pelajaran lain di jalur.
          </p>
        </div>
      </div>
    </main>
  )
}
