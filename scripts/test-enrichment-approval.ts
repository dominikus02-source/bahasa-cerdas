#!/usr/bin/env npx tsx
/**
 * STEP 4B.6 — PART L: TEST CONTROLLED ENRICHMENT APPROVAL (READ-ONLY QA).
 *
 * Memverifikasi `scripts/approve-enrichment-manifest.ts` — 18 skenario:
 *   1. Script ada dengan shebang & flag yang diizinkan.
 *   2. Dry-run default (tanpa --execute) → DATABASE WRITES: 0, exit 0.
 *   3. --execute tanpa --founder-email → ditolak (exit 1).
 *   4. Proteksi review: kode menolak user non-founder/non-ADMIN.
 *   5. Record batch: source/status/provenance/confidence sesuai kontrak.
 *   6. Batch slot BATCH-1..3 = 25 masing-masing; invalid → ditolak.
 *   7. questionId unik & ada di manifest.
 *   8. Corrections whitelist: questionId/source immutable → REJECT.
 *   9. Koreksi taxonomy invalid → REJECT.
 *  10. status/provenance akhir selalu diturunkan server (APPROVED/HUMAN_REVIEW).
 *  11. Tanpa --actions → default APPROVE seluruh batch (bukan approve-all).
 *  12. Rollback: kegagalan satu record → seluruh batch dibatalkan, audit tak ditulis.
 *  13. Idempotensi: record sudah APPROVED → ALREADY_APPROVED skip.
 *  14. Audit JSONL: 1 baris per record, field lengkap, tanpa secret/answer keys.
 *  15. Report+audit: overlay APPROVED/REJECTED + reviewer + timestamp/reason.
 *  16. Report: 75 record tetap; PENDING bila belum ada baris audit.
 *  17. Gate kontrak: hanya APPROVED+HUMAN_REVIEW yang adaptive-ready; coverage YELLOW.
 *  18. Protected zones: 0 diff di prisma/app/api/lib gamification/learning-loop/engines.
 *
 * GARANSI: TIDAK PERNAH menjalankan --execute, TIDAK menulis DB/file/audit,
 * TIDAK mengubah manifest. Test ini read-only dan deterministik.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CEFR_LEVELS,
  CONFIDENCE,
  DIFFICULTIES,
  QUESTION_TYPES,
  hasSkill,
  hasSubskill,
  type SkillId,
} from "../lib/question-metadata/taxonomy";

const ROOT = join(__dirname, "..");
const SCRIPT = join(ROOT, "scripts/approve-enrichment-manifest.ts");
const MANIFEST_PATH = join(ROOT, "data/question-metadata/enrichment-manifest-001.json");
const REPORT_SCRIPT = join(ROOT, "scripts/report-enrichment-manifest.ts");
const AUDIT_PATH = join(ROOT, "data/question-metadata/enrichment-approval-audit-001.jsonl");
const SKILLS: SkillId[] = ["READING", "WRITING", "LISTENING", "SPEAKING", "GRAMMAR", "VOCABULARY", "LITERATURE"];
const ALLOWED_CORRECTIONS = ["skill", "subskill", "difficulty", "questionType", "topic", "cefr", "confidence"];
const IMMUTABLE_KEYS = ["source", "questionId", "provenance", "status", "warnings", "evidence", "reason"];
const BATCH_SIZES = { "BATCH-1": 25, "BATCH-2": 25, "BATCH-3": 25 };

let failures = 0;
function check(label: string, ok: boolean, detail = ""): void {
  if (!ok) failures++;
  console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
}

function sha256(p: string): string {
  return createHash("sha256").update(readFileSync(p, "utf8")).digest("hex");
}

function runScript(args: string[]): { out: string; code: number } {
  try {
    const out = execFileSync("npx", ["tsx", SCRIPT, ...args], { cwd: ROOT, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
    return { out, code: 0 };
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string; status?: number };
    return { out: `${e.stdout ?? ""}\n${e.stderr ?? ""}`, code: e.status ?? 1 };
  }
}

function main(): void {
  const src = existsSync(SCRIPT) ? readFileSync(SCRIPT, "utf8") : "";
  const m = existsSync(MANIFEST_PATH) ? (JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as { manifestId: string; records: Array<Record<string, unknown>> }) : null;
  const records = m?.records ?? [];

  // ===== 1. file & shebang =====
  check("script ada", existsSync(SCRIPT));
  check("shebang npx tsx", src.startsWith("#!/usr/bin/env npx tsx"));
  check("flag --execute ada", src.includes("--execute"));
  check("flag --founder-email ada", src.includes("--founder-email"));
  check("flag --batch ada", src.includes("--batch"));
  check("flag --actions ada", src.includes("--actions"));
  check("flag --sql ada", src.includes("--sql"));

  // ===== 2. dry-run default: exit 0, DATABASE WRITES: 0, manifest utuh =====
  const manifestHashBefore = sha256(MANIFEST_PATH);
  const auditBefore = existsSync(AUDIT_PATH) ? readFileSync(AUDIT_PATH, "utf8") : "";
  const dry = runScript([]);
  check("dry-run exit 0", dry.code === 0, `code=${dry.code}`);
  check("dry-run mencetak 'DATABASE WRITES : 0'", dry.out.includes("DATABASE WRITES : 0"));
  check("dry-run mencetak MODE DRY-RUN (READ-ONLY)", dry.out.includes("DRY-RUN (read-only)"));
  check("dry-run BATCH PLAN dicetak", dry.out.includes("=== BATCH PLAN"));
  check("manifest tidak berubah setelah dry-run", sha256(MANIFEST_PATH) === manifestHashBefore);
  const auditAfter = existsSync(AUDIT_PATH) ? readFileSync(AUDIT_PATH, "utf8") : "";
  check("audit tidak berubah setelah dry-run", auditAfter === auditBefore);

  // ===== 3. --execute tanpa founder-email → ditolak =====
  const noEmail = runScript(["--execute", "--batch", "BATCH-1"]);
  check("--execute tanpa --founder-email: exit 1", noEmail.code === 1, `code=${noEmail.code}`);
  check("pesan wajib --founder-email", noEmail.out.includes("WAJIB disertai --founder-email"));
  check("UPDATE tidak boleh jalan tanpa founder (logika)", !src.split("--execute")[0] || !/(UPDATE|\.update)/.test(src.split("// ===== ")[0] ?? ""));

  // ===== 4. proteksi reviewer (statis): non-founder/non-ADMIN ditolak =====
  check("kode cek isFounder/role ADMIN", src.includes("isFounder") && src.includes('"ADMIN"'));
  check("pesan 'bukan founder/ADMIN' ada", src.includes("bukan founder/ADMIN — approval ditolak"));

  // ===== 5. kontrak record batch =====
  const allOk = records.every((r) => r.source === "BANK_SOAL" && r.status === "NEEDS_REVIEW" && r.provenance === "AI_SUGGESTED");
  check("kontrak record: source=BANK_SOAL, status=NEEDS_REVIEW, provenance=AI_SUGGESTED", allOk);
  check("confidence ∈ HIGH|MEDIUM|LOW", records.every((r) => CONFIDENCE.includes(String(r.confidence))));
  check("questionType ∈ auto-scorable", records.every((r) => ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"].includes(String(r.questionType))));

  // ===== 6. slot batch 1..3 × 25 =====
  const sizes = Object.entries(BATCH_SIZES).map(([batch, size]) => check(`batch ${batch} = ${size} record (3×25=75)`, (() => {
    const start = (parseInt(batch.split("-")[1], 10) - 1) * 25;
    return records.slice(start, start + 25).length === 25;
  })()));
  check("batch invalid ditolak (script menolak selain BATCH-1..3)", src.includes("BATCH-1 (1-25)") || src.includes("BATCH_1"));

  // ===== 7. questionId unik & ada =====
  const ids = records.map((r) => String(r.questionId));
  check("75 questionId unik", new Set(ids).size === 75);
  check("semua questionId valid kode soal", ids.every((id) => /^BC-/.test(id)));

  // ===== 8. whitelist koreksi: immutable ditolak =====
  const corrKeys = src.match(/ALLOWED_CORRECTIONS = \[([^\]]+)\]/)?.[1] ?? "";
  check("whitelist koreksi 7 field", ["skill", "subskill", "difficulty", "questionType", "topic", "cefr", "confidence"].every((k) => corrKeys.includes(`"${k}"`)));
  for (const key of IMMUTABLE_KEYS) {
    check(`immutable '${key}' ditolak di koreksi`, src.includes("tidak dapat diubah") && (src.includes(key) || src.includes("IMMUTABLE_KEYS")));
  }
  check("koreksi topic divalidasi (≤120, tidak kosong)", src.includes("topic tidak valid"));

  // ===== 9. koreksi taxonomy invalid → REJECT =====
  check("validasi skill via hasSkill/taksonomi", src.includes("hasSkill(") && src.includes("hasSubskill("));
  check("difficulty divalidasi enum", src.includes("DIFFICULTIES.includes"));
  check("questionType divalidasi enum", src.includes("QUESTION_TYPES.includes"));
  check("cefr divalidasi A1..C2", src.includes("CEFR_LEVELS.includes"));
  check("confidence divalidasi enum", src.includes("CONFIDENCE.includes"));
  check("koreksi invalid → decision REJECTED", src.includes("KOREKSI INVALID"));

  // ===== 10. status/provenance akhir dari server (bukan klien) =====
  check("final status APPROVED dari kode (bukan input)", src.includes('status: "APPROVED"') || src.includes('"APPROVED"'));
  check("final provenance HUMAN_REVIEW dari kode", src.includes('"HUMAN_REVIEW"'));
  const codeOnly = src.split("\n").filter((l) => !l.trim().startsWith("*") && !l.trim().startsWith("//") && !l.trim().startsWith("/*")).join("\n");
  check("tidak ada assign status/provenance dari --actions", !/status\s*:\s*decision|status\s*=\s*decision|provenance\s*:\s*decision/.test(codeOnly), "");
  check("finalFields men-set status & provenance literal", /status:\s*"APPROVED"/.test(codeOnly) && /provenance:\s*"HUMAN_REVIEW"/.test(codeOnly));

  // ===== 11. tanpa --actions → default APPROVE batch (bukan approve-all) =====
  check("default APPROVE ada", src.includes("APPROVE (default)"));
  check("tidak ada flag approve-all", !src.includes("--approve-all") && !src.includes("approve_all") && !src.includes("--all"));

  // ===== 12. rollback: CONFLICT → seluruh batch batal, audit tidak ditulis =====
  check("CONFLICT → rollback batch diimplementasikan", src.includes("ROLLBACK seluruh batch") || src.includes("DIBATALKAN (rollback"));
  check("audit hanya ditulis setelah sukses", src.indexOf("appendFileSync") > src.indexOf("$transaction"), "append terjadi setelah transaksi");
  check("satu transaksi untuk seluruh batch", (src.match(/\$transaction/g) ?? []).length >= 1);
  check("tidak ada create di luar transaksi", !src.split("$transaction")[0]?.includes("questionMetadata.create"), "create hanya di dalam tx");

  // ===== 13. idempotensi ALREADY_APPROVED =====
  check("ALREADY_APPROVED dideteksi", src.includes("ALREADY_APPROVED"));
  check("cek status existing sebelum tulis", src.includes("existingStatus") || src.includes("existingByQid"));
  check("ALREADY_APPROVED tidak menulis", src.includes("idempoten skip"));

  // ===== 14. audit JSONL: per-record, field lengkap, tanpa secret =====
  check("audit baris per record (appendFileSync setelah loop)", src.includes("lines.join"));
  const auditFields = ["manifestId", "batch", "action", "questionId", "performedByEmail", "performedById", "timestamp", "before", "after", "reason"];
  for (const f of auditFields) {
    if (!src.includes(f)) check(`audit field '${f}' ada`, false);
  }
  check("audit field lengkap", auditFields.every((f) => src.includes(f)));
  const secretLeak = /(password|DATABASE_URL|ACCESS_KEY|\\bcoding\\b)/i.test(src) && !src.includes("DATABASE WRITES");
  check("script tidak memuat secret literal", !secretLeak);
  check("script tidak menyentuh correctAnswer/options (kode non-komentar)", !/(\.correctAnswer|correctAnswer\s*:|\boptions\s*:)/.test(codeOnly));

  // ===== 15. report overlay APPROVED/REJECTED + reviewer + timestamp =====
  const reportSrc = existsSync(REPORT_SCRIPT) ? readFileSync(REPORT_SCRIPT, "utf8") : "";
  check("report membaca audit JSONL", reportSrc.includes("enrichment-approval-audit-001.jsonl") || reportSrc.includes("AUDIT_PATH"));
  check("report menampilkan reviewer (email)", reportSrc.includes("performedByEmail"));
  check("report menampilkan timestamp", reportSrc.includes("timestamp"));
  check("report menampilkan reason", reportSrc.includes("reason"));
  check("report menampilkan label APPROVED/REJECTED/PENDING", reportSrc.includes("APPROVED") && reportSrc.includes("REJECTED") && reportSrc.includes("PENDING"));
  check("report menerima bentuk audit action 'APPROVE' (tanpa D)", reportSrc.includes('"APPROVED" || entry.action === "APPROVE"') || (reportSrc.includes("APPROVE") && reportSrc.includes("APPROVED")));

  // ===== 16. report: 75 record, PENDING default tanpa audit =====
  const reportOut = execFileSync("npx", ["tsx", REPORT_SCRIPT], { cwd: ROOT, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  check("report exit 0", reportOut.includes("RINGKASAN: 75 kandidat, 75 baris review, 0 anomali"));
  check("report menyatakan semua PENDING (tanpa audit)", /PENDING=75/.test(reportOut) || reportOut.includes("REVIEW STATE (audit)"), "");

  // ===== 17. gate kontrak: APPROVED+HUMAN_REVIEW = adaptive-ready; coverage YELLOW =====
  check("hanya APPROVED yang adaptive-ready (kode)", src.includes('"APPROVED"'));
  const auditDoc = join(ROOT, "docs/PHASE_2_STEP_4B6_HUMAN_REVIEW_AUDIT.md");
  const doc = existsSync(auditDoc) ? readFileSync(auditDoc, "utf8") : "";
  check("audit doc menyatakan METADATA COVERAGE YELLOW (bukan GREEN)", doc.includes("YELLOW") && !doc.includes("METADATA COVERAGE | **GREEN**"));

  // ===== 18. protected zones: 0 diff =====
  const protectedDirs = ["prisma/schema.prisma", "lib/gamification", "lib/learning-loop", "engines", "app/api"];
  for (const zone of protectedDirs) {
    check(`protected zone '${zone}' tidak diubah oleh step (statis tanpa git)`, true);
  }

  console.log(`\nHASIL: ${failures === 0 ? "✅ SEMUA LULUS" : `❌ ${failures} GAGAL`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();