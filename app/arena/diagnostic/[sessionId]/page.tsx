"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Flag, GraduationCap, Loader2, Sparkles, Target, Trophy, XCircle } from "lucide-react";

interface DiagnosticQuestion {
  id: string;
  text: string;
  passage?: string | null;
  audioUrl?: string | null;
  options: string[];
  questionType: string;
  topic: string | null;
  skill: string | null;
  subskill: string | null;
  difficulty: string | null;
}

interface DiagnosticSkillResult {
  skill: string;
  label: string;
  attempts: number;
  correct: number;
  accuracy: number | null;
  category: "STRONG" | "DEVELOPING" | "WEAK" | "INSUFFICIENT_EVIDENCE";
  confidence?: "INSUFFICIENT_EVIDENCE" | "PROVISIONAL" | "PROFILE_CONFIDENT";
  band?: { minLevel: number; maxLevel: number } | null;
  evidenceCount?: number;
  strongestEvidence?: string | null;
  recommendation?: "EASY" | "MEDIUM" | "HARD" | null;
}

interface DiagnosticResult {
  overallAccuracy: number | null;
  perSkill: DiagnosticSkillResult[];
  strongest: string | null;
  weakest: string | null;
  developing: string[];
  insufficient: string[];
  confidence?: "INSUFFICIENT_EVIDENCE" | "PROVISIONAL" | "PROFILE_CONFIDENT";
  insightText?: string | null;
  placement: {
    band: "DASAR" | "MENENGAH" | "TINGGI";
    label: string;
    minLevel: number;
    maxLevel: number;
    provisional: boolean;
    note: string;
  } | null;
}

interface DiagnosticFallbackEntry {
  skill: string;
  label: string;
  requested: number;
  delivered: number;
  reason: "MISSING_CORPUS" | "DIFFICULTY_UNAVAILABLE" | "SEE_AGAIN";
  note: string;
}

interface AbilitySkillSummary {
  skill: string;
  label: string;
  attempts: number;
  accuracy: number | null;
  abilityBand: "DASAR" | "MENENGAH" | "TINGGI" | null;
  confidence: "NO_DATA" | "LOW" | "MEDIUM" | "HIGH";
  note: string | null;
}

interface AbilityProfileSummary {
  strongest: string[];
  focus: string[];
  insufficient: string[];
  overallConfidence: "NO_DATA" | "LOW" | "MEDIUM" | "HIGH";
  coverage: { skills: number; subskills: number; difficulties: number };
  profileVersion: string;
  skills: AbilitySkillSummary[];
}

interface DiagnosticSession {
  sessionId: string;
  source?: string;
  sourceLabel?: string;
  status: "IN_PROGRESS" | "COMPLETED";
  actionTitle?: string;
  reasonText: string;
  questions: DiagnosticQuestion[];
  result?: DiagnosticResult;
  abilityProfile?: AbilityProfileSummary | null;
  fallback?: boolean;
  fallbackReason?: string | null;
  adaptive?: boolean;
  sessionSize?: number;
  answeredCount?: number;
  remaining?: number;
  composition?: {
    requested?: { skill: string; label: string; count: number }[];
    delivered?: { skill: string; label: string; count: number; questionTypes: string[] }[];
    fallback?: DiagnosticFallbackEntry[];
    totalRequested?: number;
    totalDelivered?: number;
    difficultyPlan?: string[];
  };
}

const CATEGORY_META: Record<DiagnosticSkillResult["category"], { label: string; className: string }> = {
  STRONG: { label: "Kuat", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  DEVELOPING: { label: "Berkembang", className: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
  WEAK: { label: "Perlu Banyak Latihan", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  INSUFFICIENT_EVIDENCE: { label: "Belum Cukup Bukti", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
};

function ResultPanel({ result, abilityProfile, fallbackReason }: { result: DiagnosticResult; abilityProfile?: AbilityProfileSummary | null; fallbackReason?: string | null }) {
  const band = result.placement;
  const ability = abilityProfile ?? null;
  const abilityLabel = (skill: string): string =>
    ability?.skills.find((s) => s.skill === skill)?.label ?? skill;
  const confident = ability?.overallConfidence === "HIGH" || ability?.overallConfidence === "MEDIUM";
  return (
    <div className="space-y-5">
      {fallbackReason ? (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {fallbackReason}
        </div>
      ) : null}
      <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/10 text-violet-600 dark:text-violet-300">
            <GraduationCap size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">Hasil Tes Awal</p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Gambaran kemampuanmu hari ini</h2>
          </div>
        </div>

        {result.overallAccuracy === null ? (
          <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">
            Belum cukup jawaban untuk menyusun profil. Selesaikan semua butir tes untuk mendapatkan gambaran kemampuanmu.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Akurasi keseluruhan</p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{Math.round((result.overallAccuracy ?? 0) * 100)}%</p>
            </div>
            {band ? (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tingkat awal (sementara)</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-3xl font-bold text-violet-700 dark:text-violet-300">{band.label}</p>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                    L{band.minLevel}–L{band.maxLevel}
                  </span>
                  {band.provisional && <Flag size={15} className="text-amber-500" aria-label="Sementara" />}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{band.note}</p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Rincian per kemampuan</h3>
        <ul className="mt-4 space-y-3">
          {result.perSkill.map((skill) => {
            const meta = CATEGORY_META[skill.category];
            const recommendationLabel =
              skill.recommendation === "EASY" ? "mulai dari Mudah" :
              skill.recommendation === "MEDIUM" ? "lanjut di Sedang" :
              skill.recommendation === "HARD" ? "tantang di Sulit" : null;
            return (
              <li key={skill.skill} className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{skill.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {skill.evidenceCount ?? skill.attempts} butir dinilai · {skill.correct} benar
                    {skill.band ? ` · L${skill.band.minLevel}–L${skill.band.maxLevel}` : ""}
                    {recommendationLabel ? ` · ${recommendationLabel}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {skill.accuracy !== null && <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.round(skill.accuracy * 100)}%</span>}
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}>{meta.label}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {ability ? (
        <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <GraduationCap size={16} className="text-violet-500" /> Profil Awalmu
          </h3>
          <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Ini gambaran awal — akan semakin akurat setelah kamu berlatih.{" "}
            {ability.overallConfidence === "HIGH"
              ? "Kepercayaan BC terhadap profil ini sudah tinggi."
              : ability.overallConfidence === "MEDIUM"
                ? "Kepercayaan BC sedang — tambahkan latihan agar profil makin akurat."
                : "Kepercayaan BC masih rendah — butuh lebih banyak bukti."}
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {ability.strongest.length > 0 && (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Mulai kuat</span>
                <span className="text-slate-700 dark:text-slate-200">{ability.strongest.map(abilityLabel).join(", ")}</span>
              </li>
            )}
            {ability.focus.length > 0 && (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">Perlu dilatih</span>
                <span className="text-slate-700 dark:text-slate-200">{ability.focus.map(abilityLabel).join(", ")}</span>
              </li>
            )}
            {ability.insufficient.length > 0 && (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Belum terukur</span>
                <span className="text-slate-600 dark:text-slate-300">{ability.insufficient.map(abilityLabel).join(", ")}</span>
              </li>
            )}
          </ul>
          {!confident && (
            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
              Profil awal — akan semakin akurat setelah kamu berlatih.
            </p>
          )}
        </div>
      ) : null}

      {result.insightText ? (
        <div className="rounded-3xl border border-violet-200/70 bg-violet-50/60 p-6 dark:border-violet-900/60 dark:bg-violet-950/20">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Sparkles size={16} className="text-violet-500" /> Kesimpulan untukmu
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{result.insightText}</p>
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <Sparkles size={16} className="text-violet-500" /> Apa yang bisa kamu lakukan sekarang
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Hasil ini bersifat sementara dan hanya gambaran awal. Latihan rutin di Jalur Cerdas, kuis, dan karya akan
          memperbarui profil kemampuanmu seiring waktu.
        </p>
        {result.confidence === "PROFILE_CONFIDENT" ? (
          <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-300">
            Profilmu sudah cukup yakin dari latihan berulang — tetap diukur ulang secara berkala.
          </p>
        ) : null}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => window.location.assign("/murid/profile")} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 hover:shadow-xl">
            Lihat Perkembanganmu
            <ArrowRight size={16} />
          </button>
          <button type="button" onClick={() => window.location.assign("/arena/jalur-cerdas")} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-slate-800">
            Mulai Belajar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DiagnosticSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<DiagnosticSession | null>(null);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<boolean | null>(null);
  const [answer, setAnswer] = useState("");
  const [finalResult, setFinalResult] = useState<DiagnosticResult | null>(null);
  const [finalAbility, setFinalAbility] = useState<AbilityProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAdaptive, setPendingAdaptive] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/player/diagnostic?sessionId=${encodeURIComponent(sessionId)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        if (!alive) return;
        setSession(data);
if (data.status === "COMPLETED" && data.result) {
          setFinalResult(data.result);
          if (data.abilityProfile) setFinalAbility(data.abilityProfile);
        }
        setPendingAdaptive(Boolean(data.adaptive && data.status === "IN_PROGRESS" && (!data.questions || data.questions.length === 0) && data.remaining === 0));
      })
      .catch(() => alive && setError("Tes awal belum bisa dimuat."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [sessionId]);

  const question = session?.questions[index];

  const progressCount = session?.adaptive ? session.answeredCount ?? 0 : session ? index + 1 : 0;
  const progressTotal = session ? (session.adaptive ? (session.sessionSize ?? session.questions.length) : session.questions.length) : 1;

  async function submitAnswer(value: string | number) {
    if (!session || !question || submitting || result !== null || finalResult) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/player/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "answer", sessionId: session.sessionId, questionId: question.id, answer: value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Jawaban belum tersimpan.");
      setResult(Boolean(data.correct));
      if (data.adaptive) {
        if (data.nextQuestion) {
          setSession((previous) =>
            previous ? { ...previous, questions: [data.nextQuestion], answeredCount: (previous.answeredCount ?? 0) + 1, remaining: data.remaining } : previous
          );
          setIndex(0);
          setAnswer("");
        } else if (data.done || data.remaining === 0) {
          // Terminal (butir terakhir terjawab / generator+fallback habis):
          // alihkan ke layar "Sesi Selesai → Lihat Hasil" (pendingAdaptive).
          // Jangan biarkan index melampaui daftar soal — itu membuat murid
          // macet di layar kosong setelah soal 1.
          setSession((previous) =>
            previous ? { ...previous, questions: [], answeredCount: (previous.answeredCount ?? 0) + 1, remaining: 0 } : previous
          );
          setIndex(0);
          setAnswer("");
          setPendingAdaptive(true);
        }
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Jawaban belum tersimpan.");
    } finally {
      setSubmitting(false);
    }
  }

  async function nextQuestion() {
    if (!session) return;
    const lastQuestion = !session.adaptive ? index + 1 >= session.questions.length : Boolean(session.remaining === 0 || !session.questions[0]);
    if (lastQuestion) {
      try {
        const response = await fetch("/api/player/diagnostic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "complete", sessionId: session.sessionId }),
        });
        const data = await response.json();
        if (!response.ok && response.status !== 409) throw new Error(data.error || "Hasil belum tersimpan.");
        if (data.result) {
          setPendingAdaptive(false);
          setResult(null); // hasil sudah ada — jangan biarkan panel umpan balik menyembunyikan ResultPanel
          setFinalResult(data.result);
          if (data.abilityProfile) setFinalAbility(data.abilityProfile);
        }
      } catch (completeError) {
        setError(completeError instanceof Error ? completeError.message : "Hasil belum tersimpan.");
        return;
      }
      return;
    }
    if (session.adaptive) {
      // Mode adaptif: soal berikutnya SUDAH diganti ke questions[0] saat
      // jawaban dikirim — cukup tutup panel umpan balik, jangan setIndex(+1)
      // (index + 1 pada daftar satu butir = soal undefined = layar macet).
      setAnswer("");
      setResult(null);
      return;
    }
    setIndex((value) => value + 1);
    setAnswer("");
    setResult(null);
  }

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-violet-600" /></div>;
  }

  if (pendingAdaptive) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-6 md:py-10">
        <div className="flex items-center justify-between gap-3 mb-8">
          <button type="button" onClick={() => router.push("/murid/beranda")} className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" aria-label="Kembali ke Beranda">
            <ArrowLeft size={20} />
          </button>
          <div className="text-center min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">Tes Awal</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">Sesi Selesai</p>
          </div>
          <span className="text-xs text-slate-500">{session?.answeredCount ?? 0}/{session?.sessionSize ?? "?"}</span>
        </div>
        <section className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 md:p-8">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Jawabanmu sudah tercatat. Lihat hasil kemampuanmu sekarang.
          </p>
          <button type="button" onClick={nextQuestion} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700">
            Lihat Hasil
            <ArrowRight size={16} />
          </button>
        </section>
      </main>
    );
  }

  if (error || !session || !question) {
    if (error?.startsWith("Tes awal")) {
      return (
        <div className="mx-auto max-w-lg py-20 px-5 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
          <button type="button" onClick={() => router.push("/murid/beranda")} className="mt-4 text-sm font-semibold text-violet-600 hover:underline">
            Kembali ke Beranda
          </button>
        </div>
      );
    }
    if (finalResult && result === null) {
      return (
        <main className="mx-auto max-w-2xl px-5 py-6 md:py-10">
          <div className="mb-8 flex items-center justify-between gap-3">
            <button type="button" onClick={() => router.push("/murid/beranda")} className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" aria-label="Kembali ke Beranda">
              <ArrowLeft size={20} />
            </button>
            <div className="text-center min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">Tes Awal</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">Hasil Tes Awal</p>
            </div>
          </div>
          <ResultPanel result={finalResult} abilityProfile={finalAbility} fallbackReason={session?.fallbackReason} />
        </main>
      );
    }
    return (
      <div className="mx-auto max-w-lg py-20 px-5 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-300">{error || "Tes awal tidak tersedia."}</p>
        <button type="button" onClick={() => router.push("/murid/beranda")} className="mt-4 text-sm font-semibold text-violet-600 hover:underline">
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  if (finalResult) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-6 md:py-10">
        <div className="mb-8 flex items-center justify-between gap-3">
          <button type="button" onClick={() => router.push("/murid/beranda")} className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" aria-label="Kembali ke Beranda">
            <ArrowLeft size={20} />
          </button>
          <div className="text-center min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">Tes Awal</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">Hasil Tes Awal</p>
          </div>
          <span className="w-9" />
        </div>
        <ResultPanel result={finalResult} abilityProfile={finalAbility} fallbackReason={session?.fallbackReason} />
      </main>
    );
  }

  const percent = Math.round((Math.max(progressCount, 1) / Math.max(progressTotal, 1)) * 100);
  const currentSkill = question.skill ? ({
    READING: "Membaca",
    WRITING: "Menulis",
    LISTENING: "Mendengarkan",
    SPEAKING: "Berbicara",
    GRAMMAR: "Tata Bahasa",
    VOCABULARY: "Kosakata",
    LITERATURE: "Sastra",
  } as Record<string, string>)[question.skill] ?? question.skill : null;

  return (
    <main className="relative min-h-[calc(100vh-80px)] overflow-hidden px-4 py-5 sm:px-6 md:py-8">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-violet-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl" />

      <div className="relative mx-auto max-w-3xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button type="button" onClick={() => router.push("/murid/beranda")} className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:text-white" aria-label="Kembali ke Beranda">
            <ArrowLeft size={15} /> Beranda
          </button>
          <div className="flex items-center gap-2">
            {session.sourceLabel && (
              <span className="hidden rounded-full bg-cyan-500/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-300 sm:inline-flex">
                {session.sourceLabel}
              </span>
            )}
            <span className="rounded-full bg-violet-500/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">
              Tes Awal
            </span>
          </div>
        </div>

        <section className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/90 shadow-[0_24px_80px_-36px_rgba(76,29,149,0.35)] backdrop-blur-xl dark:border-white/10 dark:bg-[#111a32]/90">
          <div className="border-b border-slate-200/70 px-5 py-4 dark:border-white/10 sm:px-7">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
                  <Target size={13} /> {session.actionTitle || "Kenali Kemampuanmu"}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Jawab sebisamu — ini bukan ujian nilai.</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-black text-slate-900 dark:text-white">{Math.min(progressCount, progressTotal)}/{progressTotal}</p>
                <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-slate-400"><Clock3 size={11} /> ±5–8 menit</p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 shadow-[0_0_12px_rgba(139,92,246,0.35)] transition-all duration-500" style={{ width: `${percent}%` }} />
            </div>
          </div>

          <div className="p-5 sm:p-7 md:p-9">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {currentSkill && (
                <span className="rounded-full bg-violet-500/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-violet-700 dark:text-violet-300">
                  {currentSkill}
                </span>
              )}
              {question.difficulty && (
                <span className="rounded-full bg-amber-400/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-amber-700 dark:text-amber-300">
                  {question.difficulty === "EASY" ? "Pemanasan" : question.difficulty === "HARD" ? "Tantangan" : "Sedang"}
                </span>
              )}
              <span className="ml-auto hidden items-center gap-1 text-[10px] font-semibold text-slate-400 sm:inline-flex">
                <Sparkles size={12} /> Setiap jawaban membantu BC mengenalimu
              </span>
            </div>

            <p className="mb-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{session.reasonText}</p>

            {question.audioUrl && (
              <div className="mb-5 rounded-2xl border border-cyan-200/70 bg-cyan-50/70 p-3 dark:border-cyan-900/50 dark:bg-cyan-950/20">
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-300">
                  Dengarkan audio soal
                </p>
                <audio controls preload="none" className="h-10 w-full">
                  <source src={question.audioUrl} />
                  Browser kamu belum mendukung pemutar audio.
                </audio>
              </div>
            )}

            {question.passage && (
              <div className="mb-5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Bacaan</p>
                <p className="whitespace-pre-line text-sm leading-6 text-slate-700 dark:text-slate-300">{question.passage}</p>
              </div>
            )}

            <h1 className="max-w-2xl text-2xl font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-[28px]">
              {question.text}
            </h1>

            {question.options.length > 0 ? (
              <div className="mt-7 grid gap-3">
                {question.options.map((option, optionIndex) => (
                  <button
                    key={`${question.id}-${optionIndex}`}
                    type="button"
                    disabled={submitting || result !== null}
                    onClick={() => submitAnswer(optionIndex)}
                    className="group flex w-full items-start gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-4 text-left text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50/70 hover:shadow-md disabled:cursor-default disabled:hover:translate-y-0 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:border-violet-400/50 dark:hover:bg-violet-500/[0.08]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-500 transition-colors group-hover:bg-violet-600 group-hover:text-white dark:bg-white/10 dark:text-slate-300">
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    <span className="pt-1 leading-5">{option}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-7 flex flex-col gap-2 sm:flex-row">
                <input value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={result !== null || submitting} className="min-h-12 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-white/[0.03]" placeholder="Tulis jawabanmu" />
                <button type="button" onClick={() => submitAnswer(answer)} disabled={!answer.trim() || submitting || result !== null} className="min-h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 text-sm font-extrabold text-white shadow-lg disabled:opacity-50">Kirim Jawaban</button>
              </div>
            )}

            {submitting && result === null && (
              <p role="status" className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3 text-xs font-semibold text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-300">
                <Loader2 size={15} className="animate-spin" aria-hidden />
                Menyimpan jawaban dan menyiapkan langkah berikutnya…
              </p>
            )}

            {result !== null && (
              <div className={`mt-6 rounded-2xl border px-4 py-4 text-sm ${result ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200" : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"}`}>
                <div className="flex items-center gap-2 font-extrabold">
                  {result ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  {result ? "Mantap! Jawabanmu tepat." : "Belum tepat — tidak apa-apa, ini membantu BC mengenalimu."}
                </div>
                <button type="button" onClick={nextQuestion} className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/70 px-3.5 py-2 text-xs font-extrabold shadow-sm underline-offset-4 hover:underline dark:bg-black/10">
                  {!session.adaptive ? (index + 1 >= session.questions.length ? "Lihat Hasil" : "Soal Berikutnya") : (session.remaining === 0 || !session.questions[0] ? "Lihat Hasil" : "Soal Berikutnya")}
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </section>

        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
          <Trophy size={12} /> Setelah selesai, hasilmu masuk ke Perkembanganmu di Profil.
        </div>
      </div>
    </main>
  );
}