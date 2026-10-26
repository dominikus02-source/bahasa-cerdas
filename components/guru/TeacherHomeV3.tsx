"use client";

import JumpaLaunchBanner from "@/components/jumpa/JumpaLaunchBanner";
import JumpaBerandaCard from "@/components/jumpa/JumpaBerandaCard";
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
  type LucideIcon,
} from "lucide-react";
import { GuruBerkarya } from "@/components/guru/GuruBerkarya";
import GuruBadgeGrid from "@/components/guru/GuruBadgeGrid";
import BannerProgramGuruCerdas from "@/components/public/BannerProgramGuruCerdas";
import { MISI_GURU } from "@/lib/guru/misi-guru";
import type { MisiGuruStatus } from "@/lib/guru/misi-guru-status";
import { getDailyTeacherTip, getWeeklyTeacherQuote } from "@/lib/guru/home-content";

/**
 * Foto beranda guru — dipulihkan atas keputusan founder (2026-10-26) setelah
 * #171 meratakan beranda menjadi kartu polos. Host images.unsplash.com sudah
 * diizinkan di next.config.ts (remotePatterns) & CSP img-src (middleware.ts).
 */
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
  icon: LucideIcon;
  image: string;
  /** Kelas scrim token (tokens.css §4) — sama di terang & gelap, gelap + peredup. */
  scrim: string;
  imagePosition?: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Main Bersama",
    desc: "Ajak kelas belajar secara interaktif.",
    href: "/guru/game/main-bersama",
    icon: Users,
    image: PHOTO.classroom,
    scrim: "bc-media-scrim--1",
  },
  {
    label: "Buat Karya",
    desc: "Tulis artikel, puisi, atau karya pembelajaran.",
    href: "/guru/artikel",
    icon: FilePenLine,
    image: PHOTO.writing,
    scrim: "bc-media-scrim--2",
  },
  {
    label: "NARA",
    desc: "Rekan Anda untuk ide dan persiapan mengajar.",
    href: "/guru/ai-bc",
    icon: Bot,
    image: PHOTO.aiWorkspace,
    scrim: "bc-media-scrim--3",
    imagePosition: "center 52%",
  },
  {
    label: "Dasbor Murid",
    desc: "Lihat pengalaman BahasaCerdas dari sisi murid.",
    href: "/murid/beranda",
    icon: GraduationCap,
    image: PHOTO.studentLearning,
    scrim: "bc-media-scrim--4",
    imagePosition: "center 42%",
  },
];

interface CompetitionData {
  myRank: number | null;
  myXp: number;
  participants: number;
}

/** Kartu dasar beranda guru — warna sepenuhnya dari token (terang & gelap). */
const CARD = "rounded-bc-card border border-bc-border bg-bc-surface shadow-bc-1";

function TeacherHero({
  greeting,
  fullName,
}: {
  greeting: string;
  fullName: string;
}) {
  return (
    <section className="bc-media min-h-[238px] rounded-bc-hero shadow-bc-2 sm:min-h-[286px]">
      <Image
        src={PHOTO.hero}
        alt=""
        fill
        priority
        sizes="(max-width: 1280px) 100vw, 850px"
        className="object-cover object-center"
      />
      <div className="bc-media-scrim" />

      <div className="relative z-10 flex min-h-[238px] max-w-[680px] flex-col justify-center px-5 py-6 sm:min-h-[286px] sm:px-9 sm:py-8">
        <span className="bc-media-chip mb-3 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-[.12em]">
          <Sparkles className="h-3.5 w-3.5" />
          RUANG KERJA GURU
        </span>
        <h1 className="bc-media-ink break-words text-[1.75rem] font-extrabold leading-[1.08] tracking-tight sm:text-[2.55rem] sm:leading-[1.06]">
          {greeting}, {fullName}
        </h1>
        <p className="bc-media-ink-2 mt-3 max-w-[510px] text-sm leading-relaxed sm:text-base">
          Mulai dari hal yang paling penting hari ini. BahasaCerdas membantu pekerjaan mengajar tetap ringkas dan terarah.
        </p>
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
    <section className={`${CARD} p-4 sm:p-5`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-bc-icon bg-bc-aud-soft text-bc-aud">
            <Award className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-bold text-bc-text">Misi Hari Ini</h2>
            <p className="mt-0.5 text-xs text-bc-text-2">Fokus ringkas dari misi minggu ini.</p>
          </div>
        </div>
        {status ? (
          <span className="shrink-0 rounded-full bg-bc-aud-soft px-2.5 py-1 text-[11px] font-bold text-bc-aud">
            {status.totalSelesai}/{status.totalMisi}
          </span>
        ) : null}
      </div>

      {!status ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-bc-tile bg-bc-surface-2" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {focus.map((config) => {
            const state = status.misi.find((item) => item.id === config.id);
            const done = state?.selesai ?? false;
            return (
              <Link
                key={config.id}
                href={config.href}
                className="group flex min-h-14 items-center gap-3 rounded-bc-tile border border-bc-border bg-bc-surface-2 px-3 py-2.5 transition-colors hover:border-bc-aud/40"
              >
                {done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-bc-aud" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-bc-text-3" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-bc-text">{config.label}</span>
                  <span className="block text-[11px] text-bc-text-2">+{config.xp} XP</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-bc-text-3 transition-transform group-hover:translate-x-0.5 group-hover:text-bc-aud" />
              </Link>
            );
          })}
        </div>
      )}

      <Link
        href="/guru/game/achievement"
        className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-bc-aud hover:underline"
      >
        Lihat semua misi <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

function QuickActions() {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-bc-text">Mulai aktivitas</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="bc-media group min-h-[142px] rounded-bc-card shadow-bc-1 transition-transform duration-200 hover:-translate-y-0.5 sm:min-h-[168px]"
            >
              <Image
                src={action.image}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1280px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                style={{ objectPosition: action.imagePosition ?? "center" }}
              />
              <div className={`bc-media-scrim ${action.scrim}`} />
              <div className="relative z-10 flex h-full min-h-[142px] flex-col p-3 sm:min-h-[168px] sm:p-4">
                <span className="bc-media-chip grid h-9 w-9 place-items-center rounded-bc-icon sm:h-10 sm:w-10">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="mt-auto pt-3 sm:pt-5">
                  <div className="flex items-end justify-between gap-2 sm:gap-3">
                    <div className="min-w-0">
                      <h3 className="bc-media-ink text-sm font-extrabold leading-tight sm:text-base">{action.label}</h3>
                      <p className="bc-media-ink-2 mt-1 hidden max-w-[220px] text-xs leading-relaxed sm:block">
                        {action.desc}
                      </p>
                    </div>
                    <span className="bc-media-cta grid h-7 w-7 shrink-0 place-items-center rounded-full transition-transform group-hover:translate-x-0.5 sm:h-8 sm:w-8">
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

/** Pengumuman bergambar Main Bersama (foto kelas) — dipulihkan atas keputusan founder. */
function MainBersamaAnnouncement() {
  return (
    <section className="overflow-hidden rounded-bc-card border border-bc-border bg-bc-surface shadow-bc-1">
      <div className="border-b border-bc-border px-5 py-3.5">
        <p className="text-sm font-bold text-bc-text">Pengumuman Terbaru</p>
      </div>
      <div className="bc-media bc-media--flush min-h-[240px] sm:min-h-[260px]">
        <Image
          src={PHOTO.classroom}
          alt="Suasana kelas dengan pembelajaran digital"
          fill
          sizes="(max-width: 1280px) 100vw, 760px"
          className="object-cover object-center"
        />
        <div className="bc-media-scrim bc-media-scrim--side" />
        <div className="relative z-10 flex min-h-[240px] max-w-[560px] flex-col justify-center p-5 sm:min-h-[260px] sm:p-7">
          <span className="bc-media-chip mb-3 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-[.12em]">
            <MonitorPlay className="h-3.5 w-3.5" /> FITUR UNGGULAN
          </span>
          <h2 className="bc-media-ink text-2xl font-extrabold sm:text-3xl">Kenalkan Main Bersama</h2>
          <p className="bc-media-ink-2 mt-2 max-w-[470px] text-sm leading-relaxed">
            Gunakan kuis interaktif untuk membuat seluruh kelas belajar, bergerak, dan merespons bersama.
          </p>
          <Link
            href="/guru/game/main-bersama"
            className="bc-media-cta mt-5 inline-flex min-h-11 w-fit items-center gap-2 rounded-bc-ctl px-4 py-2.5 text-sm font-bold shadow-bc-2"
          >
            Jelajahi Main Bersama <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Ringkasan peringkat mingguan; papan lengkap ada di /guru/game/leaderboard. */
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
    <section className={`${CARD} p-4 sm:p-5`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-bc-icon bg-bc-aud-soft text-bc-aud">
            <Trophy className="h-5 w-5" />
          </span>
          <h2 className="font-bold text-bc-text">Kompetisi Guru</h2>
        </div>
        <span className="shrink-0 rounded-full bg-bc-surface-2 px-2.5 py-1 text-[10px] font-bold text-bc-text-2">
          MINGGU INI
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3 rounded-bc-tile bg-bc-surface-2 p-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.12em] text-bc-text-3">Peringkat Anda</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-bc-text">
            {data?.myRank ? `#${data.myRank}` : "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-bc-aud">{data ? data.myXp.toLocaleString("id-ID") : "—"} XP</p>
          <p className="text-[11px] text-bc-text-3">
            {data?.participants ? `${data.participants} guru` : "Peringkat mingguan"}
          </p>
        </div>
      </div>
      <Link
        href="/guru/game/leaderboard"
        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-bc-aud hover:underline"
      >
        Lihat Papan Peringkat <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

/** Quote mingguan di atas foto hero (dipulihkan; tampil sm+ seperti sebelum #171). */
function QuoteCard() {
  const quote = getWeeklyTeacherQuote();
  return (
    <section className="bc-media min-h-[220px] rounded-bc-card p-5 shadow-bc-1">
      <Image
        src={PHOTO.hero}
        alt=""
        fill
        sizes="(max-width: 1280px) 100vw, 420px"
        className="object-cover"
        style={{ objectPosition: "center 42%" }}
      />
      <div className="bc-media-scrim bc-media-scrim--quote" />
      <div className="relative z-10">
        <div className="flex items-center gap-2">
          <Quote className="bc-media-ink-2 h-5 w-5" />
          <h2 className="bc-media-ink text-sm font-bold">Quote Minggu Ini</h2>
        </div>
        <blockquote className="bc-media-ink mt-5 text-base font-semibold leading-relaxed">
          “{quote.text}”
        </blockquote>
        <p className="bc-media-ink-2 mt-4 text-xs font-medium">— {quote.source}</p>
      </div>
    </section>
  );
}

function TipCard() {
  const tip = getDailyTeacherTip();
  return (
    <section className={`${CARD} p-4 sm:p-5`}>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-bc-icon bg-bc-aud-soft text-bc-aud">
          <Lightbulb className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-bold text-bc-text">Tips Mengajar</h2>
          <p className="text-[10px] font-semibold uppercase tracking-[.1em] text-bc-text-3">Hari ini</p>
        </div>
      </div>
      <h3 className="mt-4 text-sm font-bold text-bc-text">{tip.title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-bc-text-2">{tip.body}</p>
    </section>
  );
}

export default function TeacherHomeV3({
  greeting,
  fullName,
  misiStatus,
  userKey = null,
}: {
  greeting: string;
  fullName: string;
  misiStatus: MisiGuruStatus | null;
  /** Kunci per pengguna untuk mengingat banner JUMPA yang ditutup. */
  userKey?: string | null;
}) {
  // Urutan: sapaan + misi → JUMPA → pintasan → promo → pengumuman/kompetisi → karya → lencana/quote/tips.
  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-5 sm:space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,.7fr)]">
        <TeacherHero greeting={greeting} fullName={fullName} />
        <DailyMissionCard status={misiStatus} />
      </div>

      {/* JUMPA: banner peluncuran (bisa ditutup) + kartu tetap; tersembunyi bila flag mati */}
      <JumpaLaunchBanner userKey={userKey} />
      <JumpaBerandaCard role="GURU" />

      <QuickActions />

      <BannerProgramGuruCerdas />

      <div className="grid grid-cols-1 items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.52fr)_minmax(310px,.58fr)]">
        <MainBersamaAnnouncement />
        <CompetitionCard />
      </div>

      <GuruBerkarya misiStatus={misiStatus} compact />

      <div className="grid grid-cols-1 items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,.6fr)]">
        <GuruBadgeGrid compact />
        <div className="space-y-4 sm:space-y-5">
          <div className="hidden sm:block">
            <QuoteCard />
          </div>
          <TipCard />
        </div>
      </div>
    </div>
  );
}
