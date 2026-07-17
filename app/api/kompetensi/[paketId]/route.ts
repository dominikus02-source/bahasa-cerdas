import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { fisherYatesShuffle, shuffleOptionsForQuestion, createSessionSeed } from "@/lib/question-bank/randomization";
import type { AttemptSnapshot, QuestionSnapshot } from "@/lib/types/snapshot";
import { withQueryTimeout } from "@/lib/db/with-query-timeout";
import { ok, err } from "@/lib/api/response";
import { ERR } from "@/lib/api/errors";

const UKBI_TYPES = ["UKBI", "UKBI_SIMULASI", "UKBI_LATIHAN", "UKBI_SD", "UKBI_LATIHAN_SD", "UKBI_SMP", "UKBI_LATIHAN_SMP", "UKBI_SMA", "UKBI_LATIHAN_SMA", "UKBI_GURU_SIMULASI", "UKBI_GURU_LATIHAN"];

const MODULE_BOOT_MS = Date.now();

function isUKBI(type: string) {
  return UKBI_TYPES.includes(type);
}

function logPerf(label: string, data: Record<string, unknown>) {
  const processAgeMs = Date.now() - MODULE_BOOT_MS;
  console.log(JSON.stringify({
    event: `kompetensi_${label}`,
    processAgeMs,
    coldStart: processAgeMs < 5000,
    ...data,
    ts: new Date().toISOString(),
  }));
}

// UKBI question select — no correctAnswer sent to client
const UKBI_SELECT = { id: true, seksi: true, text: true, audioUrl: true, imageUrl: true, passage: true, type: true, options: true, difficulty: true, cognitive: true, domain: true, passageType: true, wordCount: true } as const;

// TKA question select — no correctAnswer sent to client
const TKA_SELECT = { id: true, kompetensi: true, subKompetensi: true, text: true, passage: true, type: true, options: true, difficulty: true, weight: true } as const;

// Snapshot select — includes correctAnswer for server-side scoring
const UKBI_SNAPSHOT_SELECT = { id: true, correctAnswer: true, difficulty: true, seksi: true } as const;
const TKA_SNAPSHOT_SELECT = { id: true, correctAnswer: true, weight: true, kompetensi: true } as const;

// Reading passages are stored only on the first question of each group in the
// bank; sibling questions have an empty passage. This build-time map (id ->
// group passage, forward-filled from the authoritative JSON order) patches those
// siblings so every reading question shows its "Bacaan" regardless of shuffle.
// NOTE: lazy-loaded to avoid 300KB JSON parse on every module init (cold start).

let _passageMap: Record<string, string> | null = null;

async function getPassageMap(): Promise<Record<string, string>> {
  if (!_passageMap) {
    const mod = await import("@/lib/kompetensi/passage-map.json");
    _passageMap = mod.default as Record<string, string>;
  }
  return _passageMap;
}

async function fillMissingPassages<T extends { id: string; passage?: string | null }>(rows: T[]): Promise<T[]> {
  if (rows.length === 0) return rows;
  const passageFillMap = await getPassageMap();
  for (const q of rows) {
    if ((!q.passage || !String(q.passage).trim()) && passageFillMap[q.id]) {
      q.passage = passageFillMap[q.id];
    }
  }
  return rows;
}

async function fetchUKBIQuestions(where: any, take?: number) {
  const rows = await db.uKBIQuestion.findMany({
    where,
    ...(take ? { take, orderBy: { difficulty: "asc" as const } } : {}),
    select: UKBI_SELECT,
  });
  return fillMissingPassages(rows);
}

async function fetchTKAQuestions(where: any, take?: number) {
  const rows = await db.tKAQuestion.findMany({
    where,
    ...(take ? { take, orderBy: { difficulty: "asc" as const } } : {}),
    select: TKA_SELECT,
  });
  return fillMissingPassages(rows);
}

async function fetchSectionByIds(
  section: any,
  ukbi: boolean
): Promise<any[]> {
  if (ukbi) {
    const where: any = { id: { in: section.questionIds }, isActive: true };
    if (section.seksi === "MENDENGARKAN") {
      where.audioUrl = { not: null };
    }
    return fetchUKBIQuestions(where);
  }
  return fetchTKAQuestions({ id: { in: section.questionIds }, isActive: true });
}

async function fetchSectionByCriteria(
  section: any,
  paketType: string,
  ukbi: boolean
): Promise<any[]> {
  const where: any = { isActive: true };
  if (ukbi) {
    if (section.seksi) where.seksi = section.seksi;
    // Only include listening questions that have audio available
    if (section.seksi === "MENDENGARKAN") {
      where.audioUrl = { not: null };
    }
  } else {
    if (section.kompetensi) where.kompetensi = section.kompetensi;
    if (section.subKompetensi) where.subKompetensi = section.subKompetensi;
  }

  if (paketType.includes("SD")) where.tingkat = "SD";
  else if (paketType.includes("SMP")) where.tingkat = "SMP";
  else if (paketType.includes("SMA")) where.tingkat = "SMA";
  else if (paketType.includes("GURU")) {
    // GURU: try GURU tingkat first, then fallback
    const guruWhere = { ...where, tingkat: "GURU" };
    if (ukbi) {
      const guruQuestions = await fetchUKBIQuestions(guruWhere, section.count);
      if (guruQuestions.length > 0) return guruQuestions;
    } else {
      const guruQuestions = await fetchTKAQuestions(guruWhere, section.count);
      if (guruQuestions.length > 0) return guruQuestions;
    }
    // Fallback: without tingkat filter
  }

  if (ukbi) {
    return fetchUKBIQuestions(where, section.count);
  }
  return fetchTKAQuestions(where, section.count);
}

async function fetchSectionGeneralFallback(
  section: any,
  paketType: string,
  ukbi: boolean
): Promise<any[]> {
  if (ukbi) {
    const baseWhere: any = { isActive: true };
    if (section.seksi === "MENDENGARKAN") {
      baseWhere.audioUrl = { not: null };
    }
    return fetchUKBIQuestions(baseWhere, section.count);
  }
  return fetchTKAQuestions({ isActive: true }, section.count);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paketId: string }> }
) {
  const t0 = Date.now();
  try {
    const { paketId } = await params;
    logPerf("GET_start", { paketId });
    const { searchParams } = new URL(req.url);
    const retry = searchParams.get("retry") === "1";

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log(`[kompetensi] Unauthorized access to paket ${paketId}`);
      return err(ERR.UNAUTHORIZED.error, ERR.UNAUTHORIZED.code, ERR.UNAUTHORIZED.status);
    }

    const [dbUser, paket] = await Promise.all([
      withQueryTimeout(db.user.findUnique({ where: { supabaseId: user.id } }), 5000, "User lookup timeout"),
      withQueryTimeout(db.paketKompetensi.findUnique({ where: { id: paketId } }), 5000, "Paket lookup timeout"),
    ]);

    if (!dbUser) {
      console.log(`[kompetensi] User not found for supabaseId ${user.id}`);
      return err(ERR.NOT_FOUND.error, ERR.NOT_FOUND.code, ERR.NOT_FOUND.status);
    }
    if (!paket) {
      console.log(`[kompetensi] Paket ${paketId} not found`);
      return err("Paket tidak ditemukan", "NOT_FOUND", 404);
    }

    const sectionCount = (paket.sectionsData as any[])?.length || (paket.sections as any[])?.length || 0;
    console.log(`[kompetensi] OK user=${dbUser.id} role=${dbUser.role} paket=${paketId} type=${paket.type} sections=${sectionCount}`);

    let session = await withQueryTimeout(
      db.testSession.findUnique({
        where: { userId_paketId: { userId: dbUser.id, paketId } },
      }),
      5000,
      "Session lookup timeout"
    );

    if (!session) {
      const duration = paket.duration || 30;
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + duration);

      session = await withQueryTimeout(
        db.testSession.create({
          data: {
            userId: dbUser.id,
            paketId,
            status: "IN_PROGRESS",
            expiresAt,
            startedAt: new Date(),
            answers: {},
            flagged: [],
          },
        }),
        5000,
        "Session create timeout"
      );
    } else if (session.status === "COMPLETED") {
      if (retry) {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + paket.duration);
        session = await withQueryTimeout(
          db.testSession.update({
            where: { id: session.id },
            data: { status: "IN_PROGRESS", expiresAt, startedAt: new Date(), answers: {}, flagged: [] },
          }),
          5000,
          "Session retry timeout"
        );
      } else {
        return err("Tes sudah selesai", "VALIDATION", 400);
      }
    }

    const sections = (paket.sectionsData as any[]) || (paket.sections as any[]) || [];
    const sessionSeed = createSessionSeed(dbUser.id, paket.id, session.createdAt?.getTime());
    const ukbi = isUKBI(paket.type);

    // ── PARALLEL SECTION QUERIES ──
    // All sections fetched in parallel via Promise.all instead of sequential for loop
    const rawSectionResults = await Promise.all(
      sections.map(async (section, i) => {
        let sectionQuestions: any[] = [];

        if (section.questionIds && section.questionIds.length > 0) {
          sectionQuestions = await withQueryTimeout(
            fetchSectionByIds(section, ukbi),
            10000,
            `Question fetch timeout (section ${i}: by IDs)`
          );
        } else if (section.count && section.count > 0) {
          sectionQuestions = await withQueryTimeout(
            fetchSectionByCriteria(section, paket.type, ukbi),
            10000,
            `Question fetch timeout (section ${i}: by criteria)`
          );

          // General fallback (non-GURU only) if criteria returned nothing
          if (sectionQuestions.length === 0 && !paket.type.includes("GURU")) {
            sectionQuestions = await withQueryTimeout(
              fetchSectionGeneralFallback(section, paket.type, ukbi),
              10000,
              `Question fetch timeout (section ${i}: fallback)`
            );
          }
        }

        // Shuffle questions within section
        sectionQuestions = fisherYatesShuffle(sectionQuestions, sessionSeed + "-sec" + i);

        // Shuffle options per question
        for (const q of sectionQuestions) {
          if (q.options && Array.isArray(q.options) && q.options.length > 1) {
            q.options = shuffleOptionsForQuestion(q.options, sessionSeed + "-q" + q.id);
          }
        }

        return {
          sectionIndex: i,
          sectionName: section.name,
          seksi: section.seksi,
          timeLimit: section.timeLimit,
          questions: sectionQuestions,
        };
      })
    );

    // ── SNAPSHOT ──
    const allIds: string[] = [];
    for (const section of rawSectionResults) {
      for (const q of section.questions) {
        allIds.push(q.id);
      }
    }

    interface SnapshotAnswerData {
      id: string
      correctAnswer: string
      difficulty: string
      seksi?: string
      weight?: number
      kompetensi?: string
    }

    let answerMap = new Map<string, SnapshotAnswerData>();
    if (allIds.length > 0) {
      if (ukbi) {
        const answers = await withQueryTimeout(
          db.uKBIQuestion.findMany({
            where: { id: { in: allIds } },
            select: UKBI_SNAPSHOT_SELECT,
          }),
          10000,
          "Snapshot fetch timeout"
        );
        answerMap = new Map(answers.map(a => [a.id, a as SnapshotAnswerData]));
      } else {
        const answers = await withQueryTimeout(
          db.tKAQuestion.findMany({
            where: { id: { in: allIds } },
            select: TKA_SNAPSHOT_SELECT,
          }),
          10000,
          "Snapshot fetch timeout"
        );
        answerMap = new Map(answers.map(a => [a.id, { ...a, difficulty: "" } as SnapshotAnswerData]));
      }
    }

    const questionOrder: string[] = [];
    const allSnapshots: QuestionSnapshot[] = [];

    for (const section of rawSectionResults) {
      for (const q of section.questions) {
        const answerData = answerMap.get(q.id);
        questionOrder.push(q.id);
        allSnapshots.push({
          id: q.id,
          product: ukbi ? "UKBI" : "TKA",
          section: answerData?.seksi || answerData?.kompetensi || section.seksi || section.sectionName,
          type: q.type,
          text: q.text,
          options: q.options,
          correctAnswer: answerData?.correctAnswer || "",
          difficulty: answerData?.difficulty || q.difficulty,
          weight: answerData?.weight,
          seksi: answerData?.seksi,
          kompetensi: answerData?.kompetensi,
        });
      }
    }

    await withQueryTimeout(
      db.testSession.update({
        where: { id: session.id },
        data: {
          questionSnapshot: JSON.parse(JSON.stringify({
            version: "1.0",
            createdAt: new Date().toISOString(),
            seed: sessionSeed,
            paketId: paket.id,
            userId: dbUser.id,
            questionOrder,
            questions: allSnapshots,
          })),
        },
      }),
      5000,
      "Snapshot save timeout"
    );

    const totalQuestions = rawSectionResults.reduce((sum, s) => sum + s.questions.length, 0);
    if (totalQuestions === 0) {
      return err("Tidak ada soal tersedia", "NOT_FOUND", 404);
    }

    const answers = session.answers as Record<string, string>;

    logPerf("GET_ok", { paketId, totalQuestions, totalMs: Date.now() - t0 });

    return ok({
      session: {
        id: session.id,
        status: session.status,
        startedAt: session.startedAt,
        expiresAt: session.expiresAt,
        currentSection: session.currentSection,
        currentQuestion: session.currentQuestion,
        answers,
        flagged: session.flagged,
      },
      paket: {
        id: paket.id,
        title: paket.title,
        description: paket.description,
        type: paket.type,
        mode: paket.mode,
        duration: paket.duration,
        passingScore: paket.passingScore,
        passingGrade: paket.passingGrade,
      },
      questions: rawSectionResults,
    });
  } catch (error: any) {
    logPerf("GET_error", { paketId: "unknown", error: error?.message, totalMs: Date.now() - t0 });
    console.error("GET /api/kompetensi/[paketId] error:", error);
    return err(ERR.INTERNAL.error, ERR.INTERNAL.code, ERR.INTERNAL.status);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ paketId: string }> }
) {
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

    const body = await req.json();
    const { answers, flagged } = body;

    const session = await db.testSession.findUnique({
      where: { userId_paketId: { userId: dbUser.id, paketId } },
    });

    if (!session) {
      return err("Session not found", "NOT_FOUND", 404);
    }

    if (session.status === "COMPLETED") {
      return err("Tes sudah selesai", "VALIDATION", 400);
    }

    await db.testSession.update({
      where: { id: session.id },
      data: {
        ...(answers !== undefined ? { answers } : {}),
        ...(flagged !== undefined ? { flagged } : {}),
      },
    });

    return ok({ saved: true });
  } catch (error: any) {
    console.error("PATCH /api/kompetensi/[paketId] error:", error);
    return err(ERR.INTERNAL.error, ERR.INTERNAL.code, ERR.INTERNAL.status);
  }
}
