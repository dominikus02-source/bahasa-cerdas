/**
 * Canonical answer-row assembly + scoring aggregation for UKBI/TKA submissions.
 *
 * Also hosts the two production scoring lambdas (ukbiScoringFn / tkaScoringFn),
 * extracted verbatim from the submit route (2026-09-17, assessment-engine QA
 * hardening) so tests can import the EXACT production functions instead of
 * re-deriving their semantics. The route imports them from here — this module
 * is the single source of truth for scoring.
 *
 * Extracted verbatim from app/api/kompetensi/[paketId]/submit/route.ts (2026-09-16,
 * HTTP-E2E audit phase) so the pure scoring path is directly testable. The route
 * remains the only caller and the scoring semantics are untouched:
 *
 *   - TKA lambda:    isCorrect = userAnswer === q.correctAnswer, score = (weight||1)*10
 *   - UKBI lambda:   isCorrect = userAnswer === q.correctAnswer, score = difficulty-weighted
 *   - Constructed sections (MENULIS/BERBICARA/CONSTRUCTED) are stored but excluded
 *     from automatic scoring (teacher/AI graded separately).
 *
 * The function is PURE: no db, no network, no request context. All inputs are
 * supplied by the caller (questions from the session snapshot, answers from the
 * request body, the scoringFn from the route).
 */
import type { UserAnswerRecord } from "@/lib/types/snapshot";

/**
 * UKBI scoring — difficulty-weighted (verbatim from the submit route).
 * EASY=1, MEDIUM=1.5, HARD=2, anything else=2.5; correct answer scores weight*10.
 * An empty/unknown userAnswer simply compares unequal — never throws.
 */
export function ukbiScoringFn(q: any, ua: string): { isCorrect: boolean; score: number; maxScore: number; seksi: string } {
  const isCorrect = ua === q.correctAnswer;
  const diff = String(q.difficulty || "MEDIUM");
  const w = diff === "EASY" ? 1 : diff === "MEDIUM" ? 1.5 : diff === "HARD" ? 2 : 2.5;
  return { isCorrect, score: isCorrect ? w * 10 : 0, maxScore: w * 10, seksi: q.seksi || q.section || "UMUM" };
}

/**
 * TKA scoring — flat weight-based (verbatim from the submit route).
 * maxScore = (weight||1)*10 regardless of difficulty; TKA snapshots carry no
 * difficulty by design (the GET route zeroes it in the answer map).
 */
export function tkaScoringFn(q: any, ua: string): { isCorrect: boolean; score: number; maxScore: number; seksi: string } {
  const isCorrect = ua === q.correctAnswer;
  const wMax = (q.weight || 1) * 10;
  return { isCorrect, score: isCorrect ? wMax : 0, maxScore: wMax, seksi: q.kompetensi || q.section || "UMUM" };
}

export interface AnswerRow {
  userId: string;
  sessionId: string;
  paketId: string;
  questionId: string;
  questionType: string;
  answer: string;
  // null = not evaluated yet (AI grading unavailable), distinct from false =
  // evaluated and wrong. score stays 0 because the column is non-nullable.
  isCorrect: boolean | null;
  score: number;
  seksi: string;
}

export type AnswerMap = Record<string, string>;

export type SectionScoreAccumulator = Record<
  string,
  { correct: number; total: number; score: number; pendingReview?: number; graded?: number; constructed?: boolean }
>;

export function buildAnswerRows(
  questions: any[],
  answers: AnswerMap,
  sessionId: string,
  userId: string,
  paketId: string,
  scoringFn: (q: any, userAnswer: string) => { isCorrect: boolean; score: number; maxScore: number; seksi: string },
  useCompetencyKey: boolean
): { rows: AnswerRow[]; userAnswerRecords: UserAnswerRecord[]; totalCorrect: number; totalQuestions: number; rawScore: number; maxPossible: number; sectionScores: SectionScoreAccumulator; scoredWithDifficulty: number; difficultyCarried: number } {
  const rows: AnswerRow[] = [];
  const userAnswerRecords: UserAnswerRecord[] = [];
  const sectionScores: SectionScoreAccumulator = {};
  let totalCorrect = 0;
  let totalQuestions = 0;
  let rawScore = 0;
  let maxPossible = 0;
  let scoredWithDifficulty = 0;
  let difficultyCarried = 0;

  for (const q of questions) {
    const userAnswer = answers[q.id] || "";
    const { isCorrect, score, maxScore, seksi } = scoringFn(q, userAnswer);

    // Seksi konstruktif (Menulis/Berbicara) dinilai MANUAL oleh guru — jawaban
    // (teks / URL rekaman) tetap disimpan untuk ditinjau, tapi TIDAK ikut skor otomatis.
    const isConstructed =
      String(q.type || "").toUpperCase() === "CONSTRUCTED" ||
      ["MENULIS", "BERBICARA"].includes(String(seksi).toUpperCase());

    rows.push({
      userId,
      sessionId,
      paketId,
      questionId: q.id,
      questionType: q.type || (isConstructed ? "CONSTRUCTED" : "PILIHAN_GANDA"),
      answer: userAnswer,
      isCorrect: isConstructed ? false : isCorrect,
      score: isConstructed ? 0 : score,
      seksi,
    });

    if (isConstructed) continue; // keluar dari perhitungan skor otomatis

    rawScore += score;
    maxPossible += maxScore;
    totalQuestions++;
    if (isCorrect) totalCorrect++;

    if (!sectionScores[seksi]) sectionScores[seksi] = { correct: 0, total: 0, score: 0 };
    sectionScores[seksi].total++;
    if (isCorrect) {
      sectionScores[seksi].correct++;
      sectionScores[seksi].score += score;
    }

    // UKBI flag: the snapshot answer-map zeroes TKA difficulty (single scoring
    // contract per product), so the presence of a real difficulty value is the
    // discriminator. UKBI uses difficulty weighting; TKA does not.
    const hasRealDifficulty = typeof q.difficulty === "string" && q.difficulty.length > 0;
    if (hasRealDifficulty && isCorrect) scoredWithDifficulty++;
    if (hasRealDifficulty) difficultyCarried++;

    if (useCompetencyKey) {
      userAnswerRecords.push({
        questionId: q.id,
        selectedOptionId: userAnswer,
        isCorrect,
        score,
        kompetensi: seksi,
      } as UserAnswerRecord);
    } else {
      userAnswerRecords.push({
        questionId: q.id,
        selectedOptionId: userAnswer,
        isCorrect,
        score,
        section: seksi,
      } as UserAnswerRecord);
    }
  }

  return { rows, userAnswerRecords, totalCorrect, totalQuestions, rawScore, maxPossible, sectionScores, scoredWithDifficulty, difficultyCarried };
}
