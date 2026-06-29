/**
 * Phase UKBI DATA 1A — Runtime Wiring Tests
 *
 * Tests that UKBI/TKA simulation pages resolve correctly,
 * API routes use proper engine, and no hardcoded legacy references exist.
 *
 * Run: npx tsx scripts/test-ukbi-tka-runtime-wiring.ts
 */

import { getUKBIPackages, getTKAPackages, getSimulationPackageByTrack, isUKBIType, isTKAType } from "../lib/kompetensi/get-simulation-packages";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) { passed++; console.log(`  ✅ ${message}`); }
  else { failed++; errors.push(message); console.log(`  ❌ ${message}`); }
}

async function main() {
  console.log("\n═══════════════════════════════════════════");
  console.log("  UKBI/TKA Runtime Wiring Tests");
  console.log("═══════════════════════════════════════════\n");

  // 1. Resolver exports exist
  console.log("── Test 1: Resolver exports ──");
  assert(typeof getUKBIPackages === "function", "getUKBIPackages is a function");
  assert(typeof getTKAPackages === "function", "getTKAPackages is a function");
  assert(typeof getSimulationPackageByTrack === "function", "getSimulationPackageByTrack is a function");
  assert(typeof isUKBIType === "function", "isUKBIType is a function");
  assert(typeof isTKAType === "function", "isTKAType is a function");

  // 2. UKBI packages resolve
  console.log("\n── Test 2: UKBI package resolution ──");
  const ukbiTracks = await getUKBIPackages();
  assert(Array.isArray(ukbiTracks), "UKBI tracks is array");
  assert(ukbiTracks.length >= 1, "UKBI has at least 1 track");
  const ukbiSd = ukbiTracks.find(t => t.track === "SD");
  assert(!!ukbiSd, "UKBI SD track exists");
  assert(ukbiSd!.id === "ukbi-sd", "UKBI SD has id 'ukbi-sd'");

  // 3. TKA packages resolve
  console.log("\n── Test 3: TKA package resolution ──");
  const tkaTracks = await getTKAPackages();
  assert(Array.isArray(tkaTracks), "TKA tracks is array");
  assert(tkaTracks.length >= 1, "TKA has at least 1 track");
  const tkaSmp = tkaTracks.find(t => t.track === "SMP");
  assert(!!tkaSmp, "TKA SMP track exists");
  assert(tkaSmp!.id === "tka-smp", "TKA SMP has id 'tka-smp'");

  // 4. Available tracks have paketId
  console.log("\n── Test 4: Available tracks have paketId ──");
  for (const t of ukbiTracks) {
    if (t.available) assert(!!t.paketId, `${t.id}: available track has paketId`);
  }
  for (const t of tkaTracks) {
    if (t.available) assert(!!t.paketId, `${t.id}: available track has paketId`);
  }

  // 5. Track by ID lookup
  console.log("\n── Test 5: getSimulationPackageByTrack ──");
  const sdPkg = await getSimulationPackageByTrack("SD", "UKBI");
  assert(!!sdPkg, "UKBI SD package found by track");
  assert(sdPkg!.track === "SD", "Package has track 'SD'");
  const nullPkg = await getSimulationPackageByTrack("NONEXISTENT", "UKBI");
  assert(nullPkg === null, "Nonexistent track returns null");

  // 6. UKBI type helpers
  console.log("\n── Test 6: Type helpers ──");
  assert(isUKBIType("UKBI_SD"), "UKBI_SD is UKBI type");
  assert(isUKBIType("UKBI_SMP"), "UKBI_SMP is UKBI type");
  assert(isUKBIType("UKBI_SMA"), "UKBI_SMA is UKBI type");
  assert(isUKBIType("UKBI_GURU_SIMULASI"), "UKBI_GURU_SIMULASI is UKBI type");
  assert(!isUKBIType("TKA_SMP"), "TKA_SMP is NOT UKBI type");
  assert(isTKAType("TKA_SD"), "TKA_SD is TKA type");
  assert(isTKAType("TKA_SMP"), "TKA_SMP is TKA type");
  assert(isTKAType("TKA_SMA"), "TKA_SMA is TKA type");
  assert(isTKAType("TKA_UTBK"), "TKA_UTBK is TKA type");
  assert(!isTKAType("UKBI_SD"), "UKBI_SD is NOT TKA type");

  // 7. Legacy markers
  console.log("\n── Test 7: Legacy file markers ──");
  const legacyFiles = ["scripts/seed-ukbi.cjs", "scripts/seed-tka.cjs", "scripts/seed-tka-utbk.cjs", "scripts/fix_ukbi.ts"];
  for (const lf of legacyFiles) {
    const fullPath = path.join(PROJECT_ROOT, lf);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      assert(content.includes("LEGACY"), `${lf} has LEGACY warning`);
    }
  }

  // 8. API GET route uses randomization
  console.log("\n── Test 8: API route randomization ──");
  const getRoute = fs.readFileSync(path.join(PROJECT_ROOT, "app/api/kompetensi/[paketId]/route.ts"), "utf-8");
  assert(getRoute.includes("fisherYatesShuffle"), "GET route imports fisherYatesShuffle");
  assert(getRoute.includes("shuffleOptionsForQuestion"), "GET route imports shuffleOptionsForQuestion");
  assert(getRoute.includes("createSessionSeed"), "GET route imports createSessionSeed");

  // 9. Snapshot storage
  console.log("\n── Test 9: Snapshot storage ──");
  assert(getRoute.includes("questionSnapshot"), "GET route stores questionSnapshot");

  // 10. Submit uses snapshot
  console.log("\n── Test 10: Submit uses snapshot ──");
  const submitRoute = fs.readFileSync(path.join(PROJECT_ROOT, "app/api/kompetensi/[paketId]/submit/route.ts"), "utf-8");
  assert(submitRoute.includes("questionSnapshot"), "Submit route reads questionSnapshot");
  assert(submitRoute.includes("answerDetails"), "Submit route saves answerDetails");

  // 11. correctAnswer in snapshot only (server-side), not in client-bound selects
  console.log("\n── Test 11: No answer leakage ──");
  assert(getRoute.includes("correctAnswer: string"), "correctAnswer stored in snapshot (server-side)");
  assert(getRoute.includes("questionSnapshot"), "questionSnapshot stored server-side");
  // Split at snapshot section — client selects are before, snapshot selects are after
  const snapshotSectionIndex = getRoute.indexOf("const allSnapshots");
  const clientSection = snapshotSectionIndex > 0 ? getRoute.slice(0, snapshotSectionIndex) : getRoute;
  const clientSelects = clientSection.match(/select:\s*\{[^}]+\}/g);
  const allSafe = !clientSelects || clientSelects.every(s => !s.includes("correctAnswer"));
  assert(allSafe, "Client-bound select queries (pre-snapshot) exclude correctAnswer");

  // 12. Simulation pages exist and use resolver
  console.log("\n── Test 12: Simulation pages ──");
  const ukbiPage = fs.readFileSync(path.join(PROJECT_ROOT, "app/(dashboard)/murid/simulasi/ukbi/page.tsx"), "utf-8");
  const tkaPage = fs.readFileSync(path.join(PROJECT_ROOT, "app/(dashboard)/murid/simulasi/tka/page.tsx"), "utf-8");
  assert(ukbiPage.includes("getUKBIPackages"), "UKBI page uses getUKBIPackages");
  assert(tkaPage.includes("getTKAPackages"), "TKA page uses getTKAPackages");

  // 13. Dokumen Hasil Latihan
  console.log("\n── Test 13: Dokumen Hasil Latihan ──");
  const dokumenMurid = fs.readFileSync(path.join(PROJECT_ROOT, "app/(dashboard)/murid/dokumen-latihan/page.tsx"), "utf-8");
  assert(dokumenMurid.includes("Dokumen"), "Dokumen Hasil Latihan page exists");

  // 14. BIGT page
  console.log("\n── Test 14: BIGT page ──");
  const bigtMurid = path.join(PROJECT_ROOT, "app/(dashboard)/murid/bigt/page.tsx");
  const bigtGuru = path.join(PROJECT_ROOT, "app/(dashboard)/guru/bigt/page.tsx");
  assert(fs.existsSync(bigtMurid), "Murid BIGT page exists");
  assert(fs.existsSync(bigtGuru), "Guru BIGT page exists");

  // Summary
  console.log("\n═══════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════\n");

  if (failed > 0) {
    console.log("  Errors:");
    errors.forEach(e => console.log(`    - ${e}`));
    process.exit(1);
  }
  console.log("  ✅ RUNTIME WIRING TESTS PASSED\n");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Tests failed:", e.message);
  process.exit(1);
});
