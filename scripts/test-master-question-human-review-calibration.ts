/* STEP 7.4 — Human Review Calibration & Semantic Quality Gate (REGRESSION SUITE)
 * 22 check + 1 kanari. Membaca artifact kalibrasi 7.4 + pilot/review, menguji:
 * semantic relations (sinonim/antonim/konteks/SPOK/majas/ejaan/kalimat efektif),
 * hard gates (halusinasi fakta, duplikat, ambigu, AI-template), integritas
 * keputusan reviewer, kelengkapan laporan kalibrasi, exemplar GOLD per skill.
 * TIDAK menulis DB; kanari menegaskan kerangka check bekerja.
 */
import * as fs from "fs";
import * as path from "path";
import { runGates, allGatesPass, NAMED_FACT_RISK, gateFailureSummary } from "../lib/master-authoring/gates";
import { AuthoringQuestion, AuthoringSkill } from "../lib/master-authoring/types";
import { MasterQuestion, semanticValidate, languageError, hasTemplateExplanation } from "../lib/master-recovery";

const AUDIT_DIR = "data/question-bank/audit";
const CAL_PATH = path.join(AUDIT_DIR, "master-human-review-calibration-2026-08-17.json");

interface CalRecord {
  questionId: string;
  decision: string;
  band: string;
  score: number;
  dimensions: Record<string, number>;
  goldBlocked: boolean;
  hardGateFails: string[];
  repairable: boolean;
  note: string;
}
interface CalArtifact {
  report: {
    schemaVersion: string;
    stamp: string;
    total: number;
    withCandidate: number;
    withoutCandidate: string[];
    bands: Record<string, number>;
    goldBlocked: number;
    repairable: number;
    nonRepairable: number;
    unsafeFacts: string[];
    verdict: string;
  };
  records: CalRecord[];
}

const results: { name: string; ok: boolean; detail?: string }[] = [];
const check = (name: string, fn: () => { ok: boolean; detail?: string } | boolean) => {
  try {
    const r = fn();
    const ok = typeof r === "boolean" ? r : r.ok;
    results.push({ name, ok, detail: typeof r === "boolean" ? undefined : r.detail });
  } catch (e) {
    results.push({ name, ok: false, detail: `EXCEPTION: ${String(e).slice(0, 200)}` });
  }
};

function mq(c: AuthoringQuestion, skill: AuthoringSkill, kodeSoal = "exemplar"): MasterQuestion {
  const idx = c.options.findIndex((o) => o.trim().toLowerCase() === (c.correctAnswer || "").trim().toLowerCase());
  return {
    kodeSoal,
    tema: skill.toLowerCase(),
    text: c.stem,
    options: c.options,
    correctAnswer: String(idx < 0 ? 0 : idx),
    type: c.type,
    explanation: c.explanation || "",
  } as MasterQuestion;
}

const G = (o: Partial<AuthoringQuestion> & { stem: string; options: string[]; correctAnswer: string; explanation: string }, skill: AuthoringSkill, evidence = { difficultyEvidence: "Butuh pemahaman konsep dua langkah: kenali pola lalu tentukan jawaban yang tepat (SEDANG).", semanticEvidence: "Kaidah bahasa Indonesia yang pasti dan dapat diverifikasi (PUEBI / struktur kalimat / tabel semantik)." }, kodeSoal?: string) => {
  const q: AuthoringQuestion = { type: "PILIHAN_GANDA", difficulty: "SEDANG", skill: skill as AuthoringSkill, ...o } as AuthoringQuestion;
  return { q, skill, evidence, kodeSoal };
};

interface Exemplar { q: AuthoringQuestion; skill: AuthoringSkill; evidence: { difficultyEvidence: string; semanticEvidence: string }; kodeSoal?: string; }
const EXEMPLARS: Exemplar[] = [
  G({ stem: "Pilihlah sinonim dari kata 'cerdas' yang tepat.", options: ["pintar", "malas", "lemah", "bodoh"], correctAnswer: "pintar", explanation: "Karena 'pintar' memiliki makna yang sama dengan 'cerdas', yaitu pandai atau tajam pikiran, sehingga kunci yang tepat adalah 'pintar'." }, "SINONIM"),
  G({ stem: "Pilihlah antonim (lawan kata) dari kata 'panas' yang tepat.", options: ["dingin", "hangat", "api", "siang"], correctAnswer: "dingin", explanation: "Karena 'panas' berlawanan makna dengan 'dingin', sedangkan 'hangat' dan 'api' justru bermakna dekat dengan panas." }, "ANTONIM"),
  G({ stem: "Dalam kalimat 'Ia menduduki bangku parlemen', kata 'bangku' bermakna...", options: ["kursi", "jabatan", "meja", "kelas"], correctAnswer: "jabatan", explanation: "Karena dalam konteks kalimat tersebut 'bangku' merujuk pada kedudukan atau jabatan, sehingga maknanya adalah jabatan." }, "MAKNA_KATA"),
  G({ stem: "Pada kalimat 'Adik membaca buku di kamar', kata yang berfungsi sebagai subjek adalah...", options: ["Adik", "membaca", "buku", "di kamar"], correctAnswer: "Adik", explanation: "Karena subjek adalah pelaku yang melakukan tindakan, dan dalam kalimat tersebut pelakunya adalah 'Adik'." }, "SPOK", { difficultyEvidence: "Butuh pemahaman konsep dua langkah: kenali kalimat lalu tentukan fungsi katanya (SEDANG).", semanticEvidence: "Struktur kalimat 'Adik membaca buku di kamar' terverifikasi: Adik = subjek (tabel SPOK bank, BC-SPOK-0001)." }, "BC-SPOK-0001"),
  G({ stem: "'Angin berbisik di malam hari' mengandung majas...", options: ["metafora", "personifikasi", "simile", "hiperbola"], correctAnswer: "personifikasi", explanation: "Karena 'angin' (benda mati) diberi sifat manusia 'berbisik', sehingga majas yang tepat adalah personifikasi." }, "MAJAS"),
  G({ stem: "Manakah kata yang penulisannya sesuai dengan kaidah kebakuan bahasa Indonesia?", options: ["nasihat", "nasehat", "nasehaat", "nasihaht"], correctAnswer: "nasihat", explanation: "Karena menurut PUEBI bentuk baku adalah 'nasihat', sedangkan bentuk yang memakai huruf 'e' pada suku kedua merupakan penulisan tidak baku." }, "EJAAN"),
  G({ stem: "Kalimat yang menyatakan ajakan disebut kalimat...", options: ["deklaratif", "interogatif", "imperatif", "eksklamatif"], correctAnswer: "imperatif", explanation: "Karena kalimat ajakan ditujukan untuk mengajak atau memerintah seseorang melakukan sesuatu, sehingga disebut kalimat imperatif." }, "KALIMAT_EFEKTIF"),
  G({ stem: "Berikut ini yang termasuk contoh kalimat tanya adalah...", options: ["Apa kabar?", "Tolong diam!", "Kerjakan tugasmu.", "Sungguh indah!"], correctAnswer: "Apa kabar?", explanation: "Karena kalimat tanya ditandai oleh kata 'apa' dan tanda tanya, sehingga opsi pertama adalah jawaban yang benar." }, "KONSEP"),
];

const cal: CalArtifact = JSON.parse(fs.readFileSync(CAL_PATH, "utf8"));

// ---- 1: exactly-one-correct atas kandidat riil ----
{
  const review = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, "master-authoring-review-2026-08-17.json"), "utf8"));
  const records = (review.records || review) as { questionId: string; candidate?: AuthoringQuestion }[];
  const checked: string[] = [];
  const failed: string[] = [];
  for (const r of records) {
    if (!r.candidate) continue;
    const v = semanticValidate(mq(r.candidate, (r.candidate.skill as AuthoringSkill) ?? "KONSEP"));
    checked.push(r.questionId);
    if (!v.valid || v.multiCorrect) failed.push(r.questionId);
  }
  check("exactly-one-correct", () => ({ ok: failed.length === 0, detail: `${checked.length} kandidat dicek; multi-correct: ${failed.join(", ") || "(tidak ada)"}` }));
}

// ---- 2..8: semantic relations via exemplars ----
check("synonym-semantic-relation", () => {
  const q = EXEMPLARS[0];
  const v = semanticValidate(mq(q.q, q.skill));
  return { ok: v.valid, detail: v.reason ?? "ok" };
});
check("antonym-semantic-relation", () => {
  const q = EXEMPLARS[1];
  const v = semanticValidate(mq(q.q, q.skill));
  return { ok: v.valid, detail: v.reason ?? "ok" };
});
check("context-meaning", () => {
  const q = EXEMPLARS[2];
  const v = semanticValidate(mq(q.q, q.skill));
  return { ok: v.valid, detail: v.reason ?? "ok" };
});
check("spok-correctness", () => {
  const q = EXEMPLARS[3];
  const v = semanticValidate(mq(q.q, q.skill, q.kodeSoal));
  return { ok: v.valid, detail: v.reason ?? "ok" };
});
check("majas-classification", () => {
  const q = EXEMPLARS[4];
  const v = semanticValidate(mq(q.q, q.skill));
  return { ok: v.valid, detail: v.reason ?? "ok" };
});
check("ejaan-kaidah", () => {
  const q = EXEMPLARS[5];
  const v = semanticValidate(mq(q.q, q.skill));
  const err = languageError({ text: q.q.stem, explanation: q.q.explanation, options: [] } as unknown as MasterQuestion);
  return { ok: v.valid && err === null, detail: `${v.reason ?? "ok"}; languageError: ${err ?? "ok"}` };
});
check("kalimat-efektif", () => {
  const q = EXEMPLARS[6];
  const v = semanticValidate(mq(q.q, q.skill));
  return { ok: v.valid, detail: v.reason ?? "ok" };
});

// ---- 9: distractor plausibility (panjang opsi seimbang) ----
check("distractor-plausibility", () => {
  const skewed = G({ stem: "Pilihlah sinonim dari kata 'cerdas'.", options: ["pintar", "kekuatan intelektual yang sangat tinggi dan tajam", "malas", "bodoh"], correctAnswer: "pintar", explanation: "Karena 'pintar' memiliki makna yang sama dengan 'cerdas', sehingga kunci yang tepat adalah 'pintar'." }, "SINONIM");
  const g = runGates(skewed.q, skewed.skill, { bank: [], authored: [] }, skewed.evidence);
  const fail = gateFailureSummary(g).filter((s) => s.includes("passB:panjang-opsi-seimbang"));
  return { ok: fail.length > 0, detail: fail.join("; ") || "tidak terdeteksi" };
});

// ---- 10: explanation consistency ----
check("explanation-consistency", () => {
  const bad = G({ stem: "Pilihlah sinonim dari kata 'cerdas'.", options: ["pintar", "malas", "lemah", "bodoh"], correctAnswer: "pintar", explanation: "Karena jawabannya bukan pintar, melainkan malas karena maknanya berlawanan." }, "SINONIM");
  const g = runGates(bad.q, bad.skill, { bank: [], authored: [] }, bad.evidence);
  const fail = gateFailureSummary(g).filter((s) => s.includes("passC:penjelasan-selaras-kunci"));
  return { ok: fail.length > 0, detail: fail.join("; ") || "tidak terdeteksi" };
});

// ---- 11: hallucination rejection (fakta bernama) ----
check("hallucination-rejection", () => {
  const h = G({ stem: "Berikut ini yang termasuk contoh cerpen adalah...", options: ["\"Matahari Terbenam\" karya Sitor Situmorang", "novel", "puisi", "laporan"], correctAnswer: "\"Matahari Terbenam\" karya Sitor Situmorang", explanation: "Karena cerpen adalah prosa fiksi pendek, dan \"Matahari Terbenam\" karya Sitor Situmorang termasuk contohnya." }, "KONSEP");
  const g = runGates(h.q, h.skill, { bank: [], authored: [] }, h.evidence);
  const fail = gateFailureSummary(g).filter((s) => s.includes("passB:tanpa-fakta-nama"));
  const risk = h.q.options.some((o) => NAMED_FACT_RISK.test(o));
  return { ok: risk && fail.length > 0 && !allGatesPass(g), detail: fail.join("; ") || "tidak terdeteksi" };
});

// ---- 12: ambiguity rejection ----
check("ambiguity-rejection", () => {
  const a = G({ stem: "Pilihlah sinonim dari kata 'cerdas'.", options: ["pintar", "malas", "lemah", "bodoh"], correctAnswer: "pintar", explanation: "Jawabannya pintar." }, "SINONIM");
  const g = runGates(a.q, a.skill, { bank: [], authored: [] }, a.evidence);
  const fail = gateFailureSummary(g).filter((s) => s.includes("passE:penjelasan-pedagogis"));
  return { ok: fail.length > 0, detail: fail.join("; ") || "tidak terdeteksi" };
});

// ---- 13+14: duplicate / near-duplicate rejection ----
check("duplicate-rejection", () => {
  const d = G({ stem: "Pilihlah sinonim dari kata 'cerdas'.", options: ["pintar", "malas", "lemah", "bodoh"], correctAnswer: "pintar", explanation: "Karena 'pintar' memiliki makna yang sama dengan 'cerdas', sehingga kunci yang tepat adalah 'pintar'." }, "SINONIM");
  const bankQ = mq(d.q, d.skill);
  const g = runGates(d.q, d.skill, { bank: [bankQ], authored: [] }, d.evidence);
  const fail = gateFailureSummary(g).filter((s) => s.includes("passD:tidak-exact-vs-bank"));
  return { ok: fail.length > 0, detail: fail.join("; ") || "tidak terdeteksi" };
});
check("near-duplicate-rejection", () => {
  const d = G({ stem: "Berikut ini yang termasuk contoh Cerita Inspiratif adalah...", options: ["Kisah keberhasilan seorang atlet", "Cerita pendek fiksi", "Puisi", "Laporan"], correctAnswer: "Kisah keberhasilan seorang atlet", explanation: "Karena kisah keberhasilan atlet mengandung pesan motivasi, sehingga termasuk contoh cerita inspiratif." }, "KONSEP");
  const nearBank: MasterQuestion = {
    kodeSoal: "bank-1", tema: "konsep", text: "Berikut ini yang termasuk contoh Cerita Inspiratif adalah...",
    options: ["Kisah keberhasilan seorang atlet", "Cerita pendek fiksi", "Puisi", "Laporan"],
    correctAnswer: "0", type: "PILIHAN_GANDA", explanation: "Karena sesuai konsep.",
  } as MasterQuestion;
  const g = runGates(d.q, d.skill, { bank: [nearBank], authored: [] }, d.evidence);
  const fail = gateFailureSummary(g).filter((s) => s.includes("passD:tidak-near-vs-bank") || s.includes("passD:tidak-exact-vs-bank"));
  return { ok: fail.length > 0, detail: fail.join("; ") || "tidak terdeteksi" };
});

// ---- 15: AI-sounding (template explanation) ----
check("ai-sounding-rejection", () => {
  const t = G({ stem: "Pilihlah sinonim dari kata 'cerdas'.", options: ["pintar", "malas", "lemah", "bodoh"], correctAnswer: "pintar", explanation: "Karena jawaban yang tepat karena sesuai dengan konsep yang dimaksud." }, "SINONIM");
  const g = runGates(t.q, t.skill, { bank: [], authored: [] }, t.evidence);
  const templ = hasTemplateExplanation(mq(t.q, t.skill));
  const fail = gateFailureSummary(g).filter((s) => s.includes("passC:penjelasan-selaras-kunci"));
  return { ok: templ && fail.length > 0, detail: fail.join("; ") || "tidak terdeteksi" };
});

// ---- 16+17: difficulty validation + pedagogical value ----
check("difficulty-validation", () => {
  const d = G({ stem: "Pilihlah sinonim dari kata 'cerdas'.", options: ["pintar", "malas", "lemah", "bodoh"], correctAnswer: "pintar", explanation: "Karena 'pintar' memiliki makna yang sama dengan 'cerdas', sehingga kunci yang tepat adalah 'pintar'." }, "SINONIM", { difficultyEvidence: "mudah", semanticEvidence: "tabel semantik bank (cerdas=pintar)." });
  const g = runGates(d.q, d.skill, { bank: [], authored: [] }, d.evidence);
  const fail = gateFailureSummary(g).filter((s) => s.includes("passE:difficulty-evidence-cukup"));
  return { ok: fail.length > 0, detail: fail.join("; ") || "tidak terdeteksi" };
});
check("pedagogical-value", () => {
  const p = G({ stem: "Siapakah penemu listrik?", options: ["Thomas Edison", "Isaac Newton", "Albert Einstein", "Galileo"], correctAnswer: "Thomas Edison", explanation: "Karena Thomas Edison menciptakan bola lampu, sehingga ia yang tepat." }, "SINONIM");
  const g = runGates(p.q, p.skill, { bank: [], authored: [] }, p.evidence);
  const fail = gateFailureSummary(g).filter((s) => s.includes("passE:skill-benar-diuji"));
  return { ok: fail.length > 0, detail: fail.join("; ") || "tidak terdeteksi" };
});

// ---- 18: source preservation (pilot vs review, 44 record) ----
check("source-preservation", () => {
  const pilot = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, "master-authoring-pilot-2026-08-17.json"), "utf8"));
  const review = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, "master-authoring-review-2026-08-17.json"), "utf8"));
  const pr = (pilot.records || pilot) as { questionId: string; source: MasterQuestion }[];
  const rr = (review.records || review) as { questionId: string; source: MasterQuestion }[];
  const map = new Map(pr.map((p) => [p.questionId, p.source]));
  const changed = rr.filter((r) => JSON.stringify(map.get(r.questionId)) !== JSON.stringify(r.source)).map((r) => r.questionId);
  return { ok: changed.length === 0, detail: changed.length ? `sumber berubah: ${changed.join(", ")}` : "44/44 sumber identik antar artifact" };
});

// ---- 19: GOLD hard-gate (skor tidak boleh menang atas gate) ----
check("gold-hard-gate", () => {
  const blocked = cal.records.filter((r) => r.goldBlocked);
  const ok = cal.records.every((r) => r.decision === "HUMAN_REVIEW_REQUIRED") && blocked.length > 0;
  return { ok, detail: `${blocked.length}/${cal.records.length} record goldBlocked, semua decision HUMAN_REVIEW_REQUIRED` };
});

// ---- 20: reviewer decision integrity ----
check("reviewer-decision-integrity", () => {
  const bad = cal.records.filter(
    (r) => r.decision !== "HUMAN_REVIEW_REQUIRED" || !Number.isInteger(r.score) || r.score < 0 || r.score > 50 ||
      Object.values(r.dimensions).reduce((a, b) => a + b, 0) !== r.score ||
      (r.score >= 46 && r.band !== "GOLD-POTENTIAL" && r.band !== "MINOR-REPAIR") ||
      (r.score < 30 && r.band !== "REJECT")
  );
  const oneSix = cal.records.find((r) => r.questionId === "BC-CERPEN-0016");
  return { ok: bad.length === 0 && !!oneSix && !oneSix.repairable, detail: `${bad.length} record anomali; BC-CERPEN-0016 repairable=${oneSix?.repairable}` };
});

// ---- 21: calibration report integrity ----
check("calibration-report", () => {
  const rep = cal.report;
  const bandSum = Object.values(rep.bands).reduce((a, b) => a + b, 0);
  const ok = rep.total === 44 && rep.withCandidate === 42 &&
    JSON.stringify(rep.withoutCandidate) === JSON.stringify(["BC-CERPEN-0021", "BC-CERPEN-0029"]) &&
    bandSum === 44 && rep.goldBlocked > 0 && rep.unsafeFacts.includes("BC-CERPEN-0016");
  return { ok, detail: `total=${rep.total} with=${rep.withCandidate} tanpa=${rep.withoutCandidate.join(",")} bands=${bandSum} goldBlocked=${rep.goldBlocked} unsafeFacts=${rep.unsafeFacts.length}` };
});

// ---- 22: exemplar integrity (8 skill → gates GOLD + no hard-gate) ----
// SPOK dikecualikan dari auto-GOLD: semanticValidate SPOK membutuhkan kodeSoal
// terverifikasi (BC-SPOK-*) yang kandidat AI tidak pernah punya — kandidat SPOK
// WAJIB HUMAN_REVIEW. Exemplar lain harus lolos semua gate.
check("exemplar-integrity", () => {
  const fails: string[] = [];
  const passSet = EXEMPLARS.filter((e) => e.skill !== "SPOK");
  for (const e of passSet) {
    const g = runGates(e.q, e.skill, { bank: [], authored: [] }, e.evidence);
    const v = semanticValidate(mq(e.q, e.skill, e.kodeSoal));
    const named = e.q.options.some((o) => NAMED_FACT_RISK.test(o));
    const forbidden = e.q.options.some((o) => /(semua jawaban benar|semua benar|semua pernyataan di atas|tidak ada jawaban|tidak dapat dipastikan|cukup benar|tidak relevan)/i.test(o));
    if (!allGatesPass(g) || !v.valid || named || forbidden) fails.push(`${e.skill}: ${gateFailureSummary(g).join("; ") || (v.reason ?? "gate fail")}`);
  }
  const spok = EXEMPLARS[3];
  const spokG = runGates(spok.q, spok.skill, { bank: [], authored: [] }, spok.evidence);
  const spokGateFail = !spokG.passC.passed;
  if (!spokGateFail) fails.push("SPOK: seharusnya passC fail (verifikasi tabel wajib)");
  return { ok: fails.length === 0, detail: fails.join(" | ") || `7/7 exemplar lolos; SPOK oleh desain → HUMAN_REVIEW (${gateFailureSummary(spokG).join("; ")})` };
});

// ---- kanari ----
check("SELF: check(false) harus FAIL (kanari)", () => false);

const real = results.filter((r) => !r.name.startsWith("SELF"));
const kanari = results.filter((r) => r.name.startsWith("SELF"));
for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
const failedReal = real.filter((r) => !r.ok).length;
const failedKanari = kanari.filter((r) => !r.ok).length;
console.log(`\nRESULT: ${real.filter((r) => r.ok).length} passed, ${real.length - failedReal} failed (real ${failedReal}), kanari failed ${failedKanari}`);
process.exit(failedReal > 0 ? 1 : 0);