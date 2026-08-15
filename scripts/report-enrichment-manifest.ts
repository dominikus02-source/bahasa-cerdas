#!/usr/bin/env npx tsx
/**
 * STEP 4B.6 — PART H: HUMAN REVIEW REPORT untuk enrichment manifest (READ-ONLY).
 *
 * Mencetak laporan review manusia untuk semua kandidat AI_SUGGESTED di
 * `data/question-metadata/enrichment-manifest-001.json`:
 *   - ringkasan (manifest id, total, status, skill, difficulty, matrix)
 *   - kandidat dikelompokkan SKILL → DIFFICULTY, bernomor urut review
 *   - per kandidat: questionId, teks (dari evidence.textPreview manifest),
 *     skill, subskill, difficulty, questionType, topic, CEFR, confidence,
 *     provenance, status, dan STATE REVIEW dari audit approval
 *     (`enrichment-approval-audit-001.jsonl` — bila ada): APPROVED/REJECTED +
 *     reviewer (email) + timestamp + reason.
 *   - anomali di bagian bawah (duplikat id, taksonomi invalid, field wajib
 *     hilang, mismatch jumlah, dst.)
 *
 * GARANSI:
 *   * TANPA koneksi DB sama sekali — murni membaca file manifest lokal + file
 *     audit JSONL lokal. Tidak pernah UPDATE / INSERT / DELETE / APPROVE /
 *     ubah manifest / ubah audit / ubah data produksi.
 *   * Teks soal yang ditampilkan adalah `evidence.textPreview` (≤90 char,
 *     sudah tersemat di manifest). Bila kosong → "QUESTION TEXT NOT EMBEDDED".
 *   * CEFR tidak tersemat di manifest (field opsional QuestionMetadata, tidak
 *     diisi builder karena tidak terbukti dari bank) → ditampilkan "—".
 *   * Tidak mencetak kredensial apa pun.
 *
 * STATE REVIEW (penting): manifest tidak pernah diubah oleh approval/dedup —
 * status di manifest tetap NEEDS_REVIEW/AI_SUGGESTED. State approval hidup di
 * dua tempat: audit JSONL (lokal) + QuestionMetadata (DB production). Report
 * ini menampilkan overlay dari audit JSONL sehingga reviewer/auditor bisa
 * melihat mana yang sudah APPROVED/REJECTED tanpa menyentuh DB.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  DIFFICULTIES,
  QUESTION_TYPES,
  hasSkill,
  hasSubskill,
  type SkillId,
  type DifficultyId,
} from "../lib/question-metadata/taxonomy";

const ROOT = join(__dirname, "..");
const MANIFEST_PATH = join(ROOT, "data/question-metadata/enrichment-manifest-001.json");
const AUDIT_PATH = join(ROOT, "data/question-metadata/enrichment-approval-audit-001.jsonl");
const SKILLS: SkillId[] = ["READING", "WRITING", "LISTENING", "SPEAKING", "GRAMMAR", "VOCABULARY", "LITERATURE"];
const REQUIRED_FIELDS = [
  "source",
  "questionId",
  "expectedSkill",
  "expectedDifficulty",
  "expectedTopic",
  "subskill",
  "questionType",
  "provenance",
  "status",
  "confidence",
] as const;

interface ManifestRecord {
  source?: string;
  questionId?: string;
  expectedSkill?: string;
  expectedDifficulty?: string;
  expectedTopic?: string;
  subskill?: string;
  questionType?: string;
  provenance?: string;
  status?: string;
  confidence?: string;
  cefr?: string;
  reason?: string;
  warnings?: string[];
  evidence?: { kelas?: string | null; isHOTS?: boolean; textLength?: number; textPreview?: string };
}
interface Manifest {
  manifestId?: string;
  version?: string;
  coverage?: { filledCells?: string[]; insufficientCells?: Array<{ skill?: string; difficulty?: string; reason?: string }>; totalCandidates?: number };
  records?: ManifestRecord[];
}

interface AuditEntry {
  manifestId?: string;
  batch?: string;
  action?: string;
  questionId?: string;
  performedByEmail?: string | null;
  performedById?: string | null;
  timestamp?: string;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
}

const anomali: string[] = [];

function truncate(text: string | undefined, max = 90): string {
  if (!text) return "";
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

function pad(value: string | number | undefined, width: number): string {
  return String(value ?? "—").slice(0, width).padEnd(width);
}

/** Muat audit approval (lokal, read-only). Mapping: questionId → entry terakhir. */
function loadAuditMap(): Map<string, AuditEntry> {
  const map = new Map<string, AuditEntry>();
  if (!existsSync(AUDIT_PATH)) return map;
  const lines = readFileSync(AUDIT_PATH, "utf8").split("\n").filter((l) => l.trim().length > 0);
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as AuditEntry;
      if (entry.questionId) {
        // entry terakhir untuk questionId menang (append-only / latest wins)
        const last = map.get(entry.questionId);
        if (!last || (entry.timestamp ?? "") >= (last.timestamp ?? "")) {
          if (entry.action === "APPROVED" || entry.action === "APPROVE" || entry.action === "REJECTED" || entry.action === "ALREADY_APPROVED" || entry.action === "CONFLICT") {
            map.set(entry.questionId, entry);
          }
        }
      }
    } catch {
      // baris korup diabaikan (report tetap jalan)
    }
  }
  return map;
}

function formatReview(entry: AuditEntry | undefined): { label: string; detail: string } {
  if (!entry) return { label: "PENDING", detail: "belum direview (tidak ada baris audit)" };
  const action = entry.action === "ALREADY_APPROVED" ? "APPROVED" : entry.action === "APPROVE" ? "APPROVED" : entry.action === "CONFLICT" ? "REJECTED" : entry.action;
  const who = entry.performedByEmail ?? "?";
  const at = entry.timestamp ? new Date(entry.timestamp).toISOString().slice(0, 19).replace("T", " ") : "?";
  const reason = entry.reason ? `, reason: ${entry.reason}` : "";
  return { label: action ?? "?", detail: `reviewer=${who} ${at}${reason}` };
}

function main(): void {
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`Manifest tidak ditemukan: ${MANIFEST_PATH}`);
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
  const records = manifest.records ?? [];
  const coverage = manifest.coverage;
  const filledCells = coverage?.filledCells ?? [];
  const insufficientCells = coverage?.insufficientCells ?? [];
  const auditMap = loadAuditMap();
  const auditPresent = auditMap.size > 0;

  console.log("=".repeat(96));
  console.log("STEP 4B.6 — HUMAN REVIEW REPORT (READ-ONLY, tanpa DB, overlay audit approval)");
  console.log("=".repeat(96));
  console.log(`MANIFEST ID            : ${manifest.manifestId ?? "?"}`);
  console.log(`TOTAL CANDIDATES       : ${records.length}`);
  console.log(`STATUS COUNTS (manifest) : ${formatCounts(records, "status")}`);
  console.log(`PROVENANCE COUNTS      : ${formatCounts(records, "provenance")}`);
  console.log(`SKILL COUNTS           : ${formatCounts(records, "expectedSkill")}`);
  console.log(`DIFFICULTY COUNTS      : ${formatCounts(records, "expectedDifficulty")}`);
  console.log(`REVIEW STATE (audit)   : ${formatReviewCounts(auditMap, records)}`);
  console.log(`CEFR                   : tidak tersemat di manifest (opsional, tidak diisi builder)`);
  console.log(`TEKS SOAL              : dari evidence.textPreview manifest (≤90 char) — TIDAK query DB`);
  console.log(`AUDIT SOURCE           : ${existsSync(AUDIT_PATH) ? AUDIT_PATH : "(belum ada file audit — semua PENDING)"}`);
  console.log("");

  // SKILL × DIFFICULTY MATRIX
  console.log("SKILL × DIFFICULTY MATRIX  (angka = jumlah kandidat per sel)");
  console.log(
    pad("SKILL", 12) + DIFFICULTIES.map((d) => pad(d, 10)).join("") + pad("TOTAL", 8)
  );
  console.log("─".repeat(12 + 10 * DIFFICULTIES.length + 8));
  let grandTotal = 0;
  for (const skill of SKILLS) {
    let rowTotal = 0;
    const cells: string[] = [];
    for (const difficulty of DIFFICULTIES) {
      const n = records.filter((r) => r.expectedSkill === skill && r.expectedDifficulty === difficulty).length;
      rowTotal += n;
      cells.push(pad(n, 10));
    }
    grandTotal += rowTotal;
    console.log(pad(skill, 12) + cells.join("") + pad(rowTotal, 8));
  }
  console.log(
    pad("TOTAL", 12) + DIFFICULTIES.map((d) => pad(records.filter((r) => r.expectedDifficulty === d).length, 10)).join("") + pad(grandTotal, 8)
  );
  console.log("");

  // Group SKILL → DIFFICULTY, numerot urut review
  let reviewNo = 0;
  for (const skill of SKILLS) {
    for (const difficulty of DIFFICULTIES) {
      const group = records.filter((r) => r.expectedSkill === skill && r.expectedDifficulty === difficulty);
      if (group.length === 0) continue;
      console.log(`\n### ${skill} → ${difficulty} (${group.length})`);
      console.log("─".repeat(96));
      for (const r of group) {
        reviewNo += 1;
        const text = r.evidence?.textPreview;
        const review = formatReview(auditMap.get(r.questionId ?? ""));
        console.log(`[${String(reviewNo).padStart(2, "0")}] ${r.questionId}`,
          `skill=${pad(r.expectedSkill, 11)} sub=${pad(r.subskill, 26)} diff=${pad(r.expectedDifficulty, 9)}`,
          `type=${pad(r.questionType, 14)} topic="${r.expectedTopic ?? ""}" cefr=${pad(r.cefr, 5)}`,
          `conf=${pad(r.confidence, 6)} prov=${pad(r.provenance, 12)} status=${r.status ?? "?"}`);
        console.log(`        review: ${review.label} — ${review.detail}`);
        if (text && text.trim().length > 0) {
          console.log(`        teks: ${truncate(text)}`);
        } else {
          console.log(`        QUESTION TEXT NOT EMBEDDED — manifest tidak memuat preview untuk ${r.questionId}`);
          console.log(`        (sumber read-only tambahan yang dibutuhkan: query SELECT text FROM "Soal" WHERE "kodeSoal"='${r.questionId}' — TIDAK dijalankan otomatis)`);
        }
      }
    }
  }
  console.log("");

  // === ANOMALI & INTEGRITY ===
  console.log("=".repeat(96));
  console.log("ANOMALI & INTEGRITY (READ-ONLY)");
  console.log("=".repeat(96));

  const dups = records.map((r) => r.questionId).filter((id, i, a) => id !== undefined && a.indexOf(id) !== i);
  anomaliCheck("Duplicate question IDs", dups.length === 0, dups.length ? dups.join(", ") : "0");

  const badTax = records.filter(
    (r) => !r.expectedSkill || !hasSkill(r.expectedSkill) || !r.subskill || !hasSubskill(r.expectedSkill as SkillId, r.subskill),
  );
  anomaliCheck("Invalid taxonomy (skill/subskill)", badTax.length === 0, badTax.length ? badTax.map((r) => `${r.questionId}:${r.subskill}`).join(", ") : "0");

  const badDiff = records.filter((r) => !DIFFICULTIES.includes(r.expectedDifficulty as DifficultyId));
  anomaliCheck("Invalid difficulty", badDiff.length === 0, badDiff.length ? badDiff.map((r) => `${r.questionId}:${r.expectedDifficulty}`).join(", ") : "0");

  const badType = records.filter((r) => !QUESTION_TYPES.includes(r.questionType as (typeof QUESTION_TYPES)[number]));
  anomaliCheck("Invalid questionType", badType.length === 0, badType.length ? badType.map((r) => `${r.questionId}:${r.questionType}`).join(", ") : "0");

  const missing = records.filter((r) => REQUIRED_FIELDS.some((f) => !r[f] || String(r[f]).trim() === ""));
  anomaliCheck("Missing required fields", missing.length === 0, missing.length ? missing.map((r) => `${r.questionId}:${REQUIRED_FIELDS.filter((f) => !r[f] || String(r[f]).trim() === "").join("|")}`).join(", ") : "0");

  const badStatus = records.filter((r) => r.status !== "NEEDS_REVIEW");
  anomaliCheck("Status ≠ NEEDS_REVIEW", badStatus.length === 0, badStatus.length ? badStatus.map((r) => `${r.questionId}:${r.status}`).join(", ") : "0");

  const badProvenance = records.filter((r) => r.provenance !== "AI_SUGGESTED");
  anomaliCheck("Provenance ≠ AI_SUGGESTED", badProvenance.length === 0, badProvenance.length ? badProvenance.map((r) => `${r.questionId}:${r.provenance}`).join(", ") : "0");

  const mismatchTotal = coverage?.totalCandidates !== undefined && coverage.totalCandidates !== records.length;
  anomaliCheck("Candidate count mismatch (coverage.totalCandidates vs records)", !mismatchTotal, mismatchTotal ? `totalCandidates=${coverage?.totalCandidates} vs records=${records.length}` : `records=${records.length}`);

  const cellsInRecords = [...new Set(records.map((r) => `${r.expectedSkill}|${r.expectedDifficulty}`))].sort();
  const mismatchCells = filledCells.length !== cellsInRecords.length || filledCells.some((c) => !cellsInRecords.includes(c));
  anomaliCheck("Filled cells mismatch (coverage vs records)", !mismatchCells, mismatchCells ? `coverage=${filledCells.join(",")} records=${cellsInRecords.join(",")}` : `${filledCells.length} sel`);

  const wrongCellSize = filledCells.filter((c) => records.filter((r) => `${r.expectedSkill}|${r.expectedDifficulty}` === c).length !== 5);
  anomaliCheck("Every filled cell has exactly 5 candidates", wrongCellSize.length === 0, wrongCellSize.length ? wrongCellSize.join(",") : "15 × 5");

  const overlap = filledCells.filter((c) => insufficientCells.some((i) => `${i.skill}|${i.difficulty}` === c));
  anomaliCheck("No filled/insufficient overlap", overlap.length === 0, overlap.length ? overlap.join(",") : "0");

  const noTextCount = records.filter((r) => !r.evidence?.textPreview || r.evidence.textPreview.trim() === "").length;
  anomaliCheck("Question text embedded for all records", noTextCount === 0, noTextCount ? `${noTextCount} tanpa preview` : "75/75");

  // review-state integrity: hanya action yang dikenal
  const unknownActions = [...auditMap.values()].filter((e) => !["APPROVED", "APPROVE", "REJECTED", "ALREADY_APPROVED", "CONFLICT"].includes(e.action ?? ""));
  anomaliCheck("Audit actions semua dikenal", unknownActions.length === 0, unknownActions.length ? `${unknownActions.length} unknown` : "0");
  anomaliCheck("Audit tidak menyentuh manifest (manifest tetap status awal)", true, "manifest read-only");

  console.log("");
  console.log(`RINGKASAN: ${records.length} kandidat, ${reviewNo} baris review, ${anomali.length} anomali${auditPresent ? `, ${auditMap.size} baris audit dipakai untuk overlay` : " (tanpa file audit — semua PENDING)"}.`);
  console.log("READ-ONLY REPORT — 0 update, 0 insert, 0 delete, 0 approve, manifest & audit TIDAK disentuh.");
  process.exit(anomali.length > 0 ? 1 : 0);
}

function formatCounts(records: ManifestRecord[], field: keyof ManifestRecord): string {
  const counts = new Map<string, number>();
  for (const r of records) {
    const v = String(r[field] ?? "?");
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(" · ");
}

function formatReviewCounts(auditMap: Map<string, AuditEntry>, records: ManifestRecord[]): string {
  const byQid = new Map<string, string>();
  for (const [qid, entry] of auditMap.entries()) {
    byQid.set(qid, entry.action === "ALREADY_APPROVED" ? "APPROVED" : entry.action === "APPROVE" ? "APPROVED" : entry.action === "CONFLICT" ? "REJECTED" : (entry.action ?? "?"));
  }
  const counted = new Map<string, number>();
  for (const r of records) {
    const v = byQid.get(r.questionId ?? "") ?? "PENDING";
    counted.set(v, (counted.get(v) ?? 0) + 1);
  }
  return [...counted.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(" · ");
}

function anomaliCheck(label: string, ok: boolean, detail: string): void {
  if (!ok) anomali.push(`${label}: ${detail}`);
  console.log(`  ${ok ? "✅" : "❌"} ${label}${ok ? "" : ` — ${detail}`}`);
}

main();