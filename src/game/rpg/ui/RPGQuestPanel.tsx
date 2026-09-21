"use client";

import type { QuestLineState } from "../quests/quest-engine";
import { renderTrackerText } from "../quests/flags";

export interface RPGQuestPanelProps {
  quest: QuestLineState;
  gold: number;
  nearInteractable: boolean;
  notice: string | null;
  learningReady: boolean;
  onInteract: () => void;
}

/** Presentation-only slice guidance. The engine remains quest authority. */
export function RPGQuestPanel({
  quest,
  gold,
  nearInteractable,
  notice,
  learningReady,
  onInteract,
}: RPGQuestPanelProps) {
  const objective = renderTrackerText(quest.main, quest.kills, 0);
  const isKorogQuest = quest.main === 1;
  const questActive = quest.main >= 1;

  return (
    <aside className="absolute top-3 right-3 z-10 w-[min(23rem,calc(100%-1.5rem))]" aria-label="Tujuan petualangan">
      <div className="rounded-2xl border-2 border-amber-200/80 bg-stone-950/85 p-3.5 text-amber-50 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-300">
            {questActive ? "Jejak Korog" : "Desa Suryakerta"}
          </p>
          <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-black text-amber-200">{gold} G</span>
        </div>
        <p className="mt-1.5 text-sm font-bold leading-snug text-white">{objective}</p>
        {questActive ? (
          <p className={`mt-1 text-xs font-semibold ${learningReady ? "text-emerald-200" : "text-amber-200"}`}>
            {learningReady
              ? "Tantangan Bahasa siap: jawaban benar memperkuat serangan."
              : "Tantangan Bahasa belum tersedia; periksa sesi dan pool soal sebelum playtest."}
          </p>
        ) : null}
        {isKorogQuest ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-700" aria-label={`Korog dikalahkan ${Math.min(quest.kills, 3)} dari 3`}>
            <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${Math.min(100, (quest.kills / 3) * 100)}%` }} />
          </div>
        ) : null}
        {nearInteractable ? (
          <button
            type="button"
            onClick={onInteract}
            className="mt-3 min-h-11 w-full rounded-xl bg-amber-500 px-3 text-sm font-black text-stone-950 transition hover:bg-amber-400 active:translate-y-px"
          >
            Interaksi
          </button>
        ) : (
          <p className="mt-2 text-xs font-semibold text-amber-100/75">Gunakan WASD atau panah untuk bergerak. Tekan E saat dekat tokoh atau Korog.</p>
        )}
      </div>
      {notice ? (
        <div className="mt-2 rounded-xl border border-amber-200/30 bg-stone-900/90 px-3 py-2 text-sm font-bold text-amber-50 shadow-lg" aria-live="polite">
          {notice}
        </div>
      ) : null}
    </aside>
  );
}
