"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, BookOpen, CheckCircle2, ChevronRight, Flame, PenLine, Sparkles, Target, TrendingUp } from "lucide-react";
import type { LearnerSkillState } from "@/lib/learner-state/types";

const LABEL: Record<string, string> = {
  READING: "Membaca",
  WRITING: "Menulis",
  LISTENING: "Mendengarkan",
  SPEAKING: "Berbicara",
  GRAMMAR: "Tata Bahasa",
  VOCABULARY: "Kosakata",
  LITERATURE: "Sastra",
};

const TREND: Record<string, string> = {
  IMPROVING: "Meningkat",
  STABLE: "Stabil",
  DECLINING: "Perlu perhatian",
  INSUFFICIENT_DATA: "Belum cukup bukti",
};

type BaselineData = {
  status: string;
  answeredCount?: number;
  totalQuestions?: number;
  result?: {
    objectiveAccuracy: number | null;
    writing?: { level?: "AWAL" | "BERKEMBANG" | "KUAT"; wordCount?: number } | null;
  } | null;
};

function writingLabel(level?: string) {
  if (level === "KUAT") return "Kuat";
  if (level === "BERKEMBANG") return "Berkembang";
  if (level === "AWAL") return "Awal";
  return "Belum ada data";
}

export default function ProgresPage() {
  const [skills, setSkills] = useState<LearnerSkillState[]>([]);
  const [baseline, setBaseline] = useState<BaselineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/player/learner-state"),
      fetch("/api/player/diagnostic/baseline"),
    ])
      .then(async ([skillsRes, baselineRes]) => {
        if (!active) return;
        if (!skillsRes.ok) throw new Error("gagal");
        const skillsData = await skillsRes.json();
        setSkills(skillsData.skills ?? []);
        if (baselineRes.ok) setBaseline(await baselineRes.json());
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const withEvidence = useMemo(
    () => skills.filter((item) => item.attemptCount > 0 && item.accuracy !== null),
    [skills],
  );
  const totalAttempts = skills.reduce((sum, item) => sum + item.attemptCount, 0);
  const totalCorrect = skills.reduce((sum, item) => sum + item.correctCount, 0);
  const overallAccuracy = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : null;
  const improving = skills.filter((item) => item.trend === "IMPROVING").length;

  const orderedSkills = useMemo(() => {
    const order = ["READING", "GRAMMAR", "VOCABULARY", "LITERATURE", "WRITING", "LISTENING", "SPEAKING"];
    return order.map((id) => skills.find((item) => item.skill === id)).filter(Boolean) as LearnerSkillState[];
  }, [skills]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Perkembanganmu</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Pantau perjalanan belajarmu dari waktu ke waktu.</p>
        </div>
        <div className="h-52 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  if (failed) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Perkembanganmu</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Pantau perjalanan belajarmu dari waktu ke waktu.</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-400/20 dark:bg-rose-400/[0.06]">
          <p className="font-bold text-rose-800 dark:text-rose-200">Data kemampuan belum dapat dimuat.</p>
          <p className="mt-2 text-sm text-rose-700/70 dark:text-rose-200/60">Coba muat ulang halaman. Data belajarmu tetap tersimpan.</p>
          <button onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white">Muat ulang</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Perkembanganmu</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Pantau perjalanan belajarmu dari waktu ke waktu.</p>
      </div>

      <section className="overflow-hidden rounded-3xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-6 shadow-sm dark:border-white/10 dark:from-[#111a32] dark:via-[#10182d] dark:to-[#0d2138]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-violet-700 dark:text-violet-300">
            <Sparkles size={17} />
            <span className="text-[10px] font-black uppercase tracking-[.18em]">Gambaran kemampuan</span>
          </div>
          {baseline?.status === "DONE" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={13} /> Tes awal selesai
            </span>
          )}
        </div>
        <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">Kemampuanmu mulai terbaca.</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300/75">
          Hasil tes awal menjadi titik awal. Setiap latihan berikutnya akan menambah bukti sehingga gambaran kemampuanmu makin akurat.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white/75 p-4 dark:bg-white/[.05]">
            <BookOpen className="h-4 w-4 text-violet-500" />
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{totalAttempts}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Jawaban tercatat</p>
          </div>
          <div className="rounded-2xl bg-white/75 p-4 dark:bg-white/[.05]">
            <Target className="h-4 w-4 text-cyan-500" />
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{withEvidence.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Kemampuan terukur</p>
          </div>
          <div className="rounded-2xl bg-white/75 p-4 dark:bg-white/[.05]">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{overallAccuracy === null ? "—" : \`\${overallAccuracy}%\`}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ketepatan keseluruhan</p>
          </div>
          <div className="rounded-2xl bg-white/75 p-4 dark:bg-white/[.05]">
            <PenLine className="h-4 w-4 text-fuchsia-500" />
            <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{writingLabel(baseline?.result?.writing?.level)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Kemampuan menulis</p>
          </div>
        </div>
      </section>

      {baseline?.status === "DONE" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">Hasil tes awal</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {baseline.answeredCount ?? 0} dari {baseline.totalQuestions ?? 0} soal objektif selesai, ditambah satu tugas menulis.
              </p>
            </div>
            <Link href="/murid/tes-awal" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5">
              Lihat hasil <ChevronRight size={14} />
            </Link>
          </div>
        </section>
      )}

      {withEvidence.length > 0 ? (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/50">
            <div className="mb-5 flex items-center gap-2">
              <BarChart3 size={18} className="text-violet-500" />
              <h2 className="font-bold text-slate-900 dark:text-white">Kemampuan bahasa</h2>
            </div>
            <div className="space-y-5">
              {orderedSkills.map((skill) => {
                const has = skill.attemptCount > 0 && skill.accuracy !== null;
                const value = has ? Math.round((skill.accuracy ?? 0) * 100) : 0;
                return (
                  <div key={skill.skill}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-800 dark:text-white/90">{LABEL[skill.skill]}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{has ? \`\${value}%\` : "Belum ada bukti"}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500" style={{ width: \`\${value}%\` }} />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{has ? TREND[skill.trend] : "Belum ada data"}</span>
                      <span>{skill.attemptCount > 0 ? \`\${skill.attemptCount} jawaban\` : "Belum berlatih"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/50">
            <div className="mb-4 flex items-center gap-2">
              <Flame size={18} className="text-amber-500" />
              <h2 className="font-bold text-slate-900 dark:text-white">Yang perlu kamu tahu</h2>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl bg-violet-50 p-4 dark:bg-violet-400/[0.06]">
                <p className="text-xs font-bold text-violet-700 dark:text-violet-300">Titik awal</p>
                <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">Hasil tes awal adalah gambaran awal, bukan penilaian akhir kemampuanmu.</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-400/[0.06]">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Perkembangan</p>
                <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                  {improving > 0 ? \`\${improving} kemampuan menunjukkan arah perkembangan.\` : "Arah perkembangan akan terlihat setelah bukti latihan terkumpul lebih banyak."}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-4 dark:bg-amber-400/[0.06]">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300">Ketelitian data</p>
                <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">Semakin sering kamu belajar, semakin kuat dasar pembacaan kemampuanmu.</p>
              </div>
            </div>
          </aside>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-slate-900/50">
          <BarChart3 size={32} className="mx-auto text-violet-300" />
          <h3 className="mt-3 font-bold text-slate-800 dark:text-white">Belum ada bukti belajar</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">Mulai dari tes awal atau lanjutkan latihan. Setiap jawaban yang kamu kerjakan akan membantu membentuk gambaran perkembanganmu.</p>
          <Link href="/murid/tes-awal" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700">Buka Tes Awal <ChevronRight size={15} /></Link>
        </section>
      )}
    </div>
  );
}
