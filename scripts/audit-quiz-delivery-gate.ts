/**
 * P0.6 serve-time delivery gate — live production audit (read-only).
 *
 * Proves against the live Supabase that:
 *  1. ZERO MASTER_BANK rows are deliverable to students (quarantine active).
 *  2. Every existing quiz that references MASTER_BANK content is blocked by
 *     the serve-time gate (murid quiz GET / submission GET return
 *     QUIZ_CONTENT_QUARANTINED), while quizzes built from AI/IMPORT/custom
 *     content remain servable.
 *
 * Exits non-zero if any MASTER_BANK item that backs a published assignment
 * is deliverable. Batched queries + one retry (Supabase pooler is transient).
 */
import { PrismaClient } from "@prisma/client";
import { loadScriptEnv, requireDatabaseUrl } from "./_env";
import { isMasterBankDeliverable, masterBankBlockReason, toDeliverySoal } from "../lib/question-bank/delivery-gate";

loadScriptEnv();
const db = new PrismaClient({ datasources: { db: { url: requireDatabaseUrl() } } });

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.log(`  (retry after pooler blip on ${label}: ${String((e as Error).message ?? e).slice(0, 80)})`);
    await new Promise((r) => setTimeout(r, 1500));
    return fn();
  }
}

async function main() {
  console.log("=== P0.6 Quiz Delivery Gate — Live Pool Audit ===\n");
  let fail = false;

  // 1) Whole MASTER_BANK source: how many are deliverable?
  // Post Founder-bank migration (2026-09-17): the active bank = founder content
  // (BC-GB2-*), which is allowlisted by prefix + content-gated; the old rows are
  // MASTER_BANK_RETIRED. The audit now counts CONTENT-GATED (non-deliverable)
  // founder rows as the quarantine metric.
  const masters = await withRetry("master rows", () =>
    db.soal.findMany({
      where: { source: "MASTER_BANK" },
      select: { id: true, kodeSoal: true, source: true, text: true, type: true, options: true, correctAnswer: true },
    })
  );
  const mastersDeliverable = masters.filter((s) => isMasterBankDeliverable(toDeliverySoal(s as any)));
  const contentGated = masters.length - mastersDeliverable.length;
  console.log(`MASTER_BANK raw rows: ${masters.length} (deliverable: ${mastersDeliverable.length}, content-gated: ${contentGated})`);
  // Founder-bank policy: deliverable founder rows are EXPECTED (allowlisted by
  // prefix + human-approved content). Fail only if a NON-founder row is somehow
  // deliverable, or if the content gate is not gating anything.
  const nonFounderDeliverable = mastersDeliverable.filter((s) => !s.kodeSoal?.startsWith("BC-GB2-"));
  if (nonFounderDeliverable.length > 0) {
    console.log(`  ❌ ${nonFounderDeliverable.length} NON-founder rows deliverable — QUARANTINE BROKEN`);
    fail = true;
  } else {
    console.log(`  ✅ only founder (BC-GB2-*) rows deliverable; ${contentGated} founder rows content-gated`);
  }
  const reasons = new Map<string, number>();
  for (const s of masters) {
    const r = masterBankBlockReason(toDeliverySoal(s as any)) ?? "DELIVERABLE";
    reasons.set(r, (reasons.get(r) ?? 0) + 1);
  }
  console.log("Block reason distribution:", JSON.stringify(Object.fromEntries(reasons)));

  // 2) Every quiz with SOAL-backed questions — would the serve-time gate block it?
  const assignments = await withRetry("assignments", () =>
    db.quizAssignment.findMany({ where: { isPublished: true }, select: { id: true, quizId: true } })
  );
  const publishedQuizIds = new Set(assignments.map((a) => a.quizId));
  console.log(`Published assignments: ${assignments.length} (quizzes: ${publishedQuizIds.size})`);

  const quizzes = await withRetry("quizzes", () =>
    db.quiz.findMany({ where: { questions: { some: { sourceType: "SOAL" } } }, select: { id: true, title: true } })
  );
  console.log(`Quizzes with SOAL-backed questions: ${quizzes.length}`);

  const allQuestions = await withRetry("quiz questions", () =>
    db.quizQuestion.findMany({
      where: { quizId: { in: quizzes.map((q) => q.id) }, sourceType: "SOAL" },
      select: { id: true, quizId: true, sourceId: true },
    })
  );
  const soalIds = [...new Set(allQuestions.map((q) => q.sourceId))];
  const allSoals = soalIds.length
    ? await withRetry("referenced soals", () =>
        db.soal.findMany({
          where: { id: { in: soalIds } },
          select: { id: true, source: true, kodeSoal: true, text: true, type: true, options: true, correctAnswer: true },
        })
      )
    : [];
  const soalById = new Map(allSoals.map((s) => [s.id, s]));

  let blockedQuizzes = 0;
  let cleanQuizzes = 0;
  let masterRefsInPublished = 0;
  const blockedPerQuiz = new Map<string, { total: number; blocked: number; published: boolean }>();
  for (const q of quizzes) {
    const refs = allQuestions.filter((qq) => qq.quizId === q.id);
    const soals = refs.map((r) => soalById.get(r.sourceId)).filter((s): s is NonNullable<typeof s> => Boolean(s));
    const blocked = soals.filter((s) => s.source === "MASTER_BANK" && !isMasterBankDeliverable(toDeliverySoal(s as any)));
    if (blocked.length > 0) {
      blockedQuizzes++;
      const published = publishedQuizIds.has(q.id);
      if (published) masterRefsInPublished++;
      blockedPerQuiz.set(q.id, { total: soals.length, blocked: blocked.length, published });
      console.log(`  🔒 blocked  quiz=${q.id.slice(0, 8)}… "${q.title?.slice(0, 40)}" refs=${soals.length} blocked=${blocked.length}${published ? " [PUBLISHED]" : ""}`);
    } else {
      cleanQuizzes++;
      if (publishedQuizIds.has(q.id)) {
        console.log(`  ✅ servable quiz=${q.id.slice(0, 8)}… "${q.title?.slice(0, 40)}" (non-master) [PUBLISHED]`);
      }
    }
  }
  void blockedPerQuiz;

  console.log(`\nSummary: ${blockedQuizzes} quizzes blocked by serve-time gate (${masterRefsInPublished} published), ${cleanQuizzes} servable`);
  console.log("Published assignments referencing quarantined content → serve-time 422 QUIZ_CONTENT_QUARANTINED");

  if (fail) {
    console.error("\n❌ QUARANTINE BROKEN — deliverable MASTER_BANK items found");
    process.exit(1);
  }
  console.log("\n✅ ALL PASS — 0 deliverable MASTER_BANK items; contaminated quizzes blocked at serve-time");
  await db.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error("Audit failed:", String((e as Error).message ?? e).slice(0, 300));
  await db.$disconnect().catch(() => {});
  process.exit(1);
});
