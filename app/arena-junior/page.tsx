import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import {
  Eye, Flame, Gem, Sparkles, Crown, Headphones, Puzzle,
  Target, Gamepad2, Settings, Map, Zap, Star, Check,
} from "lucide-react"
import { getUser } from "@/lib/supabase/server"
import {
  aksesArenaJunior,
  ambilKurikulum,
  GRADES,
  LABEL_JENJANG,
} from "@/lib/arena-junior/kurikulum"
import { gambarKarakter, PROFIL, normalkanKarakter } from "@/lib/arena-junior/karakter"
import { JalurBelajar } from "./_components/jalur-belajar"

export const dynamic = "force-dynamic"

function BilahAtas({
  nama,
  jenjang,
  streak,
  koin,
  xpSekarang,
  xpTarget,
}: {
  nama: string
  jenjang: string
  streak: number
  koin: number
  xpSekarang: number
  xpTarget: number
}) {
  const persenXP = xpTarget > 0 ? Math.min(100, Math.round((xpSekarang / xpTarget) * 100)) : 0
  return (
    <nav className="sticky top-0 z-40 rounded-b-3xl bg-white px-4 py-3 shadow-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="relative shrink-0">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#FFD93D] to-[#FF8C42] shadow-md">
              <Image
                src={gambarKarakter("zelby", "happy")}
                alt=""
                width={80}
                height={80}
                className="h-10 w-10 object-contain"
                priority
              />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#A78BFA] text-[10px] font-extrabold text-white shadow-sm">
              {streak}
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-slate-800">Halo, {nama}!</p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">{jenjang}</span>
              <span className="text-[10px] font-bold text-[#FF8C42] flex items-center gap-0.5">
                <Zap className="h-3 w-3" />
                {xpSekarang}/{xpTarget}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <span className="flex items-center gap-1 text-lg font-extrabold text-[#FF8C42]">
            <Flame className="h-5 w-5" aria-hidden />
            <span aria-label={`${streak} hari berturut-turut`}>{streak}</span>
          </span>
          <span className="flex items-center gap-1 text-lg font-extrabold text-[#A78BFA]">
            <Gem className="h-5 w-5" aria-hidden />
            <span aria-label={`${koin} koin`}>{koin}</span>
          </span>
          <Link
            href="/murid/pengaturan"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Pengaturan"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </nav>
  )
}

function KartuZelby({ pesan, karakter }: { pesan: string; karakter: string }) {
  const profil = PROFIL[normalkanKarakter(karakter)]
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4ECDC4] to-[#3BAFA8] p-5 text-white shadow-lg">
      <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-white/10" />
      <div className="absolute -top-4 -left-4 h-20 w-20 rounded-full bg-white/5" />
      <div className="relative flex items-start gap-3">
        <Image
          src={gambarKarakter(karakter, "wave")}
          alt=""
          width={128}
          height={128}
          className="h-16 w-16 shrink-0 object-contain drop-shadow"
        />
        <div className="flex-1">
          <h3 className="mb-1 font-extrabold leading-tight drop-shadow-sm font-junior-heading">
            {profil.nama} Berkata:
          </h3>
          <p className="text-sm font-medium opacity-95 leading-snug">
            &ldquo;{pesan}&rdquo;
          </p>
        </div>
      </div>
    </div>
  )
}

function MisiHarian({ selesai, target }: { selesai: number; target: number }) {
  const persen = Math.min(100, Math.round((selesai / target) * 100))
  const tuntas = selesai >= target
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-slate-800 font-junior-heading">
        <Sparkles className="h-5 w-5 text-[#FFD54A]" aria-hidden />
        Misi Harian
      </h2>

      <div className="space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">
              Selesaikan {target} Pelajaran
            </span>
            <span className="text-xs font-bold text-[#A78BFA]">+10 <Gem className="h-3 w-3 inline" aria-hidden /></span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={selesai} aria-valuemin={0} aria-valuemax={target}>
            <div
              className={`h-3 rounded-full transition-all ${tuntas ? "bg-[#4ECDC4]" : "bg-[#A78BFA]"}`}
              style={{ width: `${persen}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {tuntas ? "Selesai! Hebat sekali!" : `${selesai} dari ${target} selesai`}
          </p>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">
              Kumpulkan 20 Koin
            </span>
            <span className="text-xs font-bold text-[#A78BFA]">+15 <Gem className="h-3 w-3 inline" aria-hidden /></span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-3 rounded-full bg-[#A78BFA] transition-all" style={{ width: "0%" }} />
          </div>
          <p className="mt-1 text-xs text-slate-400">0 dari 20 koin</p>
        </div>
      </div>
    </div>
  )
}

function TamanBermain() {
  const games = [
    { icon: Headphones, label: "Dengar", color: "bg-pink-100", textColor: "text-pink-600", href: "/arena/game/kata-play" },
    { icon: Puzzle, label: "Susun", color: "bg-orange-100", textColor: "text-orange-600", href: "/arena/game/susun-kata" },
    { icon: Target, label: "Pasang", color: "bg-teal-100", textColor: "text-teal-600", href: "/arena/game/petualangan-kata" },
  ]
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-slate-800 font-junior-heading">
        <Gamepad2 className="h-5 w-5 text-[#FF8C42]" aria-hidden />
        Taman Bermain
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {games.map((g) => (
          <Link
            key={g.label}
            href={g.href}
            className={`${g.color} flex flex-col items-center gap-1.5 rounded-2xl p-3 transition hover:scale-105 active:scale-95`}
          >
            <g.icon className="h-7 w-7" aria-hidden />
            <span className={`text-xs font-extrabold ${g.textColor}`}>{g.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function BannerPremium() {
  return (
    <Link
      href="/premium"
      className="group flex items-center gap-4 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 p-5 text-white shadow-lg transition hover:scale-[1.02] active:scale-[0.98]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
        <Crown className="h-7 w-7 text-[#FFD93D]" />
      </div>
      <div className="flex-1">
        <h3 className="font-extrabold leading-tight drop-shadow-sm font-junior-heading">Super BahasaCerdas</h3>
        <p className="mb-2 text-xs opacity-80">Buka kostum Zelby & tanpa iklan!</p>
        <span className="inline-block rounded-full bg-[#FFD93D] px-4 py-1 text-xs font-extrabold text-purple-800 shadow">
          Minta Ortu
        </span>
      </div>
    </Link>
  )
}

function BelumPunyaKelas({ nama }: { nama: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-[#4ECDC4] to-[#FFD93D] p-4 shadow-lg">
        <Image
          src={gambarKarakter("zelby", "thinking")}
          alt=""
          width={256}
          height={256}
          className="h-36 w-36 object-contain"
          priority
        />
      </div>
      <h1 className="text-2xl font-extrabold text-slate-800 font-junior-heading">Halo, {nama}!</h1>
      <p className="max-w-sm text-slate-600">
        Kamu belum tergabung di kelas TK atau SD. Minta <strong>kode kelas</strong> ke gurumu,
        lalu masukkan di sini supaya petualanganmu bisa dimulai.
      </p>
      <Link
        href="/murid/gabung-kelas"
        className="rounded-2xl bg-[#FF8C42] px-8 py-4 text-lg font-extrabold text-white shadow-lg transition active:translate-y-0.5"
      >
        Masukkan Kode Kelas
      </Link>
    </main>
  )
}

function BilahPratinjau({ grade }: { grade: string }) {
  return (
    <div className="bg-slate-900 px-4 py-2 text-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <span className="flex items-center gap-1.5 font-bold">
          <Eye className="h-4 w-4" aria-hidden />
          Mode pratinjau
        </span>
        <span className="text-white/60">Progres tidak disimpan.</span>
        <nav className="flex flex-wrap items-center gap-1" aria-label="Pilih jenjang">
          {GRADES.map((g) => (
            <Link
              key={g}
              href={`/arena-junior?jenjang=${g}`}
              className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
                g === grade ? "bg-[#FFD54A] text-slate-900" : "bg-white/10 hover:bg-white/20"
              }`}
              aria-current={g === grade ? "page" : undefined}
            >
              {LABEL_JENJANG[g]}
            </Link>
          ))}
        </nav>
        <Link
          href="/admin"
          className="ml-auto rounded-full bg-white/10 px-3 py-1 text-xs font-bold transition hover:bg-white/20"
        >
          Kembali ke Panel Admin
        </Link>
      </div>
    </div>
  )
}

export default async function ArenaJuniorPage({
  searchParams,
}: {
  searchParams: Promise<{ jenjang?: string }>
}) {
  const user = await getUser()
  if (!user) redirect("/auth/arena-login")

  const namaDepan = user.fullName?.trim().split(/\s+/)[0] || "Teman"

  const { jenjang: jenjangDiminta } = await searchParams
  const akses = await aksesArenaJunior(user, jenjangDiminta)
  if (akses.mode === "butuh-kelas") return <BelumPunyaKelas nama={namaDepan} />

  const grade = akses.grade
  const pratinjau = akses.mode === "pratinjau"

  const { stages, ringkasan } = await ambilKurikulum(user.id, grade)

  const pesanZelby = ringkasan.judulBerikutnya
    ? `Ayo lanjut ke "${ringkasan.judulBerikutnya}". Baca dengan nyaring supaya makin lancar!`
    : ringkasan.totalPelajaran > 0
      ? "Semua pelajaran di kelasmu sudah selesai. Kamu luar biasa!"
      : "Pelajaran untuk kelasmu sedang disiapkan. Sampai jumpa sebentar lagi!"

  const persenJenjang =
    ringkasan.totalPelajaran > 0
      ? Math.round((ringkasan.selesai / ringkasan.totalPelajaran) * 100)
      : 0

  return (
    <>
      {pratinjau && <BilahPratinjau grade={grade} />}
      <BilahAtas
        nama={namaDepan}
        jenjang={LABEL_JENJANG[grade]}
        streak={user.streak}
        koin={user.coins}
        xpSekarang={ringkasan.xpTerkumpul}
        xpTarget={ringkasan.totalXP}
      />

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:order-2">
            <KartuZelby pesan={pesanZelby} karakter={ringkasan.karakterBerikutnya} />
            <MisiHarian selesai={ringkasan.selesaiHariIni} target={ringkasan.targetHarian} />
            <TamanBermain />
            <BannerPremium />
          </div>

          <div className="lg:order-1 lg:col-span-2">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-800 font-junior-heading">Petualangan Hari Ini</h2>
                  <p className="text-sm text-slate-500">Bantu Zelby menjelajah hutan kata!</p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-200 cursor-default">
                  <Map className="h-4 w-4" aria-hidden />
                  Peta
                </span>
              </div>

              <JalurBelajar stages={stages} idAktif={ringkasan.pelajaranBerikutnya} />

              <div className="mt-6 rounded-2xl bg-[#FFF8E7] px-5 py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-700">Kemajuan {LABEL_JENJANG[grade]}</span>
                  <span className="font-bold text-[#FFD54A]">
                    <Star className="h-3.5 w-3.5 inline fill-current" aria-hidden />{' '}
                    {ringkasan.selesai}/{ringkasan.totalPelajaran}
                  </span>
                </div>
                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-3 rounded-full bg-[#FFD54A] transition-all"
                    style={{ width: `${persenJenjang}%` }}
                  />
                </div>
                {ringkasan.xpTerkumpul > 0 && (
                  <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                    <Zap className="h-3 w-3" aria-hidden />
                    {ringkasan.xpTerkumpul} XP terkumpul
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
