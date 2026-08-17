import { MasterQuestion, IssueCategory } from "./types";
import { normText, keyIndex, normOption } from "./normalize";

export const TEMPLATE_EXPLANATION =
  /jawaban yang tepat karena sesuai dengan konsep yang dimaksud/;

export function isTemplateConceptQuestion(q: MasterQuestion): {
  is: boolean;
  concept?: string;
} {
  const m = (q.text || "").match(
    /^Berikut ini yang termasuk contoh\s+(.+?)\s+(?:adalah|yaitu|ialah)/i
  );
  if (!m) return { is: false };
  return { is: true, concept: normText(m[1]) };
}

export function isJelaskanTokenQuestion(q: MasterQuestion): boolean {
  return /^Jelaskan pengertian .+? menurut pemahaman Anda\.?$/i.test(
    q.text || ""
  );
}

export function isTautologyBS(q: MasterQuestion): boolean {
  if (q.type !== "BENAR_SALAH") return false;
  if (/^Pernyataan: .+? adalah bagian dari materi Bahasa Indonesia\.?$/.test(
    q.text || ""
  )) return true;
  if (!/^Pernyataan:/.test(q.text || "")) return false;
  const idx = keyIndex(q.correctAnswer, q.type);
  if (idx === null || !q.options[idx]) return false;
  const keyOpt = normOption(q.options[idx]);
  if (!keyOpt) return false;
  const subject = (q.text || "").replace(/^Pernyataan:\s*/i, "").split(/[.,]/)[0].trim();
  if (subject && normText(subject).includes(keyOpt) && normText(subject) !== keyOpt)
    return true;
  return false;
}

export function isSelfAnswer(q: MasterQuestion): {
  is: boolean;
  concept?: string;
} {
  const idx = keyIndex(q.correctAnswer, q.type);
  if (idx === null || !q.options[idx]) return { is: false };
  const keyOpt = normOption(q.options[idx]);
  if (!keyOpt) return { is: false };
  const m = (q.text || "").match(/dari kata '([^']+)'/i);
  if (m && normText(m[1]) === keyOpt) return { is: true, concept: m[1] };
  const m2 = (q.text || "").match(/dari '([^']+)'/i);
  if (m2 && normText(m2[1]) === keyOpt) return { is: true, concept: m2[1] };
  return { is: false };
}

export function isWrongTypeMCQ(q: MasterQuestion): boolean {
  const idx = keyIndex(q.correctAnswer, q.type);
  if (idx === null) return false;
  if (q.type === "BENAR_SALAH" && q.options.length > 2) return true;
  if (q.type === "ISIAN_SINGKAT" && q.options.length > 1 && idx < q.options.length)
    return true;
  return false;
}

export function isJelaskanTokenBroken(q: MasterQuestion): boolean {
  if (!isJelaskanTokenQuestion(q)) return false;
  if (q.type !== "ISIAN_SINGKAT") return false;
  return q.options.length === 1;
}

export function optionIssues(q: MasterQuestion): string[] {
  const issues: string[] = [];
  if (!Array.isArray(q.options) || q.options.length < 2)
    issues.push("kurang dari 2 opsi");
  const seen = new Map<string, number>();
  q.options.forEach((o, i) => {
    const n = normOption(o);
    if (!o || !o.trim()) issues.push(`opsi ${i} kosong`);
    if (n) {
      const first = seen.get(n);
      if (first !== undefined) issues.push(`opsi ${i} duplikat opsi ${first}`);
      else seen.set(n, i);
    }
  });
  return issues;
}

export function keyInRange(q: MasterQuestion): { ok: boolean; idx: number | null } {
  const idx = keyIndex(q.correctAnswer, q.type);
  if (idx === null) return { ok: false, idx: null };
  if (idx < 0 || idx >= q.options.length) return { ok: false, idx };
  return { ok: true, idx };
}

export function hasTemplateExplanation(q: MasterQuestion): boolean {
  return TEMPLATE_EXPLANATION.test(q.explanation || "");
}

export function explanationTooShort(q: MasterQuestion): boolean {
  const e = (q.explanation || "").trim();
  return e.length < 20 && !hasTemplateExplanation(q);
}

export function difficultyMismatch(q: MasterQuestion): boolean {
  const m = (q.indikator || "").match(/\((MUDAH|SEDANG|SULIT)\)/i);
  if (!m) return false;
  return m[1].toUpperCase() !== (q.difficulty || "").toUpperCase();
}

export function trivialContentHOTS(q: MasterQuestion): boolean {
  const trivial =
    isTemplateConceptQuestion(q).is ||
    isJelaskanTokenQuestion(q) ||
    isTautologyBS(q);
  if (!trivial) return false;
  const diff = (q.difficulty || "").toUpperCase();
  if (diff === "SULIT" || (q.levelBerpikir || 0) >= 4) return true;
  return false;
}

const KNOWN_LANGUAGE_ERRORS: Record<string, string> = {
  langgsung: "langsung",
  mencangkup: "mencakup",
  praktek: "praktik",
  sistim: "sistem",
  jaman: "zaman",
  resiko: "risiko",
  nasehat: "nasihat",
  apotik: "apotek",
  aktifitas: "aktivitas",
  kwalitas: "kualitas",
  kwantitas: "kuantitas",
  silahkan: "silakan",
  merubah: "mengubah",
  merobah: "mengubah",
  dipengaruhi: "dipengaruhi",
  mempengaruhi: "memengaruhi",
  perekonomian: "perekonomian",
  "di karenakan": "dikarenakan",
  "di karena": "dikarenakan",
};

export function languageError(q: MasterQuestion): string | null {
  const haystack = `${q.text} ${q.explanation} ${q.options.join(" ")}`.toLowerCase();
  for (const [bad, good] of Object.entries(KNOWN_LANGUAGE_ERRORS)) {
    if (haystack.includes(bad)) return `${bad} → ${good}`;
  }
  return null;
}

export function skillMismatch(q: MasterQuestion): boolean {
  const tema = (q.tema || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!tema || tema.length < 3) return false;
  const kode = (q.kodeSoal || "").toLowerCase();
  return !kode.includes(tema);
}

export function unsupportedClaim(q: MasterQuestion): boolean {
  if (!isTautologyBS(q)) return false;
  return /adalah bagian dari materi Bahasa Indonesia/.test(q.text || "");
}

export function explanationContradictsKey(q: MasterQuestion): boolean {
  const { ok, idx } = keyInRange(q);
  if (!ok || idx === null) return false;
  const keyOpt = q.options[idx];
  if (!keyOpt) return false;
  const e = normText(q.explanation || "");
  if (!e) return false;
  const re = new RegExp(
    `(bukan|salah|tidak tepat|tidak benar)\\s+${escapeRegExp(normText(keyOpt))}`
  );
  return re.test(e);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
