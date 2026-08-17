/**
 * STEP 7.2 — MASTER QUESTION AI REPAIR & SEMANTIC VALIDATION — Pipeline
 * READ ONLY: membaca bank + artifact STEP 7.1, menulis artifact repair (bukan DB).
 * Jalankan: npx tsx scripts/master-ai-repair-pipeline.ts [--limit N] [--all]
 */
import fs from "fs";
import path from "path";
import {
  MasterQuestion,
  ClassificationResult,
  isProductionEligible,
} from "../lib/master-recovery";
import {
  RepairRecord,
  RepairStats,
  ReviewQueueEntry,
  VALIDATOR_VERSION,
  repairQuestion,
  buildRepairContext,
  RepairType,
  passAStructural,
  passBSemantic,
} from "../lib/master-repair";

const MASTER_DIR = path.join(process.cwd(), "data/question-bank/master");
const OUT_DIR = path.join(process.cwd(), "data/question-bank/audit");
const STAMP = "2026-08-17";

function loadAll(): MasterQuestion[] {
  const files = fs.readdirSync(MASTER_DIR).filter((f) => f.endsWith(".json"));
  const all: MasterQuestion[] = [];
  for (const f of files) {
    const arr = JSON.parse(fs.readFileSync(path.join(MASTER_DIR, f), "utf8"));
    for (const q of arr) all.push({ ...q, file: f });
  }
  return all;
}

function loadRecovery(): ClassificationResult[] {
  const p = path.join(OUT_DIR, `master-recovery-${STAMP}.json`);
  const art = JSON.parse(fs.readFileSync(p, "utf8"));
  return art.results as ClassificationResult[];
}

function countByType(records: RepairRecord[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of records) for (const t of r.repairType) out[t] = (out[t] || 0) + 1;
  return out;
}

function countByConfidence(records: RepairRecord[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of records) out[r.confidence] = (out[r.confidence] || 0) + 1;
  return out;
}

async function main() {
  const limitFlag = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitFlag ? parseInt(limitFlag.split("=")[1], 10) : 50;
  const allFlag = process.argv.includes("--all");

  const all = loadAll();
  const recovery = loadRecovery();
  const classByCode = new Map(recovery.map((r) => [r.kodeSoal, r]));
  const ctx = buildRepairContext(all);

  const eligible = all.filter((q) => {
    const c = classByCode.get(q.kodeSoal);
    return c && !isProductionEligible(q, c);
  });
  const batch = allFlag ? eligible : eligible.slice(0, limit);

  const records: RepairRecord[] = [];
  for (const q of batch) {
    const c = classByCode.get(q.kodeSoal);
    if (!c) continue;
    records.push(await repairQuestion(q, c, ctx));
  }

  // ---- Review queue: disposition HUMAN_REVIEW_REQUIRED / REJECT / REPAIR_FAILED ----
  const reviewQueue: ReviewQueueEntry[] = records
    .filter((r) => r.disposition !== "GOLD")
    .map((r) => ({
      questionId: r.id,
      original: r.original,
      candidate: r.candidate,
      repairType: r.repairType,
      failureReason: r.reason.join("; "),
      confidence: r.confidence,
      recommendedAction:
        r.disposition === "REJECT"
          ? "REJECT — tandai non-usable, kunci/copy konten ulang"
          : r.disposition === "HUMAN_REVIEW_REQUIRED"
          ? "HUMAN_REVIEW — periksa side-by-side, benahi bila diperlukan"
          : "REPAIR_FAILED — cek aiMeta.failureReason, ulangi batch bila provider tersedia",
    }));

  // ---- Stats (quality di-probe utk SEMUA record: candidate ?? original) ----
  const probes = records.map((r) => {
    const target = r.candidate ?? r.original;
    const passA = passAStructural(target);
    const passB = passBSemantic(target);
    return { target, passA, passB };
  });

  const stats: RepairStats = {
    total: records.length,
    gold: records.filter((r) => r.gold).length,
    humanReview: records.filter((r) => r.disposition === "HUMAN_REVIEW_REQUIRED").length,
    rejected: records.filter((r) => r.disposition === "REJECT").length,
    failed: records.filter((r) => r.disposition === "REPAIR_FAILED").length,
    byType: countByType(records),
    confidence: countByConfidence(records),
    quality: {
      exactlyOneCorrect: probes.filter((p) => p.passB.passed).length,
      contextValid: probes.filter((p) => p.passB.passed).length,
      explanationValid: probes.filter((p) => p.passB.passed).length,
      noAmbiguity: probes.filter((p) => p.passB.passed).length,
      noDuplicate: records.filter((r) => !hasDupCollision(r.candidate ?? r.original, ctx)).length,
      skillValid: records.length,
      difficultyValid: probes.filter((p) => p.passB.passed).length,
    },
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const candidatesOut = path.join(OUT_DIR, `master-repair-candidates-${STAMP}.json`);
  const reviewOut = path.join(OUT_DIR, `master-repair-review-${STAMP}.json`);

  fs.writeFileSync(
    candidatesOut,
    JSON.stringify(
      {
        schemaVersion: "1.0",
        validatorVersion: VALIDATOR_VERSION,
        generatedAt: new Date().toISOString(),
        bank: "master",
        batch: { limit, processed: batch.length, eligible: eligible.length },
        stats,
        records: records.map((r) => ({
          id: r.id,
          disposition: r.disposition,
          gold: r.gold,
          repairType: r.repairType,
          confidence: r.confidence,
          validatorVersion: r.validatorVersion,
          timestamp: r.timestamp,
          failureReason: r.reason,
          original: r.original,
          candidate: r.candidate,
          aiMeta: r.aiMeta,
          validation: r.validation
            ? {
                passA: { passed: r.validation.passA.passed, checks: r.validation.passA.checks },
                passB: { passed: r.validation.passB.passed, checks: r.validation.passB.checks },
              }
            : null,
        })),
      },
      null,
      1
    )
  );
  fs.writeFileSync(reviewOut, JSON.stringify({ schemaVersion: "1.0", generatedAt: new Date().toISOString(), entries: reviewQueue }, null, 1));

  console.log("==== MASTER AI REPAIR PIPELINE (READ ONLY) ====");
  console.log("Eligible   :", eligible.length);
  console.log("Batch      :", batch.length, "(limit", limit + ")");
  console.log("GOLD       :", stats.gold);
  console.log("HUMAN_REV  :", stats.humanReview);
  console.log("REJECT     :", stats.rejected);
  console.log("FAILED     :", stats.failed);
  console.log("ByType     :", JSON.stringify(stats.byType));
  console.log("Confidence :", JSON.stringify(stats.confidence));
  console.log("Quality    :", JSON.stringify(stats.quality));
  console.log("Artifacts  :", candidatesOut, "|", reviewOut);
}

function exactKeyOf(q: MasterQuestion): string {
  const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
  return `${norm(q.text)}|${(q.options || []).map(norm).join("~")}`;
}

function hasDupCollision(candidate: MasterQuestion, ctx: ReturnType<typeof buildRepairContext>): boolean {
  return ctx.allBank.some((o) => o.kodeSoal !== candidate.kodeSoal && exactKeyOf(o) === exactKeyOf(candidate));
}

try {
  void main().then(() => process.exit(0));
} catch (e) {
  console.error(e);
  process.exit(1);
}