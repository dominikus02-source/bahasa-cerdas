/**
 * Quest/flag contract (map-side only) — Pendekar Suryakerta (P1E.2).
 *
 * This file is a CONTRACT, not an engine: it fixes the flag vocabulary and
 * tracker texts the map layer depends on (portal gating, chest state).
 * Quest engine implementation arrives in a later phase.
 *
 * Source: prototype refreshQuest + flag assignments (verbatim).
 *
 * AMBIGUITY A1 (documented, not redesigned): `nagaDead` is CHECKED by the
 * gunung→menara portal (req) and by Eyang Kartala / Bagas dialogues, but is
 * NEVER ASSIGNED anywhere in the 1788-line prototype. The menara gate is
 * therefore unsatisfiable in prototype play. Migrated verbatim — no setter
 * invented. Unlocking menara is a future design decision, not a migration fix.
 *
 * DEAD STATE (documented, not resurrected): quest tracker 5
 * ("Temui Eyang Kartala — ada kabar aneh...") has NO assignment path in the
 * prototype (assignments only reach 0→1→2→3→4 and 6, 7). It stays documented.
 */

/** All quest flags assigned or checked by the prototype (verbatim names). */
export type QuestFlagName =
  | "bossDead" | "nagaDead" | "towerIntro" | "towerDone"
  | "sari" | "sariQ" | "charm" | "tani"
  | "ratmiMet" | "empuMet"
  | "kiAfter" | "kiAfter2" | "kiAfter3"
  | "end1" | "end2" | "end3";

/** Flags a quest-flag store must carry (all default false). */
export type QuestFlags = Partial<Record<QuestFlagName, boolean>>;

/** Runtime list of the 16 canonical flags (signal validation). */
export const QUEST_FLAG_NAMES: ReadonlyArray<string> = [
  "bossDead", "nagaDead", "towerIntro", "towerDone",
  "sari", "sariQ", "charm", "tani",
  "ratmiMet", "empuMet",
  "kiAfter", "kiAfter2", "kiAfter3",
  "end1", "end2", "end3",
];

/** Flag requirements referenced by portals (verbatim prototype `req`). */
export const PORTAL_FLAG_REQUIREMENTS: ReadonlyArray<string> = ["bossDead", "nagaDead"];

/** Quest tracker states with no prototype assignment path. */
export const DEAD_QUEST_STATES: ReadonlyArray<number> = [5];

/**
 * Main-quest tracker texts 0-7, VERBATIM from prototype refreshQuest.
 * `{kills}` and `{towerBest}` are template slots (prototype interpolates
 * Math.min(G.kills,3) and G.towerBest||0 at render time).
 */
export const QUEST_TRACKER_TEXT: Readonly<Record<number, string>> = {
  0: "Temui Ki Jaka, Kepala Desa.",
  1: "Kalahkan monster Korog di hutan timur ({kills}/3), lalu laporkan ke Ki Jaka.",
  2: "Kalahkan RAJA KOROG di Goa Timur, ujung timur laut hutan.",
  3: "Laporkan kemenanganmu ke Ki Jaka!",
  4: "Naiki Gunung Karang lewat Goa Timur. Taklukkan NAGA ABU di puncak!",
  5: "Temui Eyang Kartala — ada kabar aneh dari puncak gunung...",
  6: "Uji Menara Angin (gerbang cahaya di puncak): capai lantai 10! Rekor: Lt {towerBest}",
  7: "Kau LEGENDA NUSANTARA! Menara masih menanti di lantai lebih tinggi... (Rekor: Lt {towerBest})",
};

/** Render a tracker slot (prototype interpolation semantics). */
export function renderTrackerText(state: number, kills: number, towerBest: number): string {
  const tpl = QUEST_TRACKER_TEXT[state];
  if (tpl === undefined) return "";
  return tpl
    .replace("{kills}", String(Math.min(kills, 3)))
    .replace("{towerBest}", String(towerBest || 0));
}
