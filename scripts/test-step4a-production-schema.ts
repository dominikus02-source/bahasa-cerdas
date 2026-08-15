#!/usr/bin/env npx tsx
/**
 * PHASE 2 STEP 4A — PRODUCTION DATABASE SCHEMA GATE (READ-ONLY AUDIT).
 *
 * Audit katalog production (Supabase PostgreSQL) untuk fondasi adaptive
 * learning: LearningEvidence, QuestionMetadata, AdaptivePracticeSession,
 * termasuk dependensi LearnerState (join LearningEvidence →
 * QuestionMetadata status='APPROVED') + selector adaptive (kandidat dari
 * QuestionMetadata APPROVED → Soal.kodeSoal).
 *
 * GARANSI SCRIPT:
 *   * TIDAK PERNAH menulis/update/delete/approve — murni SELECT + katalog.
 *   * DB tidak tersedia → "DATABASE UNAVAILABLE ... UNVERIFIED", exit 0
 *     (jujur, tanpa angka karangan).
 *   * TIDAK pernah mencetak DATABASE_URL/password/secret; evidence
 *     diagregasi (never selectedAnswer/user email).
 *   * Tidak membuat migration apa pun dan tidak memodifikasi skema produksi.
 */
import { Prisma } from "@prisma/client";
import { loadScriptEnv } from "./_env";
import { db } from "../lib/db";

const TABLES: string[] = ["LearningEvidence", "QuestionMetadata", "AdaptivePracticeSession"];
const EXPECTED_COLUMNS: Record<string, string[]> = {
  QuestionMetadata: [
    "id", "source", "questionId", "skill", "subskill", "difficulty", "level",
    "topic", "questionType", "cefr", "provenance", "confidence", "status",
    "taxonomyVersion", "metadataVersion", "createdById", "reviewedById",
    "createdAt", "updatedAt",
  ],
  LearningEvidence: [
    "id", "userId", "source", "activityId", "questionId", "selectedAnswer",
    "isCorrect", "score", "skill", "difficulty", "answeredAt", "metadata",
    "createdAt", "updatedAt",
  ],
  AdaptivePracticeSession: [
    "id", "userId", "source", "selectionVersion", "targetSkill", "targetSubskill",
    "targetDifficulty", "reasonCode", "reasonText", "questionIds", "status",
    "expiresAt", "createdAt", "completedAt",
  ],
};
const EXPECTED_UNIQUES: Record<string, string[]> = {
  QuestionMetadata: ["QuestionMetadata_source_questionId_key"],
  LearningEvidence: ["LearningEvidence_userId_source_activityId_questionId_key"],
  AdaptivePracticeSession: [],
};
const EXPECTED_FKS: Record<string, string[]> = {
  QuestionMetadata: ["QuestionMetadata_createdById_fkey", "QuestionMetadata_reviewedById_fkey"],
  LearningEvidence: ["LearningEvidence_userId_fkey"],
  AdaptivePracticeSession: ["AdaptivePracticeSession_userId_fkey"],
};
const EXPECTED_INDEXES: Record<string, string[]> = {
  QuestionMetadata: [
    "QuestionMetadata_source_status_idx", "QuestionMetadata_skill_subskill_idx",
    "QuestionMetadata_difficulty_idx", "QuestionMetadata_level_idx",
  ],
  LearningEvidence: [
    "LearningEvidence_userId_answeredAt_idx", "LearningEvidence_userId_questionId_idx",
    "LearningEvidence_userId_source_answeredAt_idx", "LearningEvidence_userId_skill_answeredAt_idx",
  ],
  AdaptivePracticeSession: ["AdaptivePracticeSession_userId_createdAt_idx", "AdaptivePracticeSession_userId_status_idx"],
};
const DIFFICULTY_VALUES = ["EASY", "MEDIUM", "HARD", "VERY_HARD"];
const SKILL_VALUES = ["READING", "WRITING", "LISTENING", "SPEAKING", "GRAMMAR", "VOCABULARY", "LITERATURE"];
const STATUS_VALUES = ["DRAFT", "NEEDS_REVIEW", "APPROVED", "REJECTED"];
const SESSION_STATUS_VALUES = ["IN_PROGRESS", "COMPLETED"];
const SOURCE = "BANK_SOAL";

interface StatusBand {
  schema: "GREEN" | "YELLOW" | "RED";
  integrity: "GREEN" | "YELLOW" | "RED";
  coverage: "GREEN" | "YELLOW" | "RED";
  readiness: "GREEN" | "YELLOW" | "RED";
}

const band: StatusBand = { schema: "GREEN", integrity: "GREEN", coverage: "GREEN", readiness: "GREEN" };

function report(label: string, value: string, ok = true): void {
  console.log(`  ${ok ? "✅" : "️❌"} ${label}: ${value}`);
}

function degrade(key: keyof StatusBand, level: "YELLOW" | "RED"): void {
  const order = ["GREEN", "YELLOW", "RED"] as const;
  const current = order.indexOf(band[key]);
  const target = order.indexOf(level);
  if (target > current) band[key] = level;
}

async function checkSchema(): Promise<void> {
  console.log("\n=== CHECK A — SCHEMA (katalog production, bukan asumsi Prisma) ===");
  const tables = await db.$queryRaw<Array<{ table_name: string }>>(Prisma.sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ANY(${TABLES as string[]})
    ORDER BY table_name`);
  const present = new Set(tables.map((row) => row.table_name));
  for (const table of TABLES) {
    if (present.has(table)) {
      report(`tabel ${table}`, "ADA");
    } else {
      report(`tabel ${table}`, "TIDAK ADA", false);
      degrade("schema", "RED");
      degrade("readiness", "RED");
    }
  }

  const columns = await db.$queryRaw<Array<{ table_name: string; column_name: string; data_type: string; is_nullable: string; column_default: string | null; udt_name: string }>>(Prisma.sql`
    SELECT table_name, column_name, data_type, is_nullable, column_default, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ANY(${TABLES as string[]})
    ORDER BY table_name, ordinal_position`);
  for (const table of TABLES) {
    if (!present.has(table)) continue;
    const rows = columns.filter((row) => row.table_name === table);
    const actualColumns = rows.map((row) => row.column_name);
    const missing = EXPECTED_COLUMNS[table].filter((name) => !actualColumns.includes(name));
    const extra = actualColumns.filter((name) => !EXPECTED_COLUMNS[table].includes(name));
    report(`kolom ${table}`, `${rows.length} kolom (${missing.length === 0 ? "cocok kontrak" : `HILANG: ${missing.join(", ")}`})`, missing.length === 0);
    if (missing.length > 0) {
      degrade("schema", "RED");
      degrade("readiness", "RED");
    }
    if (extra.length > 0) {
      report(`kolom ekstra ${table}`, extra.join(", "));
      degrade("schema", "YELLOW");
    }
    for (const row of rows) {
      const nullable = row.is_nullable === "YES" ? "null" : "NOT NULL";
      const defaultText = row.column_default ? ` default=${row.column_default}` : "";
      console.log(`      · ${row.column_name}: ${row.udt_name}/${row.data_type} ${nullable}${defaultText}`);
    }
  }

  const constraints = await db.$queryRaw<Array<{ table_name: string; constraint_type: string; constraint_name: string; cols: string }>>(Prisma.sql`
    SELECT tc.table_name, tc.constraint_type, tc.constraint_name,
           COALESCE(string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position), '') AS cols
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public' AND tc.table_name = ANY(${TABLES as string[]})
    GROUP BY tc.table_name, tc.constraint_type, tc.constraint_name
    ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name`);
  for (const table of TABLES) {
    if (!present.has(table)) continue;
    const own = constraints.filter((row) => row.table_name === table);
    const pk = own.filter((row) => row.constraint_type === "PRIMARY KEY");
    const uniques = own.filter((row) => row.constraint_type === "UNIQUE");
    const fks = own.filter((row) => row.constraint_type === "FOREIGN KEY");
    report(`PK ${table}`, pk.length === 1 ? pk[0].constraint_name : "TIDAK ADA", pk.length === 1);
    if (pk.length !== 1) degrade("schema", "RED");

    const uniqueIndexes = await db.$queryRaw<Array<{ indexname: string; indexdef: string }>>(Prisma.sql`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = ${table}
        AND indexdef ILIKE '%UNIQUE%'`);
    for (const expected of EXPECTED_UNIQUES[table]) {
      const found = uniqueIndexes.some((row) => row.indexname === expected);
      if (!found) {
        report(`unique ${expected}`, "TIDAK ADA", false);
        degrade("schema", "RED");
        degrade("integrity", "RED");
      }
    }
    for (const expected of EXPECTED_FKS[table]) {
      const found = fks.some((row) => row.constraint_name === expected);
      if (!found) {
        report(`fk ${expected}`, "TIDAK ADA", false);
        degrade("schema", "RED");
      }
    }
  }

  const indexes = await db.$queryRaw<Array<{ tablename: string; indexname: string }>>(Prisma.sql`
    SELECT tablename, indexname FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = ANY(${TABLES as string[]})
    ORDER BY tablename, indexname`);
  for (const table of TABLES) {
    if (!present.has(table)) continue;
    const own = new Set(indexes.filter((row) => row.tablename === table).map((row) => row.indexname));
    for (const expected of EXPECTED_INDEXES[table]) {
      if (!own.has(expected)) {
        report(`index ${expected}`, "TIDAK ADA", false);
        degrade("schema", "YELLOW");
        degrade("readiness", "YELLOW");
      }
    }
  }

  const enums = await db.$queryRaw<Array<{ typname: string; enumlabel: string }>>(Prisma.sql`
    SELECT t.typname, e.enumlabel
    FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname IN ('Difficulty', 'LearningSkillType')
    ORDER BY t.typname, e.enumsortorder`);
  for (const enumName of ["Difficulty", "LearningSkillType"]) {
    const values = enums.filter((row) => row.typname === enumName).map((row) => row.enumlabel);
    const expected = enumName === "Difficulty" ? DIFFICULTY_VALUES : SKILL_VALUES;
    const ok = values.length === expected.length && expected.every((value) => values.includes(value));
    report(`enum ${enumName}`, ok ? `ADA (${values.join(", ")})` : `MISMATCH (${values.join(", ")})`, ok);
    if (!ok) {
      degrade("schema", "RED");
      degrade("readiness", "RED");
    }
  }

  const rls = await db.$queryRaw<Array<{ relname: string; relrowsecurity: boolean }>>(Prisma.sql`
    SELECT c.relname, c.relrowsecurity
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = ANY(${TABLES as string[]})`);
  for (const row of rls) {
    report(`RLS ${row.relname}`, row.relrowsecurity ? "ENABLED" : "disabled (drift minor)", row.relrowsecurity);
    if (!row.relrowsecurity) degrade("schema", "YELLOW");
  }
}

async function checkMetadata(): Promise<void> {
  console.log("\n=== CHECK B — QUESTION METADATA ===");
  const total = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS n FROM "QuestionMetadata"`);
  report("total QuestionMetadata", String(total[0].n));

  const bySource = await db.$queryRaw<Array<{ source: string; n: bigint }>>(Prisma.sql`
    SELECT source, COUNT(*)::bigint AS n FROM "QuestionMetadata" GROUP BY source ORDER BY n DESC`);
  console.log(`   • source: ${bySource.map((row) => `${row.source}=${row.n}`).join(", ") || "(kosong)"}`);

  const byStatus = await db.$queryRaw<Array<{ status: string; n: bigint }>>(Prisma.sql`
    SELECT status, COUNT(*)::bigint AS n FROM "QuestionMetadata" GROUP BY status ORDER BY n DESC`);
  console.log(`   • status: ${byStatus.map((row) => `${row.status}=${row.n}`).join(", ") || "(kosong)"}`);
  report("NEEDS_REVIEW count", String((byStatus.find((row) => row.status === "NEEDS_REVIEW")?.n ?? BigInt(0))));
  report("APPROVED count", String((byStatus.find((row) => row.status === "APPROVED")?.n ?? BigInt(0))));
  report("REJECTED count", String((byStatus.find((row) => row.status === "REJECTED")?.n ?? BigInt(0))));

  const missingQuestionId = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS n FROM "QuestionMetadata" WHERE "questionId" IS NULL OR "questionId" = ''`);
  report("metadata questionId kosong/null", String(missingQuestionId[0].n));

  const orphanToSoal = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS n FROM "QuestionMetadata" m
    WHERE NOT EXISTS (SELECT 1 FROM "Soal" s WHERE s."kodeSoal" = m."questionId")`);
  report("metadata tanpa Soal (orphan)", String(orphanToSoal[0].n));
  if (Number(orphanToSoal[0].n) > 0) degrade("integrity", "YELLOW");

  const dupes = await db.$queryRaw<Array<{ source: string; questionId: string; n: bigint }>>(Prisma.sql`
    SELECT source, "questionId", COUNT(*)::bigint AS n FROM "QuestionMetadata"
    GROUP BY source, "questionId" HAVING COUNT(*) > 1 ORDER BY n DESC`);
  report("duplikat (source, questionId)", String(dupes.length));
  if (dupes.length > 0) {
    degrade("integrity", "RED");
    for (const row of dupes.slice(0, 5)) console.log(`      · duplikat ${row.source}/${row.questionId} = ${row.n}`);
  }

  const invalidSkills = await db.$queryRaw<Array<{ skill: string; n: bigint }>>(Prisma.sql`
    SELECT skill, COUNT(*)::bigint AS n FROM "QuestionMetadata"
    WHERE skill IS NOT NULL AND NOT (skill = ANY(${SKILL_VALUES}))
    GROUP BY skill ORDER BY n DESC`);
  report("invalid skill", invalidSkills.length === 0 ? "0" : invalidSkills.map((row) => `${row.skill}=${row.n}`).join(", "), invalidSkills.length === 0);
  if (invalidSkills.length > 0) degrade("integrity", "YELLOW");

  const orphanMeta = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS n FROM "QuestionMetadata" m
    LEFT JOIN "User" u ON u.id = m."createdById" WHERE m."createdById" IS NOT NULL AND u.id IS NULL`);
  report("orphan createdById/reviewedById", String(orphanMeta[0].n));
}

async function checkApproved(): Promise<void> {
  console.log("\n=== CHECK C — APPROVED DATA coverage ===");
  const bySkill = await db.$queryRaw<Array<{ skill: string | null; n: bigint }>>(Prisma.sql`
    SELECT skill, COUNT(*)::bigint AS n FROM "QuestionMetadata"
    WHERE status = 'APPROVED' GROUP BY skill ORDER BY n DESC`);
  const byDiff = await db.$queryRaw<Array<{ difficulty: string | null; n: bigint }>>(Prisma.sql`
    SELECT difficulty, COUNT(*)::bigint AS n FROM "QuestionMetadata"
    WHERE status = 'APPROVED' GROUP BY difficulty ORDER BY n DESC`);
  const byType = await db.$queryRaw<Array<{ questionType: string; n: bigint }>>(Prisma.sql`
    SELECT "questionType", COUNT(*)::bigint AS n FROM "QuestionMetadata"
    WHERE status = 'APPROVED' GROUP BY "questionType" ORDER BY n DESC`);
  const bySource = await db.$queryRaw<Array<{ source: string; n: bigint }>>(Prisma.sql`
    SELECT source, COUNT(*)::bigint AS n FROM "QuestionMetadata"
    WHERE status = 'APPROVED' GROUP BY source ORDER BY n DESC`);

  console.log(`   • skill: ${bySkill.map((row) => `${row.skill ?? "(null)"}=${row.n}`).join(", ") || "(kosong)"}`);
  console.log(`   • difficulty: ${byDiff.map((row) => `${row.difficulty ?? "(null)"}=${row.n}`).join(", ") || "(kosong)"}`);
  console.log(`   • questionType: ${byType.map((row) => `${row.questionType}=${row.n}`).join(", ") || "(kosong)"}`);
  console.log(`   • source: ${bySource.map((row) => `${row.source}=${row.n}`).join(", ") || "(kosong)"}`);

  console.log("   • matriks skill × difficulty (approved):");
  const matrix = await db.$queryRaw<Array<{ skill: string | null; difficulty: string | null; n: bigint }>>(Prisma.sql`
    SELECT skill, difficulty, COUNT(*)::bigint AS n FROM "QuestionMetadata"
    WHERE status = 'APPROVED' GROUP BY skill, difficulty ORDER BY skill, difficulty`);
  const header = ["skill", ...DIFFICULTY_VALUES].map((col) => col.padEnd(12)).join("");
  console.log(`     ${header}`);
  const availableSkills = [...new Set(matrix.map((row) => row.skill).filter((value): value is string => value !== null))];
  for (const skill of availableSkills) {
    const line = [skill.padEnd(12)];
    for (const difficulty of DIFFICULTY_VALUES) {
      const cell = matrix.find((row) => row.skill === skill && row.difficulty === difficulty)?.n ?? BigInt(0);
      line.push((cell > BigInt(0) ? String(cell) : "0").padEnd(12));
    }
    console.log(`     ${line.join("")}`);
  }
  const zeroCells = DIFFICULTY_VALUES.length * availableSkills.length
    - matrix.filter((row) => row.n > BigInt(0)).length;
  report("sel matriks terisi vs kosong", `${availableSkills.length} skill, ${zeroCells} sel kosong`);
  if (availableSkills.length === 0) {
    degrade("coverage", "RED");
    band.readiness = "RED";
  } else if (zeroCells > 0) {
    degrade("coverage", "YELLOW");
  }
}

async function checkEvidence(): Promise<void> {
  console.log("\n=== CHECK D — LEARNING EVIDENCE ===");
  const total = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS n FROM "LearningEvidence"`);
  report("total evidence", String(total[0].n));

  const bySource = await db.$queryRaw<Array<{ source: string; n: bigint }>>(Prisma.sql`
    SELECT source, COUNT(*)::bigint AS n FROM "LearningEvidence" GROUP BY source ORDER BY n DESC`);
  console.log(`   • source: ${bySource.map((row) => `${row.source}=${row.n}`).join(", ") || "(kosong)"}`);

  const bySkill = await db.$queryRaw<Array<{ skill: string | null; n: bigint }>>(Prisma.sql`
    SELECT m.skill, COUNT(*)::bigint AS n
    FROM "LearningEvidence" e
    LEFT JOIN "QuestionMetadata" m ON m."source" = e.source AND m."questionId" = e."questionId"
    GROUP BY m.skill ORDER BY n DESC`);
  console.log(`   • skill (via metadata): ${bySkill.map((row) => `${row.skill ?? "(tanpa metadata)"}=${row.n}`).join(", ") || "(kosong)"}`);

  const withMeta = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS n FROM "LearningEvidence" e
    WHERE EXISTS (SELECT 1 FROM "QuestionMetadata" m WHERE m."source" = e.source AND m."questionId" = e."questionId")`);
  const withoutMeta = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS n FROM "LearningEvidence" e
    WHERE NOT EXISTS (SELECT 1 FROM "QuestionMetadata" m WHERE m."source" = e.source AND m."questionId" = e."questionId")`);
  report("evidence dengan metadata", String(withMeta[0].n));
  report("evidence TANPA metadata", String(withoutMeta[0].n));
  if (Number(withoutMeta[0].n) > 0) degrade("integrity", "YELLOW");

  const withApproved = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS n FROM "LearningEvidence" e
    WHERE EXISTS (SELECT 1 FROM "QuestionMetadata" m
      WHERE m."source" = e.source AND m."questionId" = e."questionId" AND m."status" = 'APPROVED')`);
  report("evidence dengan metadata APPROVED", String(withApproved[0].n));

  const orphans = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS n FROM "LearningEvidence" e
    WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = e."userId")`);
  report("orphan evidence (userId tanpa User)", String(orphans[0].n));
  if (Number(orphans[0].n) > 0) degrade("integrity", "RED");

  const dupes = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS n FROM (
      SELECT "userId", source, "activityId", "questionId"
      FROM "LearningEvidence"
      GROUP BY "userId", source, "activityId", "questionId"
      HAVING COUNT(*) > 1
    ) d`);
  report("duplikat kontrak unik (userId,source,activityId,questionId)", String(dupes[0].n));
  if (Number(dupes[0].n) > 0) degrade("integrity", "RED");

  for (const [label, days] of [["1 hari terakhir", 1], ["7 hari terakhir", 7], ["30 hari terakhir", 30]] as const) {
    const recent = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS n FROM "LearningEvidence"
      WHERE "answeredAt" >= now() - (${days}::int * interval '1 day')`);
    report(`evidence ${label}`, String(recent[0].n));
  }
}

async function checkSessions(): Promise<void> {
  console.log("\n=== CHECK E — ADAPTIVE PRACTICE SESSIONS ===");
  const total = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS n FROM "AdaptivePracticeSession"`);
  report("total sessions", String(total[0].n));

  const byStatus = await db.$queryRaw<Array<{ status: string; n: bigint }>>(Prisma.sql`
    SELECT status, COUNT(*)::bigint AS n FROM "AdaptivePracticeSession" GROUP BY status ORDER BY n DESC`);
  console.log(`   • status: ${byStatus.map((row) => `${row.status}=${row.n}`).join(", ") || "(kosong)"}`);

  const bySource = await db.$queryRaw<Array<{ source: string; n: bigint }>>(Prisma.sql`
    SELECT source, COUNT(*)::bigint AS n FROM "AdaptivePracticeSession" GROUP BY source ORDER BY n DESC`);
  console.log(`   • source: ${bySource.map((row) => `${row.source}=${row.n}`).join(", ") || "(kosong)"}`);

  const byUser = await db.$queryRaw<Array<{ users: bigint; min: bigint; max: bigint; avg: number }>>(Prisma.sql`
    WITH peruser AS (
      SELECT "userId", COUNT(*)::bigint AS n FROM "AdaptivePracticeSession" GROUP BY "userId"
    )
    SELECT COUNT(*)::bigint AS users, COALESCE(MIN(n), 0::bigint) AS min, COALESCE(MAX(n), 0::bigint) AS max, COALESCE(AVG(n), 0)::float8 AS avg FROM peruser`);
  report("sesi per user (agregat saja)", `users=${byUser[0].users}, min=${byUser[0].min}, max=${byUser[0].max}, avg=${byUser[0].avg.toFixed(1)}`);

  const expired = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS n FROM "AdaptivePracticeSession"
    WHERE "status" = 'IN_PROGRESS' AND "expiresAt" < now()`);
  const activeInProgress = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS n FROM "AdaptivePracticeSession"
    WHERE "status" = 'IN_PROGRESS' AND "expiresAt" >= now()`);
  report("sesi IN_PROGRESS kedaluwarsa (abandoned)", String(expired[0].n));
  report("sesi IN_PROGRESS masih berlaku", String(activeInProgress[0].n));

  const orphans = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS n FROM "AdaptivePracticeSession" s
    WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = s."userId")`);
  report("orphan session (userId tanpa User)", String(orphans[0].n));
  if (Number(orphans[0].n) > 0) degrade("integrity", "RED");

  const dupAnomaly = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS n FROM (
      SELECT "userId", source, "questionIds", COUNT(*) AS c
      FROM "AdaptivePracticeSession"
      GROUP BY "userId", source, "questionIds"
      HAVING COUNT(*) > 1
    ) d`);
  report("anomali duplikat (userId,source,questionIds sama)", String(dupAnomaly[0].n));
}

async function checkRelations(): Promise<void> {
  console.log("\n=== CHECK F — RELATION INTEGRITY ===");
  const orphanMetaWithSoal = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS n FROM "QuestionMetadata" m
    WHERE NOT EXISTS (SELECT 1 FROM "Soal" s WHERE s."kodeSoal" = m."questionId")`);
  report("Soal → QuestionMetadata: metadata tanpa Soal", String(orphanMetaWithSoal[0].n));

  const soalMissingMeta = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS n FROM "Soal" s
    WHERE s."kodeSoal" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "QuestionMetadata" m WHERE m."questionId" = s."kodeSoal")`);
  report("Soal berkode tanpa metadata (informasional)", String(soalMissingMeta[0].n));

  const evidenceNoMeta = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS n FROM "LearningEvidence" e
    WHERE NOT EXISTS (SELECT 1 FROM "QuestionMetadata" m WHERE m."source" = e.source AND m."questionId" = e."questionId")`);
  report("QuestionMetadata → LearningEvidence: evidence tanpa metadata", String(evidenceNoMeta[0].n));

  const evidenceNoSoal = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS n FROM "LearningEvidence" e
    WHERE NOT EXISTS (SELECT 1 FROM "Soal" s WHERE s."kodeSoal" = e."questionId")`);
  report("Soal → LearningEvidence: evidence tanpa Soal", String(evidenceNoSoal[0].n));

  const evidenceOrphanUser = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS n FROM "LearningEvidence" e
    WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = e."userId")`);
  const sessionsOrphanUser = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS n FROM "AdaptivePracticeSession" s
    WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = s."userId")`);
  report("User → LearningEvidence: orphan users", String(evidenceOrphanUser[0].n));
  report("User → AdaptivePracticeSession: orphan sessions", String(sessionsOrphanUser[0].n));

  const evidenceForApprovedOnly = await db.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS n FROM "LearningEvidence" e
    WHERE EXISTS (SELECT 1 FROM "QuestionMetadata" m
      WHERE m."source" = e.source AND m."questionId" = e."questionId" AND m."status" <> 'APPROVED')`);
  report("evidence ke metadata non-APPROVED", String(evidenceForApprovedOnly[0].n));
}

async function checkMigrationSafety(): Promise<void> {
  console.log("\n=== CHECK G — PRODUCTION MIGRATION SAFETY ===");
  console.log(`  Status skema: ${band.schema}`);
  console.log(`  Kontrak diverifikasi vs migration manual:
    2026-08-15_question_metadata.sql / 2026-08-15_learning_evidence.sql /
    2026-08-15_adaptive_practice_session.sql (+ enum Difficulty & LearningSkillType).`);
  if (band.schema === "GREEN") {
    console.log("  GREEN — skema production cocok persis dengan kontrak migrasi/Prisma.");
  } else if (band.schema === "YELLOW") {
    console.log("  YELLOW — drift kompatibel (lihat temuan CHECK A); tidak ada perbaikan otomatis.");
  } else {
    console.log("  RED — tabel/kolom/kunci kontrak hilang; PRODUCTION HIDDEN FAILURE. JANGAN gunakan adaptive.");
  }
}

function finalStatus(): void {
  console.log("\n=== CHECK H — PRODUCTION READINESS ===");
  console.log(`  DATABASE SCHEMA   = ${band.schema}`);
  console.log(`  DATA INTEGRITY    = ${band.integrity}`);
  console.log(`  METADATA COVERAGE = ${band.coverage}`);
  console.log(`  ADAPTIVE READINESS= ${band.readiness}`);
}

async function main(): Promise<void> {
  loadScriptEnv();
  console.log("PHASE 2 STEP 4A — PRODUCTION DATABASE SCHEMA GATE (READ-ONLY)");

  const rawUrl = process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, "") ?? "";
  if (!rawUrl || rawUrl === "[SENSITIVE]" || !/^postgres(ql)?:\/\//.test(rawUrl)) {
    console.log("DATABASE UNAVAILABLE — nilai env [SENSITIVE]/tidak ada di mesin ini.");
    console.log("PRODUCTION SCHEMA GATE : UNVERIFIED (tidak dijalankan; tanpa angka karangan)");
    process.exit(0);
  }

  try {
    await db.$queryRaw`SELECT 1`;
  } catch (error) {
    console.log(`DATABASE UNAVAILABLE — koneksi gagal: ${String(error).slice(0, 200)}`);
    console.log("PRODUCTION SCHEMA GATE : UNVERIFIED (tidak dijalankan; tanpa angka karangan)");
    await db.$disconnect();
    process.exit(0);
  }

  try {
    await checkSchema();
    await checkMetadata();
    await checkApproved();
    await checkEvidence();
    await checkSessions();
    await checkRelations();
    await checkMigrationSafety();
    finalStatus();
    console.log("\nPRODUCTION SCHEMA GATE : SELESAI (READ-ONLY — 0 write, 0 update, 0 delete, 0 approve)");
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});