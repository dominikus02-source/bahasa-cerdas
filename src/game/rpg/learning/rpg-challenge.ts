/**
 * RPG learning challenge contract — Pendekar Suryakerta (P1.8A).
 *
 * Adapter boundary over the CANONICAL production question source (Prisma
 * `Soal`, projected through the repo-canonical `GameQuestion` runtime shape
 * from lib/game-questions). No new question schema, no new validator, no
 * content generation — this module only adapts + splits visibility:
 *
 * - ResolvedChallenge (SERVER ONLY): carries the canonical answer.
 * - LearningChallenge (client-safe): answer stripped, stable identity.
 *
 * Curriculum metadata (topik/KD/kelas/kompetensi) passes through verbatim;
 * difficulty maps VERY_HARD→HARD explicitly; unknown skill tags are
 * preserved raw as OTHER (never dropped, never invented).
 *
 * Pure + deterministic. No React/DOM/storage/network/renderer/RNG.
 */

import type { GameQuestion } from "@/lib/game-questions/types";

/** WHY the challenge is asked — one contract, context as metadata (§9). */
export type LearningContext = "BATTLE" | "QUEST" | "NPC" | "EXPLORATION" | "BOSS";

/** Canonical Bahasa Indonesia learning domains (§11). */
export type LearningDomain =
  | "KOSAKATA" | "MAKNA_KATA" | "STRUKTUR_KALIMAT" | "EJAAN"
  | "TANDA_BACA" | "MAJAS" | "MEMBACA" | "PEMAHAMAN_TEKS"
  | "MENDENGARKAN" | "MENULIS"
  | { other: string };

export type LearningDifficulty = "EASY" | "MEDIUM" | "HARD";

/** Minimal Soal-row shape consumed by the adapter (DB rows are wider). */
export interface SoalLike {
  id: string;
  kodeSoal?: string | null;
  text: string;
  type: string;
  options: string[];
  correctAnswer: string;
  explanation?: string | null;
  difficulty?: string | null;
  topik?: string | null;
  kompetensi?: string | null;
  KD?: string | null;
  kelas?: string | null;
  skillTag?: string | null;
}

export interface CurriculumRef {
  topik?: string | null;
  kompetensi?: string | null;
  kd?: string | null;
  kelas?: string | null;
}

/** Server-side challenge: canonical answer present. NEVER send to client. */
export interface ResolvedChallenge {
  challengeId: string;
  context: LearningContext;
  domain: LearningDomain;
  difficulty: LearningDifficulty;
  prompt: string;
  options: string[];
  freeText: boolean;
  answer: string;
  curriculum: CurriculumRef;
  source: { kind: "SOAL"; soalId: string; kodeSoal?: string | null };
}

/** Client-safe projection: identical identity, no answer. */
export interface LearningChallenge extends Omit<ResolvedChallenge, "answer"> {}

/**
 * Enemy skillTag → canonical domain (explicit table; unknown tags preserved
 * raw under OTHER so future tags flow without code changes).
 */
export function domainForSkillTag(tag: string | null | undefined): LearningDomain {
  const t = (tag ?? "").trim().toLowerCase();
  switch (t) {
    case "sinonim":
    case "kosakata":
      return "KOSAKATA";
    case "antonim":
    case "makna":
      return "MAKNA_KATA";
    case "tata-bahasa":
    case "struktur":
      return "STRUKTUR_KALIMAT";
    case "ejaan":
    case "eyd":
      return "EJAAN";
    case "tanda-baca":
      return "TANDA_BACA";
    case "majas":
      return "MAJAS";
    case "membaca":
      return "MEMBACA";
    case "pemahaman":
    case "pemahaman-teks":
      return "PEMAHAMAN_TEKS";
    case "mendengarkan":
    case "listening":
      return "MENDENGARKAN";
    case "menulis":
      return "MENULIS";
    default:
      return t ? { other: t } : { other: "unknown" };
  }
}

/** Canonical difficulty mapping (Prisma enum has VERY_HARD; game scale caps at HARD). */
export function difficultyFor(raw: string | null | undefined): LearningDifficulty {
  const d = (raw ?? "").trim().toUpperCase();
  if (d === "EASY" || d === "MUDAH") return "EASY";
  if (d === "HARD" || d === "SULIT" || d === "VERY_HARD") return "HARD";
  return "MEDIUM";
}

/** Stable challenge identity: source + context (same soal, new attempt = new attemptId, not new challenge). */
export function challengeIdFor(soalId: string, context: LearningContext): string {
  return `soal:${soalId}:${context.toLowerCase()}`;
}

/**
 * Adapt a Soal row to a resolved (server-side) challenge.
 * Returns undefined for content that fails the canonical gate
 * (empty text/answer) — callers treat undefined as "no challenge".
 */
export function adaptSoalToChallenge(
  soal: SoalLike,
  context: LearningContext,
): ResolvedChallenge | undefined {
  const prompt = (soal.text ?? "").trim();
  const answer = (soal.correctAnswer ?? "").trim();
  if (!soal.id || !prompt || !answer) return undefined;
  const freeText = soal.type !== "PILIHAN_GANDA" || soal.options.length === 0;
  return {
    challengeId: challengeIdFor(soal.id, context),
    context,
    domain: domainForSkillTag(soal.skillTag ?? soal.topik),
    difficulty: difficultyFor(soal.difficulty),
    prompt,
    options: [...soal.options],
    freeText,
    answer,
    curriculum: {
      topik: soal.topik ?? null,
      kompetensi: soal.kompetensi ?? null,
      kd: soal.KD ?? null,
      kelas: soal.kelas ?? null,
    },
    source: { kind: "SOAL", soalId: soal.id, kodeSoal: soal.kodeSoal ?? null },
  };
}

/** Strip the answer for client delivery (anti-cheat boundary). */
export function toClientChallenge(resolved: ResolvedChallenge): LearningChallenge {
  const { answer: _answer, ...client } = resolved;
  void _answer;
  return client;
}

/** Re-express a GameQuestion (repo-canonical runtime shape) as SoalLike. */
export function gameQuestionToSoalLike(q: GameQuestion): SoalLike {
  return {
    id: q.id,
    text: q.question,
    type: q.freeText ? "ISIAN" : "PILIHAN_GANDA",
    options: [...q.options],
    correctAnswer: q.correctAnswer,
    explanation: q.explanation ?? null,
    difficulty: q.difficulty ?? null,
    topik: q.topic ?? null,
    skillTag: q.skill ?? null,
  };
}
