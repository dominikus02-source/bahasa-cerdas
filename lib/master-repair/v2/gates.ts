import { MasterQuestion, normText, normOption, keyIndex } from "../../master-recovery";
import { NAMED_FACT_RISK } from "../../master-authoring/gates";
import {
  SemanticVerdict,
  GateResult,
  DistractorReport,
  V2EngineContext,
} from "./types";

// ─────────────────────────────────────────────────────────────
// STEP 7.5 — Semantic Gates (deterministic, table-driven)
// Sumber tabel: set verifikasi yang SELARAS dengan SSOT
// lib/master-recovery/semantics.ts (bukan fiksi baru).
// ─────────────────────────────────────────────────────────────

export const SYNONYM_SETS: Record<string, string[]> = {
  bahagia: ["senang", "gembira", "riang", "sukacita", "suka cita"],
  cerdas: ["pintar", "pandai", "tajam", "genius", "berakal"],
  berani: ["gagah", "perkasa", "gagah berani", "nekat"],
  abadi: ["kekal", "langgeng", "selamanya", "eternal"],
  maju: ["melaju", "mendepan", "berkembang", "progresif"],
  malas: ["pemalas", "ogah-ogahan", "segan"],
};

export const ANTONYM_SETS: Record<string, string[]> = {
  panas: ["dingin"],
  tinggi: ["rendah"],
  maju: ["mundur"],
};

export const MAJAS_VERIFIED: Array<{ evidence: string; majas: string }> = [
  { evidence: "angin berbisik", majas: "personifikasi" },
  { evidence: "seperti air sungai", majas: "simile" },
  { evidence: "keringatnya mengalir seperti", majas: "simile" },
  { evidence: "bintang kelas", majas: "metafora" },
];

export const KALIMAT_VERIFIED: Array<{ evidence: string; expected: string }> = [
  { evidence: "menyatakan ajakan", expected: "imperatif" },
  { evidence: "siapa namamu", expected: "interogatif" },
  { evidence: "alangkah indahnya", expected: "eksklamatif" },
];

export const MEANING_VERIFIED: Record<string, string> = {
  bangku: "jabatan",
};

export const SPOK_VERIFIED: Array<{ kodeSoal: string; expected: string }> = [
  { kodeSoal: "BC-SPOK-0001", expected: "subjek" },
  { kodeSoal: "BC-SPOK-0002", expected: "predikat" },
  { kodeSoal: "BC-SPOK-0003", expected: "objek" },
  { kodeSoal: "BC-SPOK-0004", expected: "keterangan" },
  { kodeSoal: "BC-SPOK-0005", expected: "subjek" },
  { kodeSoal: "BC-SPOK-0006", expected: "pola s p o" },
  { kodeSoal: "BC-SPOK-0007", expected: "unsur inti" },
  { kodeSoal: "BC-SPOK-0008", expected: "objek" },
];

export const EJAAN_RULES: Array<{
  original: string;
  corrected: string;
  rule: string;
  reason: string;
}> = [
  { original: "nasehat", corrected: "nasihat", rule: "KBBI: bentuk baku 'nasihat'", reason: "kata baku menurut KBBI adalah 'nasihat', bukan 'nasehat'." },
  { original: "apotik", corrected: "apotek", rule: "KBBI: bentuk baku 'apotek'", reason: "kata baku menurut KBBI adalah 'apotek', bukan 'apotik'." },
  { original: "ijin", corrected: "izin", rule: "KBBI: bentuk baku 'izin'", reason: "kata baku menurut KBBI adalah 'izin', bukan 'ijin'." },
  { original: "resiko", corrected: "risiko", rule: "KBBI: bentuk baku 'risiko'", reason: "kata baku menurut KBBI adalah 'risiko', bukan 'resiko'." },
  { original: "merubah", corrected: "mengubah", rule: "KBBI: bentuk baku 'mengubah'", reason: "bentuk baku adalah 'mengubah' (dari kata dasar 'ubah'); 'merubah' tidak baku." },
  { original: "fihak", corrected: "pihak", rule: "KBBI: bentuk baku 'pihak'", reason: "kata baku menurut KBBI adalah 'pihak', bukan 'fihak'." },
  { original: "dlm", corrected: "dalam", rule: "Ejaan: singkatan tidak baku", reason: "'dlm' bukan bentuk baku; tulis 'dalam'." },
  { original: "yg", corrected: "yang", rule: "Ejaan: singkatan tidak baku", reason: "'yg' bukan bentuk baku; tulis 'yang'." },
  { original: "tsb", corrected: "tersebut", rule: "Ejaan: singkatan tidak baku", reason: "'tsb' bukan bentuk baku; tulis 'tersebut'." },
];

export const KALIMAT_BOROS_PAIRS: Array<[string, string]> = [
  ["para", "siswa-siswa"],
  ["sangat", "amat"],
  ["berulang-ulang", "kali"],
  ["agar", "supaya"],
  ["sebab", "karena"],
];

export function synonymGate(wordA: string, wordB: string, context: { register?: string } = {}): SemanticVerdict {
  const a = normText(wordA);
  const b = normText(wordB);
  if (!a || !b) return "INSUFFICIENT_CONTEXT";
  if (a === b) return "SEMANTIC_MISMATCH";
  const inSets = (x: string) => SYNONYM_SETS[x] ?? [];
  if (inSets(a).includes(b) || inSets(b).includes(a)) return "SEMANTIC_MATCH";
  const known = SYNONYM_SETS[a] || SYNONYM_SETS[b];
  if (!known) return "AMBIGUOUS";
  return "SEMANTIC_MISMATCH";
}

export function antonymGate(wordA: string, wordB: string, context: { dimension?: string } = {}): SemanticVerdict {
  const a = normText(wordA);
  const b = normText(wordB);
  if (!a || !b) return "INSUFFICIENT_CONTEXT";
  if (a === b) return "SEMANTIC_MISMATCH";
  const inSets = (x: string) => ANTONYM_SETS[x] ?? [];
  if (inSets(a).includes(b) || inSets(b).includes(a)) return "SEMANTIC_MATCH";
  const known = ANTONYM_SETS[a] || ANTONYM_SETS[b];
  if (!known) return "AMBIGUOUS";
  return "SEMANTIC_MISMATCH";
}

export function maknaKataGate(stem: string, term: string): SemanticVerdict {
  const t = normText(term);
  if (!t) return "INSUFFICIENT_CONTEXT";
  const hasContext = /dalam kalimat|dalam konteks|kalimat berikut|konteks kalimat/i.test(stem);
  if (!hasContext) return "INSUFFICIENT_CONTEXT";
  const meaning = MEANING_VERIFIED[t];
  if (!meaning) return "AMBIGUOUS";
  return "SEMANTIC_MATCH";
}

export function spokGate(q: MasterQuestion): SemanticVerdict {
  const verified = SPOK_VERIFIED.find((v) => v.kodeSoal === q.kodeSoal);
  if (!verified) return "AMBIGUOUS";
  const idx = keyIndex(q.correctAnswer, q.type);
  if (idx === null) return "INSUFFICIENT_CONTEXT";
  const opt = normOption(q.options[idx] ?? "");
  if (!opt) return "INSUFFICIENT_CONTEXT";
  if (opt !== verified.expected) return "SEMANTIC_MISMATCH";
  return "SEMANTIC_MATCH";
}

export function majasGate(stem: string, option: string): { verdict: SemanticVerdict; evidence?: string; reason?: string } {
  const s = normText(stem);
  if (s.length < 20) return { verdict: "INSUFFICIENT_CONTEXT", reason: "stimulus terlalu pendek untuk memverifikasi majas" };
  const hits = MAJAS_VERIFIED.filter((v) => s.includes(normText(v.evidence)));
  if (hits.length === 0) return { verdict: "INSUFFICIENT_CONTEXT", reason: "tidak ada evidence majas terverifikasi dalam stimulis" };
  const matching = hits.filter((h) => normOption(option) === h.majas);
  if (matching.length === 1) return { verdict: "SEMANTIC_MATCH", evidence: matching[0].evidence, reason: `evidence '${matching[0].evidence}' ada di stimulis dan mendukung ${matching[0].majas}` };
  if (hits.length > 1) return { verdict: "AMBIGUOUS", evidence: hits.map((h) => h.evidence).join(" | "), reason: "lebih dari satu majas dengan evidence yang sama kuat" };
  return { verdict: "SEMANTIC_MISMATCH", evidence: hits[0]?.evidence, reason: `option tidak cocok dengan majas terverifikasi (${hits[0]?.majas})` };
}

export function ejaanGate(original: string, corrected: string): { verdict: SemanticVerdict; rule?: string; reason?: string } {
  const o = normText(original);
  const c = normText(corrected);
  if (!o || !c) return { verdict: "INSUFFICIENT_CONTEXT" };
  if (o === c) return { verdict: "SEMANTIC_MATCH", rule: "no-op", reason: "tidak ada perubahan" };
  const rule = EJAAN_RULES.find((r) => normText(r.original) === o && normText(r.corrected) === c);
  if (!rule) return { verdict: "AMBIGUOUS", reason: "rule ejaan tidak dapat dijelaskan (intuition-only ditolak)" };
  return { verdict: "SEMANTIC_MATCH", rule: rule.rule, reason: rule.reason };
}

export function kalimatEfektifGate(q: MasterQuestion): SemanticVerdict {
  const verified = KALIMAT_VERIFIED.find((v) => normText(q.text).includes(normText(v.evidence)));
  if (verified) {
    const idx = keyIndex(q.correctAnswer, q.type);
    if (idx !== null && normOption(q.options[idx] ?? "") === verified.expected) return "SEMANTIC_MATCH";
    return "SEMANTIC_MISMATCH";
  }
  const text = normText(q.text);
  for (const [a, b] of KALIMAT_BOROS_PAIRS) {
    if (text.includes(normText(a)) && text.includes(normText(b))) return "SEMANTIC_MISMATCH";
  }
  return "AMBIGUOUS";
}

// ── DISTRACTOR ENGINE V2 ──
export function distractorEngine(q: MasterQuestion): { reports: DistractorReport[]; passed: boolean; reason?: string } {
  const idx = keyIndex(q.correctAnswer, q.type);
  if (idx === null) return { reports: [], passed: false, reason: "kunci tidak valid" };
  const keyOpt = normOption(q.options[idx] ?? "");
  const reports: DistractorReport[] = [];
  const normOpts = q.options.map((o) => normOption(o));
  if (new Set(normOpts.filter(Boolean)).size !== normOpts.filter(Boolean).length) {
    return { reports: [], passed: false, reason: "ada opsi duplikat (norm) — distractor tidak boleh duplikat" };
  }
  const target = extractTargetWord(q);
  for (let i = 0; i < q.options.length; i++) {
    if (i === idx) continue;
    const o = normOption(q.options[i]);
    if (!o) {
      reports.push({ option: q.options[i], whyWrong: "opsi kosong", plausible: false });
      continue;
    }
    if (o === keyOpt) {
      reports.push({ option: q.options[i], whyWrong: "duplikat jawaban benar", plausible: false });
      continue;
    }
    let whyWrong: string;
    if (target) {
      const sv = synonymGate(o, target);
      const av = sv === "SEMANTIC_MISMATCH" ? antonymGate(o, target) : "SEMANTIC_MISMATCH";
      if (sv === "SEMANTIC_MATCH" || av === "SEMANTIC_MATCH") {
        whyWrong = `'${q.options[i]}' bukan ${av === "SEMANTIC_MATCH" ? "lawan kata" : "sinonim"} dari '${target}' — opsi ini justru termasuk kata yang seekuivalen, bukan jawaban yang diminta`;
      } else {
        whyWrong = `'${q.options[i]}' tidak memiliki relasi makna (sinonim/lawan kata) dengan '${target}' yang diminta soal`;
      }
    } else {
      const kk = (q.kataKunci || []).join(", ");
      whyWrong = kk ? `'${q.options[i]}' bukan bagian dari konsep yang ditanyakan (${kk})` : `'${q.options[i]}' tidak sesuai dengan makna yang ditanyakan soal`;
    }
    reports.push({ option: q.options[i], whyWrong, plausible: true });
  }
  const bad = reports.filter((r) => !r.plausible);
  return { reports, passed: bad.length === 0, reason: bad.length ? bad.map((b) => b.whyWrong).join("; ") : undefined };
}

function extractTargetWord(q: MasterQuestion): string | null {
  const m = (q.text || "").match(/dari (?:kata )?'([^']+)'/i);
  if (m) return m[1].toLowerCase();
  const kk = q.kataKunci || [];
  const hit = kk.find((k) => /sinonim|antonim/i.test(k));
  const mm = hit?.match(/'([^']+)'/);
  return mm ? mm[1].toLowerCase() : null;
}

// ── SINGLE-CORRECT HARD GATE ──
export function singleCorrectHardGate(q: MasterQuestion): GateResult {
  const idx = keyIndex(q.correctAnswer, q.type);
  if (idx === null) return { name: "single-correct", passed: false, detail: "kunci tidak valid" };
  const keyOpt = normOption(q.options[idx] ?? "");
  if (!keyOpt) return { name: "single-correct", passed: false, detail: "opsi kunci kosong" };
  const target = extractTargetWord(q);
  const matchSet = new Set<string>([keyOpt]);
  if (target && keyOpt === target) {
    for (const s of [SYNONYM_SETS[target], ANTONYM_SETS[target]]) {
      for (const w of s ?? []) matchSet.add(w);
    }
  }
  let correctCount = 0;
  for (const o of q.options.map((x) => normOption(x)).filter(Boolean)) {
    if (matchSet.has(o)) correctCount++;
  }
  if (correctCount !== 1) {
    return { name: "single-correct", passed: false, detail: `correct_count=${correctCount} (wajib 1) — REJECT, tidak diturunkan ke HUMAN_REVIEW` };
  }
  return { name: "single-correct", passed: true, detail: "tepat satu jawaban benar" };
}

// ── EXPLANATION GATE ──
const FORBIDDEN_EXPLANATION_PHRASES = [
  "semua pernyataan di atas",
  "tidak dapat dipastikan",
  "cukup benar",
  "tidak relevan",
];

export function explanationGate(q: MasterQuestion, sourceForFactCheck?: MasterQuestion): GateResult {
  const e = (q.explanation || "").trim();
  if (e.length < 20) return { name: "explanation", passed: false, detail: "explanasi terlalu pendek (<20 karakter)" };
  const stemNorm = normText(q.text);
  const idx = keyIndex(q.correctAnswer, q.type);
  const keyOpt = idx === null ? "" : normOption(q.options[idx] ?? "");
  if (normText(e) === stemNorm) return { name: "explanation", passed: false, detail: "explanasi mengulang stimulis" };
  if (keyOpt && normText(e) === keyOpt) return { name: "explanation", passed: false, detail: "explanasi mengulang jawaban" };
  NAMED_FACT_RISK.lastIndex = 0;
  const factInExpl = NAMED_FACT_RISK.test(normText(e) ? e : " ");
  if (factInExpl) {
    const src = normText(sourceForFactCheck?.text ?? "");
    NAMED_FACT_RISK.lastIndex = 0;
    const factInSource = NAMED_FACT_RISK.test(src ? src : " ");
    if (!factInSource) return { name: "explanation", passed: false, detail: "explanasi memuat fakta bernama yang tidak ada di sumber (hallucination)" };
  }
  for (const f of FORBIDDEN_EXPLANATION_PHRASES) {
    if (e.toLowerCase().includes(f)) return { name: "explanation", passed: false, detail: `frase larangan edukasi: '${f}'` };
  }
  if (keyOpt && !e.toLowerCase().includes(keyOpt.slice(0, Math.max(3, Math.floor(keyOpt.length * 0.6))))) {
    return { name: "explanation", passed: false, detail: "explanasi tidak menyinggung jawaban yang benar (tidak menjawab 'mengapa benar?')" };
  }
  return { name: "explanation", passed: true, detail: "explanasi menjawab mengapa benar tanpa mengulang stimulis/jawaban atau fakta baru" };
}

// ── AI-SOUNDING GATE ──
const AI_SOUNDING_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /berikut ini yang termasuk/i, label: "frase generik 'Berikut ini yang termasuk'" },
  { re: /yang merupakan contoh/i, label: "frase generik 'yang merupakan contoh'" },
  { re: /adalah jawaban yang tepat karena sesuai dengan konsep yang dimaksud/i, label: "template explanation robotik" },
  { re: /karena semua opsi lain (jelas )?salah/i, label: "alasan generik 'semua opsi lain salah'" },
  { re: /sebagai (seorang )?siswa/i, label: "wording artifisial 'sebagai siswa'" },
  { re: /dengan (demikian|begitu), dapat disimpulkan bahwa jawaban/i, label: "rangkuman berlebihan (unnecessary verbosity)" },
  { re: /jawaban yang paling tepat adalah/i, label: "klise robota 'jawaban yang paling tepat'" },
];

export function aiSoundingGate(q: MasterQuestion): GateResult {
  const flagged: string[] = [];
  for (const p of AI_SOUNDING_PATTERNS) {
    if (p.re.test(q.text) || p.re.test(q.explanation || "")) flagged.push(p.label);
  }
  return flagged.length
    ? { name: "ai-sounding", passed: false, detail: flagged.join("; ") }
    : { name: "ai-sounding", passed: true, detail: "tidak ada pola generik/robotik terdeteksi" };
}

// ── DUPLICATE GATE V2 (passD dipertahankan — threshold TIDAK diturunkan) ──
export function duplicateGateV2(candidate: MasterQuestion, ctx: V2EngineContext): GateResult {
  const cText = normText([candidate.text, candidate.type, ...candidate.options].join(" "));
  if (!cText) return { name: "duplicate", passed: false, detail: "kandidat kosong" };
  for (const o of ctx.allBank) {
    if (o.kodeSoal === candidate.kodeSoal) continue;
    const oText = normText([o.text, o.type, ...o.options].join(" "));
    if (oText && oText === cText) {
      return { name: "duplicate", passed: false, detail: `exact duplicate dengan ${o.kodeSoal}` };
    }
    const j = jaccard(oText.split(" "), cText.split(" "));
    if (j >= 0.9) {
      return { name: "duplicate", passed: false, detail: `near-duplicate (jaccard ${j.toFixed(2)}) dengan ${o.kodeSoal}` };
    }
    const sameOptions = JSON.stringify([...candidate.options].map((x) => normOption(x)).sort()) ===
      JSON.stringify([...o.options].map((x) => normOption(x)).sort());
    if (sameOptions && normText(o.text) === normText(candidate.text)) {
      return { name: "duplicate", passed: false, detail: `template-family duplicate dengan ${o.kodeSoal}` };
    }
  }
  return { name: "duplicate", passed: true, detail: "tidak ada duplikat (exact/near/template-family)" };
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  const union = new Set([...sa, ...sb]).size;
  return union === 0 ? 0 : inter / union;
}

export function allGateResults(...results: GateResult[]): GateResult[] {
  return results;
}