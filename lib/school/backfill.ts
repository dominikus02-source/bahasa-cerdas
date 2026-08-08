/**
 * P1-C Phase 3 — Controlled School Identity Backfill engine (PURE).
 *
 * MENGANDUNG LOGIKA KEPUTUSAN BACKFILL SAJA. File ini MURNI (pure):
 *   * TIDAK mengimpor Prisma, tidak membaca/menulis DB.
 *   * Tidak ada create/update/upsert/delete di file ini.
 *   * Keluaran = keputusan yang dapat diaudit (BackfillDecision).
 *     Penerapan (write) dilakukan SEMATA oleh CLI `scripts/school-backfill.ts`
 *     dengan predicate `WHERE schoolId IS NULL` (concurrency-safe).
 *
 * Engine ini MENGONSUMSI (bukan menyalin) helper Phase 2:
 *   * matchStudentSchool        → hierarki evidence L5..L0 + decision type
 *   * resolveGroupEvidence      → bukti grup (L2/L1), semua grup dievaluasi
 *   * findPotentialDuplicateSchools → flag duplikat katalog (FLAG_FOR_REVIEW)
 *   * normalizeSchoolName       → normalisasi deterministik (single helper)
 *
 * LEGACY DATA IS IMMUTABLE: `Profile.school` TIDAK pernah diubah oleh engine
 * maupun CLI. `schoolId` adalah identity layer baru yang terpisah.
 */

import {
  matchStudentSchool,
  resolveGroupEvidence,
  findPotentialDuplicateSchools,
  type ConfidenceLevel,
  type EvidenceLevel,
  type GroupEvidenceQuality,
  type StudentEvidence,
  type SchoolRecord,
  type AliasRecord,
} from "./matching";

export type BackfillSource =
  | "STUDENT_SCHOOL" // bukti dari Profile.school (L4/L3)
  | "GROUP_EVIDENCE" // bukti dari grup aktif (L2)
  | "EXPLICIT" // schoolId sudah terisi (L5)
  | "NONE";

export type BackfillCase =
  | "CASE_A_VERIFIED_ALIAS"
  | "CASE_B_NORMALIZED_EXACT"
  | "CASE_C_GROUP_EVIDENCE"
  | "CASE_D_CONFLICT_AMBIGUOUS"
  | "CASE_E_EXISTING_SCHOOL_ID"
  | "CASE_F_NO_EVIDENCE";

/** Keputusan backfill satu profil — dapat diaudit, TANPA perubahan data. */
export interface BackfillDecision {
  profileId: string;
  previousSchoolId: string | null;
  proposedSchoolId: string | null;
  decision: string;
  confidence: ConfidenceLevel;
  case: BackfillCase;
  source: BackfillSource;
  evidenceLevel: EvidenceLevel;
  safeToApply: boolean;
  conflicting: boolean;
  reason: string;
  candidateName: string | null;
  groupEvidenceQuality: GroupEvidenceQuality;
}

/**
 * Hitung keputusan backfill satu profil (pure, read-only).
 *
 * Aturan (sesuai P1-C Phase 3):
 *   * existing schoolId → CASE_E, TIDAK diubah. Bila evidence grup menunjuk
 *     sekolah LAIN → ditandai CONFLICTING_EVIDENCE (tetap tidak diubah).
 *   * ALIAS_MATCH / NORMALIZED_EXACT → HIGH, safe.
 *   * GROUP evidence konsisten (L2) → MEDIUM, safe (GROUP_EVIDENCE_BACKFILL).
 *   * GROUP evidence konflik (L0 MULTI_DIFFERENT) → AMBIGUOUS_GROUP_EVIDENCE,
 *     tidak aman.
 *   * Ambiguous canonical/alias → tidak aman.
 *   * Kontekstual L1 / no evidence → UNRESOLVED, tidak aman.
 */
export function decideBackfill(
  evidence: StudentEvidence,
  schools: SchoolRecord[],
  aliases: AliasRecord[]
): BackfillDecision {
  const match = matchStudentSchool(evidence, schools, aliases);
  const group = resolveGroupEvidence(evidence.groups, schools, aliases);

  const base = {
    profileId: evidence.studentId,
    previousSchoolId: evidence.existingSchoolId,
    proposedSchoolId: null as string | null,
    candidateName: null as string | null,
    confidence: match.confidence,
    evidenceLevel: match.evidenceLevel,
    source: "NONE" as BackfillSource,
    safeToApply: false,
    conflicting: false,
    groupEvidenceQuality: match.groupEvidenceQuality,
  };

  // CASE E — EXISTING SCHOOL ID (L5)
  if (evidence.existingSchoolId) {
    const conflict =
      group.level === 2 && group.schoolId !== null && group.schoolId !== evidence.existingSchoolId;
    return {
      ...base,
      case: "CASE_E_EXISTING_SCHOOL_ID",
      decision: conflict ? "CONFLICTING_EVIDENCE" : "ALREADY_CANONICAL",
      proposedSchoolId: evidence.existingSchoolId,
      candidateName: match.candidateName,
      conflicting: conflict,
      reason: conflict
        ? "schoolId sudah terisi namun evidence grup menunjuk sekolah berbeda — TIDAK diubah"
        : "schoolId sudah terisi (kanonik) — TIDAK diubah",
    };
  }

  // CASE A — VERIFIED ALIAS (L4)
  if (match.decisionType === "ALIAS_MATCH") {
    return {
      ...base,
      case: "CASE_A_VERIFIED_ALIAS",
      decision: "ALIAS_MATCH",
      proposedSchoolId: match.candidateSchoolId,
      candidateName: match.candidateName,
      source: "STUDENT_SCHOOL",
      safeToApply: true,
      reason: `Profile.school cocok dengan alias terverifikasi "${match.candidateName}"`,
    };
  }

  // CASE B — NORMALIZED EXACT (L3)
  if (match.decisionType === "NORMALIZED_EXACT") {
    return {
      ...base,
      case: "CASE_B_NORMALIZED_EXACT",
      decision: "NORMALIZED_EXACT",
      proposedSchoolId: match.candidateSchoolId,
      candidateName: match.candidateName,
      source: "STUDENT_SCHOOL",
      safeToApply: true,
      reason: `normalizeSchoolName(Profile.school) cocok persis dengan "${match.candidateName}"`,
    };
  }

  // CASE C — GROUP EVIDENCE (L2)
  if (
    (match.decisionType === "CANDIDATE_ONLY" ||
      match.decisionType === "GROUP_EVIDENCE_CANDIDATE") &&
    match.evidenceLevel === 2 &&
    match.candidateSchoolId
  ) {
    return {
      ...base,
      case: "CASE_C_GROUP_EVIDENCE",
      decision: "GROUP_EVIDENCE_BACKFILL",
      proposedSchoolId: match.candidateSchoolId,
      candidateName: match.candidateName,
      source: "GROUP_EVIDENCE",
      safeToApply: true,
      reason: `semua evidence grup aktif konsisten menunjuk "${match.candidateName}"`,
    };
  }

  // CASE D — CONFLICT / AMBIGUOUS (L0 multi-school / L3 duplikat / L4 alias)
  if (match.decisionType === "AMBIGUOUS_GROUP_EVIDENCE") {
    return {
      ...base,
      case: "CASE_D_CONFLICT_AMBIGUOUS",
      decision: "AMBIGUOUS_GROUP_EVIDENCE",
      conflicting: true,
      reason: match.ambiguityReason ?? "evidence grup menunjuk sekolah berbeda",
    };
  }
  if (match.decisionType === "AMBIGUOUS_CANONICAL") {
    return {
      ...base,
      case: "CASE_D_CONFLICT_AMBIGUOUS",
      decision: "AMBIGUOUS_CANONICAL",
      conflicting: true,
      reason: match.ambiguityReason ?? "duplikat normalizedName di katalog School",
    };
  }
  if (match.decisionType === "AMBIGUOUS_ALIAS") {
    return {
      ...base,
      case: "CASE_D_CONFLICT_AMBIGUOUS",
      decision: "AMBIGUOUS_ALIAS",
      conflicting: true,
      reason: match.ambiguityReason ?? "alias normalisasi menunjuk lebih dari satu School",
    };
  }

  // CASE F — NO EVIDENCE / contextual too weak
  return {
    ...base,
    case: "CASE_F_NO_EVIDENCE",
    decision:
      match.decisionType === "NO_FALSE_INFERENCE" ? "NO_FALSE_INFERENCE" : "UNRESOLVED",
    candidateName: match.candidateName,
    reason:
      match.decisionType === "NO_FALSE_INFERENCE"
        ? "sekolah guru kosong — jangan menebak"
        : match.evidenceLevel === 1
          ? "hanya bukti kontekstual (L1) — belum cukup kuat"
          : "tidak ada evidence cukup untuk resolve",
  };
}

/** Agregat ringkasan backfill untuk laporan dry-run. */
export interface BackfillSummary {
  totalProfiles: number;
  alreadyCanonical: number;
  normalizedExact: number;
  aliasMatch: number;
  groupEvidence: number;
  ambiguous: number;
  conflicting: number;
  unresolved: number;
  safeToBackfill: number;
  requiresReview: number;
  remainingUnresolved: number;
  catalogConflicts: number;
  perSchool: Record<
    string,
    { schoolName: string; normalizedExact: number; alias: number; groupEvidence: number }
  >;
}

export function summarizeBackfill(
  decisions: BackfillDecision[],
  schools: SchoolRecord[]
): BackfillSummary {
  const perSchool: BackfillSummary["perSchool"] = {};
  const summary: BackfillSummary = {
    totalProfiles: decisions.length,
    alreadyCanonical: 0,
    normalizedExact: 0,
    aliasMatch: 0,
    groupEvidence: 0,
    ambiguous: 0,
    conflicting: 0,
    unresolved: 0,
    safeToBackfill: 0,
    requiresReview: 0,
    remainingUnresolved: 0,
    catalogConflicts: 0,
    perSchool,
  };

  for (const d of decisions) {
    switch (d.decision) {
      case "ALREADY_CANONICAL":
        summary.alreadyCanonical++;
        break;
      case "NORMALIZED_EXACT":
        summary.normalizedExact++;
        break;
      case "ALIAS_MATCH":
        summary.aliasMatch++;
        break;
      case "GROUP_EVIDENCE_BACKFILL":
        summary.groupEvidence++;
        break;
      case "AMBIGUOUS_CANONICAL":
      case "AMBIGUOUS_ALIAS":
      case "AMBIGUOUS_GROUP_EVIDENCE":
        summary.ambiguous++;
        summary.requiresReview++;
        break;
      case "CONFLICTING_EVIDENCE":
        summary.conflicting++;
        summary.requiresReview++;
        break;
      default:
        summary.unresolved++;
        summary.remainingUnresolved++;
    }

    if (d.safeToApply) {
      summary.safeToBackfill++;
    }

    if (d.safeToApply && d.proposedSchoolId && d.candidateName) {
      const key = d.proposedSchoolId;
      if (!perSchool[key]) {
        perSchool[key] = { schoolName: d.candidateName, normalizedExact: 0, alias: 0, groupEvidence: 0 };
      }
      if (d.decision === "NORMALIZED_EXACT") perSchool[key].normalizedExact++;
      else if (d.decision === "ALIAS_MATCH") perSchool[key].alias++;
      else if (d.decision === "GROUP_EVIDENCE_BACKFILL") perSchool[key].groupEvidence++;
    }
  }

  summary.catalogConflicts = findPotentialDuplicateSchools(schools).length;
  return summary;
}
