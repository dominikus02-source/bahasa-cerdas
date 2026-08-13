"use client";

import type { BcHint, BcQuickAction, BcRole } from "./ai-bc-types";
import { AI_BC_TAGLINE, COMPANION_BUBBLES } from "./ai-bc-types";
import AICompanionCharacter, { type CompanionState } from "./AICompanionCharacter";

interface AiBcLandingProps {
  role: BcRole;
  userName: string;
  personaTitle: string;
  greeting: string;
  quickActions: BcQuickAction[];
  hints: BcHint[];
  companion: CompanionState;
  onPick: (prompt: string) => void;
}

const TONES: Record<BcRole, { pill: string; card: string; chip: string }> = {
  student: {
    pill: "bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-900",
    card: "hover:border-violet-200 hover:bg-violet-50/60 dark:hover:bg-violet-950/40 dark:hover:border-violet-900",
    chip: "border-slate-200 hover:border-violet-300 hover:bg-violet-50 dark:border-slate-700 dark:hover:bg-violet-950/50",
  },
  teacher: {
    pill: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900",
    card: "hover:border-emerald-200 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 dark:hover:border-emerald-900",
    chip: "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:hover:bg-emerald-950/50",
  },
};

export default function AiBcLanding({ role, userName, personaTitle, greeting, quickActions, hints, companion, onPick }: AiBcLandingProps) {
  const tone = TONES[role];
  const bubbles = COMPANION_BUBBLES[role];

  return (
    <div className="flex flex-col items-center gap-6 py-6 sm:py-10">
      {/* Karakter AI BC + gelembung sapaan */}
      <div className="flex flex-col items-center gap-3 text-center">
        <AICompanionCharacter state={companion} size="lg" priority className="drop-shadow-xl" />
        <div className="relative rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {bubbles.idle}
          <span
            aria-hidden="true"
            className="absolute -bottom-1 left-8 h-3 w-3 rotate-45 border-b border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-lg font-extrabold text-slate-800 dark:text-slate-100">AI BC</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${tone.pill}`}>{personaTitle}</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{AI_BC_TAGLINE}</p>
        </div>
      </div>

      {/* Sapaan */}
      <div className="max-w-md text-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Halo, {userName || "teman"}!</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{greeting}</p>
      </div>

      {/* Aksi cepat */}
      <div className="grid w-full max-w-2xl grid-cols-2 gap-3">
        {quickActions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={() => onPick(action.prompt)}
            className={`flex flex-col items-start gap-1.5 rounded-2xl border border-slate-200 bg-white dark:bg-slate-900/70 dark:border-slate-700/70 p-4 text-left shadow-sm transition-all hover:shadow-md ${tone.card}`}
          >
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{action.label}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{action.sub}</span>
          </button>
        ))}
      </div>

      {/* Saran konteks */}
      {hints.length > 0 && (
        <div className="w-full max-w-2xl">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Saran untukmu
          </p>
          <div className="flex flex-wrap gap-2">
            {hints.map((hint) => (
              <button
                key={hint.label}
                type="button"
                onClick={() => onPick(hint.prompt)}
                className={`rounded-xl border bg-white dark:bg-slate-900/70 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 transition-colors ${tone.chip}`}
              >
                {hint.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="max-w-md text-center text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
        AI BC menyesuaikan bantuan dengan peran dan progres belajarmu di BahasaCerdas.
        Untuk keputusan penting, selalu periksa kembali sumber resmi.
      </p>
    </div>
  );
}