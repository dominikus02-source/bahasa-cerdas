/**
 * DELIVERY GATE — MASTER_BANK production containment (P0.6).
 *
 * Forensic audit verdict (docs/QUESTION_BANK_50_THEME_FORENSIC_AUDIT.md):
 * of 1.500 MASTER_BANK items, 1.480 are template garbage (RETIRE), 19 are
 * recall-only SALVAGE (NOT production-valid until explicitly reviewed) and 1
 * is BROKEN (BC-SINONIM-0003 wrong key). The audit found ZERO items fit to
 * keep as-is.
 *
 * Policy implemented here — an item from `source=MASTER_BANK` is deliverable
 * to a student iff:
 *   1. its kodeSoal is on the explicit content-review allowlist below
 *      (`DELIVERABLE_MASTER_KODE_SOALS`), filled only after human content
 *      review approves the item, AND
 *   2. it passes the deterministic content gate (bank-gate canonical rules,
 *      minus KEY_IN_STEM which is tuned for AI-generated diagnostics and
 *      would over-reject legitimate stimulus-based bank items).
 *
 * The allowlist starts EMPTY: the entire MASTER_BANK source is quarantined
 * for student delivery until the separate content-cleanup / human-review
 * phase approves specific items. Taxonomy/metadata APPROVED status alone is
 * NOT treated as content approval (the audit proved those approvals reviewed
 * taxonomy, not content — 83 of 87 APPROVED master rows were templates).
 *
 * Non-MASTER_BANK soals (AI / IMPORT / custom) are outside this quarantine
 * and always pass — they carry their own creation-time validation.
 *
 * The gate is applied at BOTH the creation boundary (guru bank-soal send,
 * guru latihan pick) AND the student serve-time boundary (murid quiz GET and
 * submission GET) — the serve-time check protects already-published quizzes
 * whose QuizQuestion rows re-read `Soal` live.
 *
 * Deterministic, side-effect free. Reasons are server-side only — never
 * exposed to students.
 */
import { diagnosticSafeIssues } from "@/lib/diagnostic-ai/bank-gate";
import type { DiagnosticSafeReason } from "@/lib/diagnostic-ai/bank-gate";

/** Source label for the quarantined bank. */
export const MASTER_BANK_SOURCE = "MASTER_BANK";

/** Block reason codes (server-side only). */
export type DeliveryBlockReason = "MASTER_NOT_REVIEWED" | DiagnosticSafeReason;

/** Shape of a `Soal` row consumed by the gate. */
export interface DeliverySoalLike {
  kodeSoal: string | null;
  source?: string | null;
  text: string;
  type: string;
  options: string[];
  correctAnswer: string;
}

/**
 * kodeSoal yang sudah lolos REVIEW KONTEN MANUSIA pasca-audit (P0.6).
 * KOSONG = seluruh sumber MASTER_BANK dikarantina untuk pengiriman ke murid.
 * Isi hanya lewat fase CONTENT CLEANUP / HUMAN REVIEW (bukan otomatis).
 */
export const DELIVERABLE_MASTER_KODE_SOALS: ReadonlySet<string> = new Set<string>([]);

/**
 * Content-gate issues for a bank item. KEY_IN_STEM is intentionally excluded:
 * bank items legitimately quote their stimulus sentence in the stem (e.g.
 * SPOK "temukan subjek pada kalimat ..."), so verbatim stem overlap is not
 * evidence of leakage the way it is for generated diagnostics.
 */
export function masterBankContentIssues(soal: DeliverySoalLike): DiagnosticSafeReason[] {
  const issues = diagnosticSafeIssues({
    id: soal.kodeSoal ?? undefined,
    text: soal.text,
    options: soal.options,
    questionType: soal.type,
    correctAnswer: soal.correctAnswer,
  });
  return issues.filter((i) => i.code !== "KEY_IN_STEM").map((i) => i.code);
}

/**
 * Block reason for a bank item (null = deliverable). Non-MASTER_BANK items
 * always return null (outside the quarantine).
 *
 * @param approved allowlist override (tests); defaults to the canonical set.
 */
export function masterBankBlockReason(
  soal: DeliverySoalLike,
  approved: ReadonlySet<string> = DELIVERABLE_MASTER_KODE_SOALS
): DeliveryBlockReason | null {
  if (soal.source !== MASTER_BANK_SOURCE) return null;
  if (!soal.kodeSoal || !approved.has(soal.kodeSoal)) return "MASTER_NOT_REVIEWED";
  const content = masterBankContentIssues(soal);
  return content.length > 0 ? content[0] : null;
}

/**
 * Full deliverability check for a `Soal` row destined to a student.
 * MASTER_BANK items require content-reviewed allowlisting + content-safe.
 */
export function isMasterBankDeliverable(
  soal: DeliverySoalLike,
  approved: ReadonlySet<string> = DELIVERABLE_MASTER_KODE_SOALS
): boolean {
  return masterBankBlockReason(soal, approved) === null;
}

/** Normalize a raw `Soal` row (or partial) into the gate's shape. */
export function toDeliverySoal(row: Record<string, unknown> | null | undefined): DeliverySoalLike {
  return {
    kodeSoal: (row?.kodeSoal as string | null) ?? null,
    source: (row?.source as string | null | undefined) ?? null,
    text: (row?.text as string) ?? "",
    type: (row?.type as string) ?? "",
    options: Array.isArray(row?.options) ? (row.options as string[]) : [],
    correctAnswer: (row?.correctAnswer as string | null | undefined) ?? "",
  };
}
