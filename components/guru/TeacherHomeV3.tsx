"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Bot,
  CheckCircle2,
  Circle,
  FilePenLine,
  GraduationCap,
  Lightbulb,
  MonitorPlay,
  Quote,
  Sparkles,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { GuruBerkarya } from "@/components/guru/GuruBerkarya";
import GuruBadgeGrid from "@/components/guru/GuruBadgeGrid";
import BannerProgramGuruCerdas from "@/components/public/BannerProgramGuruCerdas";
import { MISI_GURU } from "@/lib/guru/misi-guru";
import type { MisiGuruStatus } from "@/lib/guru/misi-guru-status";
import { getDailyTeacherTip, getWeeklyTeacherQuote } from "@/lib/guru/home-content";

const PHOTO = {
  hero: "https://images.unsplash.com/photo-1654356709115-3f68998bead4?auto=format&fit=crop&w=1800&q=82",
  classroom: "https://images.unsplash.com/photo-1778489769184-45868633c527?auto=format&fit=crop&w=1600&q=82",
  writing: "https://images.unsplash.com/photo-1743385779312-73ea241025d8?auto=format&fit=crop&w=1200&q=80",
  aiWorkspace: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=82",
  studentLearning: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1400&q=82",
} as const;

type QuickAction = {
  label: string;
  desc: string;
  href: string;
  image: string;
  icon: LucideIcon;
  overlay: string;
  imagePosition?: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Main Bersama",
    desc: "Ajak kelas belajar secara interaktif.",
    href: "/guru/game/main-bersama",
    image: PHOTO.classroom,
    icon: Users,
    overlay: "linear-gradient(135deg, rgba(19,82,181,.95), rgba(37,99,235,.88) 52%, rgba(14,165,233,.70))",
  },
  {
    label: "Buat Karya",
    desc: "Tulis artikel, puisi, atau karya pembelajaran.",
    href: "/guru/artikel",
    image: PHOTO.writing,
    icon: FilePenLine,
    overlay: "linear-gradient(135deg, rgba(21,72,160,.96), rgba(40,94,192,.88) 55%, rgba(93,130,217,.72))",
  },
  {
    label: "AI BC",
    desc: "Asisten untuk ide dan persiapan mengajar.",
    href: "/guru/ai-bc",
    image: PHOTO.aiWorkspace,
    icon: Bot,
    overlay: "linear-gradient(135deg, rgba(18,55,120,.97), rgba(37,86,170,.88) 54%, rgba(78,126,211,.70))",
    imagePosition: "center 52%",
  },
  {
    label: "Dasbor Murid",
    desc: "Lihat pengalaman BahasaCerdas dari sisi murid.",
    href: "/murid/beranda",
    image: PHOTO.studentLearning,
    icon: GraduationCap,
    overlay: "linear-gradient(135deg, rgba(5,74,112,.97), rgba(8,116,158,.88) 52%, rgba(34,180,188,.66))",
    imagePosition: "center 42%",
  },
];

interface CompetitionData {
  myRank: number | null;
  myXp: number;
  participants: number;
}

function TeacherHero({
  greeting,
  fullName,
}: {
  greeting: string;
  fullName: string;
}) {
  return (
    <section
      className="relative min-h-[286px] overflow-hidden rounded-[28px] border border-blue-300/25 shadow-[0_22px_55px_rgba(15,62,132,.18)]"
      style={{ backgroundColor: "#071d3d" }}
    >
      <Image
        src={PHOTO.hero}
        alt=""
        fill
        priority
        sizes="(max-width: 1280px) 100vw, 850px"
        className="object-cover object-center"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 78% 18%, rgba(96,165,250,.22), transparent 32%), linear-gradient(90deg, rgba(6,26,57,.98) 0%, rgba(11,50,101,.90) 54%, rgba(11,59,119,.52) 100%)",
        }}
      />

      <div className="relative z-10 flex min-h-[286px] max-w-[680px] flex-col justify-center px-6 py-8 sm:px-9">
        <span className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-blue-200/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold tracking-[.12em] text-blue-100 backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5" />
          RUANG KERJA GURU
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-[2.55rem] sm:leading-[1.06]">
          {greeting}, {fullName}
        </h1>
        <p className="mt-3 max-w-[510px] text-sm leading-relaxed text-blue-100 sm:text-base">
          Mulai dari hal yang paling penting hari ini. BahasaCerdas membantu pekerjaan mengajar tetap ringkas dan terarah.
        </p>
        <div className="mt-6 max-w-[500px] rounded-2xl border border-white/15 bg-black/25 px-4 py-3 backdrop-blur-md">
          <p className="text-sm font-medium leading-relaxed text-white/90">
            “Satu keputusan mengajar yang baik dapat mengubah cara siswa melihat dirinya sendiri.”
          </p>
        </div>
      </div>
    </section>
  );
}

function DailyMissionCard({ status }: { status: MisiGuruStatus | null }) {
  const focus = useMemo(() => {
    if (!status) return [];
    const belum = MISI_GURU.filter(
      (config) => !status.misi.find((item) => item.id === config.id)?.selesai,
    );
    const selesai = MISI_GURU.filter(
      (config) => status.misi.find((item) => item.id === config.id)?.selesai,
    );
    return [...belum, ...selesai].slice(0, 3);
  }, [status]);

  return (
    <section className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-[0_14px_35px_rgba(31,78,145,.08)] dark:border-blue-950/80 dark:bg-[#0b1d34]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-300">
            <Award className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-slate-100">Misi Hari Ini</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Fokus ringkas dari misi minggu ini.
            </p>
          </div>
        </div>
        {status ? (
          <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
            {status.totalSelesai}/{status.totalMisi}
          </span>
        ) : null}
      </div>

      {!status ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-blue-50/70 dark:bg-blue-950/30" />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {focus.map((config) => {
            const state = status.misi.find((item) => item.id === config.id);
            const done = state?.selesai ?? false;
            return (
              <Link
                key={config.id}
                href={config.href}
                className="group flex min-h-14 items-center gap-3 rounded-2xl border border-blue-100/80 bg-blue-50/50 px-3 py-2.5 transition-colors hover:border-blue-200 hover:bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/30 dark:hover:bg-blue-950/50"
              >
                {done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-300" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-blue-300 dark:text-blue-700" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {config.label}
                  </span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                    +{config.xp} XP
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-blue-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600 dark:text-blue-600 dark:group-hover:text-blue-300" />
              </Link>
            );
          })}
        </div>
      )}

      <Link
        href="/guru/game/achievement"
        className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
      >
        Lihat semua misi <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

function QuickActions() {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Mulai aktivitas</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Empat pintasan utama untuk pekerjaan guru.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="group relative min-h-[168px] overflow-hidden rounded-[22px] border border-blue-200/25 shadow-[0_12px_30px_rgba(20,67,135,.12)] transition-transform duration-200 hover:-translate-y-0.5"
              style={{ backgroundColor: "#0b3b77" }}
            >
              <Image
                src={action.image}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                style={{ objectPosition: action.imagePosition ?? "center" }}
              />
              <div className="absolute inset-0" style={{ background: action.overlay }} />
              <div className="relative z-10 flex h-full min-h-[168px] flex-col p-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur-md">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="mt-auto pt-5">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h3 className="text-base font-extrabold text-white">{action.label}</h3>
                      <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-white/80">
                        {action.desc}
                      </p>
                    </div>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-blue-700 transition-transform group-hover:translate-x-0.5">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function MainBersamaAnnouncement() {
  return (
    <section className="overflow-hidden rounded-[26px] border border-blue-100 bg-white shadow-[0_14px_34px_rgba(25,72,140,.08)] dark:border-blue-950/80 dark:bg-[#0b1d34]">
      <div className="border-b border-blue-100 px-5 py-3.5 dark:border-blue-950/70">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Pengumuman Terbaru</p>
      </div>
      <div className="relative min-h-[260px]" style={{ backgroundColor: "#082c59" }}>
        <Image
          src={PHOTO.classroom}
          alt="Suasana kelas dengan pembelajaran digital"
          fill
          sizes="(max-width: 1280px) 100vw, 760px"
          className="object-cover object-center"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(6,27,58,.98) 0%, rgba(10,63,132,.88) 58%, rgba(23,105,199,.30) 100%)",
          }}
        />
        <div className="relative z-10 flex min-h-[260px] max-w-[560px] flex-col justify-center p-6 sm:p-7">
          <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-500/20 px-2.5 py-1 text-[10px] font-extrabold tracking-[.12em] text-blue-100 ring-1 ring-inset ring-blue-200/20">
            <MonitorPlay className="h-3.5 w-3.5" /> FITUR UNGGULAN
          </span>
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Kenalkan Main Bersama</h2>
          <p className="mt-2 max-w-[470px] text-sm leading-relaxed text-blue-50/90">
            Gunakan kuis interaktif untuk membuat seluruh kelas belajar, bergerak, dan merespons bersama.
          </p>
          <Link
            href="/guru/game/main-bersama"
            className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-700 shadow-lg shadow-blue-950/20 transition-colors hover:bg-blue-50"
          >
            Jelajahi Main Bersama <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function CompetitionCard() {
  const [data, setData] = useState<CompetitionData | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/guru/leaderboard?period=WEEKLY", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((payload) => {
        if (!active) return;
        setData({
          myRank: typeof payload?.myRank === "number" ? payload.myRank : null,
          myXp: typeof payload?.myXp === "number" ? payload.myXp : 0,
          participants: typeof payload?.participants === "number" ? payload.participants : 0,
        });
      })
      .catch(() => {
        if (active) setData({ myRank: null, myXp: 0, participants: 0 });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      className="relative overflow-hidden rounded-[26px] border border-blue-100 p-5 text-white shadow-[0_14px_34px_rgba(20,67,135,.16)] dark:border-blue-950"
      style={{ background: "linear-gradient(135deg, #0b2550 0%, #0b3c7f 54%, #1459ad 100%)" }}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-blue-100 ring-1 ring-inset ring-white/10">
            <Trophy className="h-5 w-5" />
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-blue-100 ring-1 ring-inset ring-white/10">
            MINGGU INI
          </span>
        </div>
        <h2 className="mt-5 text-lg font-bold">Kompetisi Guru</h2>
        <p className="mt-1 text-xs leading-relaxed text-blue-100/80">
          Lihat posisi Anda dan karya guru lain yang sedang bertumbuh.
        </p>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-[.12em] text-blue-200/70">Peringkat Anda</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <p className="text-4xl font-extrabold tracking-tight">
              {data?.myRank ? `#${data.myRank}` : "—"}
            </p>
            <div className="text-right">
              <p className="text-sm font-bold text-blue-100">{data ? data.myXp.toLocaleString("id-ID") : "—"} XP</p>
              <p className="text-[10px] text-blue-200/70">
                {data?.participants ? `${data.participants} guru` : "Peringkat mingguan"}
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/guru/game/leaderboard"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#0b84d4" }}
        >
          Lihat Papan Peringkat <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}

function QuoteCard() {
  const quote = getWeeklyTeacherQuote();
  return (
    <section
      className="relative min-h-[220px] overflow-hidden rounded-[24px] border border-blue-100 p-5 text-white shadow-[0_12px_30px_rgba(20,67,135,.11)] dark:border-blue-950"
      style={{ backgroundColor: "#0a2d5d" }}
    >
      <Image
        src={PHOTO.hero}
        alt=""
        fill
        sizes="(max-width: 1280px) 100vw, 420px"
        className="object-cover"
        style={{ objectPosition: "center 42%" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(6,26,57,.99) 0%, rgba(12,57,116,.92) 56%, rgba(14,92,168,.66) 100%)",
        }}
      />
      <div className="relative z-10">
        <div className="flex items-center gap-2">
          <Quote className="h-5 w-5 text-blue-200" />
          <h2 className="text-sm font-bold text-white">Quote Minggu Ini</h2>
        </div>
        <p className="mt-5 text-base font-semibold leading-relaxed text-white">
          “{quote.text}”
        </p>
        <p className="mt-4 text-xs font-medium text-blue-200">— {quote.source}</p>
      </div>
    </section>
  );
}

function TipCard() {
  const tip = getDailyTeacherTip();
  return (
    <section className="rounded-[24px] border border-blue-100 bg-white p-5 shadow-[0_10px_28px_rgba(25,72,140,.07)] dark:border-blue-950/80 dark:bg-[#0b1d34]">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-300">
          <Lightbulb className="h-4.5 w-4.5" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Tips Mengajar</h2>
          <p className="text-[10px] font-semibold uppercase tracking-[.1em] text-blue-600 dark:text-blue-300">Hari ini</p>
        </div>
      </div>
      <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-100">{tip.title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{tip.body}</p>
    </section>
  );
}

export default function TeacherHomeV3({
  greeting,
  fullName,
  misiStatus,
}: {
  greeting: string;
  fullName: string;
  misiStatus: MisiGuruStatus | null;
}) {
  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.58fr)_minmax(320px,.72fr)]">
        <TeacherHero greeting={greeting} fullName={fullName} />
        <DailyMissionCard status={misiStatus} />
      </div>

      <QuickActions />

      <BannerProgramGuruCerdas />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.52fr)_minmax(310px,.58fr)]">
        <MainBersamaAnnouncement />
        <CompetitionCard />
      </div>

      <GuruBerkarya misiStatus={misiStatus} compact />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.38fr)_minmax(300px,.62fr)]">
        <GuruBadgeGrid compact />
        <div className="space-y-5">
          <QuoteCard />
          <TipCard />
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 pb-2 text-[11px] text-slate-400 dark:text-slate-500">
        <Zap className="h-3.5 w-3.5 text-blue-400" />
        <span>Beranda Guru dirancang untuk aksi cepat. Nilai dan data murid tetap terpusat di Kelasku.</span>
      </div>
    </div>
  );
}
