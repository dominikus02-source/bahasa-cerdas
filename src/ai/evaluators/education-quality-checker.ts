/**
 * Education Quality Checker
 *
 * Evaluates AI-generated educational content for pedagogical quality.
 * Checks alignment with Indonesian curriculum standards.
 *
 * TODO:
 * - Implement rubric-based scoring
 * - Validate against CP/KD database
 * - Check for grade-appropriate language complexity
 */

export interface QualityCheckResult {
  passed: boolean;
  score: number;
  details: { criterion: string; passed: boolean; note: string }[];
}

export function checkEducationQuality(
  content: string,
  grade: string
): QualityCheckResult {
  const details: { criterion: string; passed: boolean; note: string }[] = [];

  // Check 1: Language level appropriate
  const hasComplexWords = countComplexWords(content);
  details.push({
    criterion: "Kesesuaian bahasa dengan jenjang",
    passed: hasComplexWords < 5,
    note: hasComplexWords >= 5
      ? `Terdeteksi ${hasComplexWords} kata kompleks yang mungkin terlalu sulit untuk ${grade}`
      : "Bahasa sesuai jenjang",
  });

  // Check 2: Has concrete examples
  const hasExamples = /contoh|misalnya|seperti|ilustrasi/i.test(content);
  details.push({
    criterion: "Contoh konkret",
    passed: hasExamples,
    note: hasExamples ? "Terdapat contoh konkret" : "Tidak ada contoh konkret — tambahkan contoh dari kehidupan siswa",
  });

  // Check 3: Active vs passive voice balance
  const passiveCount = (content.match(/\bdi\w+kan\b|\bdi\w+i\b|\bter\w+kan\b/gi) || []).length;
  details.push({
    criterion: "Aktif vs Pasif",
    passed: passiveCount < content.split(/[.!?]+/).length * 0.3,
    note: passiveCount > 5 ? "Terlalu banyak kalimat pasif" : "Keseimbangan kalimat baik",
  });

  const passedCount = details.filter((d) => d.passed).length;
  const score = Math.round((passedCount / details.length) * 100);

  return {
    passed: score >= 50,
    score,
    details,
  };
}

function countComplexWords(text: string): number {
  const complex = [
    "implementasi", "aplikatif", "kolaboratif", "komprehensif",
    "kontemporer", "fundamental", "integral", "universal",
    "substantif", "paradigmatik", "kontekstual", "sistematis",
  ];
  const lower = text.toLowerCase();
  return complex.filter((w) => lower.includes(w)).length;
}
