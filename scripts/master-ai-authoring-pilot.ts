/**
 * STEP 7.3 — MASTER QUESTION AI AUTHORING & SEMANTIC REPAIR — PILOT
 * READ ONLY terhadap bank: membaca master bank + artifact STEP 7.1/7.2,
 * menulis artifact authoring (bukan DB). Source TIDAK pernah dimutasi.
 *
 * Jalankan: npx tsx scripts/master-ai-authoring-pilot.ts [--limit=50] [--offset=0] [--force] [--all]
 */
import fs from "fs";
import path from "path";
import { MasterQuestion } from "../lib/master-recovery";
import {
  AuthoringRecord,
  AuthoringQuestion,
  createAuthoringExecutor,
  summarizeAuthoring,
  authorQuestion,
  VALIDATOR_VERSION,
} from "../lib/master-authoring";

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

function loadRepairCandidates(): { id: string; original: MasterQuestion; repairType: string[] }[] {
  const p = path.join(OUT_DIR, `master-repair-candidates-${STAMP}.json`);
  const art = JSON.parse(fs.readFileSync(p, "utf8"));
  return (art.records as Array<{
    id: string;
    original: MasterQuestion;
    repairType: string[];
    disposition: string;
  }>)
    .filter((r) => r.disposition !== "GOLD" && r.original && r.original.text)
    .map((r) => ({ id: r.id, original: r.original, repairType: r.repairType }));
}

function loadCheckpoint(): Set<string> {
  const p = path.join(OUT_DIR, `master-authoring-checkpoint-${STAMP}.json`);
  if (!fs.existsSync(p)) return new Set();
  const c = JSON.parse(fs.readFileSync(p, "utf8"));
  return new Set(c.questionIds as string[]);
}

function saveCheckpoint(ids: string[]) {
  const p = path.join(OUT_DIR, `master-authoring-checkpoint-${STAMP}.json`);
  fs.writeFileSync(p, JSON.stringify({ schemaVersion: "master-authoring-checkpoint-v1", stamp: STAMP, questionIds: [...new Set(ids)].sort() }, null, 2));
}

async function main() {
  const limitFlag = process.argv.find((a) => a.startsWith("--limit="));
  const offsetFlag = process.argv.find((a) => a.startsWith("--offset="));
  const delayFlag = process.argv.find((a) => a.startsWith("--delay="));
  const limit = limitFlag ? parseInt(limitFlag.split("=")[1], 10) : 50;
  const offset = offsetFlag ? parseInt(offsetFlag.split("=")[1], 10) : 0;
  const delayMs = delayFlag ? parseInt(delayFlag.split("=")[1], 10) : 800;
  const force = process.argv.includes("--force");
  const allFlag = process.argv.includes("--all");

  if (limit !== 10 && limit !== 25 && limit !== 50) {
    console.log(`ERROR: --limit hanya 10/25/50 (dapat: ${limit})`);
    process.exit(1);
  }

  const bank = loadAll();
  const candidates = loadRepairCandidates();
  candidates.sort((a, b) => (a.id < b.id ? -1 : 1));

  const checkpoint = force ? new Set<string>() : loadCheckpoint();
  const eligible = candidates.filter((c) => !checkpoint.has(c.id));
  const batch = allFlag ? eligible : eligible.slice(offset, offset + limit);

  console.log(`Bank: ${bank.length} soal | kandidat AI_REPAIR: ${candidates.length} | sudah diproses: ${candidates.length - eligible.length} | batch: ${batch.length} (offset ${offset})`);

  if (batch.length === 0) {
    console.log("Tidak ada kandidat tersisa. Gunakan --force untuk memproses ulang.");
    process.exit(0);
  }

  const executor = createAuthoringExecutor();
  const records: AuthoringRecord[] = [];
  const authored: AuthoringQuestion[] = [];

  for (let i = 0; i < batch.length; i++) {
    if (i > 0 && delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    const c = batch[i];
    const ctx = {
      bank,
      authored,
      familyKey: c.original.text,
      facts: [],
    };
    const record = await authorQuestion(c.original, undefined, ctx, { executor });
    records.push(record);
    if (record.candidate) authored.push(record.candidate);
    checkpoint.add(c.id);
    console.log(
      `[${i + 1}/${batch.length}] ${c.id} → ${record.decision} (${record.telemetry.provider}/${record.telemetry.errorCode ?? "-"} ${record.telemetry.latencyMs}ms)`
    );
    if ((i + 1) % 25 === 0) saveCheckpoint([...checkpoint]);
  }
  saveCheckpoint([...checkpoint]);

  const stats = summarizeAuthoring(records);
  const artifact = {
    schemaVersion: "master-authoring-pilot-v1",
    validatorVersion: VALIDATOR_VERSION,
    generatedAt: new Date().toISOString(),
    stamp: STAMP,
    bank: bank.length,
    batch: batch.length,
    offset,
    limit,
    providerAvailable: process.env.GROQ_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.GEMINI_API_KEY ? true : false,
    stats,
    records,
  };
  fs.writeFileSync(path.join(OUT_DIR, `master-authoring-pilot-${STAMP}.json`), JSON.stringify(artifact, null, 2));

  const review = records
    .filter((r) => r.decision === "HUMAN_REVIEW_REQUIRED" || r.decision === "REJECT")
    .map((r) => ({
      questionId: r.questionId,
      decision: r.decision,
      source: r.source,
      candidate: r.candidate,
      reason: r.reason,
      detectedRisks: r.detectedRisks,
      confidence: r.confidence,
    }));
  fs.writeFileSync(path.join(OUT_DIR, `master-authoring-review-${STAMP}.json`), JSON.stringify({ schemaVersion: "master-authoring-review-v1", stamp: STAMP, records: review }, null, 2));

  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(stats, null, 2));
  console.log(`Artifacts: master-authoring-pilot-${STAMP}.json (${records.length} records), master-authoring-review-${STAMP}.json (${review.length} review)`);
  if (stats.failed === batch.length) {
    console.log("Catatan: SEMUA record REPAIR_FAILED — periksa ketersediaan API key (lihat report).");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
