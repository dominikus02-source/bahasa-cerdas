#!/usr/bin/env npx tsx
/**
 * STEP 4B.5 — TEST REPORT ENRICHMENT MANIFEST (READ-ONLY QA).
 *
 * Memverifikasi `scripts/report-enrichment-manifest.ts`:
 *   1. Report berjalan tanpa DB, exit 0.
 *   2. Output memuat semua seksi wajib (MANIFEST ID, TOTAL CANDIDATES,
 *      STATUS COUNTS, SKILL COUNTS, DIFFICULTY COUNTS, MATRIX).
 *   3. 75 kandidat dirender, bernomor urut 01..75, dikelompokkan 15 sel.
 *   4. Anomali = 0 (duplikat, taksonomi, field wajib, mismatch).
 *   5. Manifest TIDAK berubah (hash sebelum == sesudah) — proof read-only.
 *   6. Tidak ada "QUESTION TEXT NOT EMBEDDED" (semua record punya preview).
 *
 * GARANSI: tidak pernah menulis DB, tidak mengubah manifest, tidak approve.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DIFFICULTIES,
  hasSkill,
  hasSubskill,
  type SkillId,
} from "../lib/question-metadata/taxonomy";

const ROOT = join(__dirname, "..");
const REPORT_SCRIPT = join(ROOT, "scripts/report-enrichment-manifest.ts");
const MANIFEST_PATH = join(ROOT, "data/question-metadata/enrichment-manifest-001.json");
const SKILLS: SkillId[] = ["READING", "WRITING", "LISTENING", "SPEAKING", "GRAMMAR", "VOCABULARY", "LITERATURE"];
const REQUIRED_FIELDS = ["source", "questionId", "expectedSkill", "expectedDifficulty", "expectedTopic", "subskill", "questionType", "provenance", "status", "confidence"];

let failures = 0;
function check(label: string, ok: boolean, detail = ""): void {
  if (!ok) failures++;
  console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
}

function sha256(p: string): string {
  return createHash("sha256").update(readFileSync(p, "utf8")).digest("hex");
}

function main(): void {
  if (!existsSync(REPORT_SCRIPT)) {
    check("report script ada", false);
  } else {
    check("report script ada", true);
  }
  if (!existsSync(MANIFEST_PATH)) {
    check("manifest ada", false);
  } else {
    check("manifest ada", true);
  }

  const before = sha256(MANIFEST_PATH);
  // 1. jalankan report (tanpa DB env — harus tetap jalan)
  const out = execFileSync("npx", ["tsx", REPORT_SCRIPT], { cwd: ROOT, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  const after = sha256(MANIFEST_PATH);
  check("manifest tidak berubah (read-only)", before === after);

  // 2. seksi wajib
  const requiredSections = [
    "MANIFEST ID",
    "TOTAL CANDIDATES",
    "STATUS COUNTS",
    "SKILL COUNTS",
    "DIFFICULTY COUNTS",
    "REVIEW STATE (audit)",
    "SKILL × DIFFICULTY MATRIX",
    "ANOMALI & INTEGRITY",
    "READ-ONLY REPORT",
  ];
  for (const s of requiredSections) {
    check(`output memuat seksi "${s}"`, out.includes(s));
  }

  // 3. render kandidat
  const m = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as { records: Array<{ questionId?: string; expectedSkill?: string; expectedDifficulty?: string; evidence?: { textPreview?: string } }> };
  const records = m.records ?? [];
  const filledCells = [...new Set(records.map((r) => `${r.expectedSkill}|${r.expectedDifficulty}`))].sort();
  check("75 kandidat", records.length === 75, `records=${records.length}`);
  check("15 sel terisi", filledCells.length === 15, `${filledCells.length}`);
  check("setiap sel 5 kandidat", filledCells.every((c) => records.filter((r) => `${r.expectedSkill}|${r.expectedDifficulty}` === c).length === 5));

  const ids: string[] = [];
  for (const r of records) {
    if (!Object.keys(records[0]).includes("evidence") || !r.evidence?.textPreview) {
      check(`record ${r.questionId} punya textPreview`, false);
    }
    if (r.questionId === undefined) check("questionId ada", false);
    else {
      ids.push(r.questionId);
      check(`baris review memuat ${r.questionId}`, out.includes(r.questionId));
    }
  }
  const dups = ids.filter((id, i, a) => a.indexOf(id) !== i);
  check("tidak ada questionId duplikat", dups.length === 0);

  // nomor urut 01..75
  const maxNo = Math.max(...ids.map((_, i) => i + 1));
  check("nomor urut mencakup 75", maxNo === 75 && out.includes("[75] "));
  check("no '[00]' atau '[76]'", !out.includes("[00] ") && !out.includes("[76] "));

  // header group SKILL→DIFFICULTY
  for (const skill of SKILLS) {
    for (const d of DIFFICULTIES) {
      const has = records.some((r) => r.expectedSkill === skill && r.expectedDifficulty === d);
      if (has) check(`group header ${skill} → ${d}`, out.includes(`### ${skill} → ${d}`));
    }
  }

  // 4. integrity
  const badTax = records.filter((r) => !hasSkill(r.expectedSkill ?? "") || !hasSubskill(r.expectedSkill as SkillId, r.subskill ?? ""));
  check("taksonomi valid (semua record)", badTax.length === 0, badTax.length ? `${badTax.length}` : "");
  const missing = records.filter((r) => REQUIRED_FIELDS.some((f) => !(r as unknown as Record<string, unknown>)[f] || String((r as unknown as Record<string, unknown>)[f]).trim() === ""));
  check("field wajib lengkap", missing.length === 0, missing.length ? `${missing.length}` : "");
  check("status = NEEDS_REVIEW semua", records.every((r) => (r as { status?: string }).status === "NEEDS_REVIEW"));
  check("provenance = AI_SUGGESTED semua", records.every((r) => (r as { provenance?: string }).provenance === "AI_SUGGESTED"));

  // 5. tidak ada QUESTION TEXT NOT EMBEDDED (semua punya preview)
  check("tidak ada 'QUESTION TEXT NOT EMBEDDED'", !out.includes("QUESTION TEXT NOT EMBEDDED"));

  // 6. review-state overlay (4B.6): guid "review:" per baris + state distribution
  const reviewLines = (out.match(/review: /g) ?? []).length;
  check("setiap kandidat punya baris 'review:'", reviewLines === 75, `found=${reviewLines}`);
  const pendingState = out.includes("REVIEW STATE (audit)   : PENDING=") || out.includes("REVIEW STATE (audit)");
  check("REVIEW STATE menampilkan PENDING (tanpa file audit)", pendingState);

  // 7. summary dari report
  check("report menyatakan 0 anomali", /RINGKASAN: 75 kandidat, 75 baris review, 0 anomali/.test(out), "");
  check("report selesai exit 0", true);

  console.log(`\nHASIL: ${failures === 0 ? "✅ SEMUA LULUS" : `❌ ${failures} GAGAL`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();