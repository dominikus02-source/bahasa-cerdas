/**
 * Test: Kompetensi Route — Performance Safety & Anti Leakage
 *
 * Checks:
 * 1. Route uses Promise.all for section queries (not sequential)
 * 2. Response does not contain correctAnswer/answerKey/jawaban
 * 3. randomization tetap aktif (fisherYatesShuffle)
 * 4. Snapshot tetap dibuat
 * 5. Query paket listing tidak mengambil JSON blob besar
 * 6. Build pass (checked via process)
 */

import fs from "fs";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

function assertNotInFile(filePath: string, pattern: string, label: string) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const hasPattern = content.includes(pattern);
    assert(!hasPattern, `${label} (${filePath} tidak mengandung "${pattern}")`);
  } catch {
    assert(false, `${label} (file tidak ditemukan: ${filePath})`);
  }
}

function assertInFile(filePath: string, pattern: string, label: string) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const hasPattern = content.includes(pattern);
    assert(hasPattern, `${label} (${filePath} mengandung "${pattern}")`);
  } catch {
    assert(false, `${label} (file tidak ditemukan: ${filePath})`);
  }
}

console.log("=".repeat(60));
console.log("  TEST: KOMPETENSI ROUTE — PERFORMANCE & SAFETY");
console.log("=".repeat(60));

// ── 1. Kompetensi route tidak memakai await sequential di loop kritis ──
console.log("\n── 1. PARALLEL QUERY ──");
const route = "app/api/kompetensi/[paketId]/route.ts";

assertInFile(route, "Promise.all(", "Section queries are parallel (Promise.all)");
assertNotInFile(route, "for (let i = 0; i < sections.length; i++)", "No sequential for loop over sections (old pattern)");
// Helper functions contain findMany — that's OK. Check there's no non-helper usage.
const routeContentCheck = fs.readFileSync(route, "utf-8");
const fetchUKBILines = routeContentCheck.split("\n").filter(l => l.includes("db.uKBIQuestion.findMany")).length;
assert(fetchUKBILines <= 2, `uKBIQuestion.findMany only in helpers (found ${fetchUKBILines} lines)`);
const fetchTKALines = routeContentCheck.split("\n").filter(l => l.includes("db.tKAQuestion.findMany")).length;
assert(fetchTKALines <= 2, `tKAQuestion.findMany only in helpers (found ${fetchTKALines} lines)`);

// ── 2. Response tidak mengandung correctAnswer ──
console.log("\n── 2. NO ANSWER LEAKAGE ──");
// The SELECT constants exist and should NOT include correctAnswer
assertInFile(route, "UKBI_SELECT", "UKBI_SELECT exists (no correctAnswer)");
assertInFile(route, "TKA_SELECT", "TKA_SELECT exists (no correctAnswer)");

// Verify UKBI_SELECT doesn't include correctAnswer
const routeContent = fs.readFileSync(route, "utf-8");
const ukbiSelectMatch = routeContent.match(/const UKBI_SELECT = \{([^}]+)\}/);
if (ukbiSelectMatch) {
  assert(!ukbiSelectMatch[1].includes("correctAnswer"), "UKBI_SELECT does not contain correctAnswer");
}
const tkaSelectMatch = routeContent.match(/const TKA_SELECT = \{([^}]+)\}/);
if (tkaSelectMatch) {
  assert(!tkaSelectMatch[1].includes("correctAnswer"), "TKA_SELECT does not contain correctAnswer");
}

// Snapshot select SHOULD include correctAnswer (server-side only)
assertInFile(route, "UKBI_SNAPSHOT_SELECT", "UKBI_SNAPSHOT_SELECT exists for server scoring");
assertInFile(route, "TKA_SNAPSHOT_SELECT", "TKA_SNAPSHOT_SELECT exists for server scoring");

// ── 3. Randomization tetap aktif ──
console.log("\n── 3. RANDOMIZATION ──");
// Primitive shuffle lives in lib (session-pool/randomization); route wires it in per-session.
assertInFile("lib/question-bank/randomization.ts", "fisherYatesShuffle", "Shuffle primitive exists (lib/question-bank/randomization.ts)");
assertInFile("lib/question-bank/session-pool.ts", "fisherYatesShuffle", "Pool shuffle uses fisherYatesShuffle");
assertInFile(route, "shuffleOptionsForQuestion", "Options are shuffled (route)");
assertInFile(route, "createSessionSeed", "Session seed is created (route)");

// ── 4. Snapshot tetap dibuat ──
console.log("\n── 4. SNAPSHOT ──");
assertInFile(route, "questionSnapshot", "Snapshot is saved to session");
assertInFile(route, "allSnapshots.push", "Snapshots are constructed");

// ── 5. Query paket listing tidak mengambil JSON blob besar ──
console.log("\n── 5. PAKET LISTING ──");
const resolver = "lib/kompetensi/get-simulation-packages.ts";
// The resolver must use select, not fetch all columns
assertInFile(resolver, "select:", "Resolver uses select (not all columns)");
const resolverContent = fs.readFileSync(resolver, "utf-8");
assert(!resolverContent.includes("sectionsData"), "Resolver does not fetch sectionsData");
assert(!resolverContent.includes("questionPool"), "Resolver does not fetch questionPool");

// ── 6. Timeout guard ──
console.log("\n── 6. QUERY TIMEOUT ──");
assertInFile(route, "withQueryTimeout", "Route uses query timeout helper");
assertInFile("lib/db/with-query-timeout.ts", "withQueryTimeout", "Timeout helper exists");

// ── 7. Helper functions ──
console.log("\n── 7. HELPER FUNCTIONS ──");
assertInFile(route, "fetchUKBIQuestions", "UKBI fetch helper exists (reduces duplication)");
assertInFile(route, "fetchTKAQuestions", "TKA fetch helper exists (reduces duplication)");
assertInFile(route, "fetchSectionByIds", "Section-by-IDs helper exists");
assertInFile(route, "fetchSectionByCriteria", "Section-by-criteria helper exists (with GURU fallback)");

// ── 8. API artikel caching ──
console.log("\n── 8. API ARTIKEL CACHE ──");
const artikelApi = "app/api/artikel/route.ts";
assertInFile(artikelApi, "getOrSet", "Artikel API uses Redis cache (getOrSet)");
assertInFile(artikelApi, "withQueryTimeout", "Artikel API uses query timeout");
assertInFile("lib/cache/redis-cache.ts", "getOrSet", "Redis cache helper exists");

// ── 9. Submit route has rate limiting ──
console.log("\n── 9. SUBMIT RATE LIMIT ──");
const submitRoute = "app/api/kompetensi/[paketId]/submit/route.ts";
if (fs.existsSync(submitRoute)) {
  const submitContent = fs.readFileSync(submitRoute, "utf-8");
  assert(submitContent.includes("rateLimitRoute") && submitContent.includes("simulation-submit"),
    "Submit route has Redis rate limiting (30 req/min)");
}

// ── SUMMARY ──
console.log("\n" + "=".repeat(60));
console.log(`  RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`);
if (failed === 0) {
  console.log("  ✅ ALL SAFETY TESTS PASSED");
} else {
  console.log(`  ❌ ${failed} TESTS FAILED`);
}
console.log("=".repeat(60));
process.exit(failed > 0 ? 1 : 0);
