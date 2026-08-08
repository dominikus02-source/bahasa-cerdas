#!/usr/bin/env npx tsx
/**
 * P1-C Phase 3 — Controlled backfill `Profile.schoolId` (DEFAULT READ-ONLY).
 *
 * Mode:
 *   * Tanpa argumen (atau `--dry-run`) → READ-ONLY: hanya membaca, menghitung
 *     keputusan, mencetak laporan. DATABASE WRITES = 0.
 *   * `--apply` → EKSPLISIT. Menerapkan backfill HANYA untuk keputusan
 *     `safeToApply` (CASE A/B/C), dengan update predicate
 *     `WHERE id = <profileId> AND schoolId IS NULL` (concurrency-safe),
 *     batch kecil, dan menghitung affected rows.
 *
 * KEAMANAN (P1-C Phase 3):
 *   * `Profile.school` (legacy) TIDAK PERNAH diubah — hanya `schoolId`.
 *   * Tidak membuat/mengubah/menggabungkan School atau SchoolAlias.
 *   * Tidak auto-create School dari typo; tidak fuzzy; tidak AI/LLM.
 *   * `schoolId` TIDAK dipakai untuk authorization.
 *   * Existing `schoolId` tidak pernah ditimpa (ALREADY_CANONICAL /
 *     CONFLICTING_EVIDENCE) — engine `lib/school/backfill.ts`.
 *   * Semua evidence grup aktif dievaluasi (tidak ada first-group bias).
 *
 * Tanpa koneksi DB → "DATABASE READ-ONLY UNAVAILABLE", exit 0, TANPA statistik.
 *
 * Jalankan:
 *   npx tsx scripts/school-backfill.ts            (dry-run)
 *   npx tsx scripts/school-backfill.ts --apply    (tulis, eksplisit)
 */
import { PrismaClient } from "@prisma/client";
import { loadScriptEnv } from "./_env";
import {
  decideBackfill,
  summarizeBackfill,
  type BackfillDecision,
} from "../lib/school/backfill";
import type { SchoolRecord, AliasRecord } from "../lib/school/matching";

const APPLY_BATCH_SIZE = 25;

function isApply(args: string[]): boolean {
  return args.includes("--apply");
}

async function main(): Promise<void> {
  loadScriptEnv();
  const apply = isApply(process.argv.slice(2));

  const rawUrl =
    process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, "") ??
    process.env.DIRECT_URL?.trim().replace(/^["']|["']$/g, "");

  console.log("P1-C PHASE 3 — SCHOOL IDENTITY BACKFILL (Profile.schoolId)");
  console.log(`MODE : ${apply ? "APPLY (menulis, eksplisit)" : "DRY-RUN (read-only)"}`);
  console.log(apply ? "DATABASE WRITES : planned (--apply)" : "DATABASE WRITES : 0\n");

  if (!rawUrl || rawUrl === "[SENSITIVE]" || !/^postgres(ql)?:\/\//.test(rawUrl)) {
    console.log("DATABASE READ-ONLY UNAVAILABLE");
    console.log(
      rawUrl === "[SENSITIVE]"
        ? "Alasan : nilai DATABASE_URL adalah placeholder '[SENSITIVE]' (env di-mask)."
        : "Alasan : DATABASE_URL tidak berupa URL postgresql:// yang valid."
    );
    console.log("\n(Tidak ada statistik yang dihasilkan — data tidak dibaca.)");
    console.log("P1-C PHASE 3 DRY-RUN : ABORTED (DB tidak tersedia)");
    process.exit(0);
  }

  const url = rawUrl;
  const db = new PrismaClient({ datasources: { db: { url } } });

  try {
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
    console.log("P1-C PHASE 3 : ABORTED (DB tidak tersedia)");
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

  const decisions: BackfillDecision[] = studentRows.map((u) =>
    decideBackfill(
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

  const summary = summarizeBackfill(decisions, schools);

  // --- LAPORAN ---
  console.log(`Sekolah kanonik (School)     : ${schools.length}`);
  console.log(`Alias (SchoolAlias)          : ${aliases.length}`);
  console.log(`Profil murid dianalisis      : ${summary.totalProfiles}\n`);

  console.log("--- KEPUTUSAN BACKFILL ---");
  console.log(`  ALREADY CANONICAL (L5, tidak diubah)    : ${summary.alreadyCanonical}`);
  console.log(`  NORMALIZED EXACT (CASE B, HIGH)         : ${summary.normalizedExact}`);
  console.log(`  ALIAS MATCH (CASE A, HIGH)              : ${summary.aliasMatch}`);
  console.log(`  GROUP EVIDENCE (CASE C, MEDIUM)         : ${summary.groupEvidence}`);
  console.log(`  AMBIGUOUS (katalog/alias/grup)          : ${summary.ambiguous}`);
  console.log(`  CONFLICTING (schoolId vs evidence grup) : ${summary.conflicting}`);
  console.log(`  UNRESOLVED (CASE F)                     : ${summary.unresolved}`);
  console.log("");
  console.log("--- RINGKASAN ---");
  console.log(`  SAFE TO BACKFILL          : ${summary.safeToBackfill}`);
  console.log(`  REQUIRES REVIEW           : ${summary.requiresReview}`);
  console.log(`  REMAINING UNRESOLVED      : ${summary.remainingUnresolved}`);
  console.log(`  CATALOG CONFLICTS         : ${summary.catalogConflicts}`);

  console.log("");
  console.log("--- BREAKDOWN PER-SCHOOL (profil yang aman untuk di-backfill) ---");
  const perSchoolEntries = Object.entries(summary.perSchool).sort(
    (a, b) =>
      b[1].normalizedExact +
      b[1].alias +
      b[1].groupEvidence -
      (a[1].normalizedExact + a[1].alias + a[1].groupEvidence)
  );
  if (perSchoolEntries.length === 0) {
    console.log("  (tidak ada profil yang memenuhi syarat backfill)");
  }
  for (const [schoolId, row] of perSchoolEntries) {
    const total = row.normalizedExact + row.alias + row.groupEvidence;
    console.log(
      `  ${row.schoolName} (${schoolId.slice(0, 8)}…): ${total} = ` +
        `normalized ${row.normalizedExact} | alias ${row.alias} | grup ${row.groupEvidence}`
    );
  }

  if (apply) {
    const eligible = decisions.filter((d) => d.safeToApply && d.proposedSchoolId);
    console.log(`\nAPPLY : ${eligible.length} keputusan aman akan diterapkan (batch ${APPLY_BATCH_SIZE}).`);

    let totalAffected = 0;
    let totalSkipped = 0;
    for (let i = 0; i < eligible.length; i += APPLY_BATCH_SIZE) {
      const batch = eligible.slice(i, i + APPLY_BATCH_SIZE);
      for (const d of batch) {
        // Re-resolve + update predicate `schoolId IS NULL` → tidak menimpa
        // proses lain (concurrency-safe). Affected rows 0 = sudah terisi.
        const res = await db.profile.updateMany({
          where: { id: d.profileId, schoolId: null },
          data: { schoolId: d.proposedSchoolId as string },
        });
        if (res.count > 0) totalAffected += res.count;
        else totalSkipped++;
      }
    }
    console.log(`  AFFECTED ROWS  : ${totalAffected}`);
    console.log(`  SKIPPED (terisi duluan oleh proses lain) : ${totalSkipped}`);
  } else {
    console.log(`\nDRY-RUN : ${summary.safeToBackfill} profil siap di-backfill.`);
    console.log("Gunakan `--apply` untuk menerapkan (eksplisit).");
  }

  console.log("");
  console.log("CATATAN:");
  console.log("  - Hanya Profile.schoolId yang diisi (schoolId IS NULL). Profile.school TIDAK diubah.");
  console.log("  - Tidak ada School/SchoolAlias yang dibuat/diubah/digabung; tidak ada fuzzy/AI/LLM.");
  console.log("  - schoolId TIDAK pernah dipakai untuk authorization.");
  console.log(apply ? "P1-C PHASE 3 APPLY : SELESAI" : "P1-C PHASE 3 DRY-RUN : SELESAI (READ-ONLY)");

  await db.$disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("GAGAL (unexpected):", err);
  process.exit(1);
});
