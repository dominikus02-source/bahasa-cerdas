"use client";

import type { DialogueSession } from "../interaction/dialogue";
import { currentNode } from "../interaction/dialogue";
import { getDialogueTree } from "../data/dialogues";
import type { QuestLineState } from "../quests/quest-engine";

export interface RPGDialogueProps {
  session: DialogueSession | null;
  quest: QuestLineState;
  onAdvance: () => void;
  onEnd: () => void;
}

/** Thin, player-facing view over the engine-owned canonical dialogue session. */
export function RPGDialogue({ session, quest, onAdvance, onEnd }: RPGDialogueProps) {
  if (!session) return null;
  const tree = getDialogueTree(session.npcId);
  const current = tree ? currentNode(tree, session, { kills: quest.kills, flowers: quest.flowers }) : undefined;
  if (!current) return null;
  const isFinalNode = session.atEnd || !current.node.next;

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 px-3 pb-3 pt-12 pointer-events-none">
      <section className="pointer-events-auto mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border-2 border-amber-200/80 bg-stone-950/95 shadow-2xl">
        <div className="border-b border-amber-100/15 bg-amber-500/10 px-4 py-2">
          <p className="text-sm font-black text-amber-200">{current.node.speaker}</p>
        </div>
        <div className="p-4">
          <div className="space-y-2 text-[15px] font-medium leading-relaxed text-stone-100">
            {current.lines.map((line, index) => <p key={`${session.nodeId}-${index}`}>{line}</p>)}
          </div>
          <button
            type="button"
            onClick={isFinalNode ? onEnd : onAdvance}
            className="mt-4 min-h-12 w-full rounded-xl bg-amber-500 px-4 text-base font-black text-stone-950 transition hover:bg-amber-400 active:translate-y-px"
          >
            {isFinalNode ? "Mengerti" : "Lanjut"}
          </button>
        </div>
      </section>
    </div>
  );
}
