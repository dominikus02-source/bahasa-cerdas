#!/usr/bin/env npx tsx
/**
 * STEP 4E — PART R: DIAGNOSTIC POOL QUALITY CHECK (READ-ONLY).
 *
 * Audit read-only pool diagnostik (BANK_SOAL, status=APPROVED):
 *   - jumlah metadata APPROVED + Soal yang cocok (kodeSoal ada)
 *   - duplikasi questionId, metadata yatim (APPROVED tanpa Soal)
 *   - ketersediaan per kombinasi skill × difficulty × tipe soal
 *   - simulasi min & max sesi yang bisa dibentuk tanpa duplikasi
 * Klasifikasi: ZERO / INSUFFICIENT / HEALTHY (toleransi DIAGNOSTIC_MIN_ITEMS=8).
 *
 * TANPA koneksi DB → "DATABASE READ-ONLY UNAVAILABLE", exit 0
 * (jangan pernah mengarang angka aktual).
 */
import { PrismaClient } from "@prisma/client";
import { loadScriptEnv } from "./_env";
import { SKILLS, DIFFICULTIES, QUESTION_TYPES } from "../lib/question-metadata/taxonomy";
import { DIAGNOSTIC_ALLOWED_SIZES, DIAGNOSTIC_MIN_ITEMS } from "../lib/diagnostic/config";

function classify(count: number): "HEALTHY" | "INSUFFICIENT" | "ZERO" {
  if (count === 0) return "ZERO";
  if (count < DIAGNOSTIC_MIN_ITEMS) return "INSUFFICIENT";
  return "HEALTHY";
}

async function main(): Promise<void> {
  loadScriptEnv();
  console.log("STEP 4E — DIAGNOSTIC POOL QUALITY CHECK (BANK_SOAL, status=APPROVED) — READ-ONLY\n");

  const rawUrl = process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, "") ?? process.env.DIRECT_URL?.trim().replace(/^["']|["']$/g, "");
  if (!rawUrl || rawUrl === "[SENSITIVE]" || !/^postgres(ql)?:\/\//.test(rawUrl)) {
    console.log("DATABASE READ-ONLY UNAVAILABLE (nilai env [SENSITIVE]/tidak ada di mesin ini).");
    console.log("Jalankan setelah env produksi tersedia untuk memverifikasi pool nyata.");
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

  const metadataRows = await prismaClient.questionMetadata.findMany({
    where: { source: "BANK_SOAL", status: "APPROVED", skill: { not: null } },
    select: { questionId: true, skill: true, subskill: true, difficulty: true, topic: true, questionType: true },
  });
  const soalRows = await prismaClient.soal.findMany({
    where: { kodeSoal: { in: [...new Set(metadataRows.map((row) => row.questionId))] } },
    select: { kodeSoal: true, type: true },
  });
  const soalById = new Map(soalRows.map((soal) => [soal.kodeSoal, soal]));

  const valid = metadataRows.filter((row) => row.skill && soalById.has(row.questionId));
  const byCell = new Map<string, Set<string>>();
  const typeCounts = new Map<string, number>();
  for (const row of valid) {
    const key = `${row.skill}|${row.difficulty ?? "NULL"}`;
    if (!byCell.has(key)) byCell.set(key, new Set());
    byCell.get(key)!.add(row.questionId);
    const type = soalById.get(row.questionId)?.type ?? "UNKNOWN";
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
  }

  const totalApproved = metadataRows.length;
  const matchedSoal = valid.length;
  const unique = new Set(valid.map((row) => row.questionId)).size;

  console.log("Pool diagnostik (read-only):");
  console.log(`  approved metadata    : ${totalApproved}`);
  console.log(`  matching Soal        : ${matchedSoal}`);
  console.log(`  unique question      : ${unique}`);
  console.log(`  duplikat questionId  : ${totalApproved - matchedSoal + (matchedSoal - unique)}`);
  console.log(`  yatim (tanpa Soal)   : ${totalApproved - matchedSoal}`);

  console.log("\nSebaran tipe soal (hanya tipe yang bisa dinilai otomatis):");
  for (const type of QUESTION_TYPES) {
    console.log(`  ${type.padEnd(16)}: ${typeCounts.get(type) ?? 0}`);
  }

  console.log("\nMatriks skill × difficulty (unique candidates):");
  const pad = (value: string, width: number) => value.padEnd(12);
  console.log(pad("skill", 12) + DIFFICULTIES.map((d) => pad(d, 12)).join("") + "TOTAL");
  for (const skill of Object.keys(SKILLS)) {
    let total = 0;
    const line = pad(SKILLS[skill as keyof typeof SKILLS] ?? skill, 12);
    const cells: string[] = [];
    for (const difficulty of DIFFICULTIES) {
      const count = byCell.get(`${skill}|${difficulty}`)?.size ?? 0;
      total += count;
      cells.push(`${count}(${classify(count) === "HEALTHY" ? "✓" : classify(count) === "INSUFFICIENT" ? "~" : "✗"})`);
    }
    cells.push(String(total));
    console.log(line + cells.map((cell) => pad(cell, 12)).join(""));
  }

  const zeroCells: string[] = [];
  const insufficientCells: string[] = [];
  for (const skill of Object.keys(SKILLS)) {
    for (const difficulty of DIFFICULTIES) {
      const count = byCell.get(`${skill}|${difficulty}`)?.size ?? 0;
      if (count === 0) zeroCells.push(`${SKILLS[skill as keyof typeof SKILLS]}/${difficulty}`);
      else if (count < DIAGNOSTIC_MIN_ITEMS) insufficientCells.push(`${SKILLS[skill as keyof typeof SKILLS]}/${difficulty}`);
    }
  }
  console.log("\nSel kosong (ZERO)            :", zeroCells.length ? zeroCells.join(", ") : "-");
  console.log("Sel kurang dari 8 butir      :", insufficientCells.length ? insufficientCells.join(", ") : "-");
  console.log(`Sel sehat (≥${DIAGNOSTIC_MIN_ITEMS})             : ${byCell.size - zeroCells.length - insufficientCells.length}`);

  if (unique >= DIAGNOSTIC_MIN_ITEMS) {
    const maxSessions = Math.min(...DIAGNOSTIC_ALLOWED_SIZES.map((size) => Math.floor(unique / size)));
    console.log(`\nKesimpulan: pool diagnostik HONEST (${unique} kandidat ≥ ${DIAGNOSTIC_MIN_ITEMS}); sesi 10 butir tanpa duplikasi: ${unique >= 10 ? "bisa" : "tidak"}; sesi bervariasi hingga ${maxSessions} tanpa pengulangan soal.`);
  } else {
    console.log(`\nKesimpulan: pool diagnostik TIDAK cukup (${unique} < ${DIAGNOSTIC_MIN_ITEMS}) → preview menjawab DIAGNOSTIC_UNAVAILABLE yang jujur (tanpa fabrikasi).`);
  }

  await prismaClient.$disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});