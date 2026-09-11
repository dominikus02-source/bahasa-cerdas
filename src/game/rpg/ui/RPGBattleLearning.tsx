/**
 * RPGBattleLearning — battle learning overlay (P1.9A vertical slice).
 *
 * PURE presentation: props in, callbacks out — never mutates game state,
 * never holds battle truth, never sees the canonical answer. The engine
 * owns evaluation; this component only renders the client-safe challenge
 * and forwards the player's answer text.
 *
 * Copy rule: the player reads "jawab untuk memperkuat serangan" —
 * no challengeId/attemptId/multiplier/state names, no answer key.
 * Mobile-first: min 48px targets, no horizontal overflow, bottom sheet
 * keeps the battle canvas visible above.
 */

"use client";

import { useState } from "react";
import type { LearningChallenge } from "../learning/rpg-challenge";
import { resolveLearningPanel } from "./battle-learning-view";

export interface RPGBattleLearningProps {
  /** True while a battle is active. */
  inBattle: boolean;
  /** PENDING substate: "PENDING" | "RESOLVED" | undefined. */
  learningStatus?: "PENDING" | "RESOLVED";
  /** Client-safe challenge (answer already stripped server-side). */
  challenge: LearningChallenge | null;
  /** Retained feedback until the next attack consumes it. */
  feedback: { correct: boolean } | null;
  onAnswer: (answer: string) => void;
  onAttack: () => void;
}

export function RPGBattleLearning({
  inBattle,
  learningStatus,
  challenge,
  feedback,
  onAnswer,
  onAttack,
}: RPGBattleLearningProps) {
  const [draft, setDraft] = useState("");
  const panel = resolveLearningPanel({
    inBattle,
    learningStatus,
    hasChallenge: challenge !== null,
    hasFeedback: feedback !== null,
  });

  if (panel === "HIDDEN") return null;

  return (
    <div
      role="dialog"
      aria-label={panel === "QUESTION" ? "Tantangan bahasa" : "Hasil jawaban"}
      className="absolute inset-x-0 bottom-0 z-20 px-3 pb-3 pt-8 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-md rounded-2xl border-2 border-[var(--game-border-light)] bg-[var(--game-surface)] shadow-xl overflow-hidden">
        {panel === "QUESTION" && challenge ? (
          <div className="p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--game-primary)]">
              Tantangan Bahasa
            </p>
            <p className="mt-1 text-[15px] font-bold leading-snug text-[var(--game-text)]">
              {challenge.prompt}
            </p>
            {challenge.options.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {challenge.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onAnswer(opt)}
                    className="min-h-12 w-full rounded-xl border-2 border-[var(--game-border-light)] bg-white px-3 py-2.5 text-left text-sm font-bold text-slate-900 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] dark:bg-slate-800 dark:text-white"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (draft.trim()) onAnswer(draft.trim());
                }}
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ketik jawabanmu…"
                  aria-label="Jawaban"
                  className="min-h-12 flex-1 rounded-xl border-2 border-[var(--game-border-light)] bg-white px-3 text-sm font-bold text-slate-900 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="submit"
                  className="min-h-12 rounded-xl bg-[var(--game-primary)] px-5 text-sm font-black text-white"
                >
                  Kirim
                </button>
              </form>
            )}
            <p className="mt-2.5 text-xs font-semibold text-[var(--game-text-muted)]">
              Jawab untuk memperkuat seranganmu!
            </p>
          </div>
        ) : (
          <div className="p-4" aria-live="polite">
            <div
              className={`rounded-xl px-3 py-2.5 text-sm font-black ${
                feedback?.correct
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
              }`}
            >
              {feedback?.correct ? (
                <span>
                  <span aria-hidden>✓</span> Benar! Seranganmu menguat!
                </span>
              ) : (
                <span>
                  <span aria-hidden>!</span> Belum tepat — serang seperti biasa.
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onAttack}
              className="mt-3 min-h-12 w-full rounded-xl bg-[var(--game-primary)] px-4 text-base font-black text-white transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Serang!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
