// Single source of truth for grade levels and Kurikulum Merdeka phases.
//
// The AI tool forms each hardcoded their own grade list containing only
// VII–XII, so Fase A/B/C (SD) were selectable while no SD grade existed to
// pair with them — SD teachers could not generate a modul ajar, soal, or PPT
// at all. Anything that needs a grade dropdown should import from here.

export type Jenjang = "TK" | "SD" | "SMP" | "SMA";

export interface GradeOption {
  /** Roman numeral as written on Indonesian school documents. */
  value: string;
  /** Label shown in dropdowns, e.g. "IV (SD)". */
  label: string;
  jenjang: Jenjang;
  /** Kurikulum Merdeka phase this grade belongs to. */
  phase: string;
}

export const GRADE_OPTIONS: GradeOption[] = [
  { value: "TK", label: "TK/PAUD", jenjang: "TK", phase: "Fondasi" },
  { value: "I", label: "I (SD)", jenjang: "SD", phase: "A" },
  { value: "II", label: "II (SD)", jenjang: "SD", phase: "A" },
  { value: "III", label: "III (SD)", jenjang: "SD", phase: "B" },
  { value: "IV", label: "IV (SD)", jenjang: "SD", phase: "B" },
  { value: "V", label: "V (SD)", jenjang: "SD", phase: "C" },
  { value: "VI", label: "VI (SD)", jenjang: "SD", phase: "C" },
  { value: "VII", label: "VII (SMP)", jenjang: "SMP", phase: "D" },
  { value: "VIII", label: "VIII (SMP)", jenjang: "SMP", phase: "D" },
  { value: "IX", label: "IX (SMP)", jenjang: "SMP", phase: "D" },
  { value: "X", label: "X (SMA/SMK)", jenjang: "SMA", phase: "E" },
  { value: "XI", label: "XI (SMA/SMK)", jenjang: "SMA", phase: "F" },
  { value: "XII", label: "XII (SMA/SMK)", jenjang: "SMA", phase: "F" },
];

export const PHASE_OPTIONS = [
  { value: "Fondasi", label: "Fondasi (TK/PAUD)" },
  { value: "A", label: "A (SD Kelas I-II)" },
  { value: "B", label: "B (SD Kelas III-IV)" },
  { value: "C", label: "C (SD Kelas V-VI)" },
  { value: "D", label: "D (SMP Kelas VII-IX)" },
  { value: "E", label: "E (SMA Kelas X)" },
  { value: "F", label: "F (SMA Kelas XI-XII)" },
];

/** Grades that belong to a phase, so the two dropdowns can never disagree. */
export function gradesForPhase(phase: string): GradeOption[] {
  return GRADE_OPTIONS.filter((g) => g.phase === phase);
}

export function phaseForGrade(grade: string): string {
  return GRADE_OPTIONS.find((g) => g.value === grade)?.phase ?? "E";
}

export function jenjangForGrade(grade: string): Jenjang {
  return GRADE_OPTIONS.find((g) => g.value === grade)?.jenjang ?? "SMA";
}

/** Plain list of roman numerals, for forms that have no phase selector. */
export const GRADE_VALUES = GRADE_OPTIONS.map((g) => g.value);

// ── Arena Junior (dasbor murid TK–SD) ────────────────────────────────────────
// Group.grade adalah teks bebas berisi angka Romawi ("I".."XII") atau "TK".
// Arena Junior memakai enum sendiri (TK, K1..K6), jadi pemetaannya dipusatkan
// di sini supaya tidak ada route yang menebak-nebak formatnya.

const ARENA_JUNIOR_BY_GRADE: Record<string, "TK" | "K1" | "K2" | "K3" | "K4" | "K5" | "K6"> = {
  TK: "TK",
  I: "K1",
  II: "K2",
  III: "K3",
  IV: "K4",
  V: "K5",
  VI: "K6",
};

/**
 * Jenjang Arena Junior untuk sebuah `Group.grade`, atau null bila kelas itu
 * bukan TK/SD (VII ke atas, "SMA", "Lainnya", dst).
 */
export function arenaJuniorGradeFor(grade: string | null | undefined) {
  if (!grade) return null;
  return ARENA_JUNIOR_BY_GRADE[grade.trim().toUpperCase()] ?? null;
}
