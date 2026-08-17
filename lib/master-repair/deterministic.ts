import { MasterQuestion, normOption } from "../master-recovery";

// ─── Repair deterministik (tanpa AI, tanpa mengarang konten) ──

/** Tipe salah (MCQ ber-opsi diketik BS/ISIAN) → PILIHAN_GANDA. Opsi/kunci/teks asli TIDAK diubah. */
export function typeRepair(q: MasterQuestion): MasterQuestion {
  return {
    ...q,
    type: "PILIHAN_GANDA",
    options: q.options.map((o) => (typeof o === "string" ? o : String(o))),
  };
}

const SYNONYM_LABEL: Record<string, string> = {
  bahagia: "senang",
  cerdas: "pintar",
  berani: "gagah",
  abadi: "kekal",
  maju: "berkembang",
  malas: "pemalas",
};

/**
 * Perbaikan kunci yang objektif salah — hanya bila SEMANTIC TABLE menunjukkan
 * tepat SATU opsi lain yang benar (WRONG_KEY + bukan multi-correct).
 * Explanation ikut diperbaiki dari tabel (tanpa mengarang fakta baru).
 */
export function wrongKeyRepair(q: MasterQuestion): MasterQuestion | null {
  const m = (q.text || "").match(/dari (?:kata )?'([^']+)'/i);
  const target = m ? m[1].toLowerCase() : null;
  if (!target) return null;
  const correctLabel = SYNONYM_LABEL[target];
  if (!correctLabel) return null;

  const candidates = q.options
    .map((o, i) => ({ o: normOption(o), i }))
    .filter((x) => x.o && x.o === correctLabel);
  if (candidates.length !== 1) return null;

  const fixed = typeRepair(q);
  return {
    ...fixed,
    correctAnswer: String(candidates[0].i),
    explanation: `Sinonim dari kata '${target}' adalah '${correctLabel}'. Opsi lain tidak memiliki makna yang sama dengan '${target}'.`,
  };
}

/** Deteksi kunci yang menunjuk ke kata di stem itu sendiri (self-answer). */
export function isSelfAnswerRepairNeeded(q: MasterQuestion): boolean {
  const m = (q.text || "").match(/dari (?:kata )?'([^']+)'/i);
  const target = m ? m[1].toLowerCase() : null;
  if (!target) return false;
  const idx = parseInt(String(q.correctAnswer), 10);
  const keyOpt = !isNaN(idx) && q.options[idx] ? normOption(q.options[idx]) : "";
  return keyOpt === target;
}

/** Apakah repair konten (concept→context, tautologi, distractor, stem) perlu AI? */
export function isAiContentRepair(repairType: string): boolean {
  return [
    "CONCEPT_TO_CONTEXT",
    "BAD_EXPLAIN_TO_MCQ",
    "TAUTOLOGY_TO_VALID_ITEM",
    "OPTION_REPAIR",
    "STEM_REPAIR",
    "DISTRACTOR_REPAIR",
  ].includes(repairType);
}
