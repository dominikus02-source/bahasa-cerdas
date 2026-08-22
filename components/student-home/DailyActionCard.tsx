"use client";

import { useState, useEffect, useCallback } from "react";
import { Brain, CheckCircle, XCircle, Loader2, ChevronRight } from "lucide-react";
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
 * States: LOADING → PENDING → SUBMITTING → COMPLETED (correct/incorrect)
 */
export function DailyActionCard() {
  const [action, setAction] = useState<DailyActionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DailyActionAnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch today's action
  useEffect(() => {
    async function fetchAction() {
      try {
        const res = await fetch("/api/student/daily-action");
        if (!res.ok) throw new Error("Gagal memuat");
        const data: DailyActionResponse = await res.json();
        setAction(data);
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
    if (!selectedAnswer.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/student/daily-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: selectedAnswer.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal mengirim jawaban.");
      }

      const data: DailyActionAnswerResult = await res.json();
      setResult(data);

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
  }, [selectedAnswer, submitting]);

  // Parse options for display
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
          </div>
        </div>
      </div>
    );
  }

  // ── Pending State (main interactive card) ──
  if (action?.status === "PENDING") {
    const pending = action as DailyActionPending;
    const options = parseOptions(pending.options);
    const sourceLabel =
      pending.source === "TKA"
        ? "TKA"
        : pending.source === "UKBI"
        ? "UKBI"
        : "Bank Soal";

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
              1 soal · ±2 menit · {sourceLabel}
            </p>
          </div>
        </div>

        {/* Question */}
        <div className="mb-3 rounded-xl bg-white/70 p-3 text-sm leading-relaxed text-slate-800 dark:bg-slate-800/60 dark:text-slate-200">
          {pending.questionText}
        </div>

        {/* Options */}
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

        {/* Submit Button */}
        {error && (
          <p className="mb-2 text-xs text-red-500 dark:text-red-400">{error}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={!selectedAnswer.trim() || submitting}
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
