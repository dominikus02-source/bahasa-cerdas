/**
 * Curriculum Alignment Checker
 *
 * Validates that generated content aligns with the specified curriculum
 * (Kurikulum Merdeka or K13).
 *
 * TODO:
 * - Load and match against actual CP/KD from database (LearningLevel, LearningUnit models)
 * - Check completeness of required components per curriculum type
 * - Verify Profil Pelajar Pancasila dimensions
 */

export interface CurriculumCheckResult {
  passed: boolean;
  curriculum: string;
  missingComponents: string[];
  warnings: string[];
}

const MERDEKA_COMPONENTS = [
  "Capaian Pembelajaran (CP)",
  "Tujuan Pembelajaran (TP)",
  "Profil Pelajar Pancasila",
  "Pemahaman Bermakna",
  "Pertanyaan Pemantik",
  "Kegiatan Pembelajaran",
  "Asesmen",
];

const K13_COMPONENTS = [
  "KI-1 (Spiritual)",
  "KI-2 (Sosial)",
  "KI-3 (Pengetahuan)",
  "KI-4 (Keterampilan)",
  "KD dan IPK",
  "Tujuan Pembelajaran (ABCD)",
  "Materi Pembelajaran",
  "Kegiatan 5M",
  "Penilaian",
];

export function checkCurriculumAlignment(
  content: string,
  curriculum: "MERDEKA" | "K13"
): CurriculumCheckResult {
  const requiredComponents = curriculum === "MERDEKA" ? MERDEKA_COMPONENTS : K13_COMPONENTS;
  const missingComponents: string[] = [];
  const warnings: string[] = [];

  for (const component of requiredComponents) {
    const found = content.toLowerCase().includes(component.toLowerCase().substring(0, 20));
    if (!found) {
      missingComponents.push(component);
    }
  }

  if (missingComponents.length === requiredComponents.length) {
    warnings.push("Konten tidak terdeteksi mengikuti struktur kurikulum apapun");
  }

  return {
    passed: missingComponents.length === 0,
    curriculum,
    missingComponents,
    warnings,
  };
}
