/**
 * Agent ID Mapping — resolves user-facing agent aliases to canonical agent IDs.
 *
 * This allows the frontend and API to accept flexible naming
 * (e.g. "rpp-modul", "modul-ajar", "buat-soal") and map them
 * to the canonical backend agent ID.
 */

export const AGENT_ALIASES: Record<string, string> = {
  // RPP / Modul Ajar
  "rpp-modul": "rpp",
  rpp: "rpp",
  "modul-ajar": "rpp",
  "buat-rpp": "rpp",
  "rpp-merdeka": "rpp",

  // Soal
  "buat-soal": "soal",
  soal: "soal",
  "bank-soal": "soal",
  "kisi-kisi": "soal",
  assessment: "soal",
  asesmen: "soal",

  // PPT
  "buat-ppt": "ppt",
  ppt: "ppt",
  presentasi: "ppt",
  slide: "ppt",

  // Review Materi
  "review-materi": "review",
  review: "review",
  "review-pembelajaran": "review",
  "telaah-materi": "review",

  // Feedback Siswa
  "feedback-siswa": "feedback",
  feedback: "feedback",
  "umpan-balik": "feedback",

  // Penilaian Otomatis
  "penilaian-otomatis": "grading",
  grading: "grading",
  nilai: "grading",
  koreksi: "grading",
  "penilaian-esai": "grading",

  // Analisis Teks
  "analisis-teks": "text-analysis",
  "text-analysis": "text-analysis",
  "analisis-bahasa": "text-analysis",
  "telaah-teks": "text-analysis",

  // Korektor EYD
  "korektor-eyd": "eyd",
  eyd: "eyd",
  puebi: "eyd",
  "perbaiki-ejaan": "eyd",
  "koreksi-bahasa": "eyd",

  // AI BC Assistant
  "ai-bc-assistant": "bc-assistant",
  "bc-assistant": "bc-assistant",
  assistant: "bc-assistant",
  asisten: "bc-assistant",
  "ai-assistant": "bc-assistant",
};

export const CANONICAL_AGENTS = [
  "rpp",
  "soal",
  "ppt",
  "review",
  "feedback",
  "grading",
  "text-analysis",
  "eyd",
  "bc-assistant",
] as const;

export type CanonicalAgentId = (typeof CANONICAL_AGENTS)[number];

export const AGENT_LABELS: Record<CanonicalAgentId, string> = {
  rpp: "Rencana Pembelajaran",
  soal: "Buat Soal",
  ppt: "Buat PPT",
  review: "Review Materi",
  feedback: "Feedback Siswa",
  grading: "Penilaian Otomatis",
  "text-analysis": "Analisis Teks",
  eyd: "Korektor EYD",
  "bc-assistant": "AI BC Assistant",
};

/**
 * Resolve an agent alias to its canonical ID.
 * If the alias is not found, returns null.
 */
export function resolveAgentId(alias: string): string | null {
  const key = alias.toLowerCase().replace(/\s+/g, "-").trim();
  return AGENT_ALIASES[key] ?? null;
}

/**
 * Check if a string is a known canonical agent ID.
 */
export function isValidAgentId(id: string): id is CanonicalAgentId {
  return CANONICAL_AGENTS.includes(id as CanonicalAgentId);
}
