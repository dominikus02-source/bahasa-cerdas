import Link from "next/link"
import Image from "next/image"
import { Lock, Star, Check } from "lucide-react"
import { gambarKarakter } from "@/lib/arena-junior/karakter"
import { LABEL_JENJANG } from "@/lib/arena-junior/kurikulum"
import type { ArenaJuniorGrade } from "@prisma/client"

type Pelajaran = {
  id: string
  title: string
  subtitle: string | null
  lessonOrder: number
  characterHint: string
  estimatedMinutes: number
  xpReward: number
  locked: boolean
  completed: boolean
  stars: number
}

type Unit = { unitOrder: number; unitTitle: string; lessons: Pelajaran[] }

type Stage = {
  grade: ArenaJuniorGrade
  stageTitle: string
  icon: string | null
  jenjangMurid: boolean
  units: Unit[]
}

/** Node bulat di jalur. Ukurannya besar karena jari anak kecil kurang presisi. */
function Node({
  pelajaran,
  aktif,
  geser,
}: {
  pelajaran: Pelajaran
  aktif: boolean
  geser: number
}) {
  const { locked, completed, stars, title } = pelajaran

  const isi = locked ? (
    <Lock className="h-8 w-8 text-slate-400" aria-hidden />
  ) : completed ? (
    <Check className="h-10 w-10 text-white" strokeWidth={3} aria-hidden />
  ) : (
    <Image
      src={gambarKarakter(pelajaran.characterHint, aktif ? "happy" : "idle")}
      alt=""
      width={96}
      height={96}
      className="h-16 w-16 object-contain"
    />
  )

  const lingkaran = [
    "relative flex items-center justify-center rounded-full border-4 border-white shadow-lg transition",
    aktif ? "h-24 w-24 bg-[#FF6B9D]" : "h-20 w-20",
    completed ? "bg-[#FFD54A]" : locked ? "bg-slate-200" : aktif ? "" : "bg-[#FFF1D2]",
  ].join(" ")

  const inti = (
    <div className="flex flex-col items-center gap-2" style={{ marginLeft: geser }}>
      <div className={lingkaran}>
        {isi}
        {aktif && (
          <span className="absolute -top-3 rounded-full border border-pink-200 bg-white px-2 py-0.5 text-[11px] font-extrabold text-[#FF6B9D] shadow">
            MULAI
          </span>
        )}
      </div>
      <span
        className={`max-w-[7rem] text-center text-xs font-bold leading-tight ${
          locked ? "text-slate-400" : "text-slate-700"
        }`}
      >
        {title}
      </span>
      {completed && stars > 0 && (
        <span className="flex gap-0.5" aria-label={`${stars} dari 3 bintang`}>
          {[1, 2, 3].map((n) => (
            <Star
              key={n}
              className={`h-3.5 w-3.5 ${n <= stars ? "fill-[#FFD54A] text-[#FFD54A]" : "text-slate-300"}`}
              aria-hidden
            />
          ))}
        </span>
      )}
    </div>
  )

  if (locked) {
    return (
      <div aria-disabled title="Selesaikan pelajaran sebelumnya dulu" className="cursor-not-allowed">
        {inti}
      </div>
    )
  }

  return (
    <Link
      href={`/junior/pelajaran/${pelajaran.id}`}
      className="rounded-3xl focus:outline-none focus-visible:ring-4 focus-visible:ring-[#FF6B9D]/40"
      aria-label={`${title} — ${pelajaran.estimatedMinutes} menit, ${pelajaran.xpReward} XP`}
    >
      {inti}
    </Link>
  )
}

function Unit({ unit, idAktif }: { unit: Unit; idAktif: string | null }) {
  return (
    <section className="py-4">
      <h3 className="mb-4 text-center text-sm font-bold uppercase tracking-wide text-slate-400">
        {unit.unitTitle}
      </h3>
      <div className="flex flex-col items-center gap-8">
        {unit.lessons.map((pelajaran, i) => (
          <Node
            key={pelajaran.id}
            pelajaran={pelajaran}
            aktif={pelajaran.id === idAktif}
            // Zigzag lembut supaya jalur terasa seperti peta, bukan daftar.
            geser={[0, 56, -56][i % 3]}
          />
        ))}
      </div>
    </section>
  )
}

function IsiStage({ stage, idAktif }: { stage: Stage; idAktif: string | null }) {
  return (
    <div className="divide-y divide-dashed divide-slate-200">
      {stage.units.map((unit) => (
        <Unit key={unit.unitOrder} unit={unit} idAktif={idAktif} />
      ))}
    </div>
  )
}

export function JalurBelajar({
  stages,
  idAktif,
}: {
  stages: Stage[]
  idAktif: string | null
}) {
  const jenjangSendiri = stages.filter((s) => s.jenjangMurid)
  // Jenjang bawah ditaruh setelahnya dan tertutup — tersedia kalau anak butuh
  // mundur, tapi tidak menenggelamkan jalur utamanya.
  const jenjangBawah = stages.filter((s) => !s.jenjangMurid).reverse()

  return (
    <div className="space-y-6">
      {jenjangSendiri.map((stage) => (
        <div key={stage.grade} className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-2xl" aria-hidden>
              {stage.icon ?? "📘"}
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800">{stage.stageTitle}</h2>
              <p className="text-sm text-slate-500">Petualanganmu sekarang</p>
            </div>
          </div>
          <IsiStage stage={stage} idAktif={idAktif} />
        </div>
      ))}

      {jenjangBawah.length > 0 && (
        <div className="space-y-3">
          <p className="px-1 text-sm font-semibold text-slate-500">
            Mau mengulang materi yang lebih mudah? Semuanya terbuka.
          </p>
          {jenjangBawah.map((stage) => {
            const total = stage.units.reduce((n, u) => n + u.lessons.length, 0)
            const selesai = stage.units.reduce(
              (n, u) => n + u.lessons.filter((l) => l.completed).length,
              0
            )
            return (
              <details key={stage.grade} className="group rounded-3xl bg-white/70 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                  <span className="text-2xl" aria-hidden>
                    {stage.icon ?? "📘"}
                  </span>
                  <span className="flex-1">
                    <span className="block font-bold text-slate-700">
                      {LABEL_JENJANG[stage.grade]} — {stage.stageTitle}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {selesai} dari {total} pelajaran selesai
                    </span>
                  </span>
                  <span className="text-sm font-bold text-[#D99058] group-open:hidden">Buka</span>
                  <span className="hidden text-sm font-bold text-[#D99058] group-open:inline">
                    Tutup
                  </span>
                </summary>
                <div className="px-4 pb-4">
                  <IsiStage stage={stage} idAktif={null} />
                </div>
              </details>
            )
          })}
        </div>
      )}
    </div>
  )
}
