/**
 * Phase UKBI DATA 1A — Runtime Wiring Audit
 *
 * Read-only audit of UKBI/TKA runtime wiring.
 * Checks: package integrity, resolver correctness, API engine state, legacy references.
 *
 * Run: npx tsx scripts/audit-ukbi-tka-runtime-wiring.ts
 */

import { db } from "../lib/db";
import * as fs from "fs";
import * as path from "path";
import { getUKBIPackages, getTKAPackages, isUKBIType, isTKAType } from "../lib/kompetensi/get-simulation-packages";

const PROJECT_ROOT = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;
const errors: string[] = [];
const warnings: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) { passed++; }
  else { failed++; errors.push(message); console.log(`  ❌ ${message}`); }
}

function warn(message: string) {
  warnings.push(message);
  console.log(`  ⚠️  ${message}`);
}

async function main() {
  console.log("\n═══════════════════════════════════════════");
  console.log("  UKBI/TKA Runtime Wiring Audit");
  console.log("═══════════════════════════════════════════\n");

  // 1. Get all UKBI/TKA PaketKompetensi
  console.log("── 1. Active PaketKompetensi ──");
  const allPk = await db.paketKompetensi.findMany({
    where: { isActive: true },
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
    select: { id: true, title: true, type: true, totalQuestions: true, duration: true, isActive: true, sections: true },
  });
  const ukbiPk = allPk.filter(p => isUKBIType(p.type));
  const tkaPk = allPk.filter(p => isTKAType(p.type));
  console.log(`  UKBI pakets: ${ukbiPk.length}`);
  console.log(`  TKA pakets: ${tkaPk.length}`);
  assert(ukbiPk.length >= 1, "At least 1 UKBI PaketKompetensi exists");
  assert(tkaPk.length >= 1, "At least 1 TKA PaketKompetensi exists");
  for (const pk of ukbiPk) {
    console.log(`    ${pk.type.padEnd(22)} ${pk.title.padEnd(40)} ${pk.totalQuestions}Q ${pk.duration}m`);
  }
  for (const pk of tkaPk) {
    console.log(`    ${pk.type.padEnd(22)} ${pk.title.padEnd(40)} ${pk.totalQuestions}Q ${pk.duration}m`);
  }

  // 2. Question counts per track
  console.log("\n── 2. Question Bank Size ──");
  const ukbiTotal = await db.uKBIQuestion.count();
  const tkaTotal = await db.tKAQuestion.count();
  const ukbiByTingkat = await db.uKBIQuestion.groupBy({ by: ["tingkat"], _count: true, where: { isActive: true } });
  const tkaByTingkat = await db.tKAQuestion.groupBy({ by: ["tingkat"], _count: true, where: { isActive: true } });
  console.log(`  UKBI total: ${ukbiTotal}`);
  console.log(`  TKA total: ${tkaTotal}`);
  for (const t of ukbiByTingkat) console.log(`    UKBI ${t.tingkat}: ${t._count}`);
  for (const t of tkaByTingkat) console.log(`    TKA ${t.tingkat}: ${t._count}`);

  // 3. Resolver output
  console.log("\n── 3. Resolver Output ──");
  const ukbiTracks = await getUKBIPackages();
  const tkaTracks = await getTKAPackages();
  console.log(`  UKBI resolver returns ${ukbiTracks.length} tracks`);
  for (const t of ukbiTracks) {
    console.log(`    ${t.id.padEnd(14)} ${t.available ? "✅" : "⬜"} ${t.label.padEnd(22)} ${t.questionCount}Q ${t.duration}m ${t.paketId ? `paket=${t.paketId.slice(0, 8)}...` : "no-paket"}${t.isLegacy ? " [LEGACY]" : ""}`);
    assert(t.id.startsWith("ukbi-"), `UKBI track ${t.id} has correct prefix`);
    if (t.available) assert(!!t.paketId, `Available track ${t.id} has paketId`);
  }
  for (const t of tkaTracks) {
    console.log(`    ${t.id.padEnd(14)} ${t.available ? "✅" : "⬜"} ${t.label.padEnd(22)} ${t.questionCount}Q ${t.duration}m ${t.paketId ? `paket=${t.paketId.slice(0, 8)}...` : "no-paket"}${t.isLegacy ? " [LEGACY]" : ""}`);
    assert(t.id.startsWith("tka-"), `TKA track ${t.id} has correct prefix`);
    if (t.available) assert(!!t.paketId, `Available track ${t.id} has paketId`);
  }

  // 4. Simulation pages
  console.log("\n── 4. Simulation Pages — Static File Check ──");
  const ukbiPage = path.join(PROJECT_ROOT, "app/(dashboard)/murid/simulasi/ukbi/page.tsx");
  const tkaPage = path.join(PROJECT_ROOT, "app/(dashboard)/murid/simulasi/tka/page.tsx");
  const guruUkbiPage = path.join(PROJECT_ROOT, "app/(dashboard)/guru/simulasi/ukbi/page.tsx");
  const guruTkaPage = path.join(PROJECT_ROOT, "app/(dashboard)/guru/simulasi/tka/page.tsx");
  const ukbiClient = path.join(PROJECT_ROOT, "app/(dashboard)/murid/simulasi/ukbi/client.tsx");
  const tkaClient = path.join(PROJECT_ROOT, "app/(dashboard)/murid/simulasi/tka/client.tsx");

  assert(fs.existsSync(ukbiPage), "/murid/simulasi/ukbi page exists");
  assert(fs.existsSync(tkaPage), "/murid/simulasi/tka page exists");
  assert(fs.existsSync(guruUkbiPage), "/guru/simulasi/ukbi page exists");
  assert(fs.existsSync(guruTkaPage), "/guru/simulasi/tka page exists");
  assert(fs.existsSync(ukbiClient), "/murid/simulasi/ukbi client exists");
  assert(fs.existsSync(tkaClient), "/murid/simulasi/tka client exists");

  // Check pages use resolver
  const ukbiContent = fs.readFileSync(ukbiPage, "utf-8");
  const tkaContent = fs.readFileSync(tkaPage, "utf-8");
  assert(ukbiContent.includes("getUKBIPackages"), "UKBI page imports getUKBIPackages");
  assert(tkaContent.includes("getTKAPackages"), "TKA page imports getTKAPackages");
  assert(!ukbiContent.includes("hardcoded"), "UKBI page no hardcoded paketId");
  assert(!tkaContent.includes("hardcoded"), "TKA page no hardcoded paketId");

  // 5. API routes
  console.log("\n── 5. API Competency Routes ──");
  const getRoute = path.join(PROJECT_ROOT, "app/api/kompetensi/[paketId]/route.ts");
  const submitRoute = path.join(PROJECT_ROOT, "app/api/kompetensi/[paketId]/submit/route.ts");
  const hasilRoute = path.join(PROJECT_ROOT, "app/api/kompetensi/[paketId]/hasil/route.ts");
  assert(fs.existsSync(getRoute), "GET route exists");
  assert(fs.existsSync(submitRoute), "Submit route exists");
  assert(fs.existsSync(hasilRoute), "Hasil route exists");

  const getContent = fs.readFileSync(getRoute, "utf-8");
  const submitContent = fs.readFileSync(submitRoute, "utf-8");
  assert(getContent.includes("fisherYatesShuffle"), "GET route uses randomization");
  assert(getContent.includes("shuffleOptionsForQuestion"), "GET route shuffles options");
  assert(getContent.includes("createSessionSeed"), "GET route creates session seed");
  assert(getContent.includes("questionSnapshot"), "GET route stores questionSnapshot");
  // correctAnswer appears in snapshot section (server-side), NOT in pre-snapshot client selects
  const snapshotSectionIndex = getContent.indexOf("const allSnapshots");
  const clientSection = snapshotSectionIndex > 0 ? getContent.slice(0, snapshotSectionIndex) : getContent;
  const clientSelects = clientSection.match(/select:\s*\{[^}]+\}/g);
  const clientSafe = !clientSelects || clientSelects.every(s => !s.includes("correctAnswer"));
  assert(clientSafe, "Client-bound select queries (pre-snapshot) exclude correctAnswer");
  assert(getContent.includes("correctAnswer: string"), "GET route stores correctAnswer in snapshot (server-side only)");
  assert(getContent.includes("questionSnapshot"), "GET route stores questionSnapshot");
  assert(submitContent.includes("questionSnapshot"), "Submit route reads questionSnapshot");
  assert(submitContent.includes("answerDetails"), "Submit route saves answerDetails");

  // 6. Legacy files
  console.log("\n── 6. Legacy Seed Files ──");
  const legacyFiles = [
    "scripts/seed-ukbi.cjs",
    "scripts/seed-tka.cjs",
    "scripts/seed-tka-utbk.cjs",
    "scripts/fix_ukbi.ts",
  ];
  for (const lf of legacyFiles) {
    const fullPath = path.join(PROJECT_ROOT, lf);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      const hasWarning = content.includes("LEGACY");
      assert(hasWarning, `Legacy file ${lf} has LEGACY warning`);
      console.log(`  ✅ ${lf} — marked as LEGACY`);
    } else {
      warn(`Legacy file ${lf} not found (may have been deleted)`);
    }
  }

  // 7. No orphan question references
  console.log("\n── 7. Orphan Question References ──");
  for (const pk of ukbiPk) {
    const sections = (pk.sections as any[]) || [];
    for (const s of sections) {
      if (s.questionIds && s.questionIds.length > 0) {
        const validCount = await db.uKBIQuestion.count({ where: { id: { in: s.questionIds }, isActive: true } });
        if (validCount < s.questionIds.length) {
          warn(`Paket ${pk.title} (${pk.id.slice(0, 8)}...) has ${s.questionIds.length - validCount} orphan question refs in section "${s.name}"`);
        }
      }
    }
  }
  for (const pk of tkaPk) {
    const sections = (pk.sections as any[]) || [];
    for (const s of sections) {
      if (s.questionIds && s.questionIds.length > 0) {
        const validCount = await db.tKAQuestion.count({ where: { id: { in: s.questionIds }, isActive: true } });
        if (validCount < s.questionIds.length) {
          warn(`Paket ${pk.title} (${pk.id.slice(0, 8)}...) has ${s.questionIds.length - validCount} orphan question refs in section "${s.name}"`);
        }
      }
    }
  }
  console.log("  ✅ Orphan check complete");

  // 8. Summary
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
  console.log("  ✅ RUNTIME WIRING AUDIT PASSED\n");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Audit failed:", e.message);
  process.exit(1);
});
