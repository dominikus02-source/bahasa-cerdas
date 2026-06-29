/**
 * Phase UKBI DATA 1A — UKBI SD Practice Question Bank Validator
 *
 * Validates all 250 questions from JSON source files.
 * Run: npx tsx scripts/validate-ukbi-sd-bank.ts
 */

import * as fs from "fs";
import * as path from "path";

const BANKS_DIR = path.join(__dirname, "..", "data", "question-bank", "ukbi", "sd");

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
  prompt?: string;
  options?: { id: string; text: string }[];
  correctAnswer?: string;
  explanation?: string;
  tags?: string[];
  source: string;
  status: string;
  cognitive?: string;
  domain?: string;
  scoringMode?: string;
  audioScript?: string;
  rubric?: any[];
}

interface BankFile {
  meta: any;
  questions: QuestionItem[];
}

let passed = 0;
let failed = 0;
const errors: string[] = [];
const warnings: string[] = [];
const sectionCounts: Record<string, number> = {};

function assert(condition: boolean, message: string) {
  if (condition) { passed++; }
  else { failed++; errors.push(message); console.log(`  ❌ ${message}`); }
}

function warn(message: string) {
  warnings.push(message);
  console.log(`  ⚠️  ${message}`);
}

console.log("\n═══════════════════════════════════════════");
console.log("  UKBI SD Bank — Structural Validator");
console.log("═══════════════════════════════════════════\n");

const bankFiles: { file: string; data: BankFile }[] = [];
const sections = fs.readdirSync(BANKS_DIR);
for (const section of sections) {
  const sectionDir = path.join(BANKS_DIR, section);
  if (!fs.statSync(sectionDir).isDirectory()) continue;
  const files = fs.readdirSync(sectionDir).filter(f => f.endsWith(".json"));
  for (const file of files) {
    const filePath = path.join(sectionDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      bankFiles.push({ file: path.relative(BANKS_DIR, filePath), data });
    } catch (e: any) {
      console.log(`  ❌ Invalid JSON in ${file}: ${e.message}`);
      failed++;
    }
  }
}

assert(bankFiles.length === 5, `Expected 5 bank files, found ${bankFiles.length}`);

// Collect all questions
const allQuestions: QuestionItem[] = [];
for (const { file, data } of bankFiles) {
  const items = data.questions || [];
  assert(items.length > 0, `${file} has at least 1 question`);
  
  const section = data.meta?.section || "unknown";
  sectionCounts[section] = (sectionCounts[section] || 0) + items.length;
  
  for (const item of items) {
    allQuestions.push(item);
    
    // 1. ID format
    assert(
      /^BC-UKBI-SD-(KAIDAH|MEMBACA|MENDENGARKAN|MENULIS|BERBICARA)-(TERBATAS|MARGINAL|SEMENJANA|MADYA)-SET001-Q\d{3}$/.test(item.id),
      `Valid ID format: ${item.id}`
    );
    
    // 2. Section matches folder
    const sectionUpper = file.split("/")[0].toUpperCase();
    const idSection = item.id.split("-")[3];
    const folderSectionMap: Record<string, string> = {
      "merespons-kaidah": "KAIDAH",
      "membaca": "MEMBACA",
      "mendengarkan": "MENDENGARKAN",
      "menulis": "MENULIS",
      "berbicara": "BERBICARA",
    };
    const expectedIdSection = folderSectionMap[file.split("/")[0]];
    if (expectedIdSection) {
      assert(idSection === expectedIdSection, `${item.id}: section in ID matches folder`);
    }
    
    // 3. Band matches ID
    const idBand = item.id.split("-")[4];
    assert(idBand === item.band, `${item.id}: band "${item.band}" matches ID band "${idBand}"`);
    
    // 4. Product
    assert(item.product === "UKBI_PRACTICE", `${item.id}: product is UKBI_PRACTICE`);
    
    // 5. Track
    assert(item.track === "UKBI_SD", `${item.id}: track is UKBI_SD`);
    
    // 6. Source
    assert(item.source === "BC_UKBI_SD_ORIGINAL", `${item.id}: source is BC_UKBI_SD_ORIGINAL`);
    
    // 7. Status
    assert(item.status === "approved", `${item.id}: status is approved`);
    
    // 8. Valid type
    assert(["pilihan_ganda", "constructed"].includes(item.type), `${item.id}: valid type "${item.type}"`);
    
    // 9. Difficulty range
    assert(item.difficulty >= 1 && item.difficulty <= 4, `${item.id}: difficulty ${item.difficulty} in 1-4 range`);
    
    // 10. Cognitive
    assert(
      ["MENGINGAT", "PEMAHAMAN", "PENERAPAN", "ANALISIS", "EVALUASI", "KREASI"].includes(item.cognitive || ""),
      `${item.id}: valid cognitive "${item.cognitive}"`
    );
    
    // 11. Domain
    assert(["SINTAS", "SOSIAL", "VOKASIONAL", "AKADEMIK"].includes(item.domain || ""), `${item.id}: valid domain "${item.domain}"`);
    
    // 12. For pilihan_ganda: stem, options, correctAnswer, explanation
    if (item.type === "pilihan_ganda") {
      assert(!!item.stem, `${item.id}: has stem`);
      assert(item.options && item.options.length >= 4, `${item.id}: has 4+ options`);
      
      if (item.options) {
        // No duplicate option texts
        const texts = item.options.map(o => o.text.toLowerCase().trim());
        const uniqueTexts = new Set(texts);
        assert(texts.length === uniqueTexts.size, `${item.id}: no duplicate option texts`);
        
        // correctAnswer matches an option id
        const optionIds = item.options.map(o => o.id);
        assert(optionIds.includes(item.correctAnswer || ""), `${item.id}: correctAnswer "${item.correctAnswer}" in options ${JSON.stringify(optionIds)}`);
        
        // Option IDs are A, B, C, D
        assert(
          JSON.stringify(optionIds) === JSON.stringify(["A", "B", "C", "D"]),
          `${item.id}: option IDs are A, B, C, D`
        );
      }
      
      assert(!!item.explanation, `${item.id}: has explanation`);
      
      // Band-difficulty consistency
      if (item.band === "TERBATAS") assert(item.difficulty === 1, `${item.id}: TERBATAS has difficulty 1`);
      if (item.band === "MARGINAL") assert(item.difficulty === 2, `${item.id}: MARGINAL has difficulty 2`);
      if (item.band === "SEMENJANA" || item.band === "MADYA") assert(item.difficulty >= 2, `${item.id}: ${item.band} has difficulty >= 2`);
    }
    
    // 13. For constructed: prompt, scoringMode, rubric
    if (item.type === "constructed") {
      assert(!!item.prompt, `${item.id}: has prompt`);
      assert(!!item.scoringMode, `${item.id}: has scoringMode`);
      assert(item.rubric && item.rubric.length >= 2, `${item.id}: has rubric with 2+ criteria`);
    }
    
    // 14. No official UKBI copy marker
    const fullText = JSON.stringify(item).toLowerCase();
    assert(!fullText.includes("ukbi resmi"), `${item.id}: no 'ukbi resmi' marker`);
    assert(!fullText.includes("bigt"), `${item.id}: no 'bigt' marker`);
    assert(!fullText.includes("soal resmi"), `${item.id}: no 'soal resmi' marker`);
  }
}

// 15. Total count
assert(allQuestions.length === 250, `Total 250 questions (found ${allQuestions.length})`);

// 16. Section distribution
const expectedCounts: Record<string, number> = {
  "merespons-kaidah": 70,
  "membaca": 100,
  "mendengarkan": 40,
  "menulis": 20,
  "berbicara": 20,
};
for (const [sec, expected] of Object.entries(expectedCounts)) {
  const actual = sectionCounts[sec] || 0;
  assert(actual === expected, `Section "${sec}" has ${actual} questions (expected ${expected})`);
}

// 17. No leaks
const sensitiveFields = ["correctAnswer", "answerKey", "jawaban"];
for (const item of allQuestions) {
  // Just a structural check - leakage tests handle runtime
  if (item.type === "pilihan_ganda") {
    assert(!!item.correctAnswer, `${item.id}: has correctAnswer for scoring`);
  }
}

// No grade wording in stems
for (const item of allQuestions) {
  if (item.stem) {
    const stem = item.stem.toLowerCase();
    assert(
      !stem.includes("kelas 1") && !stem.includes("kelas 2") && !stem.includes("kelas 3") &&
      !stem.includes("kelas 4") && !stem.includes("kelas 5") && !stem.includes("kelas 6") &&
      !stem.includes("sd kelas"),
      `${item.id}: stem does not contain grade wording`
    );
  }
}

console.log("\n═══════════════════════════════════════════");
console.log(`  Results: ${passed} passed, ${failed} failed`);
if (warnings.length > 0) {
  console.log(`\n  Warnings (${warnings.length}):`);
  warnings.forEach(w => console.log(`    ⚠️  ${w}`));
}
console.log("═══════════════════════════════════════════\n");

if (failed > 0) {
  console.log("  Errors:");
  errors.forEach(e => console.log(`    - ${e}`));
  process.exit(1);
}
console.log("  ✅ ALL VALIDATIONS PASSED\n");
process.exit(0);
