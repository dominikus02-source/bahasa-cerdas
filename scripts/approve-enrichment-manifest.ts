#!/usr/bin/env npx tsx
/**
 * STEP 4B.6 — CONTROLLED ENRICHMENT APPROVAL (founder/admin-only).
 *
 * Materialize + approve kandidat enrichment AI_SUGGESTED dari
 * `data/question-metadata/enrichment-manifest-001.json` menjadi record
 * `QuestionMetadata` (status=APPROVED, provenance=HUMAN_REVIEW,
 * reviewedById=reviewer) dalam SATU $transaction — satu gagal → ROLLBACK
 * seluruh batch, audit tidak ditulis (ZERO partial write).
 *
 * Mode:
 *   * Tanpa argumen (atau --dry-run) → READ-ONLY: validasi rencana batch lalu
 *     cetak laporan. DATABASE WRITES = 0.
 *   * --execute --founder-email <email> --batch <BATCH-1|BATCH-2|BATCH-3>
 *     → EKSPLISIT (maks 25 record per eksekusi, tidak ada approve-all).
 *   * --actions <file.json> → keputusan per-record opsional: REJECT (reason)
 *     atau CORRECT_THEN_APPROVE (corrections whitelist 7 field kanonikal).
 *     Tanpa file → seluruh record batch di-approve (batas batch tetap 25).
 *   * --sql → cetak SQL idempotent untuk Supabase SQL Editor (jalur cadangan).
 *
 * KEAMANAN (Part D):
 *   * Reviewer identity dari DB — --founder-email harus user founder/ADMIN.
 *   * source/questionId/provenance/status akhir TIDAK pernah dari klien;
 *     selalu diturunkan dari manifest + koreksi whitelist + transisi sah.
 *   * Soal harus ada di Soal.kodeSoal sebelum materialize.
 *   * Record sudah APPROVED → ALREADY_APPROVED (idempoten, no-op).
 *   * Record sudah ada dengan status lain → CONFLICT → rollback seluruh batch.
 *   * Larangan transisi: APPROVED tidak pernah jadi REJECTED/CORRECTED.
 *   * Tidak pernah membaca/menulis correctAnswer/options/jawaban.
 *
 * Manifest TIDAK pernah diubah — determinisme batu; state approval hidup di
 * audit JSONL (enrichment-approval-audit-001.jsonl) + DB.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync, appendFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadScriptEnv } from "./_env";
import { validateQuestionMetadata } from "../lib/question-metadata/validation";
import {
  CEFR_LEVELS,
  CONFIDENCE,
  DIFFICULTIES,
  QUESTION_TYPES,
  hasSkill,
  hasSubskill,
  type SkillId,
} from "../lib/question-metadata/taxonomy";

const ROOT = join(__dirname, "..");
const MANIFEST_PATH = join(ROOT, "data/question-metadata/enrichment-manifest-001.json");
const AUDIT_PATH = join(ROOT, "data/question-metadata/enrichment-approval-audit-001.jsonl");
const BATCH_SIZE = 25;
const ALLOWED_CORRECTIONS = ["skill", "subskill", "difficulty", "questionType", "topic", "cefr", "confidence"];
const IMMUTABLE_KEYS = ["source", "questionId", "provenance", "status", "warnings", "evidence", "reason"];

interface ManifestRecord {
  source: string;
  questionId: string;
  expectedSkill: string;
  expectedDifficulty: string;
  expectedTopic: string;
  subskill: string;
  questionType: string;
  provenance: string;
  status: string;
  confidence: string;
  warnings?: string[];
  evidence?: { kelas?: string | null; isHOTS?: boolean; textLength?: number; textPreview?: string };
  reason?: string;
}

interface Manifest {
  manifestId: string;
  records: ManifestRecord[];
}

type ReviewAction =
  | { action: "REJECT"; reason?: string }
  | { action: "CORRECT_THEN_APPROVE"; corrections: Record<string, string | null>; reason?: string };

type Decision = "APPROVE" | "REJECTED" | "ALREADY_APPROVED" | "CONFLICT";

interface BatchPlanItem {
  record: ManifestRecord;
  decision: Decision;
  final: Record<string, string | null>;
  note: string;
}

function isExecute(args: string[]): boolean {
  return args.includes("--execute");
}
function isSqlMode(args: string[]): boolean {
  return args.includes("--sql");
}
function founderEmail(args: string[]): string | undefined {
  const index = args.indexOf("--founder-email");
  return index >= 0 ? args[index + 1] : undefined;
}
function batchArg(args: string[]): string | undefined {
  const index = args.indexOf("--batch");
  return index >= 0 ? args[index + 1] : undefined;
}
function actionsPath(args: string[]): string | undefined {
  const index = args.indexOf("--actions");
  return index >= 0 ? args[index + 1] : undefined;
}

const BATCH_SLOTS: Record<string, [number, number]> = {
  "BATCH-1": [0, 25],
  "BATCH-2": [25, 50],
  "BATCH-3": [50, 75],
};

function loadManifest(): Manifest {
  if (!existsSync(MANIFEST_PATH)) throw new Error(`Manifest tidak ditemukan: ${MANIFEST_PATH}`);
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
  if (!Array.isArray(manifest.records) || manifest.records.length === 0) {
    throw new Error("Manifest tidak berisi records");
  }
  for (const record of manifest.records) {
    if (!record.questionId || !record.source) throw new Error("Rekor manifest kurang questionId/source");
  }
  return manifest;
}

function loadActions(path: string | undefined): Map<string, ReviewAction> {
  const actions = new Map<string, ReviewAction>();
  if (!path) return actions;
  const filePath = resolve(ROOT, path);
  if (!existsSync(filePath)) throw new Error(`File --actions tidak ditemukan: ${filePath}`);
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as Record<string, ReviewAction>;
  for (const [questionId, decision] of Object.entries(raw)) {
    if (!questionId) throw new Error("Kunci questionId kosong di --actions");
    if (!decision || !decision.action) throw new Error(`Keputusan tanpa action untuk ${questionId}`);
    if (decision.action === "REJECT") {
      actions.set(questionId, { action: "REJECT", reason: decision.reason });
      continue;
    }
    if (decision.action === "CORRECT_THEN_APPROVE") {
      if (!decision.corrections || typeof decision.corrections !== "object") {
        throw new Error(`CORRECT_THEN_APPROVE tanpa corrections untuk ${questionId}`);
      }
      actions.set(questionId, { action: "CORRECT_THEN_APPROVE", corrections: decision.corrections, reason: decision.reason });
      continue;
    }
    throw new Error(`Action tidak dikenal '${decision.action}' untuk ${questionId}`);
  }
  return actions;
}

/** Validasi koreksi per-record. Mengembalikan daftar error (kosong = valid). */
function validateCorrections(record: ManifestRecord, corrections: Record<string, string | null>): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(corrections)) {
    if (IMMUTABLE_KEYS.includes(key)) {
      errors.push(`${key} tidak dapat diubah`);
      continue;
    }
    if (!ALLOWED_CORRECTIONS.includes(key)) {
      errors.push(`field koreksi '${key}' tidak diizinkan (whitelist: ${ALLOWED_CORRECTIONS.join(", ")})`);
    }
  }
  const skill = corrections.skill ?? record.expectedSkill;
  if (!hasSkill(skill)) errors.push(`skill '${skill}' tidak valid`);
  if (skill && hasSkill(skill)) {
    const subskill = corrections.subskill ?? record.subskill;
    if (!hasSubskill(skill as SkillId, subskill)) errors.push(`subskill '${subskill}' tidak valid untuk skill ${skill}`);
  }
  const difficulty = corrections.difficulty ?? record.expectedDifficulty;
  if (!DIFFICULTIES.includes(difficulty as (typeof DIFFICULTIES)[number])) errors.push(`difficulty '${difficulty}' tidak valid`);
  const questionType = corrections.questionType ?? record.questionType;
  if (!QUESTION_TYPES.includes(questionType as (typeof QUESTION_TYPES)[number])) errors.push(`questionType '${questionType}' tidak valid`);
  const cefr = corrections.cefr ?? null;
  if (cefr !== null && !CEFR_LEVELS.includes(cefr as (typeof CEFR_LEVELS)[number])) errors.push(`cefr '${cefr}' tidak valid`);
  const confidence = corrections.confidence ?? record.confidence;
  if (!CONFIDENCE.includes(confidence as (typeof CONFIDENCE)[number])) errors.push(`confidence '${confidence}' tidak valid`);
  const topic = corrections.topic ?? record.expectedTopic;
  if (!topic || String(topic).trim().length === 0 || String(topic).length > 120) errors.push("topic tidak valid");
  return errors;
}

function finalFields(record: ManifestRecord, corrections: Record<string, string | null> | null): Record<string, string | null> {
  return {
    source: "BANK_SOAL",
    questionId: record.questionId,
    skill: corrections?.skill ?? record.expectedSkill,
    subskill: corrections?.subskill ?? record.subskill,
    difficulty: corrections?.difficulty ?? record.expectedDifficulty,
    questionType: corrections?.questionType ?? record.questionType,
    topic: (corrections?.topic ?? record.expectedTopic) || null,
    cefr: corrections?.cefr ?? null,
    confidence: corrections?.confidence ?? record.confidence,
    provenance: "HUMAN_REVIEW",
    status: "APPROVED",
  };
}

/** Rencana batch (logika murni — tanpa DB). */
function planBatch(manifest: Manifest, slot: [number, number], actions: Map<string, ReviewAction>): BatchPlanItem[] {
  const [start, end] = slot;
  const plan: BatchPlanItem[] = [];
  for (const record of manifest.records.slice(start, end)) {
    const decision = actions.get(record.questionId);
    if (decision?.action === "REJECT") {
      plan.push({
        record,
        decision: "REJECTED",
        final: finalFields(record, null),
        note: decision.reason?.trim() ? `REJECT: ${decision.reason}` : "REJECT (tanpa reason)",
      });
      continue;
    }
    if (decision?.action === "CORRECT_THEN_APPROVE") {
      const errors = validateCorrections(record, decision.corrections);
      if (errors.length > 0) {
        plan.push({
          record,
          decision: "REJECTED",
          final: finalFields(record, null),
          note: `KOREKSI INVALID (${errors.join("; ")}) — record di-REJECT`,
        });
        continue;
      }
      plan.push({ record, decision: "APPROVE", final: finalFields(record, decision.corrections), note: "APPROVE dengan koreksi" });
      continue;
    }
    plan.push({ record, decision: "APPROVE", final: finalFields(record, null), note: "APPROVE (default)" });
  }
  return plan;
}

function printSql(manifestId: string, plan: BatchPlanItem[]): void {
  const values = plan
    .filter((item) => item.decision === "APPROVE")
    .map((item) => {
      const esc = (v: string | null | undefined) => (v === null || v === undefined || v === "" ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
      const { record, final } = item;
      const id = `qm-en-${record.questionId}`;
      return `  (${esc(id)}, ${esc("BANK_SOAL")}, ${esc(record.questionId)}, ${esc(final.skill)}, ${esc(final.subskill)}, ${esc(final.difficulty)}, NULL, ${esc(final.topic)}, ${esc(final.questionType)}, ${esc(final.cefr)}, ${esc("HUMAN_REVIEW")}, ${esc(final.confidence)}, ${esc("APPROVED")}, ${esc("1.0")}, ${esc("1.0")})`;
    });
  console.log(`-- ENRICHMENT ${manifestId} — materialize+approve idempoten (jalankan di Supabase SQL Editor)`);
  console.log(`-- Hanya record APPROVE; Soal harus ada; questionId tidak diubah; tidak ada approve-all (${plan.length} record, ${plan.filter((i) => i.decision === "APPROVE").length} approve).`);
  console.log(`INSERT INTO "QuestionMetadata" ("id","source","questionId","skill","subskill","difficulty","level","topic","questionType","cefr","provenance","confidence","status","taxonomyVersion","metadataVersion") VALUES`);
  console.log(values.join(",\n"));
  console.log(`ON CONFLICT ("source", "questionId") DO NOTHING;`);
  console.log(`-- Verifikasi:`);
  console.log(`SELECT "questionId", "status", "provenance" FROM "QuestionMetadata" WHERE "source" = 'BANK_SOAL' AND "questionId" IN (${plan.filter((i) => i.decision === "APPROVE").map((i) => `'${i.record.questionId}'`).join(", ")}) ORDER BY "questionId";`);
}

function printPlan(plan: BatchPlanItem[], mode: string): void {
  console.log(`\n=== BATCH PLAN (${mode}) ===`);
  for (const item of plan) {
    const { record, final } = item;
    const statusIcon = item.decision === "APPROVE" ? "✅" : "⏭️";
    console.log(`  ${statusIcon} ${record.questionId} — ${item.decision}${item.note !== "APPROVE (default)" && item.note !== "APPROVE dengan koreksi" ? ` (${item.note})` : ""}`);
    console.log(`      skill=${final.skill} sub=${final.subskill} diff=${final.difficulty} type=${final.questionType} topic=${final.topic ?? "—"} cefr=${final.cefr ?? "—"} conf=${final.confidence} → status=${final.status} prov=${final.provenance}`);
  }
  const counts = plan.reduce<Record<string, number>>((acc, item) => {
    acc[item.decision] = (acc[item.decision] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`\nRingkasan: ${plan.length} record — APPROVE=${counts["APPROVE"] ?? 0}, REJECTED=${counts["REJECTED"] ?? 0}, ALREADY_APPROVED=${counts["ALREADY_APPROVED"] ?? 0}, CONFLICT=${counts["CONFLICT"] ?? 0}`);
}

function auditLine(item: BatchPlanItem, manifestId: string, batch: string, reviewerEmail: string | null, reviewerId: string | null): string {
  return JSON.stringify({
    manifestId,
    batch,
    action: item.decision,
    questionId: item.record.questionId,
    performedByEmail: reviewerEmail,
    performedById: reviewerId,
    timestamp: new Date().toISOString(),
    before: { ...item.record, final: undefined },
    after: item.decision === "APPROVE" ? item.final : null,
    reason: item.note && item.note !== "APPROVE (default)" && item.note !== "APPROVE dengan koreksi" ? item.note : null,
  });
}

async function main(): Promise<void> {
  loadScriptEnv();
  const args = process.argv.slice(2);
  const execute = isExecute(args);
  const sqlMode = isSqlMode(args);
  const email = founderEmail(args);
  const batchName = batchArg(args) ?? "BATCH-1";
  const actions = loadActions(actionsPath(args));

  const manifest = loadManifest();
  const slot = BATCH_SLOTS[batchName];
  if (!slot) {
    console.error(`\n--batch harus salah satu dari BATCH-1 (1-25), BATCH-2 (26-50), BATCH-3 (51-75). Diterima: '${batchName}'.`);
    process.exit(1);
  }
  const plan = planBatch(manifest, slot, actions);

  console.log(`STEP 4B.6 — CONTROLLED ENRICHMENT APPROVAL (${manifest.manifestId})`);
  console.log(`Batch  : ${batchName} (slot ${slot[0] + 1}–${slot[1]} manifest, maks ${BATCH_SIZE})`);
  console.log(`MODE   : ${sqlMode ? "SQL MODE (cetak SQL, tanpa koneksi)" : execute ? "EXECUTE (menulis, eksplisit)" : "DRY-RUN (read-only)"}`);
  if (!sqlMode) console.log(execute ? "DATABASE WRITES : planned (--execute)" : "DATABASE WRITES : 0\n");

  if (sqlMode) {
    printSql(manifest.manifestId, plan);
    process.exit(0);
  }

  if (execute && !email) {
    console.error("\n--execute WAJIB disertai --founder-email <email> (User founder/ADMIN yang mereview).");
    process.exit(1);
  }
  if (execute && plan.filter((item) => item.decision === "APPROVE").length === 0) {
    console.error("\nTidak ada record yang akan di-APPROVE pada batch ini — tidak ada yang ditulis.");
    process.exit(1);
  }

  const rawUrl = process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, "") ?? process.env.DIRECT_URL?.trim().replace(/^["']|["']$/g, "");
  if (!rawUrl || rawUrl === "[SENSITIVE]" || !/^postgres(ql)?:\/\//.test(rawUrl)) {
    console.log("\nDATABASE UNAVAILABLE (nilai env [SENSITIVE]/tidak ada di mesin ini).");
    printPlan(plan, execute ? "EXECUTE (rencana)" : "DRY-RUN");
    console.log("Jalur cadangan: jalankan mode --sql lalu tempel ke Supabase SQL Editor.");
    console.log(execute ? "\nExecution dibatalkan — tidak ada yang ditulis ke database." : "\nDRY-RUN: tidak ada perubahan ditulis.");
    process.exit(0);
  }

  const prismaClient = new PrismaClient();
  try {
    await prismaClient.$queryRaw`SELECT 1`;
  } catch {
    console.log("\nDATABASE UNAVAILABLE (koneksi gagal).");
    printPlan(plan, execute ? "EXECUTE (rencana)" : "DRY-RUN");
    console.log("Jalur cadangan: jalankan mode --sql lalu tempel ke Supabase SQL Editor.");
    await prismaClient.$disconnect();
    process.exit(0);
  }

  const founder = execute ? await prismaClient.user.findUnique({ where: { email } }) : null;
  if (execute && !founder) {
    console.error(`\nUser dengan email '${email}' tidak ditemukan.`);
    await prismaClient.$disconnect();
    process.exit(1);
  }
  if (execute && !(founder?.isFounder || founder?.role === "ADMIN")) {
    console.error(`\nUser '${email}' bukan founder/ADMIN — approval ditolak.`);
    await prismaClient.$disconnect();
    process.exit(1);
  }

  // Validasi DB (read-only) per record
  const enrichIds = manifest.records.slice(slot[0], slot[1]).map((r) => r.questionId);
  const existingMeta = await prismaClient.questionMetadata.findMany({
    where: { source: "BANK_SOAL", questionId: { in: enrichIds } },
    select: { questionId: true, status: true },
  });
  const existingByQid = new Map(existingMeta.map((m) => [m.questionId, m.status]));
  const soals = await prismaClient.soal.findMany({
    where: { kodeSoal: { in: enrichIds } },
    select: { kodeSoal: true },
  });
  const soalSet = new Set(soals.map((s) => s.kodeSoal));

  const resolved: BatchPlanItem[] = [];
  for (const item of plan) {
    if (item.decision === "REJECTED") {
      resolved.push(item);
      continue;
    }
    const existingStatus = existingByQid.get(item.record.questionId);
    if (existingStatus === "APPROVED") {
      resolved.push({ ...item, decision: "ALREADY_APPROVED", note: "sudah APPROVED di DB — idempoten skip" });
      continue;
    }
    if (existingStatus) {
      resolved.push({ ...item, decision: "CONFLICT", note: `metadata sudah ada dengan status '${existingStatus}' — rollback batch` });
      continue;
    }
    if (!soalSet.has(item.record.questionId)) {
      resolved.push({ ...item, decision: "CONFLICT", note: "Soal.kodeSoal tidak ditemukan — rollback batch" });
      continue;
    }
    const validated = validateQuestionMetadata({ ...item.final, level: null });
    if (!validated.valid) {
      resolved.push({ ...item, decision: "CONFLICT", note: `taxonomy gagal: ${validated.errors.join("; ")} — rollback batch` });
      continue;
    }
    resolved.push(item);
  }

  const conflicts = resolved.filter((item) => item.decision === "CONFLICT");
  if (conflicts.length > 0) {
    console.error("\nCONFLICT DITEMUKAN — seluruh batch DIBATALKAN (rollback, ZERO writes):");
    for (const item of conflicts) {
      console.error(`  ❌ ${item.record.questionId} — ${item.note}`);
    }
    await prismaClient.$disconnect();
    process.exit(1);
  }

  printPlan(resolved, execute ? "VALIDATED (siap eksekusi)" : "VALIDATED (dry-run)");

  if (!execute) {
    console.log("\nDRY-RUN: tidak ada perubahan ditulis. Gunakan --execute --founder-email <email> --batch <BATCH-x> untuk menyetujui.");
    await prismaClient.$disconnect();
    process.exit(0);
  }

  const ready = resolved.filter((item) => item.decision === "APPROVE");
  console.log(`\nMENULIS APPROVED oleh ${email} (founder/admin): ${ready.length} record dalam SATU transaksi...`);

  const createdIds: string[] = [];
  await prismaClient.$transaction(async (tx) => {
    for (const item of ready) {
      const created = await tx.questionMetadata.create({
        data: {
          source: "BANK_SOAL",
          questionId: item.record.questionId,
          skill: item.final.skill,
          subskill: item.final.subskill,
          difficulty: item.final.difficulty as never,
          topic: item.final.topic,
          questionType: item.final.questionType ?? "PILIHAN_GANDA",
          cefr: item.final.cefr,
          provenance: item.final.provenance ?? "HUMAN_REVIEW",
          confidence: item.final.confidence ?? "HIGH",
          status: "APPROVED",
          taxonomyVersion: "1.0",
          metadataVersion: "1.0",
          reviewedById: founder?.id ?? null,
        },
        select: { id: true },
      });
      createdIds.push(created.id);
    }
  });

  if (createdIds.length !== ready.length) {
    console.error(`Hanya ${createdIds.length}/${ready.length} ter-tulis — audit tidak ditulis.`);
    await prismaClient.$disconnect();
    process.exit(1);
  }

  const lines = resolved.map((item) => auditLine(item, manifest.manifestId, batchName, email, founder?.id ?? null));
  appendFileSync(AUDIT_PATH, lines.join("\n") + "\n");
  console.log(`✅ APPROVED: ${ready.length} record materialized (audit -> ${AUDIT_PATH})`);
  console.log(`   REJECTED (dari --actions/koreksi invalid): ${resolved.filter((i) => i.decision === "REJECTED").length}`);
  console.log(`   ALREADY_APPROVED (idempoten skip): ${resolved.filter((i) => i.decision === "ALREADY_APPROVED").length}`);
  await prismaClient.$disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});