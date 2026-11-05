"use client";

import AICompanionCharacter from "./AICompanionCharacter";
import { NARA_IDENTITY_LINE, NARA_NAME } from "./ai-bc-types";
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

export default function AiBcWelcome({
  headline,
  description,
}: AiBcWelcomeProps) {
  return (
    <div className={`mx-auto flex min-h-full w-full max-w-[900px] flex-col items-center justify-center gap-5 px-4 py-6 text-center sm:py-8 ${styles.naraWelcome}`}>
      <AICompanionCharacter state="idle" size="md" priority />
      <div className="space-y-3">
        <p className="flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-foreground">
          <span className={`text-xl ${styles.naraWordmark}`}>{NARA_NAME}</span>
          <span className={`${styles.naraBadge} rounded-full px-2.5 py-1 text-xs`}>{NARA_IDENTITY_LINE}</span>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{headline}</h1>
        <p className="mx-auto max-w-[560px] text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}