/**
 * P1-C Phase 2 — Pure read-only school-identity matching engine.
 *
 * MENGANDUNG LOGIKA PENCANDIAN SAJA. File ini MURNI (pure):
 *   * TIDAK mengimpor Prisma, tidak membaca/menulis DB.
 *   * TIDAK pernah auto-assign `Profile.schoolId`, tidak membuat School,
 *     tidak membuat SchoolAlias, tidak merge.
 *   * Keluaran = kandidat + tingkat bukti (evidence) + confidence,
 *     TANPA perubahan data apa pun (DATABASE WRITES = 0).
 *
 * Satu-satunya helper normalisasi = `normalizeSchoolName` dari ./normalize
 * (dilarang duplikasi logika normalisasi di file lain).
 *
 * Hierarki bukti (evidence):
 *   LEVEL 5 EXPLICIT           — `Profile.schoolId` sudah terisi → ALREADY_CANONICAL.
 *   LEVEL 4 VERIFIED ALIAS     — nama legacy cocok dengan SchoolAlias.normalizedAlias
 *                                 (unik per aturan @@unique).
 *   LEVEL 3 NORMALIZED EXACT   — nama legacy cocok dengan School.normalizedName.
 *   LEVEL 2 CLASS/GROUP        — grup aktif murid → sekolah guru (Profile.school guru)
 *                                 yang dapat di-resolve ke satu School.
 *   LEVEL 1 CONTEXTUAL         — bukti grup ada tapi sekolah guru TIDAK dapat
 *                                 di-resolve ke School kanonik (candidate nama saja).
 *   LEVEL 0 UNRESOLVED         — tanpa bukti apa pun.
 *
 * Confidence:
 *   ALREADY_CANONICAL / HIGH_CONFIDENCE / MEDIUM_CONFIDENCE / LOW_CONFIDENCE /
 *   AMBIGUOUS / UNRESOLVED.
 */

import { normalizeSchoolName } from "./normalize";

export type ConfidenceLevel =
  | "ALREADY_CANONICAL"
  | "HIGH_CONFIDENCE"
  | "MEDIUM_CONFIDENCE"
  | "LOW_CONFIDENCE"
  | "AMBIGUOUS"
  | "UNRESOLVED";

export type EvidenceLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type DecisionType =
  | "ALREADY_CANONICAL"
  | "ALIAS_MATCH"
  | "NORMALIZED_EXACT"
  | "CLASS_TEACHER_SCHOOL"
  | "CANDIDATE_ONLY"
  | "GROUP_EVIDENCE_CANDIDATE"
  | "AMBIGUOUS_ALIAS"
  | "AMBIGUOUS_CANONICAL"
  | "AMBIGUOUS_GROUP_EVIDENCE"
  | "NO_FALSE_INFERENCE"
  | "UNRESOLVED";

export type GroupEvidenceQuality =
  | "SINGLE_GROUP"
  | "MULTI_SAME_SCHOOL"
  | "MULTI_DIFFERENT_SCHOOL"
  | "TEACHER_EMPTY"
  | "NO_GROUP"
  | "INACTIVE_ONLY";

/** Representasi kanonik School (subset field yang relevan). */
export interface SchoolRecord {
  id: string;
  canonicalName: string;
  normalizedName: string;
  isActive: boolean;
}

/** Representasi SchoolAlias. */
export interface AliasRecord {
  id: string;
  schoolId: string;
  alias: string;
  normalizedAlias: string;
}

/** Bukti grup tempat murid terdaftar. */
export interface GroupEvidence {
  groupId: string;
  isActive: boolean;
  teacherSchool: string | null;
}

/** Input pemetaan satu murid (plain data, tanpa relasi Prisma). */
export interface StudentEvidence {
  studentId: string;
  legacySchool: string | null;
  existingSchoolId: string | null;
  groups: GroupEvidence[];
}

/** Hasil keputusan pemetaan satu murid (kandidat saja, TANPA perubahan data). */
export interface StudentDecision {
  studentId: string;
  legacyNormalized: string;
  evidenceLevel: EvidenceLevel;
  confidence: ConfidenceLevel;
  decisionType: DecisionType;
  candidateSchoolId: string | null;
  candidateName: string | null;
  groupEvidenceQuality: GroupEvidenceQuality;
  ambiguityReason?: string;
}

/**
 * Resolve nama sekolah (string) ke School kanonik.
 * Prioritas: alias eksplisit → normalizedName. Return null bila tidak unik
 * atau tidak ditemukan (bukan tebakan).
 */
function resolveToSchoolId(
  raw: string | null | undefined,
  schools: SchoolRecord[],
  aliases: AliasRecord[]
): string | null {
  const norm = normalizeSchoolName(raw);
  if (!norm) return null;

  const aliasMatches = aliases.filter((a) => a.normalizedAlias === norm);
  if (aliasMatches.length === 1) {
    const school = schools.find((s) => s.id === aliasMatches[0].schoolId);
    return school && school.isActive ? school.id : null;
  }
  if (aliasMatches.length > 1) return null;

  const canonicalMatches = schools.filter(
    (s) => s.isActive && s.normalizedName === norm
  );
  if (canonicalMatches.length === 1) return canonicalMatches[0].id;
  return null;
}

/** Klasifikasi kualitas bukti grup. */
export function classifyGroupEvidence(groups: GroupEvidence[]): GroupEvidenceQuality {
  if (groups.length === 0) return "NO_GROUP";
  const active = groups.filter((g) => g.isActive);
  if (active.length === 0) return "INACTIVE_ONLY";
  return "SINGLE_GROUP";
}

/**
 * Evaluasi bukti grup → kandidat sekolah guru (LEVEL 2) atau kontekstual (LEVEL 1).
 * Return:
 *   { level, schoolId, schoolName, quality, ambiguityReason }
 * level 2 = grup konsisten ke satu School; level 1 = hanya nama kontekstual;
 * null schoolId + level 0 = tidak dapat disimpulkan (TEACHER_EMPTY / konflik).
 */
export function resolveGroupEvidence(
  groups: GroupEvidence[],
  schools: SchoolRecord[],
  aliases: AliasRecord[]
): {
  level: 0 | 1 | 2;
  schoolId: string | null;
  schoolName: string | null;
  quality: GroupEvidenceQuality;
  ambiguityReason?: string;
} {
  if (groups.length === 0) {
    return { level: 0, schoolId: null, schoolName: null, quality: "NO_GROUP" };
  }
  const active = groups.filter((g) => g.isActive);
  if (active.length === 0) {
    return {
      level: 0,
      schoolId: null,
      schoolName: null,
      quality: "INACTIVE_ONLY",
      ambiguityReason: "semua grup nonaktif",
    };
  }

  const teacherSchoolValues = active
    .map((g) => g.teacherSchool)
    .filter((v): v is string => !!v && v.trim().length > 0);

  if (teacherSchoolValues.length === 0) {
    return {
      level: 0,
      schoolId: null,
      schoolName: null,
      quality: "TEACHER_EMPTY",
      ambiguityReason: "sekolah guru kosong di semua grup aktif",
    };
  }

  const resolved = teacherSchoolValues.map((v) => resolveToSchoolId(v, schools, aliases));
  const uniqueResolved = Array.from(new Set(resolved.filter((r): r is string => !!r)));

  if (uniqueResolved.length === 1) {
    const school = schools.find((s) => s.id === uniqueResolved[0]);
    const quality: GroupEvidenceQuality =
      active.length > 1 ? "MULTI_SAME_SCHOOL" : "SINGLE_GROUP";
    return {
      level: 2,
      schoolId: school ? school.id : null,
      schoolName: school ? school.canonicalName : null,
      quality,
    };
  }

  if (uniqueResolved.length > 1) {
    return {
      level: 0,
      schoolId: null,
      schoolName: null,
      quality: "MULTI_DIFFERENT_SCHOOL",
      ambiguityReason: "grup murid menunjuk ke sekolah guru yang berbeda",
    };
  }

  // Tidak ada yang ter-resolve ke School kanonik → kontekstual (LEVEL 1).
  return {
    level: 1,
    schoolId: null,
    schoolName: teacherSchoolValues[0],
    quality: active.length > 1 ? "MULTI_SAME_SCHOOL" : "SINGLE_GROUP",
    ambiguityReason: "sekolah guru tidak dapat di-resolve ke School kanonik",
  };
}

/**
 * Keputusan pemetaan satu murid. MURNI — tidak menulis apa pun ke DB.
 * Keluaran selalu kandidat; `existingSchoolId` dihormati (ALREADY_CANONICAL).
 */
export function matchStudentSchool(
  evidence: StudentEvidence,
  schools: SchoolRecord[],
  aliases: AliasRecord[]
): StudentDecision {
  const legacyNormalized = normalizeSchoolName(evidence.legacySchool);
  const base: Omit<StudentDecision, "decisionType" | "confidence" | "evidenceLevel"> = {
    studentId: evidence.studentId,
    legacyNormalized,
    candidateSchoolId: null,
    candidateName: null,
    groupEvidenceQuality: classifyGroupEvidence(evidence.groups),
  };

  // LEVEL 5 — EXPLICIT
  if (evidence.existingSchoolId) {
    const school = schools.find((s) => s.id === evidence.existingSchoolId);
    return {
      ...base,
      evidenceLevel: 5,
      confidence: "ALREADY_CANONICAL",
      decisionType: "ALREADY_CANONICAL",
      candidateSchoolId: evidence.existingSchoolId,
      candidateName: school ? school.canonicalName : null,
    };
  }

  // LEVEL 4 — VERIFIED ALIAS
  if (legacyNormalized) {
    const aliasMatches = aliases.filter((a) => a.normalizedAlias === legacyNormalized);
    if (aliasMatches.length === 1) {
      const school = schools.find((s) => s.id === aliasMatches[0].schoolId);
      if (school && school.isActive) {
        return {
          ...base,
          evidenceLevel: 4,
          confidence: "HIGH_CONFIDENCE",
          decisionType: "ALIAS_MATCH",
          candidateSchoolId: school.id,
          candidateName: school.canonicalName,
        };
      }
    }
    if (aliasMatches.length > 1) {
      return {
        ...base,
        evidenceLevel: 4,
        confidence: "AMBIGUOUS",
        decisionType: "AMBIGUOUS_ALIAS",
        ambiguityReason: "lebih dari satu alias cocok dengan nama legacy",
      };
    }
  }

  // LEVEL 3 — NORMALIZED EXACT
  if (legacyNormalized) {
    const canonicalMatches = schools.filter(
      (s) => s.isActive && s.normalizedName === legacyNormalized
    );
    if (canonicalMatches.length === 1) {
      return {
        ...base,
        evidenceLevel: 3,
        confidence: "HIGH_CONFIDENCE",
        decisionType: "NORMALIZED_EXACT",
        candidateSchoolId: canonicalMatches[0].id,
        candidateName: canonicalMatches[0].canonicalName,
      };
    }
    if (canonicalMatches.length > 1) {
      return {
        ...base,
        evidenceLevel: 3,
        confidence: "AMBIGUOUS",
        decisionType: "AMBIGUOUS_CANONICAL",
        ambiguityReason: "lebih dari satu School kanonik dengan normalizedName sama",
      };
    }
  }

  // LEVEL 2 / LEVEL 1 — GROUP EVIDENCE
  const group = resolveGroupEvidence(evidence.groups, schools, aliases);
  if (group.level === 2 && group.schoolId) {
    return {
      ...base,
      evidenceLevel: 2,
      confidence: "MEDIUM_CONFIDENCE",
      decisionType: legacyNormalized ? "GROUP_EVIDENCE_CANDIDATE" : "CANDIDATE_ONLY",
      candidateSchoolId: group.schoolId,
      candidateName: group.schoolName,
      groupEvidenceQuality: group.quality,
    };
  }
  if (group.level === 1) {
    return {
      ...base,
      evidenceLevel: 1,
      confidence: "LOW_CONFIDENCE",
      decisionType: "GROUP_EVIDENCE_CANDIDATE",
      candidateSchoolId: null,
      candidateName: group.schoolName,
      groupEvidenceQuality: group.quality,
      ambiguityReason: group.ambiguityReason,
    };
  }
  if (group.quality === "TEACHER_EMPTY") {
    return {
      ...base,
      evidenceLevel: 0,
      confidence: "UNRESOLVED",
      decisionType: "NO_FALSE_INFERENCE",
      groupEvidenceQuality: group.quality,
      ambiguityReason: group.ambiguityReason,
    };
  }
  if (group.quality === "MULTI_DIFFERENT_SCHOOL") {
    return {
      ...base,
      evidenceLevel: 0,
      confidence: "AMBIGUOUS",
      decisionType: "AMBIGUOUS_GROUP_EVIDENCE",
      groupEvidenceQuality: group.quality,
      ambiguityReason: group.ambiguityReason,
    };
  }

  // LEVEL 0 — UNRESOLVED
  return {
    ...base,
    evidenceLevel: 0,
    confidence: "UNRESOLVED",
    decisionType: "UNRESOLVED",
  };
}

/** Deteksi potensi duplikat School berdasarkan normalizedName (tidak merge). */
export function findPotentialDuplicateSchools(
  schools: SchoolRecord[]
): { normalizedName: string; ids: string[]; names: string[] }[] {
  const byNorm = new Map<string, SchoolRecord[]>();
  for (const s of schools) {
    const list = byNorm.get(s.normalizedName) ?? [];
    list.push(s);
    byNorm.set(s.normalizedName, list);
  }
  const dups: { normalizedName: string; ids: string[]; names: string[] }[] = [];
  for (const [norm, list] of byNorm) {
    if (list.length > 1) {
      dups.push({
        normalizedName: norm,
        ids: list.map((s) => s.id),
        names: list.map((s) => s.canonicalName),
      });
    }
  }
  return dups.sort((a, b) => a.normalizedName.localeCompare(b.normalizedName));
}

/** Ringkasan agregat daftar keputusan. */
export interface MatchSummary {
  total: number;
  alreadyCanonical: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  ambiguous: number;
  unresolved: number;
  groupEvidenceOnly: number;
  normalizedExact: number;
  aliasMatch: number;
  conflictingEvidence: number;
  noFalseInference: number;
  qualityDistribution: Record<GroupEvidenceQuality, number>;
}

export function summarizeDecisions(decisions: StudentDecision[]): MatchSummary {
  const empty: Record<GroupEvidenceQuality, number> = {
    SINGLE_GROUP: 0,
    MULTI_SAME_SCHOOL: 0,
    MULTI_DIFFERENT_SCHOOL: 0,
    TEACHER_EMPTY: 0,
    NO_GROUP: 0,
    INACTIVE_ONLY: 0,
  };
  const summary: MatchSummary = {
    total: decisions.length,
    alreadyCanonical: 0,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
    ambiguous: 0,
    unresolved: 0,
    groupEvidenceOnly: 0,
    normalizedExact: 0,
    aliasMatch: 0,
    conflictingEvidence: 0,
    noFalseInference: 0,
    qualityDistribution: { ...empty },
  };
  for (const d of decisions) {
    summary.qualityDistribution[d.groupEvidenceQuality] =
      (summary.qualityDistribution[d.groupEvidenceQuality] ?? 0) + 1;
    switch (d.confidence) {
      case "ALREADY_CANONICAL":
        summary.alreadyCanonical++;
        break;
      case "HIGH_CONFIDENCE":
        summary.highConfidence++;
        break;
      case "MEDIUM_CONFIDENCE":
        summary.mediumConfidence++;
        break;
      case "LOW_CONFIDENCE":
        summary.lowConfidence++;
        break;
      case "AMBIGUOUS":
        summary.ambiguous++;
        break;
      default:
        summary.unresolved++;
    }
    switch (d.decisionType) {
      case "CANDIDATE_ONLY":
      case "GROUP_EVIDENCE_CANDIDATE":
        summary.groupEvidenceOnly++;
        break;
      case "NORMALIZED_EXACT":
        summary.normalizedExact++;
        break;
      case "ALIAS_MATCH":
        summary.aliasMatch++;
        break;
      case "AMBIGUOUS_GROUP_EVIDENCE":
      case "AMBIGUOUS_CANONICAL":
      case "AMBIGUOUS_ALIAS":
        summary.conflictingEvidence++;
        break;
      case "NO_FALSE_INFERENCE":
        summary.noFalseInference++;
        break;
      default:
        break;
    }
  }
  return summary;
}
