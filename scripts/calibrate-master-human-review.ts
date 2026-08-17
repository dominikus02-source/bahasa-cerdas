/* STEP 7.4 — Human Review Calibration (READ ONLY atas DB; hanya menulis artifact audit)
 * Membaca pilot + review artifacts, menerapkan GATE DELTA kalibrasi (pasB baru
 * untuk-opsi-forbidden + tanpa-fakta-nama; passE penjelasan-pedagogis diperluas
 * utk KONSEP), menghitung skor kualitas 10 dimensi (0-5, maks 50), dan
 * mengklasifikasikan 44 kandidat HUMAN_REVIEW + menyimpan klasifikasi.
 * Tidak melakukan production authoring; tidak mengubah sumber. Dry-run by design.
 */
import * as fs from "fs";
import * as path from "path";
import { runGates, NAMED_FACT_RISK } from "../lib/master-authoring/gates";
import { AuthoringQuestion, AuthoringSkill } from "../lib/master-authoring/types";
import { MasterQuestion } from "../lib/master-recovery";

const AUDIT_DIR = "data/question-bank/audit";
const PILOT_PATH = path.join(AUDIT_DIR, "master-authoring-pilot-2026-08-17.json");
const REVIEW_PATH = path.join(AUDIT_DIR, "master-authoring-review-2026-08-17.json");
const OUT_PATH = path.join(AUDIT_DIR, "master-human-review-calibration-2026-08-17.json");

interface PilotRecord {
  questionId: string;
  source: MasterQuestion;
  candidate?: AuthoringQuestion;
  decision: string;
  gates: {
    passA: { passed: boolean; checks: { name: string; passed: boolean; detail?: string }[] };
    passB: { passed: boolean; checks: { name: string; passed: boolean; detail?: string }[] };
    passC: { passed: boolean; checks: { name: string; passed: boolean; detail?: string }[] };
    passD: { passed: boolean; checks: { name: string; passed: boolean; detail?: string }[] };
    passE: { passed: boolean; checks: { name: string; passed: boolean; detail?: string }[] };
  };
  confidence?: number;
  difficultyEvidence?: string;
  semanticEvidence?: string;
  detectedRisks?: string[];
}

interface ReviewRecord {
  questionId: string;
  decision: string;
  source: MasterQuestion;
  candidate?: AuthoringQuestion;
  reason: string[];
  detectedRisks?: string[];
  confidence?: number;
}

type Dim = keyof ScoreBreakdown;
interface ScoreBreakdown {
  bahasa: number; // bahasa baku + tak ada markup
  kunciObjektif: number; // satu kunci benar, bukan self-answer
  distraktor: number; // opsi seimbang, tanpa forbidden, tanpa fakta-nama
  bahasaPenjelasan: number; // penjelasan cukup, tidak generik/template
  selarasKunci: number; // penjelasan sejalan dengan kunci
  kesulitan: number; // evidence kesulitan cukup
  pedagogis: number; // stem menanyakan skill yang benar
  orisinalitas: number; // tidak duplikat vs bank/family/batch
  konteks: number; // tidak menyisipkan fakta tak terverifikasi; konteks utuh
  sumber: number; // sumber tidak dimutasi
}

interface CalibrationRecord {
  questionId: string;
  decision: string; // SELALU HUMAN_REVIEW_REQUIRED dalam fase ini
  band: "GOLD-POTENTIAL" | "MINOR-REPAIR" | "MAJOR-REPAIR" | "REJECT";
  score: number; // 0-50
  dimensions: { [K in Dim]: number };
  goldBlocked: boolean; // hard gate gagal -> tak pernah GOLD
  hardGateFails: string[];
  repairable: boolean;
  note: string;
}

interface CalibrationReport {
  schemaVersion: string;
  stamp: string;
  total: number;
  withCandidate: number;
  withoutCandidate: string[];
  bands: Record<string, number>;
  goldBlocked: number;
  repairable: number;
  nonRepairable: number;
  riskCounts: Record<string, number>;
  unsafeFacts: string[]; // kandidat dengan fakta-nama tak terverifikasi
  falsePositiveNotes: string[]; // catatan manual review
  verdict: "YELLOW" | "GREEN" | "RED";
}

const bandOf = (s: number): CalibrationRecord["band"] => {
  if (s >= 46) return "GOLD-POTENTIAL";
  if (s >= 40) return "MINOR-REPAIR";
  if (s >= 30) return "MAJOR-REPAIR";
  return "REJECT";
};

const dims: Dim[] = [
  "bahasa",
  "kunciObjektif",
  "distraktor",
  "bahasaPenjelasan",
  "selarasKunci",
  "kesulitan",
  "pedagogis",
  "orisinalitas",
  "konteks",
  "sumber",
];

function gateCheck(record: PilotRecord, pass: keyof PilotRecord["gates"], name: string) {
  const ch = record.gates?.[pass]?.checks?.find((c) => c.name === name);
  return ch?.passed ?? true;
}

function riskCount(review: ReviewRecord, needle: string): number {
  return (review.detectedRisks || []).filter((r) => r.includes(needle)).length;
}

function jaccardFamily(review: ReviewRecord): number | null {
  const r = riskCount(review, "jaccard-<0.95-vs-family");
  return r > 0 ? 1 : null;
}

function jaccardBank(review: ReviewRecord): number | null {
  return riskCount(review, "jaccard-<0.75-vs-bank") > 0 ? 1 : null;
}

function computeRecord(
  review: ReviewRecord,
  pilot: PilotRecord | undefined
): CalibrationRecord {
  const q = review.candidate;
  const hardGateFails: string[] = [];
  const score: ScoreBreakdown = {
    bahasa: 4,
    kunciObjektif: 4,
    distraktor: 4,
    bahasaPenjelasan: 4,
    selarasKunci: 4,
    kesulitan: 4,
    pedagogis: 4,
    orisinalitas: 4,
    konteks: 4,
    sumber: 4,
  };

  let note = "";
  if (!q) {
    hardGateFails.push("INVALID_CONTRACT");
    score.bahasa = 1;
    score.kunciObjektif = 1;
    score.distraktor = 1;
    score.bahasaPenjelasan = 1;
    score.selarasKunci = 1;
    score.kesulitan = 1;
    score.pedagogis = 1;
    score.orisinalitas = 1;
    score.konteks = 1;
    score.sumber = 1;
    note = "Kandidat tidak dihasilkan (INVALID_CONTRACT) — perlu tulis ulang oleh AI.";
    const total = dims.reduce((a, d) => a + score[d], 0);
    return {
      questionId: review.questionId,
      decision: "HUMAN_REVIEW_REQUIRED",
      band: bandOf(total),
      score: total,
      dimensions: score,
      goldBlocked: true,
      hardGateFails,
      repairable: true,
      note,
    };
  }

  // --- passB delta: gate kalibrasi baru ---
  if (q.options.some((o) => /(semua jawaban benar|semua benar|semua pernyataan di atas|tidak ada jawaban|tidak dapat dipastikan|cukup benar|tidak relevan)/i.test(o))) {
    hardGateFails.push("passB:tanpa-opsi-forbidden");
    score.distraktor = 0;
  }
  const namedFacts = q.options.filter((o) => NAMED_FACT_RISK.test(o));
  if (namedFacts.length > 0) {
    hardGateFails.push("passB:tanpa-fakta-nama-tak-terverifikasi");
    score.konteks = 0;
    note = `Opsi memuat atribusi karya bernama (${namedFacts[0]}…) — tidak dapat diverifikasi otomatis.`;
  }

  // --- passE delta: penjelasan-pedagogis diperluas utk KONSEP ---
  const expl = q.explanation || "";
  const hasReason = /karena|kata|berarti|merupakan|bukan|menunjukkan|sehingga|sedangkan|didefinisikan|definisi|menurut/i.test(expl) || (q.skill === "KONSEP" && /\badalah\b/i.test(expl));
  if (!hasReason) {
    hardGateFails.push("passE:penjelasan-pedagogis");
    score.bahasaPenjelasan = 1;
  }

  // --- gate hasil pilot (B/C/D/E) ---
  if (pilot?.gates) {
    if (!gateCheck(pilot, "passC", "semantik-valid")) {
      hardGateFails.push("passC:semantik-valid");
      score.kunciObjektif = 0;
    }
    if (gateCheck(pilot, "passC", "bukan-self-answer") === false) {
      hardGateFails.push("passC:bukan-self-answer");
      score.kunciObjektif = 1;
    }
    if (!gateCheck(pilot, "passC", "penjelasan-selaras-kunci")) {
      hardGateFails.push("passC:penjelasan-selaras-kunci");
      score.selarasKunci = 0;
    }
    if (!gateCheck(pilot, "passE", "kunci-tidak-terbenam-di-stem")) {
      hardGateFails.push("passE:kunci-tidak-terbenam-di-stem");
      score.selarasKunci = 1;
    }
    if (!gateCheck(pilot, "passE", "skill-benar-diuji")) {
      hardGateFails.push("passE:skill-benar-diuji");
      score.pedagogis = 1;
    }
    if (!gateCheck(pilot, "passB", "bahasa-baku")) {
      hardGateFails.push("passB:bahasa-baku");
      score.bahasa = 1;
    }
    if (!gateCheck(pilot, "passB", "panjang-opsi-seimbang")) {
      score.distraktor = Math.min(score.distraktor, 2);
    }
    if (!gateCheck(pilot, "passD", "tidak-exact-vs-bank")) {
      hardGateFails.push("passD:tidak-exact-vs-bank");
      score.orisinalitas = 0;
    }
    if (!gateCheck(pilot, "passD", "tidak-near-vs-bank")) {
      hardGateFails.push("passD:tidak-near-vs-bank");
      score.orisinalitas = 0;
    }
    if (!gateCheck(pilot, "passE", "difficulty-evidence-cukup")) {
      score.kesulitan = 1;
    }
    if (!gateCheck(pilot, "passE", "semantic-evidence-cukup")) {
      score.selarasKunci = Math.min(score.selarasKunci, 2);
    }
    if (!gateCheck(pilot, "passE", "penjelasan-tidak-tipis")) {
      score.bahasaPenjelasan = Math.min(score.bahasaPenjelasan, 2);
    }
  }

  // --- orisinalitas via detectedRisks ---
  if (jaccardFamily(review) !== null || jaccardBank(review) !== null) {
    score.orisinalitas = Math.min(score.orisinalitas, 0);
    hardGateFails.push("passD:duplikat-vs-sumber (family/bank)");
  }
  const batchCollision = riskCount(review, "opsi-set-unik-batch") > 0 || riskCount(review, "jaccard-<0.75-vs-batch") > 0;
  if (batchCollision) score.orisinalitas = Math.min(score.orisinalitas, 2);

  // --- jumlah fakta-berat utk catatan ---
  const total = dims.reduce((a, d) => a + score[d], 0);
  return {
    questionId: review.questionId,
    decision: "HUMAN_REVIEW_REQUIRED",
    band: bandOf(total),
    score: total,
    dimensions: score,
    goldBlocked: hardGateFails.length > 0,
    hardGateFails,
    repairable: !hardGateFails.includes("passC:semantik-valid") && !hardGateFails.includes("passC:penjelasan-selaras-kunci") && !hardGateFails.includes("passB:tanpa-fakta-nama-tak-terverifikasi"),
    note,
  };
}

async function main() {
  const pilotRaw = JSON.parse(fs.readFileSync(PILOT_PATH, "utf8"));
  const reviewRaw = JSON.parse(fs.readFileSync(REVIEW_PATH, "utf8"));
  const pilotRecords = (pilotRaw.records || pilotRaw) as PilotRecord[];
  const reviewRecords = (reviewRaw.records || reviewRaw) as ReviewRecord[];
  const pilotBy = new Map(pilotRecords.map((p) => [p.questionId, p]));

  const records = reviewRecords.map((r) => computeRecord(r, pilotBy.get(r.questionId)));
  const bands: Record<string, number> = {};
  let goldBlocked = 0;
  let repairable = 0;
  const unsafeFacts: string[] = [];
  const riskCounts: Record<string, number> = {};
  for (const r of reviewRecords) for (const rk of r.detectedRisks || []) riskCounts[rk] = (riskCounts[rk] ?? 0) + 1;
  for (const rec of records) {
    bands[rec.band] = (bands[rec.band] ?? 0) + 1;
    if (rec.goldBlocked) goldBlocked++;
    if (rec.repairable) repairable++;
    if (rec.dimensions.konteks === 0) unsafeFacts.push(rec.questionId);
  }

  const report: CalibrationReport = {
    schemaVersion: "1.0",
    stamp: new Date().toISOString(),
    total: records.length,
    withCandidate: records.length - reviewRecords.filter((r) => !r.candidate).length,
    withoutCandidate: reviewRecords.filter((r) => !r.candidate).map((r) => r.questionId),
    bands,
    goldBlocked,
    repairable,
    nonRepairable: records.length - repairable,
    riskCounts,
    unsafeFacts,
    falsePositiveNotes: [
      "BC-CERITA-INSPIRATIF-0025: explanation definisional ('mengandung pesan motivasi…') — FP lama penjelasan-pedagogis sudah diatasi via perluasan regex KONSEP ('adalah'/'merupakan'/'sehingga').",
      "Kandidat yang memperbaiki soal sumber (stem menyalin source word-for-word) di-flag duplikat family/bank (jaccard 1.00) — konservatif by design; keputusan: JANGAN turunkan threshold.",
    ],
    verdict: "YELLOW",
  };

  const out = { schemaVersion: "1.0", stamp: report.stamp, generator: "calibrate-master-human-review.ts", report, records };
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));

  console.log("== STEP 7.4 CALIBRATION ==");
  console.log(`total: ${report.total} (dengan kandidat: ${report.withCandidate}, tanpa: ${report.withoutCandidate.join(", ")})`);
  console.log("band:", JSON.stringify(report.bands));
  console.log(`goldBlocked: ${report.goldBlocked}, repairable: ${report.repairable}, nonRepairable: ${report.nonRepairable}`);
  console.log("unsafeFacts (opsi ber-judul/pengarang):", unsafeFacts.length ? unsafeFacts.join(", ") : "(0)");
  console.log("verdict:", report.verdict);
  console.log("artifact:", OUT_PATH);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});