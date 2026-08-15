#!/usr/bin/env npx tsx
/**
 * STEP 3J — PART B: CONTROLLED METADATA APPROVAL (founder/admin-only).
 *
 * Mode:
 *   * Tanpa argumen (atau `--dry-run`) → READ-ONLY: validasi semua rekor di
 *     `data/question-metadata/review-manifest-001.json`, cetak laporan.
 *     DATABASE WRITES = 0.
 *   * `--execute --founder-email <email>` → EKSPLISIT. Hanya rekor yang lolos
 *     SEMUA validasi yang di-update menjadi APPROVED (status-only + provenance
 *     HUMAN_REVIEW + reviewedById), dalam $transaction, concurrency-safe
 *     (WHERE status = 'NEEDS_REVIEW').
 *   * `--sql` → cetak blok SQL idempotent untuk Supabase SQL Editor (jalur
 *     cadangan bila koneksi DB tidak tersedia di mesin founder).
 *
 * KEAMANAN (Part B Step 3J):
 *   * Hanya status NEEDS_REVIEW yang boleh menjadi APPROVED.
 *   * questionId TIDAK pernah diubah (WHERE source_questionId kaku).
 *   * Approval DITOLAK bila Soal (kodeSoal) tidak ada di tabel Soal.
 *   * Validasi taxonomy dipertahankan: hasil akhir APPROVED + provenance
 *     HUMAN_REVIEW wajib lolos validateQuestionMetadata (rule validator).
 *   * Tidak ada "approve all" — batch maksimum = manifest.records.length (12),
 *     tidak ada flag untuk memperbesar.
 *   * Audit: reviewedById = id User founder/ADMIN yang dieksekusi, dan baris
 *     JSONL ditambahkan ke data/question-metadata/approval-audit-001.jsonl.
 *   * Manifest expectation harus cocok dengan isi DB (drift guard).
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { loadScriptEnv } from "./_env";
import { validateQuestionMetadata } from "../lib/question-metadata/validation";

const ROOT = join(__dirname, "..");
const MANIFEST_PATH = join(ROOT, "data/question-metadata/review-manifest-001.json");
const AUDIT_PATH = join(ROOT, "data/question-metadata/approval-audit-001.jsonl");
const MAX_RECORDS = 15;
const REQUIRED_SOURCE = "BANK_SOAL";

interface ManifestRecord {
  source: string;
  questionId: string;
  expectedSkill: string;
  expectedDifficulty: string;
  expectedTopic: string;
}

interface Manifest {
  manifestId: string;
  version: string;
  records: ManifestRecord[];
}

interface MetadataRow {
  source: string;
  questionId: string;
  skill: string | null;
  subskill: string | null;
  difficulty: string | null;
  topic: string | null;
  questionType: string;
  cefr: string | null;
  provenance: string;
  confidence: string;
  status: string;
  taxonomyVersion: string;
  metadataVersion: string;
  reviewedById: string | null;
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

function loadManifest(): Manifest {
  if (!existsSync(MANIFEST_PATH)) throw new Error(`Manifest tidak ditemukan: ${MANIFEST_PATH}`);
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
  if (!Array.isArray(manifest.records) || manifest.records.length === 0) {
    throw new Error("Manifest tidak berisi records");
  }
  if (manifest.records.length > MAX_RECORDS) {
    throw new Error(`Manifest melebihi batch maksimum ${MAX_RECORDS}`);
  }
  for (const record of manifest.records) {
    if (!record.questionId || !record.source) throw new Error("Rekor manifest kurang questionId/source");
  }
  return manifest;
}

function asRow(row: MetadataRow): Parameters<typeof validateQuestionMetadata>[0] {
  return {
    source: row.source,
    questionId: row.questionId,
    skill: row.skill,
    subskill: row.subskill,
    difficulty: row.difficulty,
    topic: row.topic,
    questionType: row.questionType,
    cefr: row.cefr,
    provenance: row.provenance,
    confidence: row.confidence,
    status: row.status,
    taxonomyVersion: row.taxonomyVersion,
    metadataVersion: row.metadataVersion,
  };
}

function printSql(manifest: Manifest, founderEmailArg?: string): void {
  const ids = manifest.records.map((record) => `'${record.questionId}'`).join(", ");
  const resolvedById = founderEmailArg
    ? `(SELECT u.id FROM "User" u WHERE u."email" = '${founderEmailArg}' AND (u."isFounder" = true OR u."role" = 'ADMIN') LIMIT 1)`
    : `(SELECT u.id FROM "User" u WHERE u."isFounder" = true ORDER BY u."createdAt" ASC LIMIT 1)`;
  console.log(`-- REVIEW MANIFEST ${manifest.manifestId} — approval idempoten (jalankan di Supabase SQL Editor)`);
  console.log(`-- Hanya NEEDS_REVIEW → APPROVED; Soal harus ada; questionId tidak diubah.`);
  console.log(`UPDATE "QuestionMetadata" m
SET "status" = 'APPROVED',
    "provenance" = 'HUMAN_REVIEW',
    "reviewedById" = ${resolvedById},
    "updatedAt" = now()
WHERE m."source" = '${REQUIRED_SOURCE}'
  AND m."questionId" IN (${ids})
  AND m."status" = 'NEEDS_REVIEW'
  AND EXISTS (SELECT 1 FROM "Soal" s WHERE s."kodeSoal" = m."questionId");`);
  console.log(`-- Verifikasi:`);
  console.log(`SELECT "questionId", "status", "provenance", "reviewedById" FROM "QuestionMetadata" WHERE "source" = '${REQUIRED_SOURCE}' AND "questionId" IN (${ids}) ORDER BY "questionId";`);
}

async function main(): Promise<void> {
  loadScriptEnv();
  const args = process.argv.slice(2);
  const execute = isExecute(args);
  const sqlMode = isSqlMode(args);
  const email = founderEmail(args);
  const manifest = loadManifest();

  console.log(`STEP 3J — CONTROLLED METADATA APPROVAL (${manifest.manifestId})`);
  console.log(`Rekor : ${manifest.records.length} (maks ${MAX_RECORDS})`);
  console.log(`MODE  : ${sqlMode ? "SQL MODE (cetak SQL, tanpa koneksi)" : execute ? "EXECUTE (menulis, eksplisit)" : "DRY-RUN (read-only)"}`);
  if (!sqlMode) console.log(execute ? "DATABASE WRITES : planned (--execute)" : "DATABASE WRITES : 0\n");

  if (sqlMode) {
    printSql(manifest, email);
    process.exit(0);
  }

  if (execute && !email) {
    console.error("\n--execute WAJIB disertai --founder-email <email> (User founder/ADMIN yang mereview).");
    process.exit(1);
  }

  const rawUrl = process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, "") ?? process.env.DIRECT_URL?.trim().replace(/^["']|["']$/g, "");
  if (!rawUrl || rawUrl === "[SENSITIVE]" || !/^postgres(ql)?:\/\//.test(rawUrl)) {
    console.log("\nDATABASE UNAVAILABLE (nilai env [SENSITIVE]/tidak ada di mesin ini).");
    console.log("Jalur cadangan: jalankan mode --sql lalu tempel ke Supabase SQL Editor.");
    printSql(manifest, email);
    process.exit(0);
  }

  const prismaClient = new PrismaClient();
  try {
    await prismaClient.$queryRaw`SELECT 1`;
  } catch (error) {
    console.log("\nDATABASE UNAVAILABLE (koneksi gagal).");
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

  const report: Array<{ questionId: string; ok: boolean; notes: string[] }> = [];
  for (const record of manifest.records) {
    const notes: string[] = [];
    let ok = true;

    const metadata = await prismaClient.questionMetadata.findUnique({
      where: { source_questionId: { source: record.source, questionId: record.questionId } },
      select: {
        source: true, questionId: true, skill: true, subskill: true, difficulty: true,
        topic: true, questionType: true, cefr: true, provenance: true, confidence: true,
        status: true, taxonomyVersion: true, metadataVersion: true, reviewedById: true,
      },
    });

    if (!metadata) {
      report.push({ questionId: record.questionId, ok: false, notes: ["metadata tidak ditemukan"] });
      continue;
    }
    if (metadata.status !== "NEEDS_REVIEW") {
      ok = false;
      notes.push(`status '${metadata.status}' bukan NEEDS_REVIEW`);
    }
    if (metadata.skill !== record.expectedSkill) {
      ok = false;
      notes.push(`skill di DB '${metadata.skill}' ≠ manifest '${record.expectedSkill}'`);
    }
    if (metadata.difficulty !== record.expectedDifficulty) {
      ok = false;
      notes.push(`difficulty di DB '${metadata.difficulty}' ≠ manifest '${record.expectedDifficulty}'`);
    }
    if ((metadata.topic ?? null) !== record.expectedTopic) {
      ok = false;
      notes.push(`topic di DB '${metadata.topic}' ≠ manifest '${record.expectedTopic}'`);
    }

    const soal = await prismaClient.soal.findUnique({ where: { kodeSoal: record.questionId }, select: { id: true } });
    if (!soal) {
      ok = false;
      notes.push("Soal.kodeSoal tidak ditemukan — approval ditolak");
    }

    const row = metadata as unknown as MetadataRow;
    const validated = validateQuestionMetadata({
      ...asRow(row),
      status: "APPROVED",
      provenance: "HUMAN_REVIEW",
    });
    if (!validated.valid) {
      ok = false;
      notes.push(`taxonomy setelah APPROVED gagal: ${validated.errors.join("; ")}`);
    }

    report.push({ questionId: record.questionId, ok, notes: ok ? ["siap APPROVED"] : notes });
  }

  console.log("\n=== VALIDATION REPORT (per rekor) ===");
  for (const entry of report) {
    console.log(`  ${entry.ok ? "✅" : "❌"} ${entry.questionId} — ${entry.notes.join("; ")}`);
  }

  const ready = report.filter((entry) => entry.ok).map((entry) => entry.questionId);
  console.log(`\nRekor siap APPROVED : ${ready.length}/${report.length}`);

  if (!execute) {
    console.log("DRY-RUN: tidak ada perubahan ditulis. Gunakan --execute --founder-email <email> untuk menyetujui.");
    await prismaClient.$disconnect();
    process.exit(0);
  }
  if (ready.length === 0) {
    console.error("Tidak ada rekor yang lolos validasi — tidak ada yang ditulis.");
    await prismaClient.$disconnect();
    process.exit(1);
  }

  console.log(`\nMENULIS APPROVED oleh ${email} (founder/admin): ${ready.length} rekor...`);
  const results = await prismaClient.$transaction(
    ready.map((questionId) =>
      prismaClient.questionMetadata.updateMany({
        where: { source: REQUIRED_SOURCE, questionId, status: "NEEDS_REVIEW" },
        data: { status: "APPROVED", provenance: "HUMAN_REVIEW", reviewedById: founder?.id ?? null },
      })
    )
  );
  const affected = results.reduce((sum, result) => sum + result.count, 0);
  if (affected !== ready.length) {
    console.error(`Hanya ${affected}/${ready.length} ter-update (kemungkinan berubah status di luar proses) — tidak ada audit ditulis.`);
    await prismaClient.$disconnect();
    process.exit(1);
  }

  const auditLine = JSON.stringify({
    manifestId: manifest.manifestId,
    performedByEmail: email,
    performedById: founder?.id ?? null,
    timestamp: new Date().toISOString(),
    affected,
    questionIds: ready,
  });
  appendFileSync(AUDIT_PATH, auditLine + "\n");

  console.log(`✅ APPROVED: ${affected} rekor (audit -> ${AUDIT_PATH})`);
  await prismaClient.$disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});