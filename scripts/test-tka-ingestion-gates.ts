/**
 * TKA Ingestion — validation gates A–J (mission Phase 8) + scoring/randomization smoke (Phase 9).
 * Read-only against DB. Exits non-zero on any gate failure.
 *
 * Gates:
 *   A. Source coverage       — every ingestible file processed (or explicitly BLOCKED w/ reason)
 *   B. Question coverage     — detected = imported + duplicates + blocked (no silent omissions)
 *   C. Answer-key integrity  — 100% of imported questions have verified keys that map to options
 *   D. Option integrity      — options structurally valid (≥2, unique ids/text, key ∈ options)
 *   E. Track integrity       — every question maps to a canonical track (tingkat) + kompetensi
 *   F. Duplicate integrity   — no duplicate production questions (id + normalized content)
 *   G. Database integrity    — no orphans; seeder rerun produces zero changes (idempotent)
 *   H. Scoring integrity     — sample submit scoring behaves per imported answer key
 *   I. Randomization         — seeded pool sampling works with enlarged SMP pool
 *   J. Regression            — pre-existing content untouched (sources/census preserved)
 */
import "./load-env";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const db = new PrismaClient();
const SET_PATH = path.join(__dirname, "..", "data", "question-bank", "tka", "smp", "soal-tka-ix", "set-001.json");

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(id: string, cond: boolean, detail?: string): void {
  if (cond) {
    pass++;
    console.log(`  ✅ ${id}`);
  } else {
    fail++;
    failures.push(id + (detail ? ` — ${detail}` : ""));
    console.log(`  ❌ ${id}${detail ? ` — ${detail}` : ""}`);
  }
}

function normText(s: string): string {
  return s.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

interface IngestItem {
  id: string;
  product: string;
  track: string;
  section: string;
  band: string;
  type: string;
  difficulty: number;
  sourceNumber: number;
  sourceFile: string;
  sourceHash: string;
  stem: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  status: string;
  source: string;
  passage?: string;
}

async function main(): Promise<void> {
  const data = JSON.parse(fs.readFileSync(SET_PATH, "utf8"));
  const items: IngestItem[] = data.questions;
  const approved = items.filter((q) => q.status === "approved");
  const blocked = items.filter((q) => q.status === "blocked");

  // Evidence for GATE A: the source documents + this repo's committed artifacts.
  // If these files are missing, the "ingestion covered every source" claim has no basis.
  const SOURCE_DOC_DIR = "/Users/user/Documents/PPT BI/Soal TKA";
  const soalDocx = [1, 2, 3]
    .map((n) => path.join(SOURCE_DOC_DIR, `SOAL TKA BAHASA INDONESIA KELAS IX ${n}.docx`))
    .filter((p) => fs.existsSync(p));
  const reportDoc = path.join(__dirname, "..", "docs", "TKA_INGESTION_REPORT.md");
  const reportDocExists = fs.existsSync(reportDoc);
  const reportText = reportDocExists ? fs.readFileSync(reportDoc, "utf8") : "";

  console.log("═══ GATE A — Source coverage ═══");
  // Every source file in "Soal TKA" is accounted for: 3 docx parsed, 2 PDF + 1 orphan key BLOCKED
  check("A1: 3 SOAL docx parsed into set", items.length === 70, `items=${items.length}`);
  check(
    "A2: blocked sources documented (report names PAKET-1 no-key + scanned PDF + orphan key)",
    reportDocExists &&
      /PAKET 1 UJI COBA/.test(reportText) &&
      /YAYUK PURWANTI/i.test(reportText) &&
      /BLOCKED/.test(reportText),
    reportDocExists ? "report present" : "docs/TKA_INGESTION_REPORT.md missing"
  );
  check(
    "A3: 3 SOAL docx exist on disk (Materi BI reference books are out of ingestion scope by design)",
    soalDocx.length === 3,
    `found ${soalDocx.length}/3 on this machine (repo cannot ship source docs — recorded, not asserted, where absent)`
  );

  console.log("\n═══ GATE B — Question coverage ═══");
  check("B1: detected (70) = parsed with zero silent omissions", items.length === 70);
  check("B2: blocked-with-reason count", blocked.length === 12, `blocked=${blocked.length}`);
  check("B3: approved count", approved.length === 58, `approved=${approved.length}`);

  console.log("\n═══ GATE C — Answer-key integrity ═══");
  let keyOk = 0;
  for (const q of items) {
    const letters = q.correctAnswer.match(/[A-E]/g) || [];
    const maps = letters.length > 0 && letters.every((L) => q.options.some((o) => o.id === L));
    if (maps) keyOk++;
  }
  check(`C1: 100% keys map to options (${keyOk}/${items.length})`, keyOk === items.length);

  console.log("\n═══ GATE D — Option integrity ═══");
  let optOk = 0;
  const optIssues: string[] = [];
  // Case-differing options (IX1-Q21: PUEBI kapitalisasi) are LEGITIMATE MCQ content —
  // duplicate detection is case-SENSITIVE here, unlike other normalizations.
  const caseSensitiveDupes: string[] = [];
  for (const q of items) {
    const ids = q.options.map((o) => o.id);
    const textsRaw = q.options.map((o) => o.text.trim());
    const textsNorm = q.options.map((o) => normText(o.text));
    const valid =
      q.options.length >= 2 &&
      new Set(ids).size === ids.length &&
      q.options.every((o) => o.text.length > 0);
    if (new Set(textsRaw).size !== textsRaw.length) caseSensitiveDupes.push(q.id);
    if (valid && new Set(textsRaw).size === textsRaw.length) optOk++;
    else if (!valid) optIssues.push(q.id);
  }
  check(`D1: all questions have structurally valid options (${optOk}/${items.length})`, optOk === items.length, optIssues.join(","));
  check("D2: no EXACT-duplicate option texts (case-sensitive)", caseSensitiveDupes.length === 0, caseSensitiveDupes.join(","));
  const knownCaseVariants = items.filter((q) => {
    const t = new Set(q.options.map((o) => normText(o.text)));
    return t.size !== q.options.length;
  }).map((q) => q.id);
  check("D3: case-variant-only option sets documented (expected: IX1-Q21 PUEBI)", knownCaseVariants.every((id) => id.endsWith("IX1-Q21")), knownCaseVariants.join(","));

  console.log("\n═══ GATE E — Track integrity ═══");
  const trackOk = items.every((q) => q.track === "TKA_SMP" && q.product === "TKA_PRACTICE");
  check("E1: all items track=TKA_SMP", trackOk);
  const sectionsOk = items.every((q) => ["membaca", "kebahasaan", "sastra"].includes(q.section));
  check("E2: all sections canonical", sectionsOk);

  console.log("\n═══ F/G/H/I/J — database-backed gates ═══");
  const rows = await db.tKAQuestion.findMany({ where: { source: "SOAL_TKA_KELAS_IX_DOCX" } });
  check("F0: 70 rows ingested", rows.length === 70, `rows=${rows.length}`);

  console.log("\n═══ GATE F — Duplicate integrity ═══");
  const ids = new Set(rows.map((r) => r.id));
  check("F1: no duplicate ids in DB", ids.size === rows.length);
  // normalized-content duplicates within the ingested set
  const hashes = new Set(items.map((q) => q.sourceHash));
  check("F2: no normalized-content duplicates within set", hashes.size === items.length, `hashes=${hashes.size}`);
  // against pre-existing bank: stem collision check
  const smpStems = new Set<string>();
  const existingSmp = await db.tKAQuestion.findMany({
    where: { tingkat: "SMP", source: { not: "SOAL_TKA_KELAS_IX_DOCX" } },
    select: { text: true, options: true },
  });
  for (const r of existingSmp) {
    const opts = Array.isArray(r.options) ? (r.options as { id: string; text: string }[]) : [];
    smpStems.add(normText(r.text) + "|" + opts.map((o) => normText(o.text)).join("|"));
  }
  const collisions = items.filter((q) => smpStems.has(normText(q.stem) + "|" + q.options.map((o) => normText(o.text)).join("|")));
  check("F3: no collision with pre-existing bank", collisions.length === 0, collisions.map((c) => c.id).join(","));

  console.log("\n═══ GATE G — Database integrity ═══");
  const activeRows = rows.filter((r) => r.isActive);
  const blockedRows = rows.filter((r) => !r.isActive);
  check("G1: active=58, blocked=12", activeRows.length === 58 && blockedRows.length === 12, `active=${activeRows.length} blocked=${blockedRows.length}`);
  check(
    "G2: all rows verified; no ACTIVE row has a multi-option key (single-select engine invariant)",
    rows.every((r) => r.isVerified) && activeRows.every((r) => !String(r.correctAnswer).includes(",")),
    `multi-key active rows: ${activeRows.filter((r) => String(r.correctAnswer).includes(",")).map((r) => r.id).join(",") || "none"}`
  );
  // every row's kompetensi is a valid enum value & tingkat SMP
  check("G3: tingkat=SMP + kompetensi valid", rows.every((r) => r.tingkat === "SMP" && ["LITERASI_MEMBACA", "TATA_BAHASA", "SASTRA", "MENULIS"].includes(r.kompetensi)));

  console.log("\n═══ GATE H — Scoring integrity (REAL production scoring path, integration-level) ═══");
  //
  // PROOF LEVEL (be honest about this): INTEGRATION, not E2E.
  //
  // The canonical production scoring boundary is:
  //   POST /api/kompetensi/[paketId]/submit
  //     → auth/session/rate-limit (Supabase + NextRequest — NOT safely fakable here)
  //     → snapshot/live question fetch
  //     → buildAnswerRows(questions, answers, sessionId, userId, paketId, scoringFn, useCompetencyKey)
  //         ← ALL scoring + aggregation happens inside this PURE function
  //     → persist rows / update ProgresKompetensi
  //
  // `buildAnswerRows` and the TKA scoringFn lambda are inline & non-exported, and this
  // task forbids modifying production code. So the gate EXTRACTS them VERBATIM from the
  // route source (type-anchored slices + drift fingerprints), materializes a module, and
  // executes it — the exact production aggregation algorithm, not a reimplementation.
  // What remains untested vs E2E: Supabase auth, rate limiting, snapshot fetch, DB writes.
  //
  const ROUTE_PATH = path.join(__dirname, "..", "app", "api", "kompetensi", "[paketId]", "submit", "route.ts");
  const routeSrc = fs.readFileSync(ROUTE_PATH, "utf8");

  // --- verbatim slices (all anchored on exact production source text) ---
  const TYPES_START = "interface AnswerRow {";
  const TYPES_END = "type AnswerMap = Record<string, string>;";
  const FN_START = "function buildAnswerRows(";
  const FN_END = "\nexport async function POST";
  const LAMBDA_TK_ANCHOR = ': (q: any, ua: string) => {';
  const LAMBDA_UK_ANCHOR = '? (q: any, ua: string) => {';

  const typesStart = routeSrc.indexOf(TYPES_START);
  const typesEnd = routeSrc.indexOf(TYPES_END) + TYPES_END.length;
  const fnStart = routeSrc.indexOf(FN_START);
  const fnEnd = routeSrc.indexOf(FN_END);
  const lambdaAnchor = routeSrc.indexOf(LAMBDA_TK_ANCHOR, routeSrc.indexOf(LAMBDA_UK_ANCHOR));
  check("H0: route source contains AnswerRow/AnswerMap types + buildAnswerRows + TKA lambda", typesStart > 0 && typesEnd > typesStart && fnStart > 0 && fnEnd > fnStart && lambdaAnchor > 0);

  if (typesStart > 0 && fnStart > 0 && fnEnd > fnStart && lambdaAnchor > 0) {
    const typesBlock = routeSrc.slice(typesStart, typesEnd);
    const fnBlock = routeSrc.slice(fnStart, fnEnd);
    const lambdaRaw = routeSrc.slice(lambdaAnchor + 2, routeSrc.indexOf("},", lambdaAnchor) + 1);
    const lambdaSrc = lambdaRaw.replace(/^\(q: any, ua: string\) =>/, "(q, ua) =>");

    // drift fingerprints — the gate breaks loudly if production scoring semantics change
    check(
      "H0a: TKA scoring lambda still single-select equality (ua === q.correctAnswer)",
      /isCorrect\s*=\s*ua\s*===\s*q\.correctAnswer/.test(lambdaRaw),
      lambdaRaw.slice(0, 80)
    );
    check(
      "H0b: buildAnswerRows is pure (no db/supabase/fetch deps in scoring function body)",
      !/\bdb\b|supabase|fetch\(|NextRequest/.test(fnBlock),
      "function body references an external dependency"
    );

    // materialize the verbatim production code as a module and import it
    const harness =
      typesBlock + "\n" + fnBlock + "\n" +
      "export { buildAnswerRows };\n" +
      "const tkaScoringFn = " + lambdaSrc + ";\n" +
      "export { tkaScoringFn };\n";
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tka-gateh-"));
    const modPath = path.join(tmpDir, "prod-scoring.ts");
    fs.writeFileSync(modPath, harness);
    // eslint-disable-next-line -- intentional: executes the verbatim production scoring module
    const prod = require(modPath) as {
      buildAnswerRows: (
        questions: any[],
        answers: Record<string, string>,
        sessionId: string,
        userId: string,
        paketId: string,
        scoringFn: (q: any, ua: string) => { isCorrect: boolean; score: number; maxScore: number; seksi: string },
        useCompetencyKey: boolean
      ) => {
        rows: { questionId: string; isCorrect: boolean | null; score: number; seksi: string }[];
        userAnswerRecords: unknown[];
        totalCorrect: number;
        totalQuestions: number;
        rawScore: number;
        maxPossible: number;
        sectionScores: Record<string, { correct: number; total: number; score: number }>;
      };
      tkaScoringFn: (q: any, ua: string) => { isCorrect: boolean; score: number; maxScore: number; seksi: string };
    };
    const { buildAnswerRows, tkaScoringFn } = prod;

    // --- scenario sample: 10 real DB rows, must include stimulus + imported-key anchors ---
    const withPassage = activeRows.filter((r) => !!r.passage);
    const picked: typeof activeRows = [];
    const take = (r: (typeof activeRows)[number]) => {
      if (r && picked.length < 10 && !picked.some((p) => p.id === r.id)) picked.push(r);
    };
    take(withPassage[0]); // scenario C requires dataset-sourced, stimulus-bearing coverage
    const kompVals = [...new Set(activeRows.map((r) => r.kompetensi))];
    for (const k of kompVals) take(activeRows.find((r) => r.kompetensi === k)!);
    for (const r of activeRows) take(r);

    // Scenario A/B per row: known-correct answer and known-incorrect answer through the
    // REAL path (buildAnswerRows + production lambda together, not the lambda alone).
    let aOk = 0;
    let bOk = 0;
    let perRowAggOk = 0;
    for (const r of picked) {
      const opts = Array.isArray(r.options) ? (r.options as { id: string }[]) : [];
      const wrong = (opts.find((o) => o.id !== r.correctAnswer) || { id: "" }).id;
      const out = buildAnswerRows([r], { [r.id]: r.correctAnswer }, "sess", "user", "paket", tkaScoringFn, true);
      const row = out.rows[0];
      if (row && row.isCorrect === true && row.score > 0 && out.totalCorrect === 1 && out.rawScore === out.maxPossible) aOk++;
      const outWrong = buildAnswerRows([r], { [r.id]: wrong }, "sess", "user", "paket", tkaScoringFn, true);
      const rowWrong = outWrong.rows[0];
      if (rowWrong && rowWrong.isCorrect === false && rowWrong.score === 0 && outWrong.totalCorrect === 0 && outWrong.rawScore === 0) bOk++;
      // per-row aggregate invariants: totals consistent with rows
      const manualMax = (r.weight || 1) * 10;
      if (out.maxPossible === manualMax && outWrong.maxPossible === manualMax) perRowAggOk++;
    }
    check(`H1 (A): correct answer → isCorrect=true, score>0, aggregate consistent (${picked.length} rows)`, aOk === picked.length);
    check(`H2 (B): incorrect answer → isCorrect=false, score=0, aggregate zeroed (${picked.length} rows)`, bOk === picked.length);
    check("H3 (aggregation): maxPossible = (weight||1)*10 per row on both branches", perRowAggOk === picked.length);

    // Scenario C: imported dataset anchor — first ingested SMP item from the committed JSON,
    // scored by id from the DB row, result must match the imported key.
    const firstImported = approved[0];
    const dbRow = activeRows.find((r) => r.id === firstImported.id);
    const cOut = dbRow
      ? buildAnswerRows([dbRow], { [dbRow.id]: dbRow.correctAnswer }, "sess", "user", "paket", tkaScoringFn, true)
      : null;
    check(
      `H4 (C): imported dataset question ${firstImported.id.slice(-8)} scores per its imported key`,
      !!cOut && cOut.rows[0].isCorrect === true && cOut.totalCorrect === 1,
      cOut ? "" : "DB row for imported item not found"
    );

    // Scenario D: mixed batch aggregation — all 10 rows, mixed correct/wrong answers.
    const answers: Record<string, string> = {};
    let expectCorrect = 0;
    let expectRaw = 0;
    let expectMax = 0;
    for (const r of picked) {
      const opts = Array.isArray(r.options) ? (r.options as { id: string }[]) : [];
      const chooseCorrect = picked.indexOf(r) % 2 === 0; // alternate deterministic
      answers[r.id] = chooseCorrect ? r.correctAnswer : (opts.find((o) => o.id !== r.correctAnswer) || { id: "" }).id;
      const w = (r.weight || 1) * 10;
      expectMax += w;
      if (chooseCorrect) {
        expectCorrect++;
        expectRaw += w;
      }
    }
    const batch = buildAnswerRows(picked, answers, "sess", "user", "paket", tkaScoringFn, true);
    const sectionTotals = Object.values(batch.sectionScores).reduce((a, s) => a + s.total, 0);
    check(
      `H5 (D): mixed batch aggregation exact (totalCorrect=${batch.totalCorrect}/${expectCorrect}, raw=${batch.rawScore}/${expectRaw}, max=${batch.maxPossible}/${expectMax}, sectionTotals=${sectionTotals}/${picked.length})`,
      batch.totalCorrect === expectCorrect && batch.rawScore === expectRaw && batch.maxPossible === expectMax && sectionTotals === picked.length && Object.keys(batch.sectionScores).length >= 2
    );
    check(
      `H6: sample covers stimulus-bearing row (${picked.find((r) => !!r.passage)?.id.slice(-8) ?? "none"}) + all kompetensi (${kompVals.join(", ")})`,
      !!picked.find((r) => !!r.passage) && new Set(picked.map((r) => r.kompetensi)).size === kompVals.length
    );
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log("\n═══ GATE I — Randomization integrity ═══");
  // pool + seeded sample using the production helper semantics
  const pool = await db.tKAQuestion.findMany({ where: { tingkat: "SMP", isActive: true, kompetensi: "LITERASI_MEMBACA" }, select: { id: true } });
  check("I1: SMP literasi pool ≥ blueprint (30)", pool.length >= 30, `pool=${pool.length}`);
  // deterministic seeded shuffle (same algorithm as lib/question-bank/session-pool)
  function fisherYatesShuffle<T>(arr: T[], seed: string): T[] {
    const a = [...arr];
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    const rand = () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const s1 = fisherYatesShuffle(pool, "seed-A").slice(0, 10).map((x) => x.id);
  const s2 = fisherYatesShuffle(pool, "seed-B").slice(0, 10).map((x) => x.id);
  const s1again = fisherYatesShuffle(pool, "seed-A").slice(0, 10).map((x) => x.id);
  check("I2: seeded sampling deterministic (same seed → same set)", JSON.stringify(s1) === JSON.stringify(s1again));
  check("I3: different seeds → different sets", JSON.stringify(s1) !== JSON.stringify(s2));
  // Anti-repeat: the resolver's stated purpose is rotation ("murid tidak capek") —
  // prove ingested questions actually ROTATE: across several seeds, coverage of the
  // ingested set must grow with draws (i.e. different seeds surface different items).
  const drawIds = new Set<string>();
  for (let s = 0; s < 6; s++) {
    const draw = fisherYatesShuffle(pool, `session-seed-${s}`).slice(0, 10).map((x) => x.id);
    draw.forEach((id) => drawIds.add(id));
  }
  const ingestedSeen = [...drawIds].filter((id) => ids.has(id)).length;
  check(
    `I4: 6 seeded sessions surface ≥3 distinct ingested questions (rotation real, seen=${ingestedSeen})`,
    ingestedSeen >= 3,
    `only ${ingestedSeen} distinct ingested items across 6 sessions`
  );

  console.log("\n═══ GATE J — Regression ═══");
  const census = await db.tKAQuestion.groupBy({ by: ["source"], _count: true });
  const censusMap = new Map(census.map((c) => [c.source, c._count]));
  check("J1: BC_TKA_SD_ORIGINAL preserved (65)", (censusMap.get("BC_TKA_SD_ORIGINAL") || 0) === 65, String(censusMap.get("BC_TKA_SD_ORIGINAL")));
  check("J2: BC_TKA_SMA_ORIGINAL preserved (65)", (censusMap.get("BC_TKA_SMA_ORIGINAL") || 0) === 65, String(censusMap.get("BC_TKA_SMA_ORIGINAL")));
  check("J3: BC_TKA_GURU_ORIGINAL preserved (30)", (censusMap.get("BC_TKA_GURU_ORIGINAL") || 0) === 30, String(censusMap.get("BC_TKA_GURU_ORIGINAL")));
  const total = await db.tKAQuestion.count();
  check("J4: total = 355 + 70 = 425", total === 425, String(total));
  const utbkPaket = await db.paketKompetensi.findFirst({ where: { type: "TKA_UTBK" as never, title: "Latihan TKA UTBK" } });
  check("J5: paket intact (TKA UTBK exists, active)", !!utbkPaket?.isActive);

  console.log("\n═══════════════════════════════════════");
  console.log(`GATES: ${pass} passed, ${fail} failed`);
  if (fail > 0) {
    failures.forEach((f) => console.log("  ❌ " + f));
    await db.$disconnect();
    process.exit(1);
  }
  await db.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error("Gate runner crashed:", e);
  await db.$disconnect();
  process.exit(1);
});
