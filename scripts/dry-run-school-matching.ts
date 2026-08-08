#!/usr/bin/env npx tsx
/**
 * P1-C Phase 2 — DRY-RUN pemetaan identitas sekolah murid (READ-ONLY ONLY).
 *
 * DATABASE WRITES : 0
 *
 * Apa yang dilakukan:
 *   * Membaca (findMany SAJA) murid, profil, grup aktif, sekolah guru.
 *   * Menjalankan engine murni `lib/school/matching.ts` untuk setiap murid.
 *   * Menampilkan laporan: distribusi evidence/confidence, potensi duplikat
 *     School, kualitas bukti grup.
 *
 * DILARANG:
 *   * create/update/delete/upsert/updateMany/deleteMany — file ini TIDAK
 *     mengandung satu pun panggilan tulis.
 *   * Mengisi Profile.schoolId, membuat School/SchoolAlias, merge, atau
 *     backfill apa pun. Output hanyalah kandidat.
 *
 * Jika DATABASE_URL tidak tersedia (placeholder [SENSITIVE] / tidak bisa
 * terhubung), laporan menampilkan "DATABASE READ-ONLY UNAVAILABLE" dan skrip
 * keluar 0 — TIDAK ada statistik yang dikarang.
 *
 * Jalankan: npx tsx scripts/dry-run-school-matching.ts
 */
import { PrismaClient } from "@prisma/client";
import { loadScriptEnv } from "./_env";
import {
  matchStudentSchool,
  findPotentialDuplicateSchools,
  summarizeDecisions,
  type SchoolRecord,
  type AliasRecord,
} from "../lib/school/matching";

async function main(): Promise<void> {
  loadScriptEnv();

  const rawUrl =
    process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, "") ??
    process.env.DIRECT_URL?.trim().replace(/^["']|["']$/g, "");

  console.log("P1-C PHASE 2 — SCHOOL IDENTITY MATCHING (DRY-RUN, READ-ONLY)");
  console.log("DATABASE WRITES : 0\n");

  if (!rawUrl || rawUrl === "[SENSITIVE]" || !/^postgres(ql)?:\/\//.test(rawUrl)) {
    console.log("DATABASE READ-ONLY UNAVAILABLE");
    console.log(
      rawUrl === "[SENSITIVE]"
        ? "Alasan : nilai DATABASE_URL adalah placeholder '[SENSITIVE]' (env di-mask)."
        : "Alasan : DATABASE_URL tidak berupa URL postgresql:// yang valid."
    );
    console.log("\n(Tidak ada statistik yang dihasilkan — data tidak dibaca.)");
    console.log("P1-C PHASE 2 DRY-RUN : ABORTED (DB tidak tersedia)");
    process.exit(0);
  }

  const url = rawUrl;
  const db = new PrismaClient({ datasources: { db: { url } } });

  try {
    // Ping read-only. Timeout cepat agar tidak menggantung bila DB mati.
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout koneksi (10s)")), 10_000)
      ),
    ]);
  } catch (err) {
    console.log("DATABASE READ-ONLY UNAVAILABLE");
    console.log(
      `Alasan : ${err instanceof Error ? err.message : String(err).slice(0, 200)}`
    );
    console.log("\n(Tidak ada statistik yang dihasilkan — data tidak dibaca.)");
    console.log("P1-C PHASE 2 DRY-RUN : ABORTED (DB tidak tersedia)");
    await db.$disconnect().catch(() => undefined);
    process.exit(0);
  }

  // --- BACA (read-only) ---
  const [schoolRows, aliasRows, studentRows] = await Promise.all([
    db.school.findMany({
      select: { id: true, canonicalName: true, normalizedName: true, isActive: true },
    }),
    db.schoolAlias.findMany({
      select: { id: true, schoolId: true, alias: true, normalizedAlias: true },
    }),
    db.user.findMany({
      where: { role: "MURID" },
      select: {
        id: true,
        profile: { select: { school: true, schoolId: true } },
        groupMemberships: {
          select: {
            group: {
              select: {
                id: true,
                isActive: true,
                teacher: { select: { profile: { select: { school: true } } } },
              },
            },
          },
        },
      },
    }),
  ]);

  const schools: SchoolRecord[] = schoolRows.map((s) => ({
    id: s.id,
    canonicalName: s.canonicalName,
    normalizedName: s.normalizedName,
    isActive: s.isActive,
  }));
  const aliases: AliasRecord[] = aliasRows.map((a) => ({
    id: a.id,
    schoolId: a.schoolId,
    alias: a.alias,
    normalizedAlias: a.normalizedAlias,
  }));

  const decisions = studentRows.map((u) =>
    matchStudentSchool(
      {
        studentId: u.id,
        legacySchool: u.profile?.school ?? null,
        existingSchoolId: u.profile?.schoolId ?? null,
        groups: u.groupMemberships.map((m) => ({
          groupId: m.group.id,
          isActive: m.group.isActive,
          teacherSchool: m.group.teacher?.profile?.school ?? null,
        })),
      },
      schools,
      aliases
    )
  );

  const summary = summarizeDecisions(decisions);
  const dupSchools = findPotentialDuplicateSchools(schools);

  // --- LAPORAN ---
  console.log(`Sekolah kanonik (School)        : ${schools.length}`);
  console.log(`Alias (SchoolAlias)             : ${aliases.length}`);
  console.log(`Murid dianalisis                : ${summary.total}`);
  console.log("");
  console.log("--- RINGKASAN CONFIDENCE ---");
  console.log(`  ALREADY_CANONICAL (L5 EXPLICIT): ${summary.alreadyCanonical}`);
  console.log(`  HIGH_CONFIDENCE                : ${summary.highConfidence}`);
  console.log(`  MEDIUM_CONFIDENCE (L2 grup)    : ${summary.mediumConfidence}`);
  console.log(`  LOW_CONFIDENCE (L1 kontekstual): ${summary.lowConfidence}`);
  console.log(`  AMBIGUOUS                       : ${summary.ambiguous}`);
  console.log(`  UNRESOLVED (L0)                 : ${summary.unresolved}`);
  console.log("");
  console.log("--- RINGKASAN KEPUTUSAN ---");
  console.log(`  NORMALIZED_EXACT               : ${summary.normalizedExact}`);
  console.log(`  ALIAS_MATCH                    : ${summary.aliasMatch}`);
  console.log(`  GROUP-EVIDENCE ONLY (candidate): ${summary.groupEvidenceOnly}`);
  console.log(`  CONFLICTING EVIDENCE           : ${summary.conflictingEvidence}`);
  console.log(`  NO_FALSE_INFERENCE             : ${summary.noFalseInference}`);
  console.log("");
  console.log("--- KUALITAS BUKTI GRUP ---");
  for (const [k, v] of Object.entries(summary.qualityDistribution)) {
    console.log(`  ${k.padEnd(22)}: ${v}`);
  }
  console.log("");
  console.log("--- POTENSI DUPLIKAT SCHOOL (FLAG_FOR_REVIEW, bukan merge) ---");
  if (dupSchools.length === 0) {
    console.log("  0 potensi duplikat (setiap normalizedName unik).");
  } else {
    for (const d of dupSchools) {
      console.log(`  ⚠ ${d.normalizedName}`);
      console.log(`    ids : ${d.ids.join(", ")}`);
      console.log(`    nama: ${d.names.join(" | ")}`);
    }
  }
  console.log("");
  console.log("CATATAN:");
  console.log("  - Ini laporan CANDIDATE-ONLY. Tidak ada Profile.schoolId yang diisi,");
  console.log("    tidak ada School/SchoolAlias yang dibuat, tidak ada data diubah.");
  console.log("  - Keputusan backfill hanya setelah founder meninjau laporan ini.");
  console.log("  - schoolId TIDAK pernah dipakai untuk authorization.");
  console.log("P1-C PHASE 2 DRY-RUN : SELESAI (READ-ONLY)");

  await db.$disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("GAGAL (unexpected):", err);
  process.exit(1);
});
