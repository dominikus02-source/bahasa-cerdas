import { MasterQuestion, ClassificationResult, IssueCategory, RepairDisposition } from "./types";
import { normText, keyIndex, normOption } from "./normalize";
import {
  isTemplateConceptQuestion,
  isJelaskanTokenQuestion,
  isTautologyBS,
  isSelfAnswer,
  isWrongTypeMCQ,
  isJelaskanTokenBroken,
  optionIssues,
  keyInRange,
  hasTemplateExplanation,
  explanationTooShort,
  difficultyMismatch,
  trivialContentHOTS,
  languageError,
  skillMismatch,
  unsupportedClaim,
  explanationContradictsKey,
} from "./detectors";
import { semanticValidate } from "./semantics";

export function exactDuplicateKey(q: MasterQuestion): string {
  return [
    normText(q.text),
    q.options.map(normOption).join("|"),
    normText(q.correctAnswer),
  ].join("::");
}

export function nearDuplicateKey(q: MasterQuestion): string {
  return normText(q.text);
}

export function tokenJaccard(a: string, b: string): number {
  const sa = new Set(normText(a).split(" ").filter(Boolean));
  const sb = new Set(normText(b).split(" ").filter(Boolean));
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = sa.size + sb.size - inter;
  return inter / union;
}

export interface BankContext {
  exactDupOf: Map<string, string>;
  nearDupMap: Map<string, string[]>;
}

export function buildDuplicateContext(all: MasterQuestion[]): BankContext {
  const exactDupOf = new Map<string, string>();
  const firstSeen = new Map<string, string>();
  for (const q of all) {
    const k = exactDuplicateKey(q);
    if (!firstSeen.has(k)) firstSeen.set(k, q.kodeSoal);
    else exactDupOf.set(q.kodeSoal, firstSeen.get(k)!);
  }
  const nearGroups = new Map<string, string[]>();
  const byNearKey = new Map<string, MasterQuestion[]>();
  for (const q of all) {
    const k = nearDuplicateKey(q);
    if (!byNearKey.has(k)) byNearKey.set(k, []);
    byNearKey.get(k)!.push(q);
  }
  for (const [, group] of byNearKey) {
    if (group.length < 2) continue;
    const first = group[0];
    const variants = group
      .slice(1)
      .filter((q) => exactDuplicateKey(q) !== exactDuplicateKey(first));
    if (variants.length > 0)
      nearGroups.set(first.kodeSoal, variants.map((q) => q.kodeSoal));
  }
  return { exactDupOf, nearDupMap: nearGroups };
}

export interface ClassifyOptions {
  nearDupThreshold?: number;
}

export function classifyQuestion(
  q: MasterQuestion,
  ctx: BankContext,
  opts: ClassifyOptions = {}
): ClassificationResult {
  const threshold = opts.nearDupThreshold ?? 0.9;
  const flags = new Set<IssueCategory>();
  const reasons: string[] = [];
  let repair: ClassificationResult["repair"] = null;

  const template = isTemplateConceptQuestion(q);
  const jelaskan = isJelaskanTokenQuestion(q);
  const tautology = isTautologyBS(q);
  const selfAnswer = isSelfAnswer(q);
  const wrongType = isWrongTypeMCQ(q);
  const { ok: keyOk, idx } = keyInRange(q);

  if (template.is) {
    flags.add("BAD_TEMPLATE");
    reasons.push(`templat "contoh ${template.concept}"`);
    const keyOpt = idx !== null && q.options[idx] ? normOption(q.options[idx]) : "";
    if (template.concept === keyOpt || (keyOpt && keyOpt.includes(template.concept!))) {
      flags.add("NO_CORRECT");
      reasons.push("kunci = nama konsep, bukan contoh");
    } else {
      flags.add("NO_CORRECT");
      reasons.push("tidak ada opsi yang merupakan contoh nyata");
    }
  }

  if (jelaskan) {
    flags.add("BAD_TEMPLATE");
    reasons.push("templat 'Jelaskan pengertian …'");
    if (isJelaskanTokenBroken(q)) {
      flags.add("BROKEN_CONTENT");
      reasons.push("isian token tunggal (opsi = jawaban itu sendiri)");
    }
  }

  if (tautology) {
    flags.add("TAUTOLOGY");
    flags.add("UNSUPPORTED_CLAIM");
    reasons.push("pernyataan tautologis / tidak dapat diuji");
  }

  if (!keyOk) {
    flags.add("WRONG_KEY");
    reasons.push(`kunci '${q.correctAnswer}' di luar jangkauan opsi`);
  } else if (selfAnswer.is) {
    flags.add("WRONG_KEY");
    reasons.push(`kunci = kata '${selfAnswer.concept}' itu sendiri (bukan jawaban)`);
  }

  const optIssues = optionIssues(q);
  if (optIssues.length > 0) {
    flags.add("INVALID_OPTION");
    reasons.push(...optIssues);
  }

  const dup = ctx.exactDupOf.get(q.kodeSoal);
  if (dup) {
    flags.add("DUPLICATE");
    reasons.push(`duplikat persis dari ${dup}`);
  }

  const near = ctx.nearDupMap.get(q.kodeSoal) || [];
  if (near.length > 0) {
    flags.add("NEAR_DUPLICATE");
    reasons.push(`stem identik dengan ${near.join(", ")}`);
  }

  if (hasTemplateExplanation(q)) {
    flags.add("EXPLANATION_MISMATCH");
    reasons.push("explanation templat (tidak menjelaskan)");
  } else if (explanationTooShort(q)) {
    flags.add("EXPLANATION_MISMATCH");
    reasons.push("explanation terlalu pendek");
  }

  if (explanationContradictsKey(q)) {
    flags.add("EXPLANATION_MISMATCH");
    reasons.push("explanation menyangkal kunci");
  }

  if (trivialContentHOTS(q)) {
    flags.add("DIFFICULTY_MISMATCH");
    reasons.push("konten trivial ditandai SULIT/HOTS");
  }
  if (difficultyMismatch(q)) {
    flags.add("DIFFICULTY_MISMATCH");
    reasons.push("indikator ≠ difficulty");
  }

  const langErr = languageError(q);
  if (langErr) {
    flags.add("LANGUAGE_ERROR");
    reasons.push(langErr);
  }

  if (skillMismatch(q)) {
    flags.add("SKILL_MISMATCH");
    reasons.push("kodeSoal prefix ≠ tema");
  }

  if (unsupportedClaim(q)) {
    flags.add("UNSUPPORTED_CLAIM");
  }

  if (wrongType) {
    flags.add("WRONG_METADATA");
    reasons.push("tipe salah (MCQ ber-opsi diketik BS/ISIAN)");
    repair = {
      type: "PILIHAN_GANDA",
      reason: "opsi ≥2 dengan kunci index → normalisasi tipe ke PILIHAN_GANDA (konten tidak diubah)",
    };
  }

  const sem = semanticValidate(q);
  const isPatternQuestion = template.is || jelaskan || tautology;
  if (!isPatternQuestion && !sem.valid) {
    if (sem.multiCorrect) {
      flags.add("MULTI_CORRECT");
      reasons.push(sem.reason || "lebih dari satu jawaban dapat dipertahankan");
    } else if (sem.ambiguous) {
      flags.add("AMBIGUOUS");
      reasons.push(sem.reason || "interpretasi ganda");
    } else if (sem.reason && /kunci/.test(sem.reason)) {
      flags.add("WRONG_KEY");
      reasons.push(sem.reason);
    } else if (sem.reason) {
      flags.add("AMBIGUOUS");
      reasons.push(sem.reason);
    }
  }

  let disposition: RepairDisposition;
  if (isPatternQuestion) {
    disposition = "AI_REPAIR_CANDIDATE";
    if (flags.has("DUPLICATE"))
      reasons.push("duplikat dalam keluarga templat — canonical dipilih, keluarga diregenerasi");
  } else if (flags.has("WRONG_KEY") || flags.has("NO_CORRECT") || flags.has("MULTI_CORRECT")) {
    disposition = "HUMAN_REVIEW_REQUIRED";
  } else if (flags.has("DUPLICATE")) {
    disposition = "HUMAN_REVIEW_REQUIRED";
    reasons.push("duplikat — canonical dipilih, bukan auto-hapus");
  } else if (
    flags.has("INVALID_OPTION") ||
    flags.has("AMBIGUOUS") ||
    flags.has("EMPTY_CONTEXT") ||
    flags.has("BROKEN_CONTEXT") ||
    flags.has("LANGUAGE_ERROR") ||
    flags.has("SKILL_MISMATCH") ||
    flags.has("UNSUPPORTED_CLAIM")
  ) {
    disposition = "HUMAN_REVIEW_REQUIRED";
  } else if (wrongType && !flags.has("DIFFICULTY_MISMATCH") && !flags.has("EXPLANATION_MISMATCH")) {
    disposition = "AUTO_REPAIR_ALLOWED";
  } else if (flags.size === 0) {
    disposition = "GOLD";
  } else {
    disposition = "HUMAN_REVIEW_REQUIRED";
  }

  const gold = disposition === "GOLD" || (disposition === "AUTO_REPAIR_ALLOWED" && repair?.type === "PILIHAN_GANDA");

  return {
    kodeSoal: q.kodeSoal,
    file: q.file,
    text: q.text,
    type: q.type,
    difficulty: q.difficulty,
    flags: [...flags],
    disposition,
    gold,
    repair,
    reason: reasons,
    duplicateOf: dup,
    nearDuplicateOf: near.length ? near : undefined,
  };
}

export function isProductionEligible(q: MasterQuestion, result: ClassificationResult): boolean {
  return result.gold && !result.flags.includes("DUPLICATE") && !result.flags.includes("AMBIGUOUS");
}

export function countByDisposition(results: ClassificationResult[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of results) out[r.disposition] = (out[r.disposition] || 0) + 1;
  return out;
}

export function countByFlag(results: ClassificationResult[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of results)
    for (const f of r.flags) out[f] = (out[f] || 0) + 1;
  return out;
}
