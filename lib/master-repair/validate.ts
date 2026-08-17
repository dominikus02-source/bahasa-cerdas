import { MasterQuestion, normOption, normText } from "../master-recovery";
import { keyInRange, optionIssues, hasTemplateExplanation, explanationContradictsKey } from "../master-recovery";
import { semanticValidate } from "../master-recovery";
import { PassACheck, PassBCheck } from "./types";

// ─── PASS A — STRUCTURAL (deterministik) ─────────────────────

export function passAStructural(q: MasterQuestion): { passed: boolean; checks: PassACheck[] } {
  const checks: PassACheck[] = [];

  const required: Array<[string, unknown]> = [
    ["kodeSoal", q.kodeSoal],
    ["text", q.text],
    ["tema", q.tema],
    ["difficulty", q.difficulty],
    ["correctAnswer", q.correctAnswer],
  ];
  for (const [name, val] of required) {
    checks.push({
      name: `field ${name}`,
      passed: typeof val === "string" && val.trim().length > 0,
      detail: typeof val === "string" && val.trim().length === 0 ? "kosong" : undefined,
    });
  }

  checks.push({
    name: "tipe valid",
    passed: ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"].includes(q.type),
    detail: q.type,
  });

  checks.push({
    name: "jumlah opsi >= 2",
    passed: Array.isArray(q.options) && q.options.length >= 2,
    detail: `opsi=${Array.isArray(q.options) ? q.options.length : 0}`,
  });

  const kr = keyInRange(q);
  checks.push({
    name: "kunci dalam jangkauan opsi",
    passed: kr.ok,
    detail: kr.ok ? undefined : `kunci '${q.correctAnswer}' (${q.options?.length ?? 0} opsi)`,
  });

  const optIssues = optionIssues(q);
  checks.push({
    name: "opsi valid (unik, tidak kosong)",
    passed: optIssues.length === 0,
    detail: optIssues.length ? optIssues.join("; ") : undefined,
  });

  checks.push({
    name: "explanation tidak kosong",
    passed: typeof q.explanation === "string" && q.explanation.trim().length > 0,
  });

  return { passed: checks.every((c) => c.passed), checks };
}

// ─── PASS B — SEMANTIC (deterministik, independent dari repairer) ──

const SPOK_EXPECTED: Record<string, string> = {
  "BC-SPOK-0001": "subjek",
  "BC-SPOK-0002": "predikat",
  "BC-SPOK-0003": "objek",
  "BC-SPOK-0004": "keterangan",
  "BC-SPOK-0005": "subjek",
  "BC-SPOK-0006": "pola s p o",
  "BC-SPOK-0007": "unsur inti",
  "BC-SPOK-0008": "objek",
};

function expectedTermFor(q: MasterQuestion): string | null {
  const spok = SPOK_EXPECTED[q.kodeSoal];
  if (spok) return spok;
  const t = normText(q.text);
  const majas = [
    { text: "'angin berbisik di malam hari' mengandung majas", expected: "personifikasi" },
    { text: "'keringatnya mengalir seperti air sungai' mengandung majas", expected: "simile" },
    { text: "'dia adalah bintang kelas' mengandung majas", expected: "metafora" },
  ].find((v) => t.includes(v.text));
  if (majas) return majas.expected;
  const kalimat = [
    { text: "kalimat yang menyatakan ajakan disebut kalimat", expected: "imperatif" },
    { text: "kalimat 'siapa namamu' termasuk jenis kalimat", expected: "interogatif" },
    { text: "kalimat 'alangkah indahnya pemandangan ini' termasuk", expected: "eksklamatif" },
  ].find((v) => t.includes(v.text));
  if (kalimat) return kalimat.expected;
  return null;
}

function explanationMentionsKey(q: MasterQuestion): boolean {
  const keyIdx = parseInt(String(q.correctAnswer), 10);
  const keyOpt = !isNaN(keyIdx) && q.options[keyIdx] ? normOption(q.options[keyIdx]) : "";
  const expl = normText(q.explanation);
  if (keyOpt && expl.includes(keyOpt)) return true;
  const expected = expectedTermFor(q);
  if (expected && expl.includes(normText(expected))) return true;
  return false;
}

export function estimateCognitiveDemand(q: MasterQuestion): "RECALL" | "UNDERSTAND" | "APPLY" | "ANALYZE" | "EVALUATE" {
  const stem = normText(q.text);
  const tema = (q.tema || "").toLowerCase();
  if (/antonim|sinonim|unsur inti|termasuk jenis/.test(stem) || /antonim|sinonim/.test(tema)) return "RECALL";
  if (/majas|s p o|spok|pola/.test(stem) || /majas|spok/.test(tema)) return "APPLY";
  if (/kalimat/.test(stem) || /kalimat/.test(tema)) return "UNDERSTAND";
  return "UNDERSTAND";
}

export function cognitiveMatchesDifficulty(demand: string, difficulty: string): boolean {
  const d = difficulty.toUpperCase();
  if (d === "MUDAH") return demand === "RECALL" || demand === "UNDERSTAND";
  if (d === "SEDANG") return demand === "UNDERSTAND" || demand === "APPLY" || demand === "ANALYZE";
  if (d === "SULIT") return demand === "ANALYZE" || demand === "EVALUATE";
  return true;
}

export function passBSemantic(
  q: MasterQuestion,
  opts: { checkDistractors?: boolean } = {}
): { passed: boolean; checks: PassBCheck[] } {
  const checks: PassBCheck[] = [];
  const sem = semanticValidate(q);

  checks.push({
    name: "jawaban didukung stimulus (semantik terverifikasi)",
    passed: sem.valid,
    detail: sem.reason,
  });

  checks.push({
    name: "tepat satu jawaban benar",
    passed: !sem.multiCorrect,
    detail: sem.multiCorrect ? sem.reason : undefined,
  });

  checks.push({
    name: "tidak ambigu",
    passed: !sem.ambiguous,
    detail: sem.ambiguous ? sem.reason : undefined,
  });

  checks.push({
    name: "explanation bermakna (bukan templat)",
    passed: !hasTemplateExplanation(q),
  });

  checks.push({
    name: "explanation tidak menyangkal kunci",
    passed: !explanationContradictsKey(q),
  });

  checks.push({
    name: "explanation menjelaskan kunci",
    passed: q.explanation.trim().length >= 25 && explanationMentionsKey(q),
    detail: `panjang=${q.explanation.trim().length}`,
  });

  const demand = estimateCognitiveDemand(q);
  checks.push({
    name: `tuntutan kognitif (${demand}) cocok dengan difficulty`,
    passed: cognitiveMatchesDifficulty(demand, q.difficulty),
    detail: `difficulty=${q.difficulty}`,
  });

  if (opts.checkDistractors !== false) {
    const keyIdx = parseInt(String(q.correctAnswer), 10);
    const distractors = q.options
      .map((o, i) => ({ o, i }))
      .filter((x) => !isNaN(keyIdx) && x.i !== keyIdx && x.o.trim().length > 0);
    const normOpts = q.options.map(normOption);
    checks.push({
      name: "distractor unik (tidak sama dengan kunci)",
      passed: new Set(normOpts).size === normOpts.length,
      detail: new Set(normOpts).size !== normOpts.length ? "ada opsi duplikat" : undefined,
    });
    checks.push({
      name: "distractor tidak sinonim kunci (tabel semantik)",
      passed: !sem.multiCorrect && distractors.length === q.options.length - (isNaN(keyIdx) ? 0 : 1),
      detail: undefined,
    });
  }

  return { passed: checks.every((c) => c.passed), checks };
}

export function explainWhy(candidate: MasterQuestion): string {
  const checks = [
    ...passAStructural(candidate).checks,
    ...passBSemantic(candidate).checks,
  ];
  return checks
    .filter((c) => !c.passed)
    .map((c) => `${c.name}${c.detail ? ` — ${c.detail}` : ""}`)
    .join("; ");
}
