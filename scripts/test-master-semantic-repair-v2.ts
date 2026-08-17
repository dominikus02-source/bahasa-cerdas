import fs from "fs";
import path from "path";
import crypto from "crypto";
import { MasterQuestion } from "../lib/master-recovery";
import { runSemanticRepairV2, sha256Source } from "../lib/master-repair/v2/engine";
import {
  synonymGate,
  antonymGate,
  majasGate,
  ejaanGate,
  kalimatEfektifGate,
  spokGate,
  distractorEngine,
  singleCorrectHardGate,
  explanationGate,
  aiSoundingGate,
  duplicateGateV2,
} from "../lib/master-repair/v2/gates";
import { categorizeQuestion } from "../lib/master-repair/v2/classify";
import { typeRepairSafe, explanationReword } from "../lib/master-repair/v2/safe";
import { RepairV2Record, PilotDecision, PILOT_DECISIONS } from "../lib/master-repair/v2/types";

const ARTIFACT = "data/question-bank/audit/master-semantic-repair-v2-pilot-2026-08-17.json";
const CANDIDATES = "data/question-bank/audit/master-repair-candidates-2026-08-17.json";

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(name: string, fn: () => boolean, note?: string): void {
  try {
    if (fn()) {
      pass++;
    } else {
      fail++;
      failures.push(`${name}${note ? ` — ${note}` : ""}`);
      console.error(`FAIL  ${name}${note ? ` (${note})` : ""}`);
    }
  } catch (e) {
    fail++;
    failures.push(`${name} — ${e instanceof Error ? e.message : String(e)}`);
    console.error(`ERROR ${name}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function canary(mustReject: boolean, actual: boolean): boolean {
  // Kanari: dengan input invalid, gate HARUS menolak (mustReject true → actual HARUS true)
  return mustReject === actual;
}

function baseQ(over: Partial<MasterQuestion> = {}): MasterQuestion {
  return {
    kodeSoal: "BC-TEST-0001",
    judul: "Test",
    tema: "Sinonim",
    kelas: "8",
    semester: 1,
    kompetensi: "3.7",
    indikator: "Memahami konsep Sinonim",
    difficulty: "MUDAH",
    levelBerpikir: 1,
    type: "PILIHAN_GANDA",
    text: "Sinonim dari kata 'cerdas' adalah...",
    options: ["Pintar", "Bodoh", "Lemah", "Lamban"],
    correctAnswer: "0",
    explanation: "'Pintar' adalah sinonim dari 'cerdas'. Pilihan lain tidak bermakna sama dengan 'cerdas'.",
    kataKunci: ["sinonim"],
    estimasiWaktu: 30,
    isHOTS: false,
    file: "sinonim.json",
    ...over,
  };
}

const ctx = { allBank: [] as MasterQuestion[], aiEnabled: false, maxAiAttempts: 0, aiBudgetUsed: 0 };
const ctxWithBank = (bank: MasterQuestion[]) => ({ ...ctx, allBank: bank });

const neutralQ = (over: Partial<MasterQuestion> = {}): MasterQuestion =>
  baseQ({ tema: "Struktur Teks", indikator: "Memahami konsep", kataKunci: ["konsep"], text: "Manakah urutan struktur yang benar?", ...over });

async function main(): Promise<void> {
// ─────────────────────────────────────────────────────────────
// A. CANARIES — input invalid HARUS ditolak gate/engine
// ─────────────────────────────────────────────────────────────
{
  // 1. multiple-correct: kunci = kata target sendiri + sinonim terverifikasi di opsi lain
  const multi = baseQ({ options: ["Pintar", "Cerdas", "Bodoh", "Lemah"], correctAnswer: "1" });
  const sc = singleCorrectHardGate(multi);
  check("canary-1 multiple-correct → REJECT (correct_count>1)", () => canary(true, sc.passed === false), sc.detail);

  // 2. fact tanpa bukti atribusi → VERIFY OR BLOCK: HUMAN_REVIEW (bukan GOLD) + faktanya disebut
  const halo = baseQ({ text: "Siapa penulis puisi 'Aku Ingin' karya Chairil Anwar?" });
  const r = await runSemanticRepairV2(halo, ctx);
  check("canary-2 fact attribution → HUMAN_REVIEW (VERIFY OR BLOCK)", () => canary(true, r.decision === "HUMAN_REVIEW"), r.reason.join("; "));
  // 2b. hallucinated attribution: explanation memuat fakta bernama yang tidak ada di sumber
  const hExp = baseQ({ text: "Manakah pernyataan yang benar tentang cerpen?", explanation: "'Aku Ingin' ditulis Chairil Anwar, penyair angkatan 45." });
  const egHalo = explanationGate(hExp, hExp);
  const egHalo2 = explanationGate(hExp, baseQ({ text: "Manakah pernyataan yang benar tentang cerpen?", explanation: "" }));
  check("canary-2b hallucination gate: fakta tanpa sumber → fail", () => canary(true, egHalo2.passed === false), egHalo2.detail);
  void egHalo;

  // 3. duplicate: dua soal identik di bank
  const bank = [baseQ({ kodeSoal: "BC-OTHER-1" })];
  const dup = baseQ({ kodeSoal: "BC-OTHER-2" });
  const dg = duplicateGateV2(dup, ctxWithBank(bank));
  check("canary-3 duplicate exact → BLOCK", () => canary(true, dg.passed === false), dg.detail);

  // 4. ambiguous synonym: 'marah' vs 'geram' tidak ada di tabel terverifikasi → AMBIGUOUS
  const sv = synonymGate("marah", "geram");
  check("canary-4 ambiguous synonym → AMBIGUOUS", () => canary(true, sv === "AMBIGUOUS"), sv);

  // 5. bad distractor: opsi duplikat norm
  const badD = baseQ({ options: ["Pintar", "Pintar", "Bodoh", "Lemah"] });
  const de = distractorEngine(badD);
  check("canary-5 bad distractor (duplicate option) → fail", () => canary(true, de.passed === false), de.reason);

  // 6. explanation mismatch: tidak menyebut jawaban benar
  const badE = baseQ({ explanation: "Kalimat ini terlalu pendek dan tidak relevan." });
  const eg = explanationGate(badE);
  check("canary-6 explanation mismatch → fail", () => canary(true, eg.passed === false), eg.detail);
}

// ─────────────────────────────────────────────────────────────
// B. ENGINE UNIT
// ─────────────────────────────────────────────────────────────
{
  check("unit categorize SAFE TYPE", () => categorizeQuestion(neutralQ({ type: "BENAR_SALAH", options: ["A", "B", "C", "D"], correctAnswer: "2" })).subType === "TYPE_REPAIR");
  check("unit categorize CONTEXT CONCEPT", () => categorizeQuestion(neutralQ({ text: "Berikut ini yang termasuk contoh paragraf eksposisi adalah..." })).category === "CONTEXT_REPAIR");
  check("unit categorize FACT", () => categorizeQuestion(neutralQ({ text: "Siapa pengarang puisi \"Aku Ingin\" karya Chairil Anwar?" })).category === "FACT_DEPENDENT_REPAIR");
  check("unit categorize SEMANTIC EJAAN", () => categorizeQuestion(neutralQ({ tema: "Ejaan", kataKunci: ["ejaan"], indikator: "Menulis kata baku" })).subType === "EJAAN");

  const rG = await runSemanticRepairV2(baseQ({ kodeSoal: "BC-TEST-0002", text: "Sinonim dari kata 'berani' adalah...", options: ["Takut", "Pengecut", "Berani", "Gagah"], correctAnswer: "2" }), ctx);
  check("unit SINONIM self-answer → GOLD (kunci 3 'Gagah')", () => rG.decision === "GOLD" && rG.candidate?.correctAnswer === "3", rG.reason.join("; "));

  const eja = ejaanGate("apotik", "apotek");
  check("unit ejaan rule verified", () => eja.verdict === "SEMANTIC_MATCH" && !!eja.rule);
  const eja2 = ejaanGate("trewr", "xyzabc");
  check("unit ejaan unknown → AMBIGUOUS (bukan intuition)", () => eja2.verdict === "AMBIGUOUS");

  const majas = majasGate("'Angin berbisik di malam hari' mengandung majas...", "personifikasi");
  check("unit majas verified evidence", () => majas.verdict === "SEMANTIC_MATCH");

  const spokOk = spokGate(baseQ({ kodeSoal: "BC-SPOK-0001", text: "Unsur SPOK...", options: ["Subjek", "Predikat", "Objek", "Keterangan"], correctAnswer: "0" }));
  check("unit SPOK verified → MATCH", () => spokOk === "SEMANTIC_MATCH");
  const spokNo = spokGate(baseQ({ kodeSoal: "BC-UNVERIFIED-1", text: "Unsur SPOK...", options: ["Subjek", "Predikat", "Objek", "Keterangan"], correctAnswer: "0" }));
  check("unit SPOK unverified → AMBIGUOUS (HUMAN_REVIEW)", () => spokNo === "AMBIGUOUS");

  const kal = kalimatEfektifGate(baseQ({ tema: "Kalimat", text: "Kalimat yang menyatakan ajakan disebut kalimat...", options: ["Deklaratif", "Interogatif", "Imperatif", "Eksklamatif"], correctAnswer: "2" }));
  check("unit kalimat efektif verified", () => kal === "SEMANTIC_MATCH");

  const tr = typeRepairSafe(baseQ({ type: "BENAR_SALAH", options: ["A", "B", "C", "D"], correctAnswer: "2" }));
  check("unit typeRepairSafe → PILIHAN_GANDA", () => tr.type === "PILIHAN_GANDA");

  const rw = explanationReword(baseQ({ explanation: "X adalah jawaban yang tepat karena sesuai dengan konsep yang dimaksud." }));
  check("unit explanationReword menghapus template", () => !/sesuai dengan konsep yang dimaksud/.test(rw.explanation));

  const av = antonymGate("panas", "dingin");
  check("unit antonym verified", () => av === "SEMANTIC_MATCH");

  const srcHash = sha256Source(baseQ());
  check("unit sha256 stabil", () => srcHash === sha256Source(baseQ()) && srcHash.length === 64);

  const aiSound = aiSoundingGate(baseQ({ text: "Berikut ini yang termasuk contoh Sinonim adalah..." }));
  check("unit ai-sounding mendeteksi 'Berikut ini yang termasuk'", () => aiSound.passed === false);
}

// ─────────────────────────────────────────────────────────────
// C. PILOT ARTIFACT INTEGRITY
// ─────────────────────────────────────────────────────────────
{
  check("artifact ada", () => fs.existsSync(ARTIFACT));
  if (fs.existsSync(ARTIFACT)) {
    const d = JSON.parse(fs.readFileSync(ARTIFACT, "utf8"));
    const records: RepairV2Record[] = d.records;
    check("artifact 100 records", () => records.length === 100);
    check("artifact id unik", () => new Set(records.map((r) => r.id)).size === 100);
    check("artifact semua decision valid", () => records.every((r) => (PILOT_DECISIONS as string[]).includes(r.decision)));
    check("artifact source immutable (sha256 cocok)", () =>
      records.every((r) => r.sourceSha256 === crypto.createHash("sha256").update(JSON.stringify(r.original)).digest("hex") && r.sourceImmutable === true));
    check("artifact distribusi = 100", () => d.summary.distribution.reduce((a: number, x: { count: number }) => a + x.count, 0) === 100);
    check("artifact GOLD punya candidate + gates lulus + HIGH", () =>
      records.filter((r) => r.decision === "GOLD").every((r) => r.candidate && r.gates.every((g) => g.passed) && r.confidence === "HIGH"));
    check("artifact 0 halusinasi GOLD", () => d.summary.metrics.hallucinatedFactGold === 0);
    check("artifact 0 multi-correct GOLD", () => d.summary.metrics.multipleCorrectGold === 0);
    check("artifact 0 duplikat GOLD", () => d.summary.metrics.duplicateGold === 0);
    check("artifact 0 mutasi sumber", () => d.summary.metrics.sourceMutated === 0);
  }
}

// ── package scripts ──
{
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  check("package test:master-semantic-repair-v2", () => !!pkg.scripts["test:master-semantic-repair-v2"]);
  check("package pilot:master-semantic-repair-v2", () => !!pkg.scripts["pilot:master-semantic-repair-v2"]);
}

// ── protected zones (git status) ──
{
  const status = (() => {
    const { execSync } = require("child_process");
    return String(execSync("git status --porcelain", { encoding: "utf8" }));
  })();
  const ALLOWED_RE = /^(M|\?\?)\s+(lib\/master-(repair|authoring|recovery)\/|scripts\/(master-|test-master-|test-question-bank-quality-audit|calibrate-master-)|data\/question-bank\/audit\/|docs\/PHASE_7_STEP_|package\.json|AGENTS\.md)/;
  const violations = status
    .split("\n")
    .filter((l: string) => l.trim())
    .filter((l: string) => !ALLOWED_RE.test(l.trim()));
  check("protected zones 0 diff", () => violations.length === 0, violations.join(" | ").slice(0, 200));
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error("FAILURES:\n" + failures.join("\n"));
  process.exit(1);
}
process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});