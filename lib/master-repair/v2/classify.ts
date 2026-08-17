import { MasterQuestion } from "../../master-recovery";
import {
  isTemplateConceptQuestion,
  isTautologyBS,
  isJelaskanTokenQuestion,
  isWrongTypeMCQ,
  isSelfAnswer,
  explanationContradictsKey,
  hasTemplateExplanation,
} from "../../master-recovery";
import { NAMED_FACT_RISK } from "../../master-authoring/gates";
import { RepairCategory } from "./types";

export interface CategoryResult {
  category: RepairCategory;
  subType: string;
  reason: string;
}

const SEMANTIC_KEYWORDS: Array<{ re: RegExp; sub: string }> = [
  { re: /sinonim/i, sub: "SINONIM" },
  { re: /antonim/i, sub: "ANTONIM" },
  { re: /makna kata/i, sub: "MAKNA_KATA" },
  { re: /spok|subjek.?predikat/i, sub: "SPOK" },
  { re: /majas/i, sub: "MAJAS" },
  { re: /ejaan/i, sub: "EJAAN" },
  { re: /kalimat efektif/i, sub: "KALIMAT_EFEKTIF" },
];

export function categorizeQuestion(q: MasterQuestion, repairIntent?: string): CategoryResult {
  const text = [q.text, q.indikator, q.tema, ...(q.kataKunci || [])].join(" ");
  const intent = (repairIntent || "").toUpperCase();

  // FACT-DEPENDENT: nama/judul/tokoh/atribusi
  NAMED_FACT_RISK.lastIndex = 0;
  if (
    NAMED_FACT_RISK.test(q.text) ||
    /karya\s+'[^']+'/i.test(q.text) ||
    /(karya|pengarang|tokoh)\s+(oleh\s+)?[A-ZÀ-Ž][a-zà-ž]+/.test(q.text) ||
    /oleh\s+[A-ZÀ-Ž][a-zà-ž]+/.test(q.text)
  ) {
    return { category: "FACT_DEPENDENT_REPAIR", subType: "FACT", reason: "memuat nama fakta (judul/pengarang/tokoh) — VERIFY OR BLOCK" };
  }

  // SEMANTIC: skill spesifik
  for (const k of SEMANTIC_KEYWORDS) {
    if (k.re.test(text) || intent.startsWith(k.sub)) {
      return { category: "SEMANTIC_REPAIR", subType: k.sub, reason: `skill semantik: ${k.sub}` };
    }
  }

  // KEY / TYPE (SAFE deterministic)
  if (isWrongTypeMCQ(q)) {
    return { category: "SAFE_REPAIR", subType: "TYPE_REPAIR", reason: "tipe soal salah (deterministik)" };
  }
  if (isSelfAnswer(q).is || explanationContradictsKey(q) || (q.kataKunci || []).some((k) => /sinonim|antonim/i.test(k))) {
    return { category: "SAFE_REPAIR", subType: "KEY_REPAIR", reason: "kunci berpotensi salah/self-answer — repair deterministik" };
  }

  // CONTEXT: pattern questions
  if (intent.startsWith("CONCEPT_TO_CONTEXT") || intent.startsWith("TAUTOLOGY") || intent.startsWith("BAD_EXPLAIN")) {
    return { category: "CONTEXT_REPAIR", subType: intent, reason: `pattern konten: ${intent}` };
  }
  if (isTautologyBS(q)) {
    return { category: "CONTEXT_REPAIR", subType: "TAUTOLOGY_TO_VALID_ITEM", reason: "pertanyaan tautologi — perlu konteks" };
  }
  if (isJelaskanTokenQuestion(q)) {
    return { category: "CONTEXT_REPAIR", subType: "BAD_EXPLAIN_TO_MCQ", reason: "pertanyaan definisi langsung — perlu konteks" };
  }
  if (isTemplateConceptQuestion(q).is) {
    return { category: "CONTEXT_REPAIR", subType: "CONCEPT_TO_CONTEXT", reason: "konsep tanpa konteks — perlu konteks" };
  }

  // SAFE: explanation wording / format
  if (hasTemplateExplanation(q)) {
    return { category: "SAFE_REPAIR", subType: "EXPLANATION_REPAIR", reason: "explanasi template — reword deterministik" };
  }

  return { category: "SAFE_REPAIR", subType: "FORMAT_REPAIR", reason: "perbaikan format/kosmetik deterministik" };
}