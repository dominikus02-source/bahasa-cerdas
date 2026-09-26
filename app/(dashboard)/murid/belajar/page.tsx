"use client";

import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  Brain,
  ClipboardList,
  Flame,
  GraduationCap,
  MessageCircle,
  School,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";

const QUESTS = [
  {
    href: "/arena/jalur-cerdas",
    label: "Jalur Cerdas",
    eyebrow: "MAIN QUEST",
    description: "Lanjutkan perjalanan belajar Bahasa Indonesia selangkah demi selangkah.",
    icon: BookOpenCheck,
    tone: "from-violet-600 via-indigo-600 to-blue-600",
    reward: "XP · Progres · Skill",
    primary: true,
  },
  {
    href: "/arena/tugas",
    label: "Tugas",
    eyebrow: "SIDE QUEST",
    description: "Selesaikan tantangan dari gurumu sebelum tenggatnya tiba.",
    icon: ClipboardList,
    tone: "from-amber-500 to-orange-600",
    reward: "Reward belajar",
  },
  {
    href: "/murid/gabung-kelas",
    label: "Kelas",
    eyebrow: "PARTY",
    description: "Masuk ke ruang belajar bersama guru dan teman-temanmu.",
    icon: School,
    tone: "from-cyan-500 to-blue-600",
    reward: "Belajar bersama",
  },
  {
    href: "/murid/progresku",
    label: "Progres",
    eyebrow: "STATUS",
    description: "Lihat perkembangan kemampuan dan perjalanan belajarmu.",
    icon: TrendingUp,
    tone: "from-emerald-500 to-teal-600",
    reward: "Insight",
  },
  {
    href: "/murid/simulasi/ukbi",
    label: "Simulasi UKBI",
    eyebrow: "CHALLENGE",
    description: "Uji kemampuan Bahasa Indonesia dalam simulasi yang terarah.",
    icon: Brain,
    tone: "from-fuchsia-500 to-violet-600",
    reward: "Skill check",
  },
  {
    href: "/murid/simulasi/tka",
    label: "Simulasi TKA",
    eyebrow: "CHALLENGE",
    description: "Persiapkan diri menghadapi TKA dengan latihan terukur.",
    icon: Target,
    tone: "from-rose-500 to-pink-600",
    reward: "Skill check",
  },
];

export default function BelajarPage() {
  return (
    <div className="relative mx-auto w-full max-w-6xl pb-20">
      {/* WORLD HERO */}
      <section className="relative overflow-hidden rounded-[2rem] bg-[#07152f] text-white shadow-[0_30px_90px_-42px_rgba(79,70,229,0.8)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-32 h-80 w-80 rounded-full bg-violet-500/25 blur-3xl" />
          <div className="absolute -right-24 -bottom-40 h-[28rem] w-[28rem] rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="absolute left-1/2 top-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>

        <div className="relative grid gap-8 px-6 py-8 sm:px-9 sm:py-10 lg:grid-cols-[1fr_360px] lg:items-center lg:px-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-[#ffd24a]" />
              Dunia Belajar
            </div>

            <h1 className="mt-5 max-w-2xl text-3xl font-black leading-[1.02] tracking-tight sm:text-4xl lg:text-[3.3rem]">
              Pilih misi.
              <span className="block bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200 bg-clip-text text-transparent">
                Naik level.
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100/75 sm:text-base">
              Setiap aktivitas di sini punya tujuan. Lanjutkan perjalanan utama,
              selesaikan side quest, atau tantang kemampuanmu.
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              {[
                [Flame, "Jaga streak"],
                [Zap, "Kumpulkan XP"],
                [Trophy, "Buka pencapaian"],
              ].map(([Icon, label]) => {
                const I = Icon as typeof Flame;
                return (
                  <span
                    key={label as string}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-[11px] font-bold text-white/85"
                  >
                    <I className="h-3.5 w-3.5 text-cyan-200" />
                    {label as string}
                  </span>
                );
              })}
            </div>
          </div>

          {/* QUEST COMPASS */}
          <div className="relative mx-auto w-full max-w-[330px]">
            <div className="absolute inset-4 rounded-[2rem] border border-white/10" />
            <div className="absolute inset-10 rounded-full border border-cyan-200/10" />
            <div className="relative aspect-square overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-violet-500/20 via-blue-500/10 to-cyan-300/10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_42%)]" />
              <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#ffe58a] via-[#ffb52e] to-fuchsia-500 p-[3px] shadow-[0_25px_70px_-18px_rgba(255,181,46,0.8)]">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-[#101d42]">
                  <GraduationCap className="h-12 w-12 text-white" />
                </div>
              </div>
              <span className="absolute left-[22%] top-[24%] h-3 w-3 rounded-full bg-cyan-200 shadow-[0_0_18px_rgba(165,243,252,0.9)]" />
              <span className="absolute right-[18%] top-[31%] h-2.5 w-2.5 rounded-full bg-fuchsia-300 shadow-[0_0_18px_rgba(240,171,252,0.8)]" />
              <span className="absolute bottom-[22%] left-[25%] h-2.5 w-2.5 rounded-full bg-[#ffd24a] shadow-[0_0_18px_rgba(255,210,74,0.8)]" />
              <span className="absolute bottom-[18%] right-[25%] h-2 w-2 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.8)]" />
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/70 backdrop-blur">
                Quest Hub
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN QUEST */}
      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">
              Perjalanan utama
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              Main Quest
            </h2>
          </div>
          <span className="hidden rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-black text-violet-700 sm:inline-flex">
            Jalur Cerdas
          </span>
        </div>

        <Link
          href="/arena/jalur-cerdas"
          className="group relative block overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#101c46] via-[#263e9d] to-[#4338ca] p-6 text-white shadow-[0_24px_70px_-34px_rgba(67,56,202,0.8)] transition-all hover:-translate-y-1 hover:shadow-[0_30px_80px_-34px_rgba(67,56,202,0.95)] sm:p-8"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-fuchsia-400/15 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100 ring-1 ring-white/10">
                  Main Quest
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[9px] font-black text-emerald-200">
                  <Sparkles className="h-3 w-3" />
                  Perjalanan aktif
                </span>
              </div>
              <h3 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                Jalur Cerdas
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100/80">
                Jalur belajar utama BahasaCerdas. Lanjutkan unit berikutnya dan bangun
                kemampuanmu sedikit demi sedikit.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {["Latihan terarah", "XP", "Progres tersimpan"].map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-[10px] font-bold text-white/80">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-[#18255b] shadow-xl transition-transform group-hover:translate-x-1">
              Lanjutkan
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
          <div className="relative mt-7 grid grid-cols-5 gap-1.5">
            <div className="h-2 rounded-full bg-cyan-300" />
            <div className="h-2 rounded-full bg-white/25" />
            <div className="h-2 rounded-full bg-white/15" />
            <div className="h-2 rounded-full bg-white/10" />
            <div className="h-2 rounded-full bg-white/10" />
          </div>
        </Link>
      </section>

      {/* SIDE QUESTS */}
      <section className="mt-9">
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Pilihan aktivitas
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            Side Quests
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUESTS.filter((quest) => !quest.primary).map(
            ({ href, label, eyebrow, description, icon: Icon, tone, reward }) => (
              <Link
                key={href}
                href={href}
                className="group relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.55)] transition-all hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl dark:border-white/10 dark:bg-white/[0.055] dark:shadow-[0_20px_55px_-34px_rgba(0,0,0,0.8)] dark:hover:border-violet-400/30 dark:hover:bg-white/[0.075]"
              >
                <div className={`absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${tone} opacity-[0.09] blur-2xl transition-opacity group-hover:opacity-20`} />
                <div className="relative flex items-start justify-between gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} shadow-lg`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[8px] font-black tracking-[0.15em] text-slate-500 dark:bg-white/[0.07] dark:text-slate-300/70">
                    {eyebrow}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-black text-slate-950 dark:text-white">{label}</h3>
                <p className="mt-1.5 min-h-[42px] text-xs leading-5 text-slate-500 dark:text-slate-300/65">{description}</p>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black text-violet-600 dark:text-violet-300">{reward}</span>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-violet-600 dark:text-white/25 dark:group-hover:text-violet-300" />
                </div>
              </Link>
            )
          )}
        </div>
      </section>

      {/* SOCIAL / MENTOR */}
      <section className="mt-9 grid gap-4 lg:grid-cols-2">
        <Link
          href="/arena/chat"
          className="group relative overflow-hidden rounded-[1.5rem] border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-6 transition-all hover:-translate-y-1 hover:shadow-xl dark:border-cyan-300/15 dark:from-cyan-400/[0.08] dark:via-white/[0.035] dark:to-blue-500/[0.08] dark:hover:border-cyan-300/25 dark:hover:bg-white/[0.055]"
        >
          <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="relative">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <p className="mt-4 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-700">Party / Sosial</p>
            <h3 className="mt-1 text-lg font-black text-slate-950">Ngobrol & belajar bersama</h3>
            <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-300/65">Diskusi dengan guru dan teman dalam ruang yang sama.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-cyan-700">
              Buka obrolan <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </Link>

        <Link
          href="/murid/dokumen-latihan"
          className="group relative overflow-hidden rounded-[1.5rem] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 transition-all hover:-translate-y-1 hover:shadow-xl dark:border-amber-300/15 dark:from-amber-400/[0.08] dark:via-white/[0.035] dark:to-orange-500/[0.08] dark:hover:border-amber-300/25 dark:hover:bg-white/[0.055]"
        >
          <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="relative">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
              <Award className="h-5 w-5 text-white" />
            </div>
            <p className="mt-4 text-[9px] font-black uppercase tracking-[0.18em] text-amber-700">Inventory</p>
            <h3 className="mt-1 text-lg font-black text-slate-950">Hasil & pencapaian</h3>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">Kembali melihat hasil latihan, ujian, dan pencapaian belajarmu.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-amber-700">
              Lihat hasil <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </Link>
      </section>
    </div>
  );
}
