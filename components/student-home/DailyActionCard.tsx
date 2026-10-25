"use client";

import { useState, useEffect, useCallback } from "react";
import { Brain, CheckCircle, XCircle, Loader2, ChevronRight, ArrowRight, BookOpen, Target } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
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
      <div className="rounded-2xl border border-bc-border bg-bc-surface/70 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-bc-surface-2" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-bc-surface-2" />
            <div className="h-3 w-28 animate-pulse rounded bg-bc-surface-2" />
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
      <div className="rounded-2xl border border-bc-success/30 bg-bc-success-soft p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bc-success-soft">
            <CheckCircle size={20} className="text-bc-success" />
          </div>
          <div>
            <p className="text-sm font-bold text-bc-success">
              Tantangan Hari Ini Selesai!
            </p>
            <p className="text-xs text-bc-success">
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
            ? "border-bc-success/30 bg-bc-success-soft"
            : "border-bc-warning/30 bg-bc-warning-soft"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              result.correct
                ? "bg-bc-success-soft"
                : "bg-bc-warning-soft"
            }`}
          >
            {result.correct ? (
              <CheckCircle size={20} className="text-bc-success" />
            ) : (
              <XCircle size={20} className="text-bc-warning-strong" />
            )}
          </div>
          <div className="flex-1">
            <p
              className={`text-sm font-bold ${
                result.correct
                  ? "text-bc-success"
                  : "text-bc-warning-strong"
              }`}
            >
              {result.correct ? "Benar! Kamu hebat!" : "Belum benar, tetap semangat!"}
            </p>
            <div className="mt-1 flex items-center gap-3 text-xs">
              <span className="font-semibold text-bc-violet">
                +{result.xpEarned} XP
              </span>
              <span className="font-semibold text-bc-warning-strong">
                +{result.coinEarned} Koin
              </span>
            </div>
            {result.explanation && (
              <p className="mt-2 text-xs leading-relaxed text-bc-text-2">
                {result.explanation}
              </p>
            )}
            {result.correctAnswer && !result.correct && (
              <p className="mt-1 text-xs text-bc-text-2">
                Jawaban: <span className="font-medium">{result.correctAnswer}</span>
              </p>
            )}
            {/* Skill feedback */}
            {(result.skillLabel || skillLabel) && (
              <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-bc-surface/70 px-2.5 py-1.5">
                <Target size={13} className="shrink-0 text-bc-violet" />
                <span className="text-[11px] text-bc-text-2">
                  Kemampuan: <span className="font-semibold text-bc-text">{result.skillLabel || skillLabel}</span>
                </span>
              </div>
            )}
            {/* Learning direction CTA */}
            {cta && (
              <a
                href={cta.href}
                className="mt-2.5 flex items-center gap-2 rounded-lg bg-bc-violet-soft px-3 py-2 text-xs font-semibold text-bc-violet transition-colors hover:bg-bc-violet/20"
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
      <div className="rounded-bc-card border border-bc-violet/30 bg-bc-surface p-4 shadow-bc-1 sm:p-5">
        {/* Header */}
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-bc-violet-soft">
            <Brain size={18} className="text-bc-violet" />
          </div>
          <div>
            <p className="text-sm font-bold text-bc-text">
              Tantangan Bahasa Hari Ini
            </p>
            <p className="text-[11px] text-bc-text-2">
              {pendingSkillLabel ? `${pendingSkillLabel} · ` : ""}1 soal · ±2 menit · {typeLabel}
            </p>
          </div>
        </div>

        {/* Question */}
        <div className="mb-3 rounded-xl bg-bc-surface/70 p-3 text-sm leading-relaxed text-bc-text">
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
                className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-all ${
                  selectedAnswer === String(idx)
                    ? "border-bc-violet bg-bc-violet-soft font-semibold text-bc-text"
                    : "border-bc-border bg-bc-surface/70 text-bc-text hover:border-bc-border-strong hover:bg-bc-surface"
                }`}
              >
                <span className="mt-px inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold">
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
                  ? "border-bc-success bg-bc-success-soft text-bc-success"
                  : "border-bc-border bg-bc-surface/70 text-bc-text hover:border-bc-success/60 hover:bg-bc-success-soft"
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
                  ? "border-bc-danger bg-bc-danger-soft text-bc-danger"
                  : "border-bc-border bg-bc-surface/70 text-bc-text hover:border-bc-danger/60 hover:bg-bc-danger-soft"
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
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-bc-violet">
              Pilih jawaban yang paling tepat:
            </p>
            <div className="space-y-1.5">
              {options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedAnswer(String(idx))}
                  disabled={submitting}
                  className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-all ${
                    selectedAnswer === String(idx)
                      ? "border-bc-violet bg-bc-violet-soft font-semibold text-bc-text"
                      : "border-bc-border bg-bc-surface/70 text-bc-text hover:border-bc-border-strong hover:bg-bc-surface"
                  }`}
                >
                  <span className="mt-px inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold">
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
          <p className="mb-2 text-xs text-bc-danger">{error}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={(!selectedAnswer.trim() && !textInput.trim()) || submitting}
          className={buttonClass({ variant: "accent", block: true, className: "disabled:cursor-not-allowed disabled:opacity-50" })}
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
