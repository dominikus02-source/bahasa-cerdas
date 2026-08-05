import { db } from "@/lib/db";
import { getSkillProfile } from "@/lib/learning-loop/skills";
import type { LearningSkillType, LearningRecommendation, RecommendationType } from "@prisma/client";

/** Durasi aktif rekomendasi (7 hari). */
const RECOMMENDATION_TTL_MS = 7 * 24 * 3600 * 1000;

/**
 * Draft rekomendasi sebelum disimpan ke LearningRecommendation.
 * `skill` opsional (tidak semua rekomendasi terikat skill tertentu).
 */
export interface RecommendationDraft {
  type: RecommendationType;
  skill?: LearningSkillType;
  priority: number;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  reason: string;
}

/**
 * Peta aksi rekomendasi per skill — satu draft untuk tiap skill, menunjuk ke
 * route yang SUDAH ada di aplikasi.
 */
export const SKILL_ACTION_MAP: Record<LearningSkillType, RecommendationDraft> = {
  READING: {
    type: "PRACTICE_QUIZ",
    skill: "READING",
    priority: 70,
    title: "Asah Kemampuan Membaca",
    description: "Rata-rata kemampuan membaca adalah yang terlemah. Latihan soal membaca singkat.",
    ctaLabel: "Latihan Membaca",
    ctaHref: "/arena/jalur-cerdas",
    reason: "Skill Membaca paling rendah",
  },
  WRITING: {
    type: "WRITE_KARYA",
    skill: "WRITING",
    priority: 70,
    title: "Tulis Karyamu",
    description: "Skill Menulismu butuh latihan. Tulis puisi/cerpen dan bagikan ke teman.",
    ctaLabel: "Tulis Karya",
    ctaHref: "/murid/karya/tulis",
    reason: "Skill Menulis paling rendah",
  },
  LISTENING: {
    type: "IMPROVE_SKILL",
    skill: "LISTENING",
    priority: 70,
    title: "Latih Mendengarkan",
    description: "Simak materi audio dan kerjakan soal mendengarkan di Jalur Cerdas.",
    ctaLabel: "Mulai Latihan",
    ctaHref: "/arena/jalur-cerdas",
    reason: "Skill Mendengarkan paling rendah",
  },
  SPEAKING: {
    type: "IMPROVE_SKILL",
    skill: "SPEAKING",
    priority: 70,
    title: "Berlatih Berbicara",
    description: "Rekam dan praktikkan bicaramu lewat tugas praktik.",
    ctaLabel: "Buka Tugas",
    ctaHref: "/arena/tugas",
    reason: "Skill Berbicara paling rendah",
  },
  GRAMMAR: {
    type: "PRACTICE_QUIZ",
    skill: "GRAMMAR",
    priority: 70,
    title: "Perkuat Tata Bahasa",
    description: "Latihan kalimat efektif dan ejaan bikin tulisanmu makin rapi.",
    ctaLabel: "Latihan Tatabahasa",
    ctaHref: "/arena/jalur-cerdas",
    reason: "Skill Tata Bahasa paling rendah",
  },
  VOCABULARY: {
    type: "TRY_ARENA",
    skill: "VOCABULARY",
    priority: 70,
    title: "Perkaya Kosakata",
    description: "Main game kata di Arena sambil menambah kosakata.",
    ctaLabel: "Main Game",
    ctaHref: "/arena/game",
    reason: "Skill Kosakata paling rendah",
  },
  LITERATURE: {
    type: "READ_ARTICLE",
    skill: "LITERATURE",
    priority: 70,
    title: "Jelajah Sastra",
    description: "Baca karya teman dan pelajari gaya bahasanya.",
    ctaLabel: "Lihat Karya",
    ctaHref: "/arena/feed",
    reason: "Skill Sastra paling rendah",
  },
};

/**
 * Ambil rekomendasi aktif user (prioritas tertinggi dulu, maks 3).
 */
export async function getActiveRecommendations(userId: string): Promise<LearningRecommendation[]> {
  return db.learningRecommendation.findMany({
    where: { userId, isActive: true },
    orderBy: { priority: "desc" },
    take: 3,
  });
}

/**
 * Bangun ulang 3 rekomendasi aktif untuk user.
 *
 * Strategi: 2 skill terlemah dari profil skill + 1 variasi WRITE_KARYA /
 * TRY_ARENA (bila belum terwakili). Rekomendasi lama di-nonaktifkan dulu,
 * semua baris baru berlaku 7 hari ke depan.
 */
export async function generateRecommendations(userId: string): Promise<void> {
  await db.learningRecommendation.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  });

  const profile = await getSkillProfile(userId);
  const chosen = profile.slice(0, 2).map((s) => s.skill);
  const drafts: RecommendationDraft[] = chosen.map((skill) => SKILL_ACTION_MAP[skill]);

  // Variasi WRITE_KARYA/TRY_ARENA bila belum terwakili 2 skill terlemah.
  if (!drafts.some((d) => d.type === "WRITE_KARYA" || d.type === "TRY_ARENA")) {
    const variety = pickVarietyDraft(chosen);
    if (variety) drafts.push(variety);
  }

  // Jamin minimal 3 baris — isi dengan skill terlemah berikutnya.
  for (const skill of profile.slice(2).map((s) => s.skill)) {
    if (drafts.length >= 3) break;
    if (!chosen.includes(skill) && !drafts.some((d) => d.skill === skill)) {
      drafts.push(SKILL_ACTION_MAP[skill]);
    }
  }

  // Profil kosong (belum ada skill) → pakai 3 default.
  if (drafts.length === 0) {
    drafts.push(SKILL_ACTION_MAP.READING, SKILL_ACTION_MAP.WRITING, SKILL_ACTION_MAP.VOCABULARY);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + RECOMMENDATION_TTL_MS);

  await db.learningRecommendation.createMany({
    data: drafts.slice(0, 3).map((d, i) => ({
      userId,
      type: d.type,
      skill: d.skill ?? null,
      priority: 90 - i,
      title: d.title,
      description: d.description,
      ctaLabel: d.ctaLabel,
      ctaHref: d.ctaHref,
      reason: d.reason,
      isActive: true,
      expiresAt,
      createdAt: now,
    })),
  });
}

/**
 * Pilih draft variasi yang belum terwakili dari daftar skill terpilih.
 * Prioritas: WRITING (WRITE_KARYA) → VOCABULARY (TRY_ARENA) → LITERATURE → dll.
 */
function pickVarietyDraft(chosen: LearningSkillType[]): RecommendationDraft | null {
  if (!chosen.includes("WRITING")) return SKILL_ACTION_MAP.WRITING;
  if (!chosen.includes("VOCABULARY")) return SKILL_ACTION_MAP.VOCABULARY;
  if (!chosen.includes("LITERATURE")) return SKILL_ACTION_MAP.LITERATURE;
  if (!chosen.includes("READING")) return SKILL_ACTION_MAP.READING;
  if (!chosen.includes("GRAMMAR")) return SKILL_ACTION_MAP.GRAMMAR;
  if (!chosen.includes("SPEAKING")) return SKILL_ACTION_MAP.SPEAKING;
  return SKILL_ACTION_MAP.LISTENING;
}
