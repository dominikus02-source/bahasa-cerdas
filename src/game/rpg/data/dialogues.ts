/**
 * Canonical dialogue content — Pendekar Suryakerta (P1.5).
 *
 * DATA ONLY (no logic, no React, no DOM). Texts are VERBATIM transcriptions
 * of first-meeting greetings from the legacy prototype. Quest-gated variants
 * (Ki Jaka quest>0, Bu Sari repeat, Eyang post-boss, dst.) belong to the
 * quest engine (P1.7) and are NOT duplicated here — each tree starts at its
 * entry node, always.
 *
 * Effect signals (FLAG/QUEST/GOLD/ITEM/SKILL/REST) transcribe prototype
 * side-effects as DATA. Only REST is applied by the engine (trivial stat
 * set, verbatim full-restore); the rest are unapplied hooks for P1.7,
 * explicitly asserted as unapplied by tests. Nothing here mutates state.
 */

export type DialogueEffectType =
  | "FLAG" | "QUEST" | "GOLD" | "ITEM" | "SKILL" | "REST";

export interface DialogueEffect {
  type: DialogueEffectType;
  /** Flag name (FLAG), quest state (QUEST), amount (GOLD), key+qty (ITEM),
   *  skill key (SKILL). REST carries no params (full HP/MP restore). */
  name?: string;
  amount?: number;
  key?: string;
  quantity?: number;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  /** Linear lines (verbatim). */
  lines: string[];
  /** Alternate variant sets (verbatim; selection is an explicit index —
   *  prototype used Math.random here, which has no place in runtime). */
  variants?: string[][];
  effects?: DialogueEffect[];
  /** Next node id; null/omitted = dialogue ends after this node. */
  next?: string | null;
}

export interface DialogueTree {
  npcId: string;
  dialogueId: string;
  start: string;
  nodes: Record<string, DialogueNode>;
}

/** Where an INTERACT on an NPC routes: dialogue session or shop session. */
export type NpcRoute = "DIALOGUE" | "SHOP";

export const NPC_ROUTING: Record<string, NpcRoute> = {
  ki: "DIALOGUE",
  sari: "DIALOGUE",
  eyang: "DIALOGUE",
  bagas: "DIALOGUE",
  tani: "DIALOGUE",
  pendaki: "DIALOGUE",
  ratmi: "SHOP",
  empu: "SHOP",
};

export function dialogueIdFor(npcId: string): string {
  return `dlg.${npcId}.intro`;
}

export const DIALOGUE_TREES: Record<string, DialogueTree> = {
  ki: {
    npcId: "ki",
    dialogueId: "dlg.ki.intro",
    start: "intro",
    nodes: {
      intro: {
        id: "intro",
        speaker: "Ki Jaka",
        lines: [
          "Nak, kamu sudah datang! Syukurlah...",
          "Para Korog keluar dari Hutan Rimba Larung. Ladang dirusak, warga ketakutan.",
          "Mohon, kalahkan 3 Korog di hutan seberang sungai timur!",
          "Ini bekal 30 G dariku. Bu Ratmi menjual Ramuan. Hati-hati, Nak!",
        ],
        effects: [
          { type: "QUEST", amount: 1 },
          { type: "GOLD", amount: 30 },
        ],
      },
    },
  },
  sari: {
    npcId: "sari",
    dialogueId: "dlg.sari.intro",
    start: "intro",
    nodes: {
      intro: {
        id: "intro",
        speaker: "Bu Sari",
        lines: [
          "Aku takut keluar rumah... ada suara aneh dari arah hutan.",
          "Ini, bawalah ramuan ini. Hati-hati ya, Nak.",
          "Oh iya... kata Eyang, ada 3 BUNGA EMAS: di taman desa, rimba timur, dan lereng gunung.",
          "Bisa Kakak carikan semuanya? Untuk jimat penyembuh.",
        ],
        effects: [
          { type: "FLAG", name: "sari" },
          { type: "FLAG", name: "sariQ" },
          { type: "ITEM", key: "ram", quantity: 1 },
        ],
      },
    },
  },
  eyang: {
    npcId: "eyang",
    dialogueId: "dlg.eyang.intro",
    start: "intro",
    nodes: {
      intro: {
        id: "intro",
        speaker: "Eyang Kartala",
        lines: [
          "Hmmm... aura pendekar muda yang kuat terasa darimu.",
          "Baiklah, aku ajarkan jurus turun-temurun: MAHAPUKUL!",
          "Nanti kalau levelmu naik, jurus lain akan terbuka dengan sendirinya.",
        ],
        effects: [{ type: "SKILL", key: "maha" }],
      },
    },
  },
  bagas: {
    npcId: "bagas",
    dialogueId: "dlg.bagas.intro",
    start: "intro",
    nodes: {
      intro: {
        id: "intro",
        speaker: "Bagas",
        lines: [
          "Kak Pendekar! Kata orang, Korog paling takut sama orang berikat kepala merah!",
        ],
        variants: [
          [
            "Kalau kamu kalahkan Raja Korog, aku kasih kamu tempat sembunyi paling apik!",
            "...tempatnya di belakang aku. Hihi.",
          ],
        ],
      },
    },
  },
  tani: {
    npcId: "tani",
    dialogueId: "dlg.tani.intro",
    start: "intro",
    nodes: {
      intro: {
        id: "intro",
        speaker: "Pak Warsa",
        lines: [
          "Ladangku rusak digerus para Korog... terima kasih mau melawan mereka, Nak.",
          "Ambillah hasil jual panenku, plus satu ramuan. Semoga berkah!",
        ],
        effects: [
          { type: "FLAG", name: "tani" },
          { type: "GOLD", amount: 25 },
          { type: "ITEM", key: "ram", quantity: 1 },
        ],
      },
    },
  },
  pendaki: {
    npcId: "pendaki",
    dialogueId: "dlg.pendaki.intro",
    start: "rest",
    nodes: {
      rest: {
        id: "rest",
        speaker: "Pak Pendaki",
        lines: [
          "Sshh... duduk dekat unggun dulu, Nak. Minum tehnya.",
          "(HP & MP pulih penuh!)",
          "Waspadai GOLEM — kulitnya keras tapi geraknya lambat.",
          "Dan jika menara itu sudah memanggilmu... bawa bekal sebanyak-banyaknya.",
        ],
        effects: [{ type: "REST" }],
      },
      cooldown: {
        id: "cooldown",
        speaker: "Pak Pendaki",
        lines: [
          "Hosh hosh... maaf Nak, api unggun masih dinyalakan ulang.",
          "Kembali lagi beberapa saat lagi.",
        ],
      },
    },
  },
};

export function getDialogueTree(npcId: string): DialogueTree | undefined {
  return DIALOGUE_TREES[npcId];
}
