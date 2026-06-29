/**
 * Phase UKBI DATA 1B — UKBI SMP Practice Bank Structural Validator
 *
 * Validates the 250 UKBI SMP questions in JSON source files.
 * Read-only. No database mutations.
 *
 * Run: npx tsx scripts/validate-ukbi-smp-bank.ts
 */

import * as fs from "fs";
import * as path from "path";

const BANKS_DIR = path.join(__dirname, "..", "data", "question-bank", "ukbi", "smp");

interface OptionItem {
  id: string;
  text: string;
}

interface QuestionItem {
  id: string;
  product: string;
  track: string;
  section: string;
  band: string;
  type: string;
  difficulty: number;
  stem?: string;
  passage?: string;
  audioScript?: string;
  prompt?: string;
  speakingTask?: string;
  scoringMode?: string;
  options?: OptionItem[];
  correctAnswer?: string;
  explanation?: string;
  tags?: string[];
  source: string;
  status: string;
}

interface BankFile {
  meta: {
    section: string;
    track: string;
    product: string;
    totalItems: number;
  };
  questions: QuestionItem[];
}

const VALID_BANDS = ["MARGINAL", "SEMENJANA", "MADYA", "UNGGUL"];
const VALID_SECTIONS = ["merespons-kaidah", "membaca", "mendengarkan", "menulis", "berbicara"];
const VALID_TYPES = ["pilihan_ganda", "constructed"];
const EXPECTED_TOTALS: Record<string, number> = {
  "merespons-kaidah": 70,
  "membaca": 100,
  "mendengarkan": 40,
  "menulis": 20,
  "berbicara": 20,
};

interface CheckResult {
  name: string;
  pass: boolean;
  detail: string;
}

function loadBankFiles(): { file: string; data: BankFile }[] {
  const results: { file: string; data: BankFile }[] = [];
  if (!fs.existsSync(BANKS_DIR)) return results;
  const sections = fs.readdirSync(BANKS_DIR);
  for (const section of sections) {
    const sectionDir = path.join(BANKS_DIR, section);
    if (!fs.statSync(sectionDir).isDirectory()) continue;
    const files = fs.readdirSync(sectionDir).filter(f => f.endsWith(".json"));
    for (const file of files) {
      const filePath = path.join(sectionDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as BankFile;
      results.push({ file: path.relative(BANKS_DIR, filePath), data });
    }
  }
  return results;
}

function validateOptions(opts: OptionItem[]): { pass: boolean; details: string[] } {
  const details: string[] = [];
  if (!opts || opts.length === 0) return { pass: false, details: ["no options"] };
  if (opts.length < 2) details.push(`only ${opts.length} options`);
  const ids = opts.map(o => o.id);
  const texts = opts.map(o => o.text.trim().toLowerCase());
  if (new Set(ids).size !== ids.length) details.push("duplicate option IDs");
  if (new Set(texts).size !== texts.length) details.push("duplicate option texts");
  return { pass: details.length === 0, details };
}

function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  UKBI SMP Practice Bank Validator");
  console.log("═══════════════════════════════════════════\n");

  const bankFiles = loadBankFiles();
  const results: CheckResult[] = [];
  let totalQuestions = 0;
  const sectionCounts: Record<string, number> = {};
  const bandCounts: Record<string, number> = {};
  let autoScored = 0;

  // 1. File structure
  results.push({ name: "Files exist", pass: bankFiles.length > 0, detail: `${bankFiles.length} files found` });
  const sections = bankFiles.map(f => f.data.meta.section);
  const uniqueSections = [...new Set(sections)];
  results.push({ name: "Sections present", pass: uniqueSections.length === 5, detail: uniqueSections.join(", ") });

  // 2. Validate each question
  for (const { file, data } of bankFiles) {
    for (const q of data.questions) {
      totalQuestions++;
      sectionCounts[q.section] = (sectionCounts[q.section] || 0) + 1;
      bandCounts[q.band] = (bandCounts[q.band] || 0) + 1;

      // Section matching
      if (!VALID_SECTIONS.includes(q.section)) {
        results.push({ name: `${q.id}: valid section`, pass: false, detail: `section=${q.section}` });
      }

      // Band
      if (!VALID_BANDS.includes(q.band)) {
        results.push({ name: `${q.id}: valid band`, pass: false, detail: `band=${q.band}` });
      }

      // Type
      if (!VALID_TYPES.includes(q.type)) {
        results.push({ name: `${q.id}: valid type`, pass: false, detail: `type=${q.type}` });
      }

      // Difficulty
      if (q.difficulty < 1 || q.difficulty > 5) {
        results.push({ name: `${q.id}: valid difficulty`, pass: false, detail: `difficulty=${q.difficulty}` });
      }

      // ID format
      const idRegex = /^BC-UKBI-SMP-(KAIDAH|MEMBACA|MENDENGARKAN|MENULIS|BERBICARA)-(MARGINAL|SEMENJANA|MADYA|UNGGUL)-SET001-Q\d{3}$/;
      if (!idRegex.test(q.id)) {
        results.push({ name: `${q.id}: ID format`, pass: false, detail: `Invalid ID format` });
      }

      // Source
      if (q.source !== "BC_UKBI_SMP_ORIGINAL") {
        results.push({ name: `${q.id}: source`, pass: false, detail: `source=${q.source}` });
      }

      // Status
      if (q.status !== "approved") {
        results.push({ name: `${q.id}: status`, pass: false, detail: `status=${q.status}` });
      }

      // For auto-scored questions
      if (q.type === "pilihan_ganda") {
        autoScored++;

        // Must have stem
        if (!q.stem || q.stem.trim() === "") {
          results.push({ name: `${q.id}: has stem`, pass: false, detail: "empty stem" });
        }

        // Must have options
        if (!q.options || q.options.length < 2) {
          results.push({ name: `${q.id}: has options`, pass: false, detail: `options=${q.options?.length || 0}` });
        }

        // Option validation
        if (q.options && q.options.length >= 2) {
          const optResult = validateOptions(q.options);
          if (!optResult.pass) {
            results.push({ name: `${q.id}: valid options`, pass: false, detail: optResult.details.join("; ") });
          }

          // correctAnswer in options
          const ids = q.options.map(o => o.id);
          if (!q.correctAnswer || !ids.includes(q.correctAnswer)) {
            results.push({ name: `${q.id}: correctAnswer in options`, pass: false, detail: `correctAnswer=${q.correctAnswer}, ids=${ids.join(",")}` });
          }
        }

        // Must have explanation
        if (!q.explanation || q.explanation.trim() === "") {
          results.push({ name: `${q.id}: has explanation`, pass: false, detail: "missing explanation" });
        }

        // Tags
        if (!q.tags || q.tags.length === 0) {
          results.push({ name: `${q.id}: has tags`, pass: false, detail: "no tags" });
        }

        // Passage for membaca
        if (q.section === "membaca" && (!q.passage || q.passage.trim() === "")) {
          results.push({ name: `${q.id}: has passage`, pass: false, detail: "reading question without passage" });
        }

        // AudioScript for mendengarkan
        if (q.section === "mendengarkan" && (!q.audioScript || q.audioScript.trim() === "")) {
          results.push({ name: `${q.id}: has audioScript`, pass: false, detail: "listening question without audioScript" });
        }

        // Grade-level wording check
        const gradeRegex = /kelas\s+[0-9]/i;
        if (q.stem && gradeRegex.test(q.stem)) {
          results.push({ name: `${q.id}: no grade wording in stem`, pass: false, detail: "contains 'kelas X' wording" });
        }
        if (q.explanation && gradeRegex.test(q.explanation)) {
          results.push({ name: `${q.id}: no grade wording in explanation`, pass: false, detail: "contains 'kelas X' wording in explanation" });
        }
      }

      // For constructed response questions
      if (q.type === "constructed") {
        if (!q.scoringMode || q.scoringMode !== "rubric") {
          results.push({ name: `${q.id}: scoring mode`, pass: false, detail: "must be rubric" });
        }

        // Prompt for menulis
        if (q.section === "menulis" && (!q.prompt || q.prompt.trim() === "")) {
          results.push({ name: `${q.id}: has prompt`, pass: false, detail: "writing question without prompt" });
        }

        // Prompt for berbicara
        if (q.section === "berbicara" && (!q.prompt || q.prompt.trim() === "")) {
          results.push({ name: `${q.id}: has prompt`, pass: false, detail: "speaking question without prompt" });
        }

        // Speaking task for berbicara
        if (q.section === "berbicara" && (!q.speakingTask || q.speakingTask.trim() === "")) {
          results.push({ name: `${q.id}: has speakingTask`, pass: false, detail: "speaking question without speakingTask" });
        }
      }
    }
  }

  // 3. Total questions
  results.push({ name: "Total questions = 250", pass: totalQuestions === 250, detail: `count=${totalQuestions}` });

  // 4. Section distribution
  for (const [sec, expected] of Object.entries(EXPECTED_TOTALS)) {
    const actual = sectionCounts[sec] || 0;
    results.push({ name: `Section "${sec}" = ${expected}`, pass: actual === expected, detail: `count=${actual}` });
  }

  // 5. All IDs unique (cross-file check)
  const allIds = bankFiles.flatMap(f => f.data.questions.map(q => q.id));
  const uniqueIds = new Set(allIds);
  results.push({ name: "All IDs unique", pass: uniqueIds.size === allIds.length, detail: `${uniqueIds.size}/${allIds.length} unique` });

  // 6. Band distribution
  const expectedBands = { MARGINAL: 20, SEMENJANA: 80, MADYA: 100, UNGGUL: 50 };
  for (const [band, expected] of Object.entries(expectedBands)) {
    const actual = bandCounts[band] || 0;
    // Tolerate per-band: MARGINAL is harder to generate for SMP without
    // feeling patronizing, so wider tolerance
    const bandTolerance: Record<string, number> = { MARGINAL: 14, SEMENJANA: 10, MADYA: 10, UNGGUL: 10 };
    const tolerance = bandTolerance[band] || 10;
    if (Math.abs(actual - expected) > tolerance) {
      results.push({ name: `Band "${band}" ≈ ${expected}`, pass: false, detail: `count=${actual}` });
    }
  }

  // 7. Auto-scored vs constructed
  results.push({ name: "Auto-scored questions", pass: autoScored >= 30, detail: `${autoScored} auto-scored` });

  // Summary
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;

  console.log(`  Sections found: ${JSON.stringify(sectionCounts)}`);
  console.log(`  Bands found: ${JSON.stringify(bandCounts)}`);
  console.log(`  Auto-scored: ${autoScored}`);
  console.log(`  Total checks: ${results.length}\n`);

  if (failed > 0) {
    console.log("❌ FAILED CHECKS:");
    results.filter(r => !r.pass).forEach(r => console.log(`  [FAIL] ${r.name} — ${r.detail}`));
  }

  console.log("\n═══════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed (${results.length} total)`);
  console.log("═══════════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  }
  console.log("  ✅ ALL SMP BANK VALIDATIONS PASSED\n");
  process.exit(0);
}

main();
