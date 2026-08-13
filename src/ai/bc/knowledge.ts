/**
 * AI BC 2.1 — BC KNOWLEDGE (pure, no server dependencies).
 *
 * Blok pengetahuan resmi untuk prompt AI BC:
 * - K1 Identitas & fakta resmi BahasaCerdas — REUSE SSOT
 *   (lib/ai/knowledge/bahasa-cerdas-identity.ts, dipakai juga oleh
 *   prompt-builder agent & legacy /api/ai/chat — TIDAK diduplikasi).
 * - Peta produk per peran — fakta platform BahasaCerdas yang terverifikasi
 *   (murid boleh MENGETAHUI segalanya tentang platform; kapabilitas guru
 *   tetap tidak ditawarkan ke murid — guard di personas.ts).
 *
 * Tidak ada mock data: hanya fakta dari registry resmi + peta produk statis.
 */

import { buildBahasaCerdasIdentityInstruction } from "@/lib/ai/knowledge/bahasa-cerdas-identity";
import type { BcPersonaKey } from "./personas";

export const BC_KNOWLEDGE_MAX_CHARS = 3400;

const PLATFORM_MAP: Record<BcPersonaKey, string[]> = {
  student: [
    "BahasaCerdas: platform belajar Bahasa Indonesia untuk murid — belajar materi, latihan soal, karya (puisi, cerpen, artikel, pantun), obrolan, arena, dan jalur cerdas.",
    "Simulasi: UKBI dan TKA untuk mengukur kemampuan berbahasa.",
    "Gamifikasi: XP, level, peringkat, lencana, koin, dan misi harian — dikumpulkan lewat aktivitas belajar.",
    "Jika murid bertanya istilah dunia guru (misalnya dokumen rencana pembelajaran), jelaskan artinya sebagai pengetahuan saja — jangan menawarkan bantuan menyusun dokumen guru.",
  ],
  teacher: [
    "BahasaCerdas untuk guru: Kelasku (kelas, murid, pengumuman, penugasan, buku nilai, data siswa), Bank Soal latihan, Panggung Literasi (karya murid, umpan balik AI), Alat AI (RPP, soal, PPT, EYD, koreksi, penilaian), Simulasi UKBI/TKA + evaluasi hasil, Toko Karya, dan Komunitas.",
    "Gamifikasi guru terpisah dari murid: XP guru, lencana guru, dan peringkat guru (Teacher XP Engine).",
  ],
  founder: [
    "BahasaCerdas: platform belajar Bahasa Indonesia untuk murid dan guru — Arena, Kelasku, Panggung Literasi, Alat AI, Simulasi UKBI/TKA, BIGT, Toko Karya, Komunitas, dan gamifikasi.",
    "Sebagai staf platform, bantu tim dengan fakta resmi saja (lihat identitas di atas); jangan menebak angka, pendanaan, atau mitra.",
  ],
  admin: [
    "BahasaCerdas: platform belajar Bahasa Indonesia untuk murid dan guru — Arena, Kelasku, Panggung Literasi, Alat AI, Simulasi UKBI/TKA, BIGT, Toko Karya, Komunitas, dan gamifikasi.",
    "Sebagai staf platform, bantu operasional dengan fakta resmi saja (lihat identitas di atas).",
  ],
  neutral: [
    "BahasaCerdas: platform belajar Bahasa Indonesia untuk murid dan guru — belajar, latihan, karya, komunitas, simulasi UKBI/TKA, dan alat AI.",
    "Jawab pertanyaan Bahasa Indonesia secara netral, tanpa asumsi peran pengguna.",
  ],
};

/**
 * Bangun blok pengetahuan untuk peran tertentu.
 * Selalu diawali fakta resmi identitas (SSOT), lalu peta produk per peran.
 */
export function buildBcKnowledgeBlock(role: BcPersonaKey): string {
  const parts = [
    buildBahasaCerdasIdentityInstruction(),
    "",
    "### Peta Produk BahasaCerdas (jawab pertanyaan platform dengan fakta ini)",
    ...PLATFORM_MAP[role] ?? [],
  ];
  const text = parts.join("\n");
  if (text.length > BC_KNOWLEDGE_MAX_CHARS) {
    return `${text.slice(0, BC_KNOWLEDGE_MAX_CHARS - 1)}…`;
  }
  return text;
}
