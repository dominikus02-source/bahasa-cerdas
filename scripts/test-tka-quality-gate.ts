/**
 * TKA / UTBK Quality Gate — Test Suite
 *
 * Phase 0A: Answer Integrity
 * Phase 0B: Stem Deduplication
 * Phase 0C: Enrichment Regression (validates against blueprint)
 *
 * Pure unit tests on JSON bank files. No database, no network.
 * Run: npm run test:tka-quality-gate
 */

import * as fs from "fs";
import * as path from "path";
import {
  ALL_TRACK_BLUEPRINTS,
  mapDifficulty,
  SECTION_TO_KOMPETENSI,
  MCQ_MIN_OPTIONS,
  MCQ_OPTION_IDS,
  SUPPORTED_QUESTION_TYPES,
  VALID_COGNITIVE,
  VALID_DOMAIN,
  VALID_BANDS,
  type TrackBlueprint,
  type TKASection,
} from "../lib/tka-enrichment/blueprint";

// ──────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────

interface QuestionOption {
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
  prompt?: string;
  options?: QuestionOption[];
  correctAnswer?: string;
  explanation?: string;
  tags?: string[];
  source: string;
  status: string;
  cognitive?: string;
  domain?: string;
}

interface TrackData {
  track: string;
  file: string;
  meta: any;
  questions: QuestionItem[];
}

interface Failure {
  track: string;
  questionId: string;
  section: string;
  reason: string;
  detail: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  checked: number;
  failures: Failure[];
}

// ──────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────

const BANK_DIR = path.join(__dirname, "..", "data", "question-bank", "tka");

function loadAllTracks(): TrackData[] {
  const tracks: TrackData[] = [];
  const trackDirs = ["sd", "smp", "sma", "utbk", "guru"];

  for (const trackKey of trackDirs) {
    const trackDir = path.join(BANK_DIR, trackKey);
    if (!fs.existsSync(trackDir)) continue;

    // Flatten: check subdirectories (like sd/membaca/) or direct files
    const entries = fs.readdirSync(trackDir, { withFileTypes: true });
    const hasSubdirs = entries.some((e) => e.isDirectory());
    const jsonFiles: string[] = [];

    if (hasSubdirs) {
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const sectionDir = path.join(trackDir, entry.name);
        const files = fs.readdirSync(sectionDir).filter((f) => f.endsWith(".json"));
        for (const f of files) {
          jsonFiles.push(path.join(entry.name, f));
        }
      }
    } else {
      jsonFiles.push(...entries.filter((e) => e.name.endsWith(".json")).map((e) => e.name));
    }

    for (const relPath of jsonFiles) {
      const filePath = path.join(trackDir, relPath);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        tracks.push({
          track: trackKey,
          file: `${trackKey}/${relPath}`,
          meta: data.meta || {},
          questions: data.questions || [],
        });
      } catch (err: any) {
        console.error(`  ⚠️  Error reading ${filePath}: ${err.message}`);
      }
    }
  }
  return tracks;
}

function normalizeStem(stem: string): string {
  return stem
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?'"()\[\]{}]/g, "");
}

// ──────────────────────────────────────────────────────────
// PHASE 0A: ANSWER INTEGRITY
// ──────────────────────────────────────────────────────────

function testAnswerIntegrity(tracks: TrackData[]): TestResult {
  const failures: Failure[] = [];
  let checked = 0;

  for (const track of tracks) {
    for (const q of track.questions) {
      checked++;

      // 1. correctAnswer exists
      if (!q.correctAnswer || String(q.correctAnswer).trim() === "") {
        failures.push({
          track: track.track,
          questionId: q.id,
          section: q.section,
          reason: "MISSING_CORRECT_ANSWER",
          detail: `correctAnswer is empty or missing`,
        });
        continue; // can't check further without answer
      }

      // 2. options exist and are valid
      if (!Array.isArray(q.options) || q.options.length < MCQ_MIN_OPTIONS) {
        failures.push({
          track: track.track,
          questionId: q.id,
          section: q.section,
          reason: "INVALID_OPTIONS",
          detail: `Expected ≥${MCQ_MIN_OPTIONS} options, got ${q.options?.length ?? 0}`,
        });
        continue;
      }

      // 3. no empty option text
      for (const opt of q.options) {
        if (!opt.text || String(opt.text).trim() === "") {
          failures.push({
            track: track.track,
            questionId: q.id,
            section: q.section,
            reason: "EMPTY_OPTION_TEXT",
            detail: `Option "${opt.id}" has empty text`,
          });
        }
      }

      // 4. option IDs are valid
      const optionIds = q.options.map((o) => String(o.id).trim());
      for (const expectedId of MCQ_OPTION_IDS.slice(0, q.options.length)) {
        if (!optionIds.includes(expectedId)) {
          failures.push({
            track: track.track,
            questionId: q.id,
            section: q.section,
            reason: "INVALID_OPTION_ID",
            detail: `Expected option "${expectedId}" not found in [${optionIds.join(", ")}]`,
          });
        }
      }

      // 5. duplicate option text
      const optionTexts = q.options.map((o) => String(o.text).trim().toLowerCase());
      const seenTexts = new Set<string>();
      for (let i = 0; i < optionTexts.length; i++) {
        if (seenTexts.has(optionTexts[i])) {
          failures.push({
            track: track.track,
            questionId: q.id,
            section: q.section,
            reason: "DUPLICATE_OPTION",
            detail: `Option text "${String(q.options[i].text).substring(0, 40)}..." appears more than once`,
          });
        }
        seenTexts.add(optionTexts[i]);
      }

      // 6. correctAnswer matches a valid option (same logic as assessment: exact string match)
      const answerNormalized = String(q.correctAnswer).trim();
      if (!optionIds.includes(answerNormalized)) {
        failures.push({
          track: track.track,
          questionId: q.id,
          section: q.section,
          reason: "CORRECT_ANSWER_MISMATCH",
          detail: `correctAnswer "${answerNormalized}" does not match any option ID [${optionIds.join(", ")}]`,
        });
      }

      // 7. stem exists and is non-trivial
      if (!q.stem || String(q.stem).trim().length < 10) {
        failures.push({
          track: track.track,
          questionId: q.id,
          section: q.section,
          reason: "MISSING_OR_SHORT_STEM",
          detail: `stem length is ${q.stem?.length ?? 0} (minimum 10)`,
        });
      }

      // 8. explanation exists
      if (!q.explanation || String(q.explanation).trim().length < 5) {
        failures.push({
          track: track.track,
          questionId: q.id,
          section: q.section,
          reason: "MISSING_EXPLANATION",
          detail: `explanation is empty or too short`,
        });
      }

      // 9. difficulty is valid number 1-4
      if (typeof q.difficulty !== "number" || q.difficulty < 1 || q.difficulty > 4) {
        failures.push({
          track: track.track,
          questionId: q.id,
          section: q.section,
          reason: "INVALID_DIFFICULTY",
          detail: `difficulty is ${JSON.stringify(q.difficulty)}, expected 1-4`,
        });
      }

      // 10. cognitive dimension is valid
      if (q.cognitive && !VALID_COGNITIVE.includes(q.cognitive as any)) {
        failures.push({
          track: track.track,
          questionId: q.id,
          section: q.section,
          reason: "INVALID_COGNITIVE",
          detail: `cognitive "${q.cognitive}" not in valid set`,
        });
      }

      // 11. domain is valid
      if (q.domain && !VALID_DOMAIN.includes(q.domain as any)) {
        failures.push({
          track: track.track,
          questionId: q.id,
          section: q.section,
          reason: "INVALID_DOMAIN",
          detail: `domain "${q.domain}" not in valid set`,
        });
      }

      // 12. question type is supported
      if (!SUPPORTED_QUESTION_TYPES.includes(q.type as any)) {
        failures.push({
          track: track.track,
          questionId: q.id,
          section: q.section,
          reason: "UNSUPPORTED_QUESTION_TYPE",
          detail: `type "${q.type}" not in supported types`,
        });
      }

      // 13. status is valid
      if (q.status !== "approved" && q.status !== "draft" && q.status !== "active") {
        failures.push({
          track: track.track,
          questionId: q.id,
          section: q.section,
          reason: "UNEXPECTED_STATUS",
          detail: `status "${q.status}" — expected approved/draft/active`,
        });
      }
    }
  }

  return {
    name: "Phase 0A: Answer Integrity",
    passed: failures.length === 0,
    checked,
    failures,
  };
}

// ──────────────────────────────────────────────────────────
// PHASE 0B: STEM DEDUPLICATION
// ──────────────────────────────────────────────────────────

function testStemDeduplication(tracks: TrackData[]): TestResult {
  const failures: Failure[] = [];
  let checked = 0;

  // Build normalized stem → question map (across all tracks)
  const stemMap = new Map<string, { track: string; questionId: string; section: string; original: string }[]>();

  for (const track of tracks) {
    for (const q of track.questions) {
      checked++;
      if (!q.stem) continue;

      const normalized = normalizeStem(q.stem);
      if (normalized.length < 5) continue; // skip trivially short stems

      if (!stemMap.has(normalized)) {
        stemMap.set(normalized, []);
      }
      stemMap.get(normalized)!.push({
        track: track.track,
        questionId: q.id,
        section: q.section,
        original: q.stem.substring(0, 60),
      });
    }
  }

  // Report duplicates
  let duplicateGroupCount = 0;
  for (const [normalized, entries] of stemMap) {
    if (entries.length > 1) {
      duplicateGroupCount++;
      const ids = entries.map((e) => `${e.track}/${e.questionId}`).join(", ");
      failures.push({
        track: entries.map((e) => e.track).join("+"),
        questionId: ids,
        section: entries[0].section,
        reason: "EXACT_STEM_DUPLICATE",
        detail: `${entries.length} questions share normalized stem: "${entries[0].original}..."`,
      });
    }
  }

  return {
    name: "Phase 0B: Stem Deduplication",
    passed: duplicateGroupCount === 0,
    checked,
    failures,
  };
}

// ──────────────────────────────────────────────────────────
// PHASE 0C: ENRICHMENT REGRESSION
// ──────────────────────────────────────────────────────────

function testEnrichmentRegression(tracks: TrackData[]): TestResult {
  const failures: Failure[] = [];
  let checked = 0;

  for (const [trackKey, blueprint] of Object.entries(ALL_TRACK_BLUEPRINTS)) {
    // Find questions for this track
    const trackQuestions = tracks
      .filter((t) => t.track === trackKey)
      .flatMap((t) => t.questions);

    const totalCount = trackQuestions.length;

    // 1. Minimum total questions
    checked++;
    if (totalCount < blueprint.totalMinimum) {
      failures.push({
        track: trackKey,
        questionId: "N/A",
        section: "ALL",
        reason: "BELOW_MINIMUM_TOTAL",
        detail: `Track "${trackKey}" has ${totalCount} questions, minimum is ${blueprint.totalMinimum}`,
      });
    }

    // 2. Section coverage
    for (const sectionBlueprint of blueprint.sections) {
      const sectionQuestions = trackQuestions.filter(
        (q) => q.section === sectionBlueprint.section
      );

      checked++;
      if (sectionQuestions.length < sectionBlueprint.minQuestions) {
        failures.push({
          track: trackKey,
          questionId: "N/A",
          section: sectionBlueprint.section,
          reason: "BELOW_MINIMUM_SECTION",
          detail: `Section "${sectionBlueprint.section}" has ${sectionQuestions.length} questions, minimum is ${sectionBlueprint.minQuestions}`,
        });
      }

      // 3. Difficulty distribution (only if enough questions to measure)
      if (sectionQuestions.length >= 10) {
        const difficultyCounts = { EASY: 0, MEDIUM: 0, HARD: 0, VERY_HARD: 0 };
        for (const q of sectionQuestions) {
          const diff = mapDifficulty(q.difficulty || 2);
          difficultyCounts[diff]++;
        }

        const total = sectionQuestions.length;
        for (const [diff, target] of Object.entries(sectionBlueprint.difficulty)) {
          const actual = ((difficultyCounts[diff as keyof typeof difficultyCounts] / total) * 100);
          const diff_pct = Math.abs(actual - target);

          checked++;
          // Allow 15% tolerance from target
          if (diff_pct > 15 && sectionQuestions.length >= 20) {
            failures.push({
              track: trackKey,
              questionId: "N/A",
              section: sectionBlueprint.section,
              reason: "DIFFICULTY_IMBALANCE",
              detail: `${diff} is ${actual.toFixed(0)}% (target ${target}%), delta ${diff_pct.toFixed(0)}%`,
            });
          }
        }
      }
    }

    // 4. No unsupported sections
    const validSections = blueprint.sections.map((s) => s.section);
    const actualSections = new Set(trackQuestions.map((q) => q.section));
    for (const section of actualSections) {
      checked++;
      if (!validSections.includes(section as TKASection)) {
        failures.push({
          track: trackKey,
          questionId: "N/A",
          section: section,
          reason: "UNSUPPORTED_SECTION",
          detail: `Section "${section}" exists in bank but not in blueprint for track "${trackKey}"`,
        });
      }
    }

    // 5. Metadata completeness (sample check: first 5 questions per section)
    for (const sectionBlueprint of blueprint.sections) {
      const sectionQuestions = trackQuestions
        .filter((q) => q.section === sectionBlueprint.section)
        .slice(0, 5);

      for (const q of sectionQuestions) {
        checked++;
        if (!q.cognitive) {
          failures.push({
            track: trackKey,
            questionId: q.id,
            section: sectionBlueprint.section,
            reason: "MISSING_COGNITIVE",
            detail: `Question missing cognitive dimension`,
          });
        }
        checked++;
        if (!q.domain) {
          failures.push({
            track: trackKey,
            questionId: q.id,
            section: sectionBlueprint.section,
            reason: "MISSING_DOMAIN",
            detail: `Question missing domain`,
          });
        }
      }
    }
  }

  return {
    name: "Phase 0C: Enrichment Regression",
    passed: failures.length === 0,
    checked,
    failures,
  };
}

// ──────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────
// DIFFICULTY MAPPING REGRESSION
// ──────────────────────────────────────────────────────────

function testDifficultyMapping(): TestResult {
  const failures: Failure[] = [];
  let checked = 0;

  // Test cases: [input, expectedOutput]
  const testCases: [number, string][] = [
    [0, "EASY"],
    [1, "EASY"],
    [2, "MEDIUM"],
    [3, "HARD"],
    [4, "VERY_HARD"],
    [5, "VERY_HARD"],  // edge case: higher than expected
  ];

  for (const [input, expected] of testCases) {
    checked++;
    const result = mapDifficulty(input);
    if (result !== expected) {
      failures.push({
        track: "ALL",
        questionId: `mapDifficulty(${input})`,
        section: "DIFFICULTY_MAPPING",
        reason: "DIFFICULTY_MAP_MISMATCH",
        detail: `Input ${input} mapped to "${result}" but expected "${expected}"`,
      });
    }
  }

  // Verify all enum values are covered
  const allEnumValues = ["EASY", "MEDIUM", "HARD", "VERY_HARD"];
  const mappedValues = new Set(testCases.map(([_, out]) => out));
  for (const val of allEnumValues) {
    checked++;
    if (!mappedValues.has(val)) {
      failures.push({
        track: "ALL",
        questionId: "N/A",
        section: "DIFFICULTY_MAPPING",
        reason: "MISSING_ENUM_COVERAGE",
        detail: `Difficulty enum value "${val}" has no test case`,
      });
    }
  }

  return {
    name: "Difficulty Mapping Regression",
    passed: failures.length === 0,
    checked,
    failures,
  };
}

function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  TKA / UTBK Quality Gate — Test Suite");
  console.log("  Phase 0A + 0B + 0C + Difficulty Mapping");
  console.log("═══════════════════════════════════════════════════════════\n");

  const tracks = loadAllTracks();
  const totalQuestions = tracks.reduce((sum, t) => sum + t.questions.length, 0);
  const trackSummary = tracks.reduce(
    (acc, t) => {
      acc[t.track] = (acc[t.track] || 0) + t.questions.length;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log(`📂 Loaded ${tracks.length} bank files with ${totalQuestions} questions`);
  console.log(`   Per track: ${Object.entries(trackSummary).map(([k, v]) => `${k}=${v}`).join(", ")}\n`);

  // Run tests
  const results: TestResult[] = [
    testDifficultyMapping(),
    testAnswerIntegrity(tracks),
    testStemDeduplication(tracks),
    testEnrichmentRegression(tracks),
  ];

  // Report
  let totalChecked = 0;
  let totalFailures = 0;
  let allPassed = true;

  for (const result of results) {
    const icon = result.passed ? "✅" : "❌";
    const failCount = result.failures.length;
    totalChecked += result.checked;
    totalFailures += failCount;

    if (!result.passed) allPassed = false;

    console.log(`${icon} ${result.name} — ${result.checked} checks, ${failCount} failures`);

    if (failCount > 0) {
      // Group failures by reason
      const byReason = new Map<string, Failure[]>();
      for (const f of result.failures) {
        if (!byReason.has(f.reason)) byReason.set(f.reason, []);
        byReason.get(f.reason)!.push(f);
      }

      for (const [reason, failures] of byReason) {
        console.log(`\n   ${reason} (${failures.length}):`);
        for (const f of failures.slice(0, 10)) {
          console.log(`     ${f.track}/${f.questionId}: ${f.detail}`);
        }
        if (failures.length > 10) {
          console.log(`     ... and ${failures.length - 10} more`);
        }
      }
    }
    console.log();
  }

  // Summary
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  TOTAL: ${totalChecked} checks, ${totalFailures} failures`);
  console.log(`  RESULT: ${allPassed ? "✅ ALL PASS" : "❌ FAILURES FOUND"}`);
  console.log("═══════════════════════════════════════════════════════════");

  // Near-duplicate detection notice
  console.log("\n📝 NOTE: Near-duplicate detection remains a future quality gate.");
  console.log("   Current deduplication is exact normalized-stem only.\n");

  if (!allPassed) {
    process.exit(1);
  }
}

main();
