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

/** Mobile-first quest HUD: compact on phones, rich tracker on larger screens. */
export function RPGQuestPanel({ quest, gold, nearInteractable, notice, learningReady, onInteract }: RPGQuestPanelProps) {
  const objective = renderTrackerText(quest.main, quest.kills, 0);
  const isKorogQuest = quest.main === 1;
  const questActive = quest.main >= 1;
  const progress = isKorogQuest ? Math.min(3, quest.kills) : 0;
  const learningClass = learningReady ? "text-emerald-300" : "text-amber-300";
  return (
    <aside className="pointer-events-none absolute top-2 right-2 z-20 w-[calc(100%-1rem)] sm:top-3 sm:right-3 sm:w-[min(23rem,calc(100%-1.5rem))]" aria-label="Tujuan petualangan">
      <div className="pointer-events-auto sm:hidden">
        <div className="mx-auto max-w-[21rem] rounded-2xl border border-amber-200/45 bg-stone-950/82 px-3 py-2 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-[11px] font-black text-stone-950">{questActive ? `${progress}/3` : "!"}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-amber-300">{questActive ? "Jejak Korog" : "Desa Suryakerta"}</p>
                <span className="shrink-0 text-[10px] font-black text-amber-200">{gold} G</span>
              </div>
              <p className="truncate text-[11px] font-bold text-white">{objective}</p>
            </div>
            {nearInteractable ? <button type="button" onClick={onInteract} className="min-h-8 shrink-0 rounded-xl bg-amber-400 px-3 text-[10px] font-black text-stone-950 shadow-sm active:scale-95">Interaksi</button> : null}
          </div>
          {questActive ? <div className="mt-1.5 flex items-center gap-2"><div className="h-1 flex-1 overflow-hidden rounded-full bg-stone-700"><div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${(progress / 3) * 100}%` }} /></div><span className={`text-[9px] font-bold ${learningClass}`}>{learningReady ? "Bahasa siap" : "Bahasa belum siap"}</span></div> : null}
        </div>
      </div>

      <div className="pointer-events-auto hidden sm:block">
        <div className="rounded-2xl border-2 border-amber-200/80 bg-stone-950/85 p-3.5 text-amber-50 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3"><p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-300">{questActive ? "Jejak Korog" : "Desa Suryakerta"}</p><span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-black text-amber-200">{gold} G</span></div>
          <p className="mt-1.5 text-sm font-bold leading-snug text-white">{objective}</p>
          {questActive ? <p className={`mt-1 text-xs font-semibold ${learningReady ? "text-emerald-200" : "text-amber-200"}`}>{learningReady ? "Tantangan Bahasa siap: jawaban benar memperkuat serangan." : "Tantangan Bahasa belum tersedia; periksa sesi dan pool soal sebelum playtest."}</p> : null}
          {isKorogQuest ? <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-700" aria-label={`Korog dikalahkan ${progress} dari 3`}><div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${(progress / 3) * 100}%` }} /></div> : null}
          {nearInteractable ? <button type="button" onClick={onInteract} className="mt-3 min-h-11 w-full rounded-xl bg-amber-500 px-3 text-sm font-black text-stone-950 transition hover:bg-amber-400 active:translate-y-px">Interaksi</button> : <p className="mt-2 text-xs font-semibold text-amber-100/75">Gunakan WASD atau panah untuk bergerak. Tekan E saat dekat tokoh atau Korog.</p>}
        </div>
      </div>

      {notice ? <div className="pointer-events-auto mx-auto mt-2 max-w-[21rem] rounded-xl border border-amber-200/30 bg-stone-900/90 px-3 py-2 text-sm font-bold text-amber-50 shadow-lg sm:max-w-none" aria-live="polite">{notice}</div> : null}
    </aside>
  );
}
