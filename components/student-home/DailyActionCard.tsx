"use client";

import { useState, useEffect, useCallback } from "react";
import { Brain, CheckCircle, XCircle, Loader2, ChevronRight, ArrowRight, BookOpen, Target } from "lucide-react";
import type {
  DailyActionResponse,
  DailyActionPending,
  DailyActionCompleted,
  DailyActionAnswerResult,
} from "@/lib/daily-action";

/**
 * DailyActionCard — "Tantangan Bahasa Hari Ini"
 *
 * Displays on Student Home as a daily learning challenge.
 * Supports 3 question types:
 *   - PILIHAN_GANDA: A/B/C/D option buttons
 *   - BENAR_SALAH: Two big buttons (Benar / Salah)
 *   - ISIAN_SINGKAT: Text input for short answer
 *
 * States: LOADING → PENDING → SUBMITTING → COMPLETED (correct/incorrect)
 */
export function DailyActionCard() {
  const [action, setAction] = useState<DailyActionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [textInput, setTextInput] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DailyActionAnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skillHint, setSkillHint] = useState<string | null>(null);

  // Fetch today's action
  useEffect(() => {
    async function fetchAction() {
      try {
        const res = await fetch("/api/student/daily-action");
        if (!res.ok) throw new Error("Gagal memuat");
        const data: DailyActionResponse = await res.json();
        setAction(data);
        if (data.status === "PENDING") setSkillHint((data as DailyActionPending).skill ?? null);
      } catch {
        setError("Gagal memuat tantangan hari ini.");
      } finally {
        setLoading(false);
      }
    }
    fetchAction();
  }, []);

  // Submit answer
  const handleSubmit = useCallback(async () => {
    const answer = selectedAnswer.trim() || textInput.trim();
    if (!answer || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/student/daily-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal mengirim jawaban.");
      }

      const data: DailyActionAnswerResult = await res.json();
      setResult(data);
      // Track skill from result for post-answer CTA
      if (data.skill) setSkillHint(data.skill);

      // Update local state to COMPLETED
      setAction((prev) =>
        prev?.status === "PENDING"
          ? { ...prev, status: "COMPLETED", isCorrect: data.correct }
          : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }, [selectedAnswer, textInput, submitting]);

  // Parse options for display
  // Skill label mapping for display
  const SKILL_LABEL_MAP: Record<string, string> = {
    READING: "Membaca",
    WRITING: "Menulis",
    LISTENING: "Mendengarkan",
    SPEAKING: "Berbicara",
    GRAMMAR: "Tata Bahasa",
    VOCABULARY: "Kosakata",
    LITERATURE: "Sastra",
  };
  const skillLabel = skillHint ? SKILL_LABEL_MAP[skillHint] ?? skillHint : null;

  // Map skill to learning direction CTA
  const SKILL_CTA_MAP: Record<string, { href: string; label: string }> = {
    READING: { href: "/arena/jalur-cerdas", label: "Latih kemampuan membaca" },
    GRAMMAR: { href: "/arena/jalur-cerdas", label: "Perkuat tata bahasa" },
    VOCABULARY: { href: "/arena/jalur-cerdas", label: "Perluas kosakata" },
    WRITING: { href: "/murid/karya/tulis", label: "Asah kemampuan menulis" },
    LITERATURE: { href: "/arena/jalur-cerdas", label: "Jelajahi sastra" },
    LISTENING: { href: "/arena/jalur-cerdas", label: "Latih kemampuan mendengarkan" },
    SPEAKING: { href: "/arena/jalur-cerdas", label: "Asah kemampuan berbicara" },
  };
  const cta = skillHint ? SKILL_CTA_MAP[skillHint] ?? { href: "/arena/jalur-cerdas", label: "Lanjutkan belajar" } : null;

  const parseOptions = (optionsJson: string): string[] => {
    try {
      const parsed = JSON.parse(optionsJson);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === "object") return Object.values(parsed).map(String);
      return [];
    } catch {
      return [];
    }
  };

  // ── Loading State ──
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-4 dark:border-slate-700/60 dark:bg-slate-800/40">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
            <div className="h-3 w-28 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error State ──
  if (error && !action) {
    return null; // Don't show card if we can't load
  }

  // ── No Action ──
  if (action?.status === "NONE") {
    return null; // Don't show card if no action available
  }

  // ── Completed State ──
  if (action?.status === "COMPLETED" && !result) {
    const completed = action as DailyActionCompleted;
    return (
      <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/60 p-4 dark:border-emerald-800/40 dark:bg-emerald-950/30">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
            <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
              Tantangan Hari Ini Selesai!
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              {completed.isCorrect ? "Jawaban benar!" : "Terus berlatih ya!"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Completed with Result (just answered) ──
  if (result) {
    return (
      <div
        className={`rounded-2xl border p-4 ${
          result.correct
            ? "border-emerald-200/60 bg-emerald-50/60 dark:border-emerald-800/40 dark:bg-emerald-950/30"
            : "border-amber-200/60 bg-amber-50/60 dark:border-amber-800/40 dark:bg-amber-950/30"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              result.correct
                ? "bg-emerald-100 dark:bg-emerald-900/50"
                : "bg-amber-100 dark:bg-amber-900/50"
            }`}
          >
            {result.correct ? (
              <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle size={20} className="text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <div className="flex-1">
            <p
              className={`text-sm font-bold ${
                result.correct
                  ? "text-emerald-800 dark:text-emerald-200"
                  : "text-amber-800 dark:text-amber-200"
              }`}
            >
              {result.correct ? "Benar! Kamu hebat!" : "Belum benar, tetap semangat!"}
            </p>
            <div className="mt-1 flex items-center gap-3 text-xs">
              <span className="font-semibold text-violet-600 dark:text-violet-400">
                +{result.xpEarned} XP
              </span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                +{result.coinEarned} Koin
              </span>
            </div>
            {result.explanation && (
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {result.explanation}
              </p>
            )}
            {result.correctAnswer && !result.correct && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                Jawaban: <span className="font-medium">{result.correctAnswer}</span>
              </p>
            )}
            {/* Skill feedback */}
            {(result.skillLabel || skillLabel) && (
              <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-white/50 px-2.5 py-1.5 dark:bg-slate-800/40">
                <Target size={13} className="shrink-0 text-violet-500 dark:text-violet-400" />
                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                  Kemampuan: <span className="font-semibold text-slate-800 dark:text-slate-200">{result.skillLabel || skillLabel}</span>
                </span>
              </div>
            )}
            {/* Learning direction CTA */}
            {cta && (
              <a
                href={cta.href}
                className="mt-2.5 flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/50"
              >
                <BookOpen size={14} />
                {cta.label}
                <ArrowRight size={14} className="ml-auto" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Pending State (main interactive card) ──
  if (action?.status === "PENDING") {
    const pending = action as DailyActionPending;
    const options = parseOptions(pending.options);
    const questionType = pending.questionType || "PILIHAN_GANDA";
    // Skill-first label (show skill, not source)
    const pendingSkillLabel = pending.skill ? SKILL_LABEL_MAP[pending.skill] ?? pending.skill : null;

    // Type-specific labels
    const typeLabel =
      questionType === "BENAR_SALAH"
        ? "Benar / Salah"
        : questionType === "ISIAN_SINGKAT"
          ? "Isian Singkat"
          : "Pilihan Ganda";

    return (
      <div className="rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50/80 to-purple-50/60 p-4 dark:border-violet-800/40 dark:from-violet-950/40 dark:to-purple-950/30">
        {/* Header */}
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/50">
            <Brain size={18} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Tantangan Bahasa Hari Ini
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {pendingSkillLabel ? `${pendingSkillLabel} · ` : ""}1 soal · ±2 menit · {typeLabel}
            </p>
          </div>
        </div>

        {/* Question */}
        <div className="mb-3 rounded-xl bg-white/70 p-3 text-sm leading-relaxed text-slate-800 dark:bg-slate-800/60 dark:text-slate-200">
          {pending.questionText}
        </div>

        {/* ── PILIHAN_GANDA: A/B/C/D option buttons ── */}
        {questionType === "PILIHAN_GANDA" && (
          <div className="mb-3 space-y-1.5">
            {options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedAnswer(String(idx))}
                disabled={submitting}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-all ${
                  selectedAnswer === String(idx)
                    ? "border-violet-400 bg-violet-100 font-semibold text-violet-900 dark:border-violet-500 dark:bg-violet-900/40 dark:text-violet-100"
                    : "border-slate-200 bg-white/60 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold">
                  {String.fromCharCode(65 + idx)}
                </span>
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* ── BENAR_SALAH: Two big buttons ── */}
        {questionType === "BENAR_SALAH" && (
          <div className="mb-3 grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedAnswer("0")}
              disabled={submitting}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-4 text-base font-bold transition-all ${
                selectedAnswer === "0"
                  ? "border-emerald-400 bg-emerald-100 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-900/40 dark:text-emerald-200"
                  : "border-slate-200 bg-white/60 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:border-emerald-600"
              }`}
            >
              <CheckCircle size={20} />
              Benar
            </button>
            <button
              onClick={() => setSelectedAnswer("1")}
              disabled={submitting}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-4 text-base font-bold transition-all ${
                selectedAnswer === "1"
                  ? "border-rose-400 bg-rose-100 text-rose-800 dark:border-rose-500 dark:bg-rose-900/40 dark:text-rose-200"
                  : "border-slate-200 bg-white/60 text-slate-700 hover:border-rose-300 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:border-rose-600"
              }`}
            >
              <XCircle size={20} />
              Salah
            </button>
          </div>
        )}

        {/* ── ISIAN_SINGKAT: Text input ── */}
        {questionType === "ISIAN_SINGKAT" && (
          <div className="mb-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Pilih jawaban yang paling tepat:
            </p>
            <div className="space-y-1.5">
              {options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedAnswer(String(idx))}
                  disabled={submitting}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-all ${
                    selectedAnswer === String(idx)
                      ? "border-violet-400 bg-violet-100 font-semibold text-violet-900 dark:border-violet-500 dark:bg-violet-900/40 dark:text-violet-100"
                      : "border-slate-200 bg-white/60 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        {error && (
          <p className="mb-2 text-xs text-red-500 dark:text-red-400">{error}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={(!selectedAnswer.trim() && !textInput.trim()) || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition-all hover:from-violet-700 hover:to-purple-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:from-violet-500 dark:to-purple-500"
        >
          {submitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              Kirim Jawaban
              <ChevronRight size={16} />
            </>
          )}
        </button>
      </div>
    );
  }

  return null;
}
