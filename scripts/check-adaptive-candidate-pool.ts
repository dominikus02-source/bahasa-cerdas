#!/usr/bin/env npx tsx
/**
 * STEP 3J — PART F: CANDIDATE POOL QUALITY CHECK (READ-ONLY).
 *
 * Untuk setiap kombinasi skill × difficulty (7 × 4):
 *   - approved metadata count (BANK_SOAL, status=APPROVED, skill non-null)
 *   - matching Soal count (kodeSoal benar-benar ada di tabel Soal)
 *   - unique question count
 * Klasifikasi: ZERO (0), INSUFFICIENT (1–4, tidak cukup mengisi sesi 5 soal),
 * HEALTHY (≥5). Plus kesimpulan global: apakah adaptive practice HONEST
 * (candidate total ≥ ukuran sesi & tidak pernah menduplikasi soal untuk
 * memenuhi ukuran sesi — selector mengembalikan null bila kandidat < size).
 *
 * Tanpa koneksi DB → "DATABASE READ-ONLY UNAVAILABLE", exit 0.
 */
import { PrismaClient } from "@prisma/client";
import { loadScriptEnv } from "./_env";
import { SKILLS, DIFFICULTIES } from "../lib/question-metadata/taxonomy";
import { ADAPTIVE_ALLOWED_SIZES } from "../lib/adaptive-practice/config";

function classify(count: number): "HEALTHY" | "INSUFFICIENT" | "ZERO" {
  if (count === 0) return "ZERO";
  if (count < 5) return "INSUFFICIENT";
  return "HEALTHY";
}

async function main(): Promise<void> {
  loadScriptEnv();
  console.log("STEP 3J — CANDIDATE POOL QUALITY CHECK (BANK_SOAL, status=APPROVED) — READ-ONLY\n");

  const rawUrl = process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, "") ?? process.env.DIRECT_URL?.trim().replace(/^["']|["']$/g, "");
  if (!rawUrl || rawUrl === "[SENSITIVE]" || !/^postgres(ql)?:\/\//.test(rawUrl)) {
    console.log("DATABASE READ-ONLY UNAVAILABLE (nilai env [SENSITIVE]/tidak ada di mesin ini).");
    console.log("Jalankan setelah approval manifest (isi .env.db.local dengan kredensial asli).");
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
    select: { questionId: true, skill: true, difficulty: true },
  });
  const soalRows = await prismaClient.soal.findMany({
    where: { kodeSoal: { in: [...new Set(metadataRows.map((row) => row.questionId))] } },
    select: { kodeSoal: true },
  });
  const soalIds = new Set(soalRows.map((soal) => soal.kodeSoal));

  const valid = metadataRows.filter((row) => row.skill && soalIds.has(row.questionId));
  const byCell = new Map<string, Set<string>>();
  for (const row of valid) {
    const key = `${row.skill}|${row.difficulty ?? "NULL"}`;
    if (!byCell.has(key)) byCell.set(key, new Set());
    byCell.get(key)!.add(row.questionId);
  }

  const totalApproved = metadataRows.length;
  const matchedSoal = valid.length;
  const unique = new Set(valid.map((row) => row.questionId)).size;

  console.log("Pool global:");
  console.log(`  approved metadata  : ${totalApproved}`);
  console.log(`  matching Soal      : ${matchedSoal}`);
  console.log(`  unique question    : ${unique}`);
  console.log(`  candidate rusak    : ${totalApproved - matchedSoal} (metadata APPROVED tanpa Soal)`);

  console.log("\nMatriks skill × difficulty (unique candidates):");
  const pad = (value: string, width: number) => value.padEnd(width);
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
      const label = `${SKILLS[skill as keyof typeof SKILLS]}/${difficulty}`;
      if (count === 0) zeroCells.push(label);
      else if (count < 5) insufficientCells.push(label);
    }
  }
  console.log("\nSel kosong (ZERO)     :", zeroCells.length ? zeroCells.join(", ") : "-");
  console.log("Sel kurang (1–4)      :", insufficientCells.length ? insufficientCells.join(", ") : "-");
  console.log(`Sel sehat (≥5)        : ${byCell.size - zeroCells.length - insufficientCells.length}`);

  const minSize = ADAPTIVE_ALLOWED_SIZES[0];
  if (unique >= minSize) {
    console.log(`\nKesimpulan: adaptive practice HONEST (${unique} kandidat ≥ ${minSize}); selector TIDAK pernah menduplikasi soal (kembali null bila kandidat < ukuran sesi).`);
  } else {
    console.log(`\nKesimpulan: candidate pool TIDAK cukup (${unique} < ${minSize}) → API akan mengembalikan mode FALLBACK yang jujur (reasonCode INSUFFICIENT_METADATA).`);
  }

  await prismaClient.$disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});