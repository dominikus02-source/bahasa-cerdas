#!/usr/bin/env npx tsx
/**
 * STEP 3J — PART C: VALIDATION REPORT untuk review manifest (READ-ONLY).
 *
 * Mencetak per rekor manifest: questionId, Soal.id, skill, subskill,
 * difficulty, topic, questionType, cefr, status, mapping validity, dan TEKS
 * SOAL (terpotong) supaya founder/reviewer bisa memeriksa apakah klasifikasi
 * benar-benar cocok dengan isi soal. TANPA LLM, TANPA auto-correct, TANPA
 * menulis apa pun (DATABASE WRITES = 0).
 *
 * Tanpa koneksi DB → "DATABASE READ-ONLY UNAVAILABLE", exit 0.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadScriptEnv } from "./_env";
import { validateQuestionMetadata } from "../lib/question-metadata/validation";

const ROOT = join(__dirname, "..");
const MANIFEST_PATH = join(ROOT, "data/question-metadata/review-manifest-001.json");

function truncate(text: string, max = 110): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

async function main(): Promise<void> {
  loadScriptEnv();
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`Manifest tidak ditemukan: ${MANIFEST_PATH}`);
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as { manifestId: string; records: Array<{ source: string; questionId: string; expectedSkill: string; expectedDifficulty: string }> };

  console.log(`STEP 3J — VALIDATION REPORT (${manifest.manifestId}) — READ-ONLY\n`);

  const rawUrl = process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, "") ?? process.env.DIRECT_URL?.trim().replace(/^["']|["']$/g, "");
  if (!rawUrl || rawUrl === "[SENSITIVE]" || !/^postgres(ql)?:\/\//.test(rawUrl)) {
    console.log("DATABASE READ-ONLY UNAVAILABLE (nilai env [SENSITIVE]/tidak ada di mesin ini).");
    console.log("Laporan baris-per-rekor hanya bisa dibuat dengan koneksi DB (isi .env.db.local).");
    process.exit(0);
  }

  const prismaClient = new PrismaClient();
  try {
    await prismaClient.$queryRaw`SELECT 1`;
  } catch {
    console.log("DATABASE READ-ONLY UNAVAILABLE (koneksi gagal).");
    await prismaClient.$disconnect();
    process.exit(0);
  }

  const rows = await prismaClient.questionMetadata.findMany({
    where: { source: "BANK_SOAL", questionId: { in: manifest.records.map((record) => record.questionId) } },
    orderBy: { questionId: "asc" },
  });
  const soalRows = await prismaClient.soal.findMany({
    where: { kodeSoal: { in: manifest.records.map((record) => record.questionId) } },
    select: { id: true, kodeSoal: true, text: true },
  });
  const soalById = new Map(soalRows.map((soal) => [soal.kodeSoal, soal]));

  const pad = (value: string | null, width: number): string => (value ?? "-").slice(0, width).padEnd(width);

  console.log(pad("questionId", 26) + pad("Soal.id", 20) + pad("skill", 11) + pad("subskill", 26) + pad("diff", 9) + pad("topic", 17) + pad("questionType", 15) + pad("cefr", 6) + pad("status", 13) + "mapping");
  console.log("─".repeat(26 + 20 + 11 + 26 + 9 + 17 + 15 + 6 + 13 + 8));

  let mismatch = 0;
  for (const record of manifest.records) {
    const metadata = rows.find((row) => row.questionId === record.questionId);
    if (!metadata) {
      console.log(`${record.questionId} — METADATA TIDAK DITEMUKAN`);
      mismatch += 1;
      continue;
    }
    const soal = soalById.get(record.questionId);
    const validated = validateQuestionMetadata({ ...metadata, status: "APPROVED", provenance: "HUMAN_REVIEW" });
    const mappingOk = Boolean(soal) && validated.valid;
    if (!mappingOk) mismatch += 1;
    console.log(
      pad(metadata.questionId, 26) +
        pad(soal ? soal.id : "MISSING", 20) +
        pad(metadata.skill, 11) +
        pad(metadata.subskill, 26) +
        pad(metadata.difficulty, 9) +
        pad(metadata.topic, 17) +
        pad(metadata.questionType, 15) +
        pad(metadata.cefr, 6) +
        pad(metadata.status, 13) +
        (mappingOk ? "✅ VALID" : "❌ INVALID")
    );
  }

  console.log("\n=== TEKS SOAL (untuk pengecekan kesesuaian klasifikasi) ===");
  for (const record of manifest.records) {
    const metadata = rows.find((row) => row.questionId === record.questionId);
    const soal = soalById.get(record.questionId);
    if (!soal) {
      console.log(`\n${record.questionId} — TANPA SOAL`);
      continue;
    }
    console.log(`\n# ${record.questionId} [klaim: ${metadata?.skill ?? "?"}/${metadata?.subskill ?? "?"}/${metadata?.difficulty ?? "?"}]`);
    console.log(`  ID  : ${soal.id}`);
    console.log(`  Soal: ${truncate(soal.text)}`);
  }

  console.log(`\nRingkasan: ${manifest.records.length} rekor, ${mismatch} bermasalah (mapping/taxonomy).`);
  process.exit(mismatch > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});