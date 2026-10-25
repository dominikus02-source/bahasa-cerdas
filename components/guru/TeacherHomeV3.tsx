"use client";

import JumpaLaunchBanner from "@/components/jumpa/JumpaLaunchBanner";
import JumpaBerandaCard from "@/components/jumpa/JumpaBerandaCard";
import { useEffect, useMemo, useState } from "react";
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

type QuickAction = {
  label: string;
  desc: string;
  href: string;
  icon: LucideIcon;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Main Bersama",
    desc: "Ajak kelas belajar secara interaktif.",
    href: "/guru/game/main-bersama",
    icon: Users,
  },
  {
    label: "Buat Karya",
    desc: "Tulis artikel, puisi, atau karya pembelajaran.",
    href: "/guru/artikel",
    icon: FilePenLine,
  },
  {
    label: "NARA",
    desc: "Rekan Anda untuk ide dan persiapan mengajar.",
    href: "/guru/ai-bc",
    icon: Bot,
  },
  {
    label: "Dasbor Murid",
    desc: "Lihat pengalaman BahasaCerdas dari sisi murid.",
    href: "/murid/beranda",
    icon: GraduationCap,
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
  const quote = getWeeklyTeacherQuote();
  return (
    <section className="relative overflow-hidden rounded-bc-hero border border-bc-border bg-bc-aud-soft px-5 py-6 shadow-bc-1 sm:px-8 sm:py-8">
      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-bc-surface px-3 py-1 text-[11px] font-bold tracking-[.12em] text-bc-aud">
        <Sparkles className="h-3.5 w-3.5" />
        RUANG KERJA GURU
      </span>
      <h1 className="mt-3 break-words text-[1.7rem] font-extrabold leading-tight tracking-tight text-bc-text sm:text-[2.3rem]">
        {greeting}, {fullName}
      </h1>
      <p className="mt-2 max-w-[560px] text-sm leading-relaxed text-bc-text-2 sm:text-base">
        Mulai dari hal yang paling penting hari ini. BahasaCerdas membantu pekerjaan mengajar tetap ringkas dan terarah.
      </p>
      <figure className="mt-5 hidden max-w-[560px] border-l-[3px] border-bc-aud pl-4 sm:block">
        <figcaption className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.1em] text-bc-aud">
          <Quote className="h-3.5 w-3.5" /> Quote Minggu Ini
        </figcaption>
        <blockquote className="mt-1.5 text-sm font-medium leading-relaxed text-bc-text">
          “{quote.text}”
        </blockquote>
        <p className="mt-1 text-xs text-bc-text-3">— {quote.source}</p>
      </figure>
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
              className={`${CARD} group flex min-h-[112px] flex-col p-3.5 transition-colors hover:border-bc-aud/50 sm:p-4`}
            >
              <span className="grid h-10 w-10 place-items-center rounded-bc-icon bg-bc-aud-soft text-bc-aud">
                <Icon className="h-5 w-5" />
              </span>
              <span className="mt-auto flex items-center justify-between gap-2 pt-3">
                <span className="min-w-0 text-sm font-bold leading-tight text-bc-text sm:text-base">{action.label}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-bc-text-3 transition-transform group-hover:translate-x-0.5 group-hover:text-bc-aud" />
              </span>
              <span className="mt-1 hidden text-xs leading-relaxed text-bc-text-2 sm:block">{action.desc}</span>
            </Link>
          );
        })}
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
  // Urutan: sapaan + misi → JUMPA → pintasan → promo → karya → lencana/kompetisi/tips.
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

      <GuruBerkarya misiStatus={misiStatus} compact />

      <div className="grid grid-cols-1 items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,.6fr)]">
        <GuruBadgeGrid compact />
        <div className="space-y-4 sm:space-y-5">
          <CompetitionCard />
          <TipCard />
        </div>
      </div>
    </div>
  );
}
