/**
 * Curriculum Map
 *
 * Reference data for Kurikulum Merdeka and K13 phase/class mapping.
 * Helps agents determine the correct phase, level, and expected competencies
 * for any given grade.
 */

export interface PhaseInfo {
  phase: string;
  grades: string[];
  ageRange: string;
  description: string;
}

export const PHASE_MAP: PhaseInfo[] = [
  { phase: "A", grades: ["SD Kelas 1", "SD Kelas 2"], ageRange: "6-8 tahun", description: "Fase A — Fondasi literasi dan numerasi dasar" },
  { phase: "B", grades: ["SD Kelas 3", "SD Kelas 4"], ageRange: "8-10 tahun", description: "Fase B — Pengembangan kemampuan dasar berbahasa" },
  { phase: "C", grades: ["SD Kelas 5", "SD Kelas 6"], ageRange: "10-12 tahun", description: "Fase C — Penguasaan struktur bahasa dan teks sederhana" },
  { phase: "D", grades: ["SMP Kelas 7", "SMP Kelas 8", "SMP Kelas 9"], ageRange: "12-15 tahun", description: "Fase D — Analisis teks dan ekspresi bahasa" },
  { phase: "E", grades: ["SMA Kelas 10"], ageRange: "15-16 tahun", description: "Fase E — Pemahaman teks kompleks dan argumentasi" },
  { phase: "F", grades: ["SMA Kelas 11", "SMA Kelas 12"], ageRange: "16-18 tahun", description: "Fase F — Produksi teks kritis dan kreatif" },
];

export function getPhaseForGrade(grade: string): PhaseInfo | undefined {
  return PHASE_MAP.find((p) => p.grades.includes(grade));
}

export function getBloomTargetForPhase(phase: string): string {
  const targets: Record<string, string> = {
    A: "C1-C2 (Mengingat dan Memahami)",
    B: "C2-C3 (Memahami dan Menerapkan)",
    C: "C2-C3 (Memahami dan Menerapkan)",
    D: "C3-C4 (Menerapkan dan Menganalisis)",
    E: "C4-C5 (Menganalisis dan Mengevaluasi)",
    F: "C5-C6 (Mengevaluasi dan Mencipta)",
  };
  return targets[phase] ?? "C2-C3";
}

export function getCurriculumVersion(grade: string): "SD" | "SMP" | "SMA" {
  if (grade.includes("SD")) return "SD";
  if (grade.includes("SMP")) return "SMP";
  return "SMA";
}
