import { MasterQuestion } from "../master-recovery";
import {
  normText,
  normOption,
  keyIndex,
  tokenJaccard,
  exactDuplicateKey,
  semanticValidate,
  isSelfAnswer,
  optionIssues,
  keyInRange,
  hasTemplateExplanation,
  explanationContradictsKey,
  languageError,
} from "../master-recovery";
import {
  AuthoringQuestion,
  AuthoringGates,
  AuthoringSkill,
  GateCheck,
  GateResult,
  SKILL_STEM_PATTERNS,
  DIFFICULTY_LEVELS,
} from "./types";
import { isTautologyBS } from "../master-recovery";

const HURUF_INDONESIA = /^[\p{L}\p{N}\p{P}\p{S}\s]+$/u;
const MARKUP_JUNK = /(\[\[|\]\]|\{\{|\}\}|#{1,6}|\*\*|```|###|<[a-z]+>|=>)/i;
const FORBIDDEN_OPTION = /(semua jawaban benar|semua benar|semua pernyataan di atas|tidak ada jawaban|tidak ada yang benar|tidak dapat dipastikan|cukup benar|tidak relevan|a dan b|b dan c|a, b, dan c)/i;
// Opsi yang memuat atribusi karya bernama — judul dalam kutip ("…" karya X)
// atau "karya" + Nama (kapitalisasi asli, guna menghindari frasa generik
// seperti "Karya sastra") — tidak dapat diverifikasi otomatis:
// risiko halusinasi fakta (atribusi/jenis/isi keliru). → HUMAN_REVIEW.
export const NAMED_FACT_RISK = /"[^"]+"\s+karya\b|karya\s+[A-ZÀ-Ž][a-zà-ž]+(\s+[A-ZÀ-Ž][a-zà-ž]+)+/;

const SKILL_TO_TEMA: Record<AuthoringSkill, string> = {
  SINONIM: "sinonim",
  ANTONIM: "antonim",
  SPOK: "spok",
  KALIMAT_EFEKTIF: "kalimat",
  EJAAN: "kata-baku",
  MAJAS: "majas",
  MAKNA_KATA: "makna-kata",
  KONSEP: "konsep",
};

/**
 * Indeks kunci dari kontrak AI: correctAnswer adalah TEKS opsi.
 * Cari teks persis di options; fallback ke keyIndex (untuk kunci berupa index).
 */
function answerIndex(q: AuthoringQuestion): number | null {
  const byText = q.options.findIndex((o) => normOption(o) === normOption(q.correctAnswer));
  if (byText !== -1) return byText;
  return keyIndex(q.correctAnswer, q.type);
}

function mq(c: AuthoringQuestion, skill: AuthoringSkill): MasterQuestion {
  return {
    kodeSoal: "candidate",
    tema: SKILL_TO_TEMA[skill],
    text: c.stem,
    options: c.options,
    correctAnswer: String(answerIndex(c) ?? 0),
    type: c.type,
    explanation: c.explanation || "",
  } as MasterQuestion;
}

function passAStructural(q: AuthoringQuestion): GateResult {
  const checks: GateCheck[] = [];
  const ok = (name: string, passed: boolean, detail?: string) =>
    checks.push({ name, passed, detail });

  ok("stem-panjang", q.stem.trim().length >= 10, `stem ${q.stem.trim().length} char`);
  ok("tipe-dikenal", q.type === "PILIHAN_GANDA" || q.type === "BENAR_SALAH");
  ok("skill-dikenal", Object.keys(SKILL_STEM_PATTERNS).includes(q.skill));
  ok(
    "difficulty-dikenal",
    (DIFFICULTY_LEVELS as readonly string[]).includes(q.difficulty),
    q.difficulty
  );
  ok("options-2-6", q.options.length >= 2 && q.options.length <= 6, `${q.options.length} opsi`);
  const opts = q.options.map((o) => o.trim());
  ok("opsi-tidak-kosong", opts.every((o) => o.length >= 1));
  ok(
    "opsi-unik",
    new Set(opts.map(normOption)).size === opts.length,
    "duplikat setelah normalisasi"
  );
  const idx = answerIndex(q);
  ok("kunci-di-range", idx !== null && idx >= 0 && idx < q.options.length);
  ok(
    "penjelasan-cukup",
    (q.explanation || "").trim().length >= 20,
    `${(q.explanation || "").trim().length} char`
  );
  return { passed: checks.every((c) => c.passed), checks };
}

function passBLinguistic(q: AuthoringQuestion, skill: AuthoringSkill): GateResult {
  const checks: GateCheck[] = [];
  const ok = (name: string, passed: boolean, detail?: string) =>
    checks.push({ name, passed, detail });

  const allText = [q.stem, ...q.options, q.explanation].join(" ");
  ok("huruf-latin-indonesia", HURUF_INDONESIA.test(allText), "karakter non-latin terdeteksi");
  ok("tanpa-markup-junk", !MARKUP_JUNK.test(allText), "markup/format aneh");
  ok("stem-opsi-tak-identik", !q.options.some((o) => normOption(o) === normText(q.stem)));
  ok(
    "opsi-bukan-opt-lain",
    (() => {
      for (const o of q.options) {
        const n = normOption(o);
        if (!n) continue;
        const count = q.options.filter((x) => normOption(x) === n).length;
        if (count > 1) return false;
      }
      return true;
    })(),
    "opsi duplikat dalam satu soal"
  );
  // EJAAN-type soal sengaja memuat salah eja di OPSI (distraktor) dan mengutip
  // bentuk salah di explanation — cek bahasa baku pada stem + explanation
  // dengan kutipan ('…'/"…") dinormalkan (sitasi bentuk kata, bukan kesalahan penulis).
  const quoted = (q.explanation || "").replace(/['"][^'"]*['"]/g, " ");
  const err = languageError({ text: q.stem, explanation: quoted, options: [] } as unknown as MasterQuestion);
  ok("bahasa-baku", err === null, err ?? "ok");
  ok(
    "tanpa-opsi-forbidden",
    !q.options.some((o) => FORBIDDEN_OPTION.test(normOption(o))),
    "opsi 'semua benar / tidak ada jawaban / tidak dapat dipastikan' dilarang"
  );
  ok(
    "tanpa-fakta-nama-tak-terverifikasi",
    !q.options.some((o) => NAMED_FACT_RISK.test(o)),
    "opsi memuat judul/karya bernama — perlu verifikasi manusia"
  );
  const lengths = q.options.map((o) => normOption(o).length);
  if (lengths.length >= 2) {
    const maxL = Math.max(...lengths);
    const minL = Math.min(...lengths.filter((l) => l > 0));
    ok(
      "panjang-opsi-seimbang",
      maxL <= Math.max(12, minL * 3 + 6),
      `max ${maxL} vs min ${minL}`
    );
  } else {
    ok("panjang-opsi-seimbang", true, "skip (1 opsi)");
  }
  return { passed: checks.every((c) => c.passed), checks };
}

function passCSemantic(q: AuthoringQuestion, skill: AuthoringSkill): GateResult {
  const checks: GateCheck[] = [];
  const ok = (name: string, passed: boolean, detail?: string) =>
    checks.push({ name, passed, detail });

  const verdict = semanticValidate(mq(q, skill));
  ok("semantik-valid", verdict.valid, verdict.reason ?? "ok");
  if (!verdict.valid) ok("multi-correct", !verdict.multiCorrect, verdict.multiCorrect ? verdict.reason : "ok");

  const self = isSelfAnswer(mq(q, skill));
  ok("bukan-self-answer", !self.is, self.concept ? `kemungkinan jawaban: ${self.concept}` : "ok");

  const cIdx = answerIndex(q);
  ok("kunci-objektif", cIdx !== null, "kunci null");
  if (cIdx !== null) {
    const keyText = normOption(q.options[cIdx]);
    ok(
      "penjelasan-selaras-kunci",
      (() => {
        if (hasTemplateExplanation(mq(q, skill))) return false;
        if (explanationContradictsKey(mq(q, skill))) return false;
        if (keyText.length >= 3) {
          const expl = normText(q.explanation);
          if (expl.includes(keyText)) return true;
          if (/karena|merupakan|berarti|adalah/.test(q.explanation)) return true;
        }
        return true;
      })(),
      "penjelasan generik/kontradiksi"
    );
  }

  const issues = optionIssues(mq(q, skill));
  ok("opsi-tanpa-masalah", issues.length === 0, issues.join("; ") || "ok");

  if (q.type === "BENAR_SALAH") {
    ok("bukan-tautologi-bs", !isTautologyBS(mq(q, skill)), "pernyataan mengulang jawaban");
  }

  if (skill === "SPOK" || skill === "MAJAS" || skill === "KALIMAT_EFEKTIF") {
    ok(
      "kebenaran-terverifikasi",
      verdict.valid,
      `${skill} butuh tabel verifikasi — kandidat AI tidak dapat diverifikasi otomatis`
    );
  }
  return { passed: checks.every((c) => c.passed), checks };
}

function passDDuplicate(
  q: AuthoringQuestion,
  ctx: { bank: MasterQuestion[]; authored: AuthoringQuestion[]; familyKey?: string },
  skill: AuthoringSkill
): GateResult {
  const checks: GateCheck[] = [];
  const ok = (name: string, passed: boolean, detail?: string) =>
    checks.push({ name, passed, detail });

  const cMq = mq(q, skill);
  const exactKey = exactDuplicateKey(cMq);
  const exactHit = ctx.bank.some((b) => exactDuplicateKey(b) === exactKey);
  ok("tidak-exact-vs-bank", !exactHit, "exact duplicate di bank");

  const normStem = normText(q.stem);
  const keyText = normOption(q.options[answerIndex(q) ?? 0] ?? "");
  const nearHit = ctx.bank.find((b) => {
    const k = exactDuplicateKey(b).split("::")[0];
    if (k !== normStem) return false;
    const bKey = normOption(b.options[keyIndex(b.correctAnswer, b.type) ?? 0] ?? "");
    return bKey === keyText;
  });
  ok("tidak-near-vs-bank", !nearHit, "stem identik dengan soal bank lain");

  let maxJ = 0;
  for (const b of ctx.bank) maxJ = Math.max(maxJ, tokenJaccard(q.stem, b.text ?? ""));
  ok("jaccard-<0.75-vs-bank", maxJ < 0.75, `max jaccard ${maxJ.toFixed(2)}`);

  let maxJAuth = 0;
  for (const a of ctx.authored) maxJAuth = Math.max(maxJAuth, tokenJaccard(q.stem, a.stem));
  ok("jaccard-<0.75-vs-batch", maxJAuth < 0.75, `max jaccard batch ${maxJAuth.toFixed(2)}`);

  const familyNorm = ctx.familyKey ? normText(ctx.familyKey) : "";
  if (familyNorm) {
    const famJ = tokenJaccard(q.stem, familyNorm);
    ok("jaccard-<0.95-vs-family", famJ < 0.95, `family jaccard ${famJ.toFixed(2)}`);
  } else {
    ok("jaccard-<0.95-vs-family", true, "tanpa family");
  }

  const optSets = new Set<string>();
  for (const o of q.options) optSets.add(normOption(o));
  const optCollision = ctx.authored.filter((a) =>
    a.options.some((o) => optSets.has(normOption(o)) && normOption(o).length >= 4)
  ).length;
  ok("opsi-set-unik-batch", optCollision === 0, `${optCollision} opsi tabrakan antar batch`);

  return { passed: checks.every((c) => c.passed), checks };
}

function passEEducational(
  q: AuthoringQuestion,
  skill: AuthoringSkill,
  evidence: { difficultyEvidence: string; semanticEvidence: string }
): GateResult {
  const checks: GateCheck[] = [];
  const ok = (name: string, passed: boolean, detail?: string) =>
    checks.push({ name, passed, detail });

  const patterns = SKILL_STEM_PATTERNS[skill] ?? [];
  ok(
    "skill-benar-diuji",
    patterns.length === 0 || patterns.some((p) => p.test(q.stem)),
    `stem tidak menanyakan ${skill}`
  );

  const cIdx = answerIndex(q);
  // Kutipan ('…'/"…") dalam stem adalah SITASI (kalimat contoh, kutipan teks),
  // bukan kebocoran jawaban — unquote sebelum cek kemunculan kunci.
  // BENAR_SALAH dikecualikan: instruksi "benar atau salah" selalu memuat kunci.
  const stemRaw = q.stem.replace(/["'][^"']*["']/g, " ");
  const stem = normText(stemRaw);
  const keyText = normOption(q.options[cIdx ?? 0] ?? "");
  if (q.type === "BENAR_SALAH") {
    ok("kunci-tidak-terbenam-di-stem", true, "skip (BS)");
  } else {
    ok("kunci-tidak-terbenam-di-stem", !(keyText.length >= 3 && stem.includes(keyText)), "jawaban muncul di stem");
  }

  ok(
    "difficulty-evidence-cukup",
    (evidence.difficultyEvidence || "").trim().length >= 20,
    "difficultyEvidence < 20 char"
  );
  ok("semantic-evidence-cukup", (evidence.semanticEvidence || "").trim().length >= 20, "semanticEvidence < 20 char");
  // Penjelasan harus memuat alasan; untuk KONSEP (definisi/pengertian) justifikasi
  // definisional ("… adalah …") sah — tanpa melonggarkan skill lain.
  ok(
    "penjelasan-pedagogis",
    /karena|kata|berarti|merupakan|bukan|menunjukkan|sehingga|sedangkan|didefinisikan|definisi|menurut/i.test(
      q.explanation
    ) || (skill === "KONSEP" && /\badalah\b/i.test(q.explanation)),
    "penjelasan tanpa alasan"
  );

  const wordCount = q.explanation.trim().split(/\s+/).length;
  ok("penjelasan-tidak-tipis", wordCount >= 5, `${wordCount} kata`);

  return { passed: checks.every((c) => c.passed), checks };
}

export function runGates(
  q: AuthoringQuestion,
  skill: AuthoringSkill,
  ctx: { bank: MasterQuestion[]; authored: AuthoringQuestion[]; familyKey?: string },
  evidence: { difficultyEvidence: string; semanticEvidence: string }
): AuthoringGates {
  return {
    passA: passAStructural(q),
    passB: passBLinguistic(q, skill),
    passC: passCSemantic(q, skill),
    passD: passDDuplicate(q, ctx, skill),
    passE: passEEducational(q, skill, evidence),
  };
}

export function allGatesPass(g: AuthoringGates): boolean {
  return g.passA.passed && g.passB.passed && g.passC.passed && g.passD.passed && g.passE.passed;
}

export function gateFailureSummary(g: AuthoringGates | null): string[] {
  if (!g) return [];
  const out: string[] = [];
  for (const [name, gr] of Object.entries(g)) {
    for (const c of gr.checks) {
      if (!c.passed) out.push(`${name}:${c.name}${c.detail ? ` (${c.detail})` : ""}`);
    }
  }
  return out;
}

export function gateFailuresCount(g: AuthoringGates | null): Record<string, number> {
  const out: Record<string, number> = {};
  if (!g) return out;
  for (const [name, gr] of Object.entries(g) as [string, GateResult][]) {
    out[name] = gr.checks.filter((c) => !c.passed).length;
  }
  return out;
}

export { keyIndex };
