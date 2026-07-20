import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { rateLimitRoute } from "@/lib/rate-limit";
import { calcLevel, calcLeagueFromXP } from "@/lib/xp";
import { ok, err } from "@/lib/api/response";
import { ERR } from "@/lib/api/errors";
import type { AttemptSnapshot, AttemptAnswerDetails, UserAnswerRecord } from "@/lib/types/snapshot";
import { gradeConstructed } from "@/lib/penilaian/ai-grade";
import { acquireAiSlot } from "@/lib/ai-concurrency";

const PERF_LOG = true;

function perfLog(label: string, data: Record<string, unknown>) {
  if (PERF_LOG) console.log(`[SUBMIT_PERF] ${label}`, data);
}

async function getLatestProgres(userId: string, paketId: string) {
  return db.progresKompetensi.findFirst({
    where: { userId, paketId },
    orderBy: { attemptNumber: "desc" },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paketId: string }> }
) {
  const t0 = Date.now();
  try {
    const { paketId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return err(ERR.UNAUTHORIZED.error, ERR.UNAUTHORIZED.code, ERR.UNAUTHORIZED.status);
    }

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) {
      return err(ERR.NOT_FOUND.error, ERR.NOT_FOUND.code, ERR.NOT_FOUND.status);
    }

    const latestResult = await getLatestProgres(dbUser.id, paketId);

    if (!latestResult) {
      return ok({ result: null });
    }

    perfLog("GET", { paketId, ms: Date.now() - t0 });

    return ok({
      result: {
        id: latestResult.id,
        paketId: latestResult.paketId,
        attemptNumber: latestResult.attemptNumber,
        totalScore: latestResult.totalScore,
        rawScore: latestResult.rawScore,
        maxScore: latestResult.maxScore,
        percentage: latestResult.percentage,
        predikat: latestResult.predikat,
        status: latestResult.status,
        sectionScores: latestResult.sectionScores,
        startedAt: latestResult.startedAt?.toISOString(),
        finishedAt: latestResult.finishedAt?.toISOString(),
        timeSpent: latestResult.timeSpent,
        certificate: undefined,
      },
    });
  } catch (error) {
    console.error("GET /api/kompetensi/[paketId]/submit error:", error);
    return err(ERR.INTERNAL.error, ERR.INTERNAL.code, ERR.INTERNAL.status);
  }
}

function getUKBIPredikat(score: number): { predikat: string; predikatLama: string } {
  if (score >= 725) return { predikat: "Istimewa", predikatLama: "I" };
  if (score >= 641) return { predikat: "Sangat Unggul", predikatLama: "II" };
  if (score >= 578) return { predikat: "Unggul", predikatLama: "III" };
  if (score >= 482) return { predikat: "Madya", predikatLama: "IV" };
  if (score >= 405) return { predikat: "Semenjana", predikatLama: "V" };
  if (score >= 326) return { predikat: "Marginal", predikatLama: "VI" };
  return { predikat: "Terbatas", predikatLama: "VII" };
}

function getTKAPredikat(percentage: number): string {
  if (percentage >= 85) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 55) return "C";
  return "D";
}

// ── Batch submission: collect answers in memory → single createMany ──

interface AnswerRow {
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

type AnswerMap = Record<string, string>;

function buildAnswerRows(
  questions: any[],
  answers: AnswerMap,
  sessionId: string,
  userId: string,
  paketId: string,
  scoringFn: (q: any, userAnswer: string) => { isCorrect: boolean; score: number; seksi: string },
  useCompetencyKey: boolean
): { rows: AnswerRow[]; userAnswerRecords: UserAnswerRecord[]; totalCorrect: number; totalQuestions: number; rawScore: number; sectionScores: Record<string, { correct: number; total: number; score: number; pendingReview?: number; graded?: number }> } {
  const rows: AnswerRow[] = [];
  const userAnswerRecords: UserAnswerRecord[] = [];
  const sectionScores: Record<string, { correct: number; total: number; score: number; pendingReview?: number; graded?: number }> = {};
  let totalCorrect = 0;
  let totalQuestions = 0;
  let rawScore = 0;

  for (const q of questions) {
    const userAnswer = answers[q.id] || "";
    const { isCorrect, score, seksi } = scoringFn(q, userAnswer);

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
    totalQuestions++;
    if (isCorrect) totalCorrect++;

    if (!sectionScores[seksi]) sectionScores[seksi] = { correct: 0, total: 0, score: 0 };
    sectionScores[seksi].total++;
    if (isCorrect) {
      sectionScores[seksi].correct++;
      sectionScores[seksi].score += score;
    }

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

  return { rows, userAnswerRecords, totalCorrect, totalQuestions, rawScore, sectionScores };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ paketId: string }> }
) {
  const t0 = Date.now();
  try {
    const rateLimitResponse = await rateLimitRoute(req, {
      maxRequests: 30,
      windowSeconds: 60,
      identifier: "simulation-submit",
    });
    if (rateLimitResponse) return rateLimitResponse;

    const { paketId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return err(ERR.UNAUTHORIZED.error, ERR.UNAUTHORIZED.code, ERR.UNAUTHORIZED.status);
    }

    const authMs = Date.now() - t0;

    // Fetch DB user + paket in parallel
    const [dbUser, paket] = await Promise.all([
      db.user.findUnique({ where: { supabaseId: user.id } }),
      db.paketKompetensi.findUnique({ where: { id: paketId } }),
    ]);

    if (!dbUser) return err(ERR.NOT_FOUND.error, ERR.NOT_FOUND.code, ERR.NOT_FOUND.status);
    if (!paket) return err("Paket tidak ditemukan", "NOT_FOUND", 404);

    const lookupMs = Date.now() - t0;

    const { answers, timeSpent } = await req.json();

    // Guard against completing a test with an empty answers payload. A paket
    // with real questions but zero submitted answers is never a legitimate
    // finish — it means the client lost its answer state before POSTing
    // (a mid-test reload is the leading suspect: the autosave used to be a
    // debounce that could go a whole test without firing, so a remount would
    // rehydrate from an empty session.answers and silently wipe local state).
    // Recording that as a COMPLETED 0-score attempt would burn the student's
    // attempt and show a misleading result, so this is rejected BEFORE the
    // session is marked COMPLETED — the student can simply resubmit with their
    // real answers, no retry flow needed.
    const expectedQuestionCount = ((paket.sectionsData as any[]) || (paket.sections as any[]) || [])
      .reduce((s: number, sec: any) => s + (sec.count || sec.questionIds?.length || 0), 0);
    if (expectedQuestionCount > 0 && Object.keys(answers || {}).length === 0) {
      return err(
        "Jawaban tidak diterima server — kemungkinan koneksi terputus atau halaman ter-refresh saat tes berlangsung. Tes ini BELUM dianggap selesai; silakan jawab ulang dan kirim kembali.",
        "EMPTY_ANSWERS",
        400
      );
    }

    let session = await db.testSession.findUnique({
      where: { userId_paketId: { userId: dbUser.id, paketId } },
    });

    if (!session) {
      session = await db.testSession.create({
        data: {
          userId: dbUser.id,
          paketId,
          status: "COMPLETED",
          startedAt: new Date(),
          finishedAt: new Date(),
          answers: answers || {},
        },
      });
    } else {
      session = await db.testSession.update({
        where: { id: session.id },
        data: { status: "COMPLETED", finishedAt: new Date() },
      });
    }

    const sessionMs = Date.now() - t0;

    // Idempotency: if already scored, return existing result
    const existingProgres = await getLatestProgres(dbUser.id, paketId);
    if (existingProgres && existingProgres.status === "COMPLETED") {
      const passingScore = paket.type?.includes("TKA") ? (paket.passingScore || 55) : 482;
      perfLog("ALREADY_SCORED", { paketId, totalMs: Date.now() - t0 });
      return ok({
        result: {
          totalScore: existingProgres.totalScore || 0,
          percentage: existingProgres.percentage || 0,
          predikat: existingProgres.predikat || "",
          rawScore: existingProgres.rawScore || 0,
          seksiScores: existingProgres.sectionScores || {},
          passed: (existingProgres.totalScore || 0) >= passingScore,
        },
        attemptNumber: existingProgres.attemptNumber,
        alreadyScored: true,
      });
    }

    const rawSnapshot = session.questionSnapshot as AttemptSnapshot | null;
    const snapshotQuestions = rawSnapshot?.questions || null;
    const allAnswerIds = Object.keys(answers || {});
    const isUKBI = paket.type.includes("UKBI");

    let questions: any[];
    if (snapshotQuestions && snapshotQuestions.length > 0) {
      questions = snapshotQuestions.filter((q: any) => allAnswerIds.includes(q.id));
    } else {
      console.warn(`[snapshot] No snapshot for session ${session.id}, falling back to live DB`);
      questions = await (isUKBI
        ? db.uKBIQuestion.findMany({ where: { id: { in: allAnswerIds }, isActive: true } })
        : db.tKAQuestion.findMany({ where: { id: { in: allAnswerIds }, isActive: true } })
      );
    }

    const scoringT0 = Date.now();
    const { rows: answerRows, userAnswerRecords, totalCorrect, totalQuestions, rawScore, sectionScores } = buildAnswerRows(
      questions,
      answers as AnswerMap,
      session.id,
      dbUser.id,
      paketId,
      isUKBI
        ? (q: any, ua: string) => {
            const isCorrect = ua === q.correctAnswer;
            const diff = String(q.difficulty || "MEDIUM");
            const w = diff === "EASY" ? 1 : diff === "MEDIUM" ? 1.5 : diff === "HARD" ? 2 : 2.5;
            return { isCorrect, score: isCorrect ? w * 10 : 0, seksi: q.seksi || q.section || "UMUM" };
          }
        : (q: any, ua: string) => {
            const isCorrect = ua === q.correctAnswer;
            return { isCorrect, score: isCorrect ? (q.weight || 1) * 10 : 0, seksi: q.kompetensi || q.section || "UMUM" };
          },
      !isUKBI
    );
    const scoringMs = Date.now() - scoringT0;

    // ── Penilaian OTOMATIS jawaban konstruktif (Menulis/Berbicara) via AI ──
    // Menulis: teks dinilai LLM; Berbicara: rekaman ditranskrip (Whisper) lalu
    // dinilai. Fail-safe: bila AI gagal, skor 0 (tak menggagalkan submit).
    // Ditampilkan sebagai bar seksi terpisah (0–100), TIDAK mengubah band UKBI utama.
    const constructedRows = answerRows.filter(
      (r) =>
        String(r.questionType || "").toUpperCase() === "CONSTRUCTED" ||
        ["MENULIS", "BERBICARA"].includes(String(r.seksi || "").toUpperCase())
    );
    if (constructedRows.length > 0) {
      const qMap = new Map<string, any>((questions as any[]).map((q: any) => [q.id, q]));
      // Rubrik/prompt konstruktif diambil langsung dari DB (bukan snapshot) karena
      // snapshot/pool yang dikirim ke client sudah disanitasi (rubrik dibuang agar
      // tak bocor). Grading butuh rubrik asli.
      const cIds = constructedRows.map((r) => r.questionId).filter(Boolean) as string[];
      const cRows =
        cIds.length > 0
          ? await db.uKBIQuestion.findMany({
              where: { id: { in: cIds } },
              select: { id: true, text: true, options: true, seksi: true },
            })
          : [];
      const metaMap = new Map<string, any>(cRows.map((q) => [q.id, q]));
      // Constructed answers are graded by an upstream LLM, so this is the one
      // part of scoring that can fail for reasons unrelated to the student.
      // Two safeguards:
      //
      // 1. Backpressure. Each call takes a slot from the global AI concurrency
      //    gate. A cohort submitting together would otherwise fire hundreds of
      //    provider calls at once and trigger upstream 429s.
      // 2. Ungraded answers are NEVER averaged in as zero. gradeConstructed is
      //    fail-safe and returns { score: 0, graded: false } when the provider
      //    fails — a flag this route previously discarded, so a provider outage
      //    silently handed every student a 0 for Menulis and Berbicara. Ungraded
      //    answers are now excluded from the average and reported as pending, so
      //    a teacher can see what still needs marking.
      const agg: Record<string, { sum: number; n: number; pending: number }> = {};
      const bumpSection = (sk: string) => (agg[sk] ??= { sum: 0, n: 0, pending: 0 });

      await Promise.allSettled(
        constructedRows.map(async (r) => {
          const q = metaMap.get(r.questionId || "") || qMap.get(r.questionId || "");
          const meta =
            q?.options && typeof q.options === "object" && !Array.isArray(q.options) ? q.options : {};
          const sk = String(r.seksi || q?.seksi || "MENULIS").toUpperCase();

          const slot = await acquireAiSlot({ pool: "grade-constructed" });
          if (!slot) {
            // Saturated past the wait window — leave it for manual marking
            // rather than recording an unearned zero.
            r.score = 0;
            r.isCorrect = null;
            bumpSection(sk).pending += 1;
            return;
          }

          try {
            const res = await gradeConstructed({
              seksi: r.seksi || q?.seksi || "MENULIS",
              prompt: q?.text || "",
              rubric: (meta as any)?.rubric || null,
              answer: r.answer || "",
            });
            if (!res.graded) {
              r.score = 0;
              r.isCorrect = null;
              bumpSection(sk).pending += 1;
              return;
            }
            r.score = res.score;
            r.isCorrect = res.score >= 60;
            const a = bumpSection(sk);
            a.sum += res.score;
            a.n += 1;
          } finally {
            await slot.release();
          }
        })
      );

      let pendingTotal = 0;
      for (const [sk, a] of Object.entries(agg)) {
        pendingTotal += a.pending;
        const avg = a.n > 0 ? Math.round(a.sum / a.n) : 0;
        sectionScores[sk] = {
          correct: avg,
          total: 100,
          score: avg,
          // Consumed by the result page so an unmarked section reads as
          // "menunggu penilaian" instead of a legitimate zero.
          ...(a.pending > 0 ? { pendingReview: a.pending, graded: a.n } : {}),
        };
      }
      if (pendingTotal > 0) {
        console.warn(
          `[kompetensi/submit] ${pendingTotal} jawaban konstruktif belum ternilai (paket=${paketId} user=${dbUser.id}) — menunggu penilaian manual`
        );
      }
    }

    const maxPossible = isUKBI
      ? totalQuestions * 2.5 * 10
      : totalQuestions * 2;
    const percentage = maxPossible > 0 ? (rawScore / maxPossible) * 100 : 0;

    // ── BATCH WRITE in transaction ──
    const writeT0 = Date.now();
    const nextAttempt = (existingProgres?.attemptNumber || 0) + 1;

    // Batched ($transaction([...])) rather than interactive ($transaction(fn)).
    // The three statements are independent, so they do not need a connection held
    // open across round trips — and holding one is what exhausts the pgbouncer
    // pool (connection_limit is 5 per instance) when a whole cohort submits at
    // once, surfacing as P2024 timeouts. Same atomicity, one round trip.
    const writeOps = [
      // 1. Clear old answers for this session (safe—scoped to sessionId)
      db.testAnswer.deleteMany({ where: { sessionId: session.id } }),
      // 2. Batch insert all answers (1 query instead of 30)
      ...(answerRows.length > 0 ? [db.testAnswer.createMany({ data: answerRows })] : []),
      // 3. Create progres (unique constraint on userId+paketId+attemptNumber prevents duplicates)
      db.progresKompetensi.create({
        data: {
          userId: dbUser.id,
          paketId,
          attemptNumber: nextAttempt,
          status: "COMPLETED",
          totalScore: isUKBI ? Math.round(percentage * 8) : Math.round(percentage),
          rawScore,
          maxScore: maxPossible,
          percentage,
          predikat: isUKBI ? getUKBIPredikat(Math.round(percentage * 8)).predikat : getTKAPredikat(percentage),
          predikatLama: isUKBI ? getUKBIPredikat(Math.round(percentage * 8)).predikatLama : null,
          sectionScores: buildSectionScores(sectionScores),
          answerDetails: JSON.parse(JSON.stringify(buildDetails(
            isUKBI, paketId, nextAttempt, session, rawSnapshot, userAnswerRecords,
            totalQuestions, totalCorrect, rawScore, percentage,
            isUKBI ? getUKBIPredikat(Math.round(percentage * 8)).predikat : getTKAPredikat(percentage),
            sectionScores
          ))),
          finishedAt: new Date(),
          timeSpent: timeSpent || 0,
        },
      }),
    ];
    const writeResults = await db.$transaction(writeOps);
    const progres = writeResults[writeResults.length - 1] as Awaited<ReturnType<typeof db.progresKompetensi.create>>;
    const writeMs = Date.now() - writeT0;

    // ── Certificate (outside transaction—non-critical) ──
    let certificate = null;
    const passingThreshold = isUKBI ? 482 : (paket.passingScore || 55);
    const finalScore = isUKBI ? Math.round(percentage * 8) : Math.round(percentage);
    if (isUKBI ? finalScore >= passingThreshold : percentage >= passingThreshold) {
      const prefix = isUKBI ? "BC-UKBI" : "BC-TKA";
      const certNo = `${prefix}-${new Date().getFullYear()}-${String(progres.id).slice(-8).toUpperCase()}`;
      certificate = await db.kompetensiCertificate.create({
        data: {
          userId: dbUser.id,
          paketId,
          progresId: progres.id,
          score: finalScore,
          predikat: isUKBI ? getUKBIPredikat(finalScore).predikat : getTKAPredikat(percentage),
          percentage,
          certificateNo: certNo,
        },
      });
    }

    // ── XP Update ──
    const xpGain = isUKBI ? Math.round(rawScore / 10) : Math.round(rawScore);
    const newXp = dbUser.xp + xpGain;
    await db.user.update({
      where: { id: dbUser.id },
      data: { xp: newXp, level: calcLevel(newXp), league: calcLeagueFromXP(newXp) },
    });

    const totalMs = Date.now() - t0;
    perfLog("SUBMIT_OK", { paketId, answersCount: answerRows.length, scoringMs, writeMs, totalMs });

    const resultPayload: Record<string, unknown> = {
      totalScore: finalScore,
      percentage: Math.round(percentage * 100) / 100,
      predikat: isUKBI ? getUKBIPredikat(finalScore).predikat : getTKAPredikat(percentage),
      benar: totalCorrect,
      salah: totalQuestions - totalCorrect,
      total: totalQuestions,
      rawScore,
      seksiScores: buildSectionScores(sectionScores),
      passed: finalScore >= passingThreshold,
    };

    if (!isUKBI) {
      resultPayload.passingScore = paket.passingScore;
      resultPayload.predikatLama = undefined;
    } else {
      resultPayload.predikatLama = getUKBIPredikat(finalScore).predikatLama;
    }

    return ok({
      result: resultPayload,
      certificate,
      attemptNumber: nextAttempt,
    });
  } catch (error: any) {
    // If unique constraint fails on progres (double submit race), return existing
    if (error?.code === "P2002" && error?.meta?.target?.includes?.("attemptNumber")) {
      const existing = await getLatestProgres((await db.user.findFirst({ where: { supabaseId: (await (await createClient()).auth.getUser()).data.user?.id } }))?.id || "", "");
      if (existing) {
        return ok({
          result: { totalScore: existing.totalScore, percentage: existing.percentage, predikat: existing.predikat },
          alreadyScored: true,
        });
      }
    }
    console.error("POST /api/kompetensi/[paketId]/submit error:", error);
    return err(ERR.INTERNAL.error, ERR.INTERNAL.code, ERR.INTERNAL.status);
  }
}

function buildSectionScores(sectionScores: Record<string, { correct: number; total: number; score: number; pendingReview?: number; graded?: number }>) {
  return Object.fromEntries(
    Object.entries(sectionScores).map(([key, val]) => [
      key,
      {
        benar: val.correct,
        salah: val.total - val.correct,
        total: val.total,
        skor: val.score,
        score: val.score,
        percentage: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
        // Propagated so the result page can render "menunggu penilaian" rather
        // than presenting an unmarked section as a zero.
        ...(val.pendingReview ? { pendingReview: val.pendingReview, graded: val.graded ?? 0 } : {}),
      },
    ])
  );
}

function buildDetails(
  isUKBI: boolean,
  paketId: string,
  nextAttempt: number,
  session: any,
  rawSnapshot: AttemptSnapshot | null,
  userAnswerRecords: UserAnswerRecord[],
  totalQuestions: number,
  totalCorrect: number,
  rawScore: number,
  percentage: number,
  predicate: string,
  sectionScores: Record<string, { correct: number; total: number; score: number; pendingReview?: number; graded?: number }>
): AttemptAnswerDetails {
  const base = {
    version: "1.0",
    attemptId: `${paketId}-${nextAttempt}-${Date.now()}`,
    sessionId: session.id,
    paketId,
    userId: session.userId,
    startedAt: session.startedAt?.toISOString() || new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    seed: rawSnapshot?.seed || "",
    snapshot: rawSnapshot ? rawSnapshot : undefined,
    userAnswers: userAnswerRecords,
    audit: {
      scoredFromSnapshot: true,
      liveDbFallbackUsed: !rawSnapshot,
      snapshotVersion: "1.0",
    },
  } as AttemptAnswerDetails;

  if (isUKBI) {
    base.product = "UKBI";
    base.scoring = {
      totalQuestions,
      correctCount: totalCorrect,
      rawScore,
      percentage,
      scaledScore: Math.round(percentage * 8),
      predicate,
      sectionBreakdown: sectionScores as Record<string, unknown>,
    };
  } else {
    base.product = "TKA";
    base.scoring = {
      totalQuestions,
      correctCount: totalCorrect,
      rawScore,
      percentage,
      predicate,
      competencyBreakdown: sectionScores as Record<string, unknown>,
    };
  }

  return base;
}