import { MasterQuestion, normText, normOption, keyIndex } from "../../master-recovery";
import { SYNONYM_SETS, ANTONYM_SETS, EJAAN_RULES } from "./gates";

// ─── SAFE REPAIR — deterministik, tanpa mengubah semantic intent ───

export function typeRepairSafe(q: MasterQuestion): MasterQuestion {
  return { ...q, type: "PILIHAN_GANDA", options: q.options.map((o) => (typeof o === "string" ? o : String(o))) };
}

export function explanationReword(q: MasterQuestion): MasterQuestion {
  const e = (q.explanation || "").trim();
  const idx = keyIndex(q.correctAnswer, q.type);
  const keyOpt = idx === null ? "" : normOption(q.options[idx] ?? "");
  const kk = (q.kataKunci || []).join(", ");
  if (!keyOpt || idx === null) return q;
  const specific = kk
    ? `'${q.options[idx]}' adalah jawaban yang tepat karena termasuk dalam cakupan ${kk}; pilihan lain tidak sesuai dengan konsep yang ditanyakan.`
    : `'${q.options[idx]}' adalah jawaban yang tepat karena sesuai dengan makna yang ditanyakan soal; pilihan lain tidak tepat.`;
  return { ...q, explanation: specific };
}

export function sanitizeOptionWhitespace(q: MasterQuestion): MasterQuestion {
  return { ...q, options: q.options.map((o) => collapseWsSafe(o)) };
}

function collapseWsSafe(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function explainableWording(q: MasterQuestion): MasterQuestion {
  return q;
}

export function isTemplateExplanationOnly(q: MasterQuestion): boolean {
  const e = normText(q.explanation || "");
  return /adalah jawaban yang tepat karena sesuai dengan konsep yang dimaksud/.test(e);
}

// ─── SEMANTIC deterministic repair (hanya dari tabel terverifikasi) ───

/** Perbaikan kunci sinonim/antonim hanya bila tabel menunjukkan tepat SATU opsi benar. */
export function semanticKeyRepair(q: MasterQuestion): MasterQuestion | null {
  const m = (q.text || "").match(/dari (?:kata )?'([^']+)'/i);
  const target = m ? m[1].toLowerCase() : null;
  if (!target) return null;

  const correctOptions = new Set<string>();
  for (const w of SYNONYM_SETS[target] ?? []) correctOptions.add(w);
  for (const w of ANTONYM_SETS[target] ?? []) correctOptions.add(w);
  if (correctOptions.size === 0) return null;

  const matches = q.options
    .map((o, i) => ({ o: normOption(o), i }))
    .filter((x) => x.o && correctOptions.has(x.o));
  if (matches.length !== 1) return null;

  const fixed = typeRepairSafe(q);
  const isAntonim = (ANTONYM_SETS[target] ?? []).includes(matches[0].o);
  const rel = isAntonim ? "lawan kata" : "sinonim";
  return {
    ...fixed,
    correctAnswer: String(matches[0].i),
    explanation: `${target[0].toUpperCase() + target.slice(1)}: ${rel} dari kata '${target}' adalah '${q.options[matches[0].i]}'. Pilihan lain tidak memiliki hubungan ${rel} dengan '${target}'.`,
  };
}

/** Koreksi ejaan pada opsi/teks hanya bila rule terverifikasi. */
export function ejaanRepair(q: MasterQuestion): MasterQuestion | null {
  const changed = new Map<string, string>();
  const norm = (s: string) => normText(s);
  for (const rule of EJAAN_RULES) {
    const o = norm(rule.original);
    for (let i = 0; i < q.options.length; i++) {
      const optNorm = norm(q.options[i]);
      if (optNorm === o) changed.set(q.options[i], rule.corrected);
    }
  }
  if (changed.size === 0) return null;
  return { ...q, options: q.options.map((o) => changed.get(o) ?? o) };
}