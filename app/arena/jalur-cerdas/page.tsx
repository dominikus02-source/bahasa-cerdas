import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { JalurPeta } from "@/components/arena/JalurPeta";
import { ArrowRight, BookOpenCheck, CheckCircle2, Crown, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { UnitIcon } from "@/components/arena/UnitIcon";

export const dynamic = "force-dynamic";

export default async function JalurCerdasPage() {
  const user = await getUser();
  if (!user) redirect("/arena/login");

  const [levels, progress] = await Promise.all([
    db.learningLevel.findMany({
      where: { type: "JALUR" },
      orderBy: { level: "asc" },
      include: {
        units: {
          where: { isActive: true },
          orderBy: { order: "asc" },
        },
      },
    }),
    db.userUnitProgress.findMany({ where: { userId: user.id } }),
  ]);

  const completedMap = new Map(progress.filter((p) => p.completed).map((p) => [p.unitId, p]));
  const hasProgress = (unitId: string) => progress.some((p) => p.unitId === unitId);
  const totalUnits = levels.reduce((sum, level) => sum + level.units.length, 0);
  const totalDone = levels.reduce(
    (sum, level) => sum + level.units.filter((unit) => completedMap.has(unit.id)).length,
    0,
  );
  const allDone = totalUnits > 0 && totalDone === totalUnits;
  const progressPct = totalUnits ? Math.round((totalDone / totalUnits) * 100) : 0;

  const questionCounts = new Map<string, number>();
  let totalQuestions = 0;

  for (const level of levels) {
    for (const unit of level.units) {
      let count = 0;
      try {
        const content = unit.content ? JSON.parse(unit.content) : null;
        count = Array.isArray(content?.questions) ? content.questions.length : 0;
      } catch {
        count = 0;
      }
      questionCounts.set(unit.id, count);
      totalQuestions += count;
    }
  }

  const activeUnit =
    levels.flatMap((level) => level.units).find((unit) => !completedMap.has(unit.id)) ?? null;

  return (
    <main className="min-h-screen bg-[#f5f7fc] pb-12 dark:bg-[#071126]">
      <section className="relative overflow-hidden bg-[#08142f] px-4 pb-8 pt-5 text-white sm:px-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-5xl">
          <Link
            href="/arena"
            className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-blue-100/65 transition hover:text-white"
          >
            ← Arena
          </Link>

          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200 ring-1 ring-cyan-200/15">
                  <Sparkles size={12} />
                  Latihan unggulan
                </span>
                <span className="rounded-full bg-white/8 px-3 py-1.5 text-[10px] font-bold text-blue-100/70 ring-1 ring-white/10">
                  Bahasa Indonesia
                </span>
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Jalur Cerdas
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/75 sm:text-base">
                Perjalanan belajar yang bertahap: pahami konsep, lihat contoh, lalu buktikan
                kemampuanmu lewat latihan.
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold text-blue-100/75">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/7 px-3 py-2 ring-1 ring-white/10">
                  <Target size={13} className="text-cyan-300" />
                  12 level
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/7 px-3 py-2 ring-1 ring-white/10">
                  <BookOpenCheck size={13} className="text-violet-300" />
                  {totalUnits} unit
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/7 px-3 py-2 ring-1 ring-white/10">
                  <Zap size={13} className="text-amber-300" />
                  {totalQuestions} soal
                </span>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/7 p-4 shadow-2xl backdrop-blur-sm sm:min-w-[260px]">
              <div className="flex items-center gap-4">
                <div
                  className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(#67e8f9 ${progressPct * 3.6}deg, rgba(255,255,255,.10) 0deg)`,
                  }}
                >
                  <div className="flex h-[62px] w-[62px] items-center justify-center rounded-full bg-[#0b1938]">
                    <span className="text-lg font-black">{progressPct}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-100/50">
                    Perjalananmu
                  </p>
                  <p className="mt-1 text-lg font-extrabold">
                    {totalDone} <span className="text-blue-100/45">/ {totalUnits}</span>
                  </p>
                  <p className="text-xs text-blue-100/60">unit selesai</p>
                </div>
              </div>

              {activeUnit && (
                <Link
                  href={`/arena/jalur-cerdas/${activeUnit.id}`}
                  className="mt-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-cyan-300 to-violet-400 px-4 py-3 text-sm font-black text-[#071126] transition hover:brightness-105"
                >
                  <span className="truncate pr-3">Lanjutkan perjalanan</span>
                  <ArrowRight size={17} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        {!allDone && activeUnit && (
          <section className="mb-7 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_18px_50px_-30px_rgba(15,23,42,.35)] dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center gap-4 p-5 sm:p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-500 shadow-lg shadow-violet-500/15">
                <UnitIcon emoji={activeUnit.emoji} className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-500">
                  Langkah berikutnya
                </p>
                <h2 className="mt-1 truncate text-base font-extrabold text-slate-900 dark:text-white">
                  {activeUnit.title}
                </h2>
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  {activeUnit.subtitle || "Lanjutkan latihanmu."}
                </p>
              </div>
              <Link
                href={`/arena/jalur-cerdas/${activeUnit.id}`}
                className="hidden shrink-0 items-center gap-2 rounded-xl bg-[#0b1938] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-violet-700 sm:inline-flex"
              >
                Mulai <ArrowRight size={15} />
              </Link>
            </div>
          </section>
        )}

        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-500">
              Peta perjalanan
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Dari dasar sampai mahir
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {totalDone}/{totalUnits} selesai
          </span>
        </div>

        <div className="space-y-6">
          {levels.map((level) => {
            const completedInLevel = level.units.filter((unit) => completedMap.has(unit.id)).length;
            const levelPct = level.units.length
              ? Math.round((completedInLevel / level.units.length) * 100)
              : 0;
            const levelDone = level.units.length > 0 && completedInLevel === level.units.length;

            return (
              <section
                key={level.id}
                className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_50px_-35px_rgba(15,23,42,.35)] dark:border-white/8 dark:bg-slate-900"
              >
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/6 sm:px-6">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${level.color || "from-violet-500 to-purple-600"} text-white shadow-lg`}
                  >
                    {levelDone ? <Trophy size={21} /> : <UnitIcon emoji={level.emoji} className="h-6 w-6" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 dark:text-white">
                        Level {level.level} · {level.title}
                      </h3>
                      {levelDone && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <CheckCircle2 size={11} />
                          Selesai
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{level.subtitle}</p>
                  </div>

                  <div className="hidden text-right sm:block">
                    <p className="text-xs font-black text-slate-700 dark:text-slate-200">
                      {completedInLevel}/{level.units.length}
                    </p>
                    <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
                        style={{ width: `${levelPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="px-3 py-5 sm:px-5 sm:py-6">
                  <JalurPeta
                    units={level.units}
                    completedIds={new Set(completedMap.keys())}
                    questionCounts={questionCounts}
                    sedangDipelajari={hasProgress}
                  />
                </div>
              </section>
            );
          })}
        </div>

        {allDone && (
          <section className="mt-7 overflow-hidden rounded-[1.75rem] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-6 text-center shadow-lg dark:border-amber-800/60 dark:from-amber-950/30 dark:via-slate-900 dark:to-emerald-950/30 sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
              <Crown size={28} />
            </div>
            <h2 className="mt-4 text-xl font-black text-slate-900 dark:text-white">Jalur selesai.</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-600 dark:text-slate-300">
              Kamu sudah menuntaskan seluruh perjalanan. Saatnya menguji kemampuanmu di simulasi UKBI.
            </p>
            <Link
              href="/arena/simulasi/ukbi"
              className="mx-auto mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0b1938] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-violet-700"
            >
              Coba Simulasi UKBI
              <ArrowRight size={16} />
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
