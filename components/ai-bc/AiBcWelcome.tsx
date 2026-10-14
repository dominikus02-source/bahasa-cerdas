"use client";

import { BookOpen, MessageSquareText, PenLine } from "lucide-react";
import AICompanionCharacter from "./AICompanionCharacter";
import type { BcHint, BcRole } from "./ai-bc-types";
import styles from "./ai-bc-workspace.module.css";

interface AiBcWelcomeProps {
  role: BcRole;
  personaTitle: string;
  headline: string;
  description: string;
  prompts: string[];
  hints: BcHint[];
  onPick: (prompt: string) => void;
}

const suggestionLabels: Record<BcRole, string[]> = {
  student: ["Pahami materi", "Bahas soal", "Latihan Bahasa Indonesia"],
  teacher: ["Siapkan materi", "Bahas soal", "Rancang aktivitas"],
};
const suggestionIcons = [BookOpen, MessageSquareText, PenLine];

export default function AiBcWelcome({
  role,
  personaTitle,
  headline,
  description,
  prompts,
  hints,
  onPick,
}: AiBcWelcomeProps) {
  const contextualHints = hints.filter(
    (hint, index) =>
      !prompts.includes(hint.prompt) &&
      hints.findIndex((item) => item.prompt === hint.prompt) === index,
  );

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[900px] flex-col items-center justify-center gap-5 px-4 py-6 text-center sm:py-8">
      <AICompanionCharacter state="idle" size="md" priority />
      <div className="space-y-2">
        <p className="flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-foreground">
          AI BC{" "}
          <span className="bc-badge-violet rounded-full px-2.5 py-1 text-xs">
            {role === "student" ? "Teman Belajar" : personaTitle}
          </span>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {headline}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <div
        aria-label="Saran pertanyaan utama"
        className="grid w-full max-w-[640px] grid-cols-1 gap-2 sm:grid-cols-3"
      >
        {prompts.slice(0, 3).map((prompt, index) => {
          const Icon = suggestionIcons[index];
          return (
            <button
              key={prompt}
              type="button"
              onClick={() => onPick(prompt)}
              className={`${styles.suggestion} flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium text-foreground`}
            >
              <Icon size={16} className="shrink-0" aria-hidden="true" />
              {suggestionLabels[role][index]}
            </button>
          );
        })}
      </div>

      {contextualHints.length > 0 && (
        <details className="w-full max-w-[640px] text-sm text-muted-foreground">
          <summary
            className={`${styles.secondaryAction} mx-auto w-fit cursor-pointer rounded-lg px-3 py-3`}
          >
            Saran sesuai{" "}
            {role === "student" ? "belajarmu" : "kebutuhan mengajar"}
          </summary>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {contextualHints.map((hint) => (
              <button
                key={hint.prompt}
                type="button"
                onClick={() => onPick(hint.prompt)}
                className={`${styles.suggestion} min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground`}
              >
                {hint.label}
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
