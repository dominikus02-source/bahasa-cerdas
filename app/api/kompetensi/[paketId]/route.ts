import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { fisherYatesShuffle, shuffleOptionsForQuestion, createSessionSeed } from "@/lib/question-bank/randomization";
import type { AttemptSnapshot, QuestionSnapshot } from "@/lib/types/snapshot";
import { withQueryTimeout } from "@/lib/db/with-query-timeout";
import { ok, err } from "@/lib/api/response";
import { ERR } from "@/lib/api/errors";
import { resolvePlan, getFeatureLimit, consumeUsageGuarded, FeatureLimitError } from "@/lib/premium-economy";
import cache from "@/lib/redis";

// TTL cache pool soal & paket (server-side, Upstash). Bump versi kunci saat
// bentuk data pool berubah agar cache lama otomatis di-bypass. Data yang
// di-cache BEBAS kunci jawaban (UKBI_SELECT/TKA_SELECT tanpa correctAnswer) —
// snapshot jawaban tetap diambil langsung dari DB. Perubahan bank soal
// terpropagasi dalam <= TTL. Nol perubahan jika Upstash tak diset (getOrSet
// jatuh ke fungsi fetch aslinya).
const POOL_CACHE_VERSION = "v4";
const POOL_TTL = Number(process.env.SIM_POOL_TTL || 300);

const UKBI_TYPES = ["UKBI", "UKBI_SIMULASI", "UKBI_LATIHAN", "UKBI_SD", "UKBI_LATIHAN_SD", "UKBI_SMP", "UKBI_LATIHAN_SMP", "UKBI_SMA", "UKBI_LATIHAN_SMA", "UKBI_GURU_SIMULASI", "UKBI_GURU_LATIHAN"];

function isUKBI(type: string) {
  return UKBI_TYPES.includes(type);
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
import passageFillMap from "@/lib/kompetensi/passage-map.json";
const PASSAGE_MAP = passageFillMap as Record<string, string>;

function fillMissingPassages<T extends { id: string; passage?: string | null }>(rows: T[]): T[] {
  for (const q of rows) {
    if ((!q.passage || !String(q.passage).trim()) && PASSAGE_MAP[q.id]) {
      q.passage = PASSAGE_MAP[q.id];
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

// Resolve the answer-free candidate pool for one section (pre-shuffle). Same
// output for a given paket+section across all users, so it is cache-friendly.
// The per-session shuffle happens AFTER this, on a fresh per-request copy.
// Soal konstruktif (Menulis/Berbicara) menaruh metadata di `options`:
// {instruction, constraints, rubric, scoringMode, sampleExpectedResponse}.
// rubric/scoringMode/sampleExpectedResponse adalah kunci penilaian → JANGAN
// dikirim ke client (bocor). Client hanya butuh instruction + constraints.
// Penilaian AI di submit membaca rubrik langsung dari DB, bukan dari client.
function sanitizeConstructedPool(pool: any[]): any[] {
  for (const q of pool) {
    const isConstructed =
      q?.type === "CONSTRUCTED" || q?.seksi === "MENULIS" || q?.seksi === "BERBICARA";
    if (isConstructed && q.options && typeof q.options === "object" && !Array.isArray(q.options)) {
      const o = q.options as any;
      q.options = { instruction: o.instruction ?? null, constraints: o.constraints ?? null };
    }
  }
  return pool;
}

async function resolveSectionPool(
  section: any,
  paketType: string,
  ukbi: boolean,
  sectionIndex: number
): Promise<any[]> {
  if (section.questionIds && section.questionIds.length > 0) {
    const pool = await withQueryTimeout(
      fetchSectionByIds(section, ukbi),
      10000,
      `Question fetch timeout (section ${sectionIndex}: by IDs)`
    );
    return sanitizeConstructedPool(pool);
  }
  if (section.count && section.count > 0) {
    let pool = await withQueryTimeout(
      fetchSectionByCriteria(section, paketType, ukbi),
      10000,
      `Question fetch timeout (section ${sectionIndex}: by criteria)`
    );
    // General fallback (non-GURU only) if criteria returned nothing
    if (pool.length === 0 && !paketType.includes("GURU")) {
      pool = await withQueryTimeout(
        fetchSectionGeneralFallback(section, paketType, ukbi),
        10000,
        `Question fetch timeout (section ${sectionIndex}: fallback)`
      );
    }
    return sanitizeConstructedPool(pool);
  }
  return [];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paketId: string }> }
) {
  try {
    const { paketId } = await params;
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
      // Paket bersifat statis lintas pengguna → cache TTL (server-side).
      cache.getOrSet(
        `komp:paket:${POOL_CACHE_VERSION}:${paketId}`,
        () => withQueryTimeout(db.paketKompetensi.findUnique({ where: { id: paketId } }), 5000, "Paket lookup timeout"),
        POOL_TTL
      ),
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

    // ── PREMIUM GATE + SESSION (satu transaksi) ──
    // Kuota simulasi dikonsumsi HANYA saat attempt baru benar-benar dimulai
    // (session dibuat / retry reset). Replay sesi IN_PROGRESS, autosave
    // (PATCH), dan halaman hasil tidak pernah mengonsumsi.
    // Konsumsi dilakukan DI DALAM transaksi yang sama dengan create/reset —
    // bila kuota habis (FeatureLimitError), transaksi rollback dan session
    // tidak ditinggalkan setengah jalan.
    const { plan: simPlan } = await resolvePlan(dbUser.id);
    const simLimit = await getFeatureLimit(simPlan, "SIMULATION_MONTHLY_LIMIT");

    type AttemptStart =
      | { mode: "replay"; session: Awaited<ReturnType<typeof db.testSession.findUnique>> }
      | { mode: "completed"; session: Awaited<ReturnType<typeof db.testSession.findUnique>> }
      | { mode: "attempt"; session: NonNullable<Awaited<ReturnType<typeof db.testSession.findUnique>>> };

    let attempt: AttemptStart;
    try {
      attempt = await db.$transaction(async (tx) => {
        const existing = await tx.testSession.findUnique({
          where: { userId_paketId: { userId: dbUser.id, paketId } },
        });
        const now = new Date();
        const isExpired =
          existing?.status === "IN_PROGRESS" &&
          existing.expiresAt &&
          existing.expiresAt < now;

        if (existing && existing.status === "IN_PROGRESS" && !isExpired) {
          // Replay sesi berjalan — TANPA konsumsi kuota.
          return { mode: "replay", session: existing };
        }

        if (existing && (existing.status === "COMPLETED" || isExpired)) {
          if (!retry) {
            return { mode: "completed", session: existing };
          }
          const expiresAt = new Date(now.getTime() + (paket.duration || 30) * 60000);
          // updateMany dengan predikat status → hanya SATU request yang bisa
          // me-reset (double-click tidak menggandakan konsumsi).
          const reset = await tx.testSession.updateMany({
            where: {
              id: existing.id,
              OR: [
                { status: "COMPLETED" },
                { status: "IN_PROGRESS", expiresAt: { lt: now } },
              ],
            },
            // questionSnapshot is cleared so the retry builds a fresh one
            // instead of being served the previous attempt's cached payload.
            data: {
              status: "IN_PROGRESS",
              expiresAt,
              startedAt: now,
              answers: {},
              flagged: [],
              questionSnapshot: Prisma.DbNull,
            },
          });
          const session = await tx.testSession.findUnique({
            where: { userId_paketId: { userId: dbUser.id, paketId } },
          });
          if (!session) throw new Error("Session tidak ditemukan setelah retry reset");
          if (reset.count === 1) {
            await consumeUsageGuarded(tx, dbUser.id, "SIMULATION", { plan: simPlan, limit: simLimit });
            return { mode: "attempt", session };
          }
          return { mode: "replay", session };
        }

        // Belum ada sesi → attempt baru. createMany + skipDuplicates membuat
        // double-click aman: hanya satu request yang mendapat count 1.
        const expiresAt = new Date(now.getTime() + (paket.duration || 30) * 60000);
        const created = await tx.testSession.createMany({
          data: [{
            userId: dbUser.id,
            paketId,
            status: "IN_PROGRESS",
            expiresAt,
            startedAt: now,
            answers: {},
            flagged: [],
          }],
          skipDuplicates: true,
        });
        const session = await tx.testSession.findUnique({
          where: { userId_paketId: { userId: dbUser.id, paketId } },
        });
        if (!session) throw new Error("Session tidak terbuat setelah create");
        if (created.count === 1) {
          await consumeUsageGuarded(tx, dbUser.id, "SIMULATION", { plan: simPlan, limit: simLimit });
          return { mode: "attempt", session };
        }
        return { mode: "replay", session };
      });
    } catch (error: any) {
      if (error instanceof FeatureLimitError) {
        const g = error.gate;
        console.log(`[kompetensi] FEATURE_LIMIT_REACHED user=${dbUser.id} paket=${paketId} plan=${g.plan} used=${g.used}/${g.limit}`);
        return NextResponse.json(
          {
            code: "FEATURE_LIMIT_REACHED",
            feature: "SIMULATION",
            plan: g.plan,
            used: g.used,
            limit: g.limit,
            upgradeAvailable: true,
          },
          { status: 403 }
        );
      }
      throw error;
    }

    if (attempt.mode === "completed") {
      const expired =
        attempt.session?.status === "IN_PROGRESS" &&
        attempt.session.expiresAt &&
        attempt.session.expiresAt < new Date();
      return err(
        expired ? "Sesi sebelumnya sudah kadaluarsa" : "Tes sudah selesai",
        "VALIDATION",
        400
      );
    }

    // Modes "attempt" and "replay" always carry a session (gate block throws
    // otherwise); "completed" already returned above → non-null here.
    const session = attempt.session!;

    // Shape of the payload the client renders. Identical whether it was just
    // built or replayed from the snapshot.
    const sessionPayload = () => ({
      session: {
        id: session!.id,
        status: session!.status,
        startedAt: session!.startedAt,
        expiresAt: session!.expiresAt,
        currentSection: session!.currentSection,
        currentQuestion: session!.currentQuestion,
        answers: session!.answers as Record<string, string>,
        flagged: session!.flagged,
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
    });

    // ── SNAPSHOT REPLAY ──
    // An in-progress session already has its questions fixed. Rebuilding them on
    // every GET meant each page refresh re-read the pools, re-shuffled, re-fetched
    // the answer key and rewrote the whole snapshot JSON — the single heaviest
    // write in this route, repeated for no gain.
    //
    // It was also a correctness hazard: the pool cache has a 300s TTL, so if the
    // question bank changed mid-test a student who refreshed could be handed a
    // different set of questions than the ones their answers are keyed to.
    // Replaying the stored payload makes the question set genuinely immutable for
    // the duration of an attempt.
    //
    // `clientSections` is built from UKBI_SELECT/TKA_SELECT, which exclude
    // correctAnswer, so it is the same answer-free payload the client already got.
    const storedSnapshot = session.questionSnapshot as { clientSections?: unknown } | null;
    const replayable =
      session.status === "IN_PROGRESS" &&
      Array.isArray(storedSnapshot?.clientSections) &&
      storedSnapshot.clientSections.length > 0;

    if (replayable) {
      return ok({ ...sessionPayload(), questions: storedSnapshot!.clientSections });
    }

    const sections = (paket.sectionsData as any[]) || (paket.sections as any[]) || [];
    const sessionSeed = createSessionSeed(dbUser.id, paket.id, session.createdAt?.getTime());
    const ukbi = isUKBI(paket.type);

    // ── PARALLEL SECTION QUERIES ──
    // All sections fetched in parallel via Promise.all instead of sequential for loop
    const rawSectionResults = await Promise.all(
      sections.map(async (section, i) => {
        // Candidate pool (answer-free) is identical per paket+section → cache it.
        // Shuffle below is per-session on a shallow copy, so the cached objects
        // are never mutated across requests.
        // Manual cache: JANGAN pernah cache hasil kosong. Hasil kosong yang
        // ter-cache (mis. ke-cache transien saat seeding) akan bertahan
        // selama TTL & bikin paket "0 soal" persisten. Hanya cache pool berisi.
        const poolKey = `komp:pool:${POOL_CACHE_VERSION}:${paketId}:${i}`;
        let pool = (await cache.get(poolKey)) as any[] | null;
        if (pool === null || pool === undefined) {
          pool = await resolveSectionPool(section, paket.type, ukbi, i);
          if (Array.isArray(pool) && pool.length > 0) {
            await cache.set(poolKey, pool, POOL_TTL);
          }
        }
        let sectionQuestions: any[] = (pool || []).map((q: any) => ({ ...q }));

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
            version: "1.1",
            createdAt: new Date().toISOString(),
            seed: sessionSeed,
            paketId: paket.id,
            userId: dbUser.id,
            questionOrder,
            questions: allSnapshots,
            // Answer-free payload for replay on subsequent GETs. Version 1.0
            // snapshots lack this and simply fall through to a full rebuild.
            clientSections: rawSectionResults,
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

    return ok({ ...sessionPayload(), questions: rawSectionResults });
  } catch (error: any) {
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
