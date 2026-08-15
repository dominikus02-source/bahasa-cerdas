import { readFileSync, writeFileSync } from "node:fs";

const rows = JSON.parse(readFileSync("data/question-metadata/sample-001.json", "utf8"));
const esc = (v: string | number | null | undefined) =>
  v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;

const lines = rows.map((r: Record<string, string | number | null>) => {
  const id = "qm-" + r.questionId;
  return `  (${esc(id)}, ${esc(r.source)}, ${esc(r.questionId)}, ${esc(r.skill)}, ${esc(r.subskill)}, ${esc(r.difficulty)}, ${esc(r.level)}, ${esc(r.topic)}, ${esc(r.questionType)}, ${esc(r.cefr)}, ${esc(r.provenance)}, ${esc(r.confidence)}, ${esc(r.status)}, ${esc(r.taxonomyVersion)}, ${esc(r.metadataVersion)})`;
});

const sql = `-- BahasaCerdas — Phase 2 Step 3D sample seed
-- 30 sampel metadata (NEEDS_REVIEW) dari data/question-metadata/sample-001.json.
-- Idempotent: ON CONFLICT ("source","questionId") DO NOTHING — aman diulang.

INSERT INTO "QuestionMetadata" ("id","source","questionId","skill","subskill","difficulty","level","topic","questionType","cefr","provenance","confidence","status","taxonomyVersion","metadataVersion") VALUES
${lines.join(",\n")}
ON CONFLICT ("source", "questionId") DO NOTHING;

-- Verifikasi: harapnya 30 baris.
-- SELECT count(*) AS total, status FROM "QuestionMetadata" GROUP BY 2;
`;

writeFileSync("prisma/migrations/manual/2026-08-15_question_metadata_sample.sql", sql);
console.log("rows:", rows.length);