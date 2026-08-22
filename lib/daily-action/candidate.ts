/**
 * Daily Action Engine 1.0 — Candidate Provider
 *
 * Fetches candidate questions from TKA, UKBI, and Soal pools.
 * Returns a uniform DailyCandidate[] regardless of source.
 *
 * Safety: UKBI listening questions without audioUrl are excluded
 * from Aksi Hari Ini candidates (they would display broken content).
 */
import { db } from "@/lib/db";
import { CANDIDATE_POOL_SIZE } from "./config";
import type { DailyCandidate } from "./types";

/** Fetch TKA candidates */
async function fetchTKA(): Promise<DailyCandidate[]> {
  const rows = await db.tKAQuestion.findMany({
    where: { isActive: true, tingkat: { in: ["SMP", "SMA", "UMUM"] } },
    select: {
      id: true,
      kompetensi: true,
      difficulty: true,
      text: true,
      options: true,
      isVerified: true,
      tingkat: true,
    },
    take: CANDIDATE_POOL_SIZE,
  });

  return rows.map((r) => ({
    id: r.id,
    source: "TKA" as const,
    skill: mapTKASkill(r.kompetensi),
    difficulty: r.difficulty ?? null,
    questionText: r.text,
    options: JSON.stringify(r.options),
    isVerified: r.isVerified,
    tingkat: r.tingkat,
    seksi: null,
    hasAudio: false,
  }));
}

/** Fetch UKBI candidates — excludes listening questions without audio */
async function fetchUKBI(): Promise<DailyCandidate[]> {
  const rows = await db.uKBIQuestion.findMany({
    where: { isActive: true, tingkat: { in: ["SMP", "SMA", "UMUM"] } },
    select: {
      id: true,
      seksi: true,
      difficulty: true,
      text: true,
      options: true,
      audioUrl: true,
      isVerified: true,
      tingkat: true,
    },
    take: CANDIDATE_POOL_SIZE,
  });

  return rows
    // SAFETY: exclude UKBI listening questions without valid audio
    .filter((r) => {
      const isListening = r.seksi === "MENDENGARKAN";
      const hasValidAudio = !!r.audioUrl && r.audioUrl.trim().length > 0;
      // Listening without audio → broken question, never eligible
      if (isListening && !hasValidAudio) return false;
      return true;
    })
    .map((r) => ({
      id: r.id,
      source: "UKBI" as const,
      skill: mapUKBISkill(r.seksi),
      difficulty: r.difficulty ?? null,
      questionText: r.text,
      options: JSON.stringify(r.options),
      isVerified: r.isVerified,
      tingkat: r.tingkat,
      seksi: r.seksi,
      hasAudio: !!r.audioUrl && r.audioUrl.trim().length > 0,
    }));
}

/** Fetch Soal candidates */
async function fetchSoal(): Promise<DailyCandidate[]> {
  const rows = await db.soal.findMany({
    where: {
      // Only published soal with valid answers
      bankSoal: { isPublished: true },
    },
    select: {
      id: true,
      topik: true,
      difficulty: true,
      text: true,
      options: true,
      correctAnswer: true,
      kelas: true,
    },
    take: CANDIDATE_POOL_SIZE,
  });

  return rows
    .filter((r) => r.correctAnswer && r.correctAnswer.trim() !== "")
    .map((r) => ({
      id: r.id,
      source: "SOAL" as const,
      skill: mapSoalSkill(r.topik),
      difficulty: r.difficulty ?? null,
      questionText: r.text,
      options: JSON.stringify(r.options),
      isVerified: false, // Soal questions are not individually verified
      tingkat: r.kelas || null, // kelas as grade hint (e.g. "VII", "VIII")
      seksi: null,
      hasAudio: false,
    }));
}

/** Fetch all candidates from all sources */
export async function fetchAllCandidates(): Promise<DailyCandidate[]> {
  const [tka, ukbi, soal] = await Promise.all([
    fetchTKA().catch(() => [] as DailyCandidate[]),
    fetchUKBI().catch(() => [] as DailyCandidate[]),
    fetchSoal().catch(() => [] as DailyCandidate[]),
  ]);

  return [...tka, ...ukbi, ...soal];
}

// ── Skill Mapping ──────────────────────────────────────────────

function mapTKASkill(kompetensi: string): string | null {
  const k = kompetensi.toUpperCase();
  if (k.includes("LITERASI") || k.includes("MEMBACA")) return "READING";
  if (k.includes("MENULIS")) return "WRITING";
  if (k.includes("TATA") || k.includes("BAHASA")) return "GRAMMAR";
  if (k.includes("SASTRA")) return "LITERATURE";
  if (k.includes("SOSIAL") || k.includes("PROFESIONAL")) return "READING";
  return "READING";
}

function mapUKBISkill(seksi: string): string | null {
  switch (seksi) {
    case "MEMBACA":
      return "READING";
    case "MENULIS":
      return "WRITING";
    case "MENDENGARKAN":
      return "LISTENING";
    case "BERBICARA":
      return "SPEAKING";
    case "MERESPONS_KAIDAH":
      return "GRAMMAR";
    default:
      return "READING";
  }
}

function mapSoalSkill(topik: string | null): string | null {
  if (!topik) return "READING";
  const t = topik.toLowerCase();
  if (/huruf|bunyi|fonetik|ejaan|kalimat|konjungsi|paragraf|tanda baca/.test(t))
    return "GRAMMAR";
  if (/kosakata|kata baku|sinonim|antonim|imbuhan|idiom/.test(t)) return "VOCABULARY";
  if (/membaca|pemahaman|fakta|opini|ringkasan|teks/.test(t)) return "READING";
  if (/menulis|karangan|cerita|cerpen|artikel/.test(t)) return "WRITING";
  if (/puisi|prosa|sastra|drama|pantun/.test(t)) return "LITERATURE";
  return "READING";
}
