import { getUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Coins, Flame, Gamepad2, Layers, ShoppingBag, Trophy, UserRound, Zap } from "lucide-react"
import { trackDailyStreak } from "@/lib/coins"
import { jenjangMurid } from "@/lib/arena-junior/kurikulum"
import { levelFromXp } from "@/lib/gamification/levels"
import { rankFromLevel } from "@/lib/gamification/ranks"
import { RankChip } from "@/components/gamification/RankChip"
import { SiaranBanner } from "@/components/arena/SiaranBanner"
import { getDisplayName } from "@/lib/nickname"
import UserAvatar from "@/components/arena/UserAvatar"

export const dynamic = "force-dynamic"

function initials(name: string) {
  return name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"
}

/**
 * ARENA 2.0 — ARENA HOME (bukan dashboard statistik).
 *
 * Satu halaman = satu pertanyaan: "Harus melakukan apa sekarang?" → MAIN
 * SEKARANG → Game Hub. Hanya tiga info progres (Level / XP / Rank) dan tiga
 * menu utama (Gim / Profil / Leaderboard). Misi, liga, badge, prestasi,
 * riwayat, toko — semua tetap hidup di route masing-masing dan tidak
 * dijejalkan ke sini. Light/dark penuh via Tailwind `dark:` variant — tidak
 * ada zona hardcoded gelap.
 *
 * Side-effect gamifikasi yang dipertahankan: trackDailyStreak (streak harian
 * tidak boleh berhenti hanya karena beranda arena disederhanakan). Misi harian
 * dibuat di halaman misi (/arena/misi) sendiri, jadi tidak diduplikasi.
 */
export default async function BerandaPage() {
  const user = await getUser()
  if (!user) redirect("/arena/login")

  // Murid TK–SD punya dasbor sendiri (Arena Junior). Login mengarahkan semua
  // murid ke sini, jadi pembelokan dilakukan di beranda saja — BUKAN di layout,
  // supaya tidak menambah query database pada setiap navigasi di dalam Arena.
  if (user.role === "MURID") {
    const jenjang = await jenjangMurid(user.id)
    if (jenjang) redirect("/junior")
  }

  const isGuruPreview = user.role !== "MURID" && !user.isFounder
  const nameOf = (u: { fullName: string; nickname?: string | null }) =>
    isGuruPreview ? u.fullName : getDisplayName(u, "peer")

  if (!isGuruPreview) await trackDailyStreak(user.id)

  // Rank/level diturunkan dari user.xp — pola sama dengan Student Shell sidebar.
  const level = levelFromXp(user.xp || 0)
  const rank = rankFromLevel(level)
  const playerName = nameOf(user)

  return (
    <div className="arena-page mx-auto w-full max-w-[1280px] space-y-6 px-4 py-6 md:px-6">
      {/* Siaran platform — kabar sistem & acara untuk semua murid. */}
      <SiaranBanner />

      {/* ── HEADER — identitas produk, bukan statistik ── */}
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">BahasaCerdas</p>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Arena</h1>
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Mainkan. Belajar. Naik Level.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!isGuruPreview && user.streak ? (
            <span
              title="Rentetan harian"
              className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-900 shadow-sm dark:border-orange-500/30 dark:bg-slate-800/80 dark:text-slate-100"
            >
              <Flame className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400" />
              {user.streak}
            </span>
          ) : null}
          {!isGuruPreview ? (
            <Link
              href="/arena/toko-koin"
              title="Toko Koin"
              className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300"
            >
              <Coins className="h-3.5 w-3.5" />
              {(user.coins || 0).toLocaleString("id-ID")}
            </Link>
          ) : null}
          <Link href="/arena/player" aria-label="Profil pemain" className="transition-transform hover:scale-105 active:scale-95">
            <UserAvatar
              size={44}
              avatar={user.avatar}
              initials={initials(playerName)}
              gradient="from-violet-500 to-purple-600"
              textClassName="text-sm"
              className="shadow-md"
            />
          </Link>
        </div>
      </header>

      {/* ── HERO — satu CTA: MAIN SEKARANG → Game Hub ── */}
      <section
        aria-label="Main sekarang"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 text-white shadow-lg shadow-violet-600/25 md:p-8"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-14 h-48 w-48 rounded-full bg-amber-300/20 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-200">Selamat datang kembali</p>
            <h2 className="mt-1 truncate text-2xl font-black md:text-3xl">{playerName}</h2>
            <p className="mt-1.5 text-sm text-violet-100/90">Pilih gim, kumpulkan XP, dan naik peringkat di Arena.</p>
          </div>
          <Link
            href="/arena/game"
            className="group flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-extrabold text-violet-700 shadow-lg shadow-violet-900/20 transition-all hover:bg-violet-50 active:scale-[0.98]"
          >
            MAIN SEKARANG <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* ── QUICK PROGRESS — hanya Level / XP / Rank ── */}
      <section aria-label="Progres cepat" className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/70">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
            <Layers size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500">Level</p>
            <p className="text-sm font-black text-gray-900 dark:text-slate-100">{level}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/70">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
            <Zap size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500">XP</p>
            <p className="truncate text-sm font-black tabular-nums text-gray-900 dark:text-slate-100">{(user.xp || 0).toLocaleString("id-ID")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/70">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
            <Trophy size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500">Rank</p>
            <div className="mt-0.5">
              <RankChip rank={rank} size={16} compact />
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN MENU — Gim / Toko / Profil / Leaderboard ── */}
      <section aria-label="Menu utama Arena" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/arena/game"
          className="group flex items-center gap-3.5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md hover:shadow-violet-500/[0.08] dark:border-slate-700/60 dark:bg-slate-800/70 dark:hover:border-violet-500/30"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/25">
            <Gamepad2 size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-gray-900 dark:text-slate-100">Gim</p>
            <p className="truncate text-[11px] text-gray-400 dark:text-slate-400">Solo, cepat, dan kompetitif</p>
            <span className="mt-1 inline-block text-[11px] font-bold text-violet-600 dark:text-violet-400">Main →</span>
          </div>
        </Link>
        <Link
          href="/arena/player"
          className="group flex items-center gap-3.5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/[0.08] dark:border-slate-700/60 dark:bg-slate-800/70 dark:hover:border-indigo-500/30"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/25">
            <UserRound size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-gray-900 dark:text-slate-100">Profil</p>
            <p className="truncate text-[11px] text-gray-400 dark:text-slate-400">Level, rank, dan progresmu</p>
            <span className="mt-1 inline-block text-[11px] font-bold text-indigo-600 dark:text-indigo-400">Lihat →</span>
          </div>
        </Link>
        <Link
          href="/arena/toko-koin"
          className="group flex items-center gap-3.5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md hover:shadow-amber-500/[0.08] dark:border-slate-700/60 dark:bg-slate-800/70 dark:hover:border-amber-500/30"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-md shadow-amber-500/25">
            <ShoppingBag size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-gray-900 dark:text-slate-100">Toko Koin</p>
            <p className="truncate text-[11px] text-gray-400 dark:text-slate-400">Tukar koin dengan item spesial</p>
            <span className="mt-1 inline-block text-[11px] font-bold text-amber-600 dark:text-amber-400">Beli →</span>
          </div>
        </Link>
        <Link
          href="/arena/player/leaderboard"
          className="group flex items-center gap-3.5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md hover:shadow-amber-500/[0.08] dark:border-slate-700/60 dark:bg-slate-800/70 dark:hover:border-amber-500/30"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/25">
            <Trophy size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-gray-900 dark:text-slate-100">Leaderboard</p>
            <p className="truncate text-[11px] text-gray-400 dark:text-slate-400">Posisimu dan teman-temanmu</p>
            <span className="mt-1 inline-block text-[11px] font-bold text-amber-600 dark:text-amber-400">Lihat →</span>
          </div>
        </Link>
      </section>
    </div>
  )
}
