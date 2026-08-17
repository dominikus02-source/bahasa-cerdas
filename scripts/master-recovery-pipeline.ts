/**
 * STEP 7.1 — Master Question Bank Recovery Pipeline
 * READ ONLY: membaca file bank, menulis artifact klasifikasi (bukan DB).
 * Jalankan: npx tsx scripts/master-recovery-pipeline.ts
 */
import fs from "fs";
import path from "path";
import {
  MasterQuestion,
  ClassificationResult,
  classifyQuestion,
  buildDuplicateContext,
  countByDisposition,
  countByFlag,
  isProductionEligible,
} from "../lib/master-recovery";

const MASTER_DIR = path.join(process.cwd(), "data/question-bank/master");
const OUT_DIR = path.join(process.cwd(), "data/question-bank/audit");

function loadAll(): MasterQuestion[] {
  const files = fs.readdirSync(MASTER_DIR).filter((f) => f.endsWith(".json"));
  const all: MasterQuestion[] = [];
  for (const f of files) {
    const arr = JSON.parse(fs.readFileSync(path.join(MASTER_DIR, f), "utf8"));
    for (const q of arr) all.push({ ...q, file: f });
  }
  return all;
}

function main() {
  const all = loadAll();
  const ctx = buildDuplicateContext(all);
  const results: ClassificationResult[] = all.map((q) => classifyQuestion(q, ctx));

  const byDisp = countByDisposition(results);
  const byFlag = countByFlag(results);
  const prodEligible = results.filter((r) => isProductionEligible(
    all.find((q) => q.kodeSoal === r.kodeSoal)!,
    r
  )).length;

  const autoRepairable = results.filter((r) => r.disposition === "AUTO_REPAIR_ALLOWED");
  const gold = results.filter((r) => r.gold);
  const humanReview = results.filter((r) => r.disposition === "HUMAN_REVIEW_REQUIRED");

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const artifact = {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    bank: "master",
    sourceDir: "data/question-bank/master",
    total: all.length,
    byDisposition: byDisp,
    byFlag: byFlag,
    productionEligible: prodEligible,
    autoRepairable: autoRepairable.map((r) => ({
      kodeSoal: r.kodeSoal,
      file: r.file,
      flags: r.flags,
      repair: r.repair,
    })),
    gold: gold.map((r) => r.kodeSoal),
    humanReview: humanReview.map((r) => ({
      kodeSoal: r.kodeSoal,
      file: r.file,
      flags: r.flags,
      reason: r.reason,
      duplicateOf: r.duplicateOf,
    })),
    results: results.map((r) => ({
      kodeSoal: r.kodeSoal,
      file: r.file,
      flags: r.flags,
      disposition: r.disposition,
      gold: r.gold,
      repair: r.repair,
      duplicateOf: r.duplicateOf,
      reason: r.reason.slice(0, 3),
    })),
  };
  const outPath = path.join(OUT_DIR, `master-recovery-${stamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(artifact, null, 1));

  console.log("==== MASTER RECOVERY PIPELINE (READ ONLY) ====");
  console.log("Total      :", all.length);
  console.log("GOLD       :", gold.length);
  console.log("AUTO_REPAIR:", byDisp.AUTO_REPAIR_ALLOWED || 0);
  console.log("AI_REPAIR  :", byDisp.AI_REPAIR_CANDIDATE || 0);
  console.log("HUMAN_REV  :", byDisp.HUMAN_REVIEW_REQUIRED || 0);
  console.log("REJECT     :", byDisp.REJECT || 0);
  console.log("Flags      :", JSON.stringify(byFlag));
  console.log("Production eligible:", prodEligible);
  console.log("Artifact   :", outPath);
}

try {
  main();
  process.exit(0);
} catch (e) {
  console.error(e);
  process.exit(1);
}
