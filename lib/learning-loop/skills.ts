import { db } from "@/lib/db";
import type { LearningSkillType, SkillRow } from "@/lib/learning-loop/types";
import type { LearningSkill } from "@prisma/client";

/** Label Bahasa Indonesia per skill bahasa. */
export const SKILL_LABELS: Record<LearningSkillType, string> = {
  READING: "Membaca",
  WRITING: "Menulis",
  LISTENING: "Mendengarkan",
  SPEAKING: "Berbicara",
  GRAMMAR: "Tata Bahasa",
  VOCABULARY: "Kosakata",
  LITERATURE: "Sastra",
};

/** Nama ikon lucide per skill (dipakai UI). */
export const SKILL_ICONS: Record<LearningSkillType, string> = {
  READING: "BookOpen",
  WRITING: "PenLine",
  LISTENING: "Headphones",
  SPEAKING: "Mic",
  GRAMMAR: "AlignLeft",
  VOCABULARY: "SpellCheck",
  LITERATURE: "Feather",
};

/**
 * Level skill (1-100) yang dihitung dari akumulasi XP skill.
 * Kurva akar kuadrat: naik cepat di awal, melambat di level tinggi.
 */
export function skillLevelFromXp(xp: number): number {
  return Math.max(1, Math.min(100, Math.floor(Math.sqrt(xp / 10) + 1)));
}

/**
 * Deteksi skill yang paling relevan dari judul unit/materi.
 *
 * Pencocokan kata kunci (lowercase) memakai prioritas tetap; default
 * dikembalikan READING bila tidak ada pola yang cocok.
 */
export function detectUnitSkill(title: string): LearningSkillType {
  const t = title.toLowerCase();
  if (/huruf|bunyi|fonetik|ejaan/.test(t)) return "GRAMMAR";
  if (/kosakata|kata baku|sinonim|antonim|imbuhan|idiom/.test(t)) return "VOCABULARY";
  if (/kalimat|konjungsi|paragraf|efektif|tanda baca/.test(t)) return "GRAMMAR";
  if (/membaca|pemahaman|fakta|opini|ringkasan|teks/.test(t)) return "READING";
  if (/menulis|karangan|cerita|cerpen|artikel/.test(t)) return "WRITING";
  if (/puisi|prosa|sastra|drama|pantun/.test(t)) return "LITERATURE";
  if (/mendengar|menyimak|audio/.test(t)) return "LISTENING";
  return "READING";
}

/**
 * Terapkan kenaikan XP untuk satu atau beberapa skill sekaligus.
 *
 * Setiap gain di-upsert ke tabel LearningSkill: XP ditambah dan level dihitung
 * ulang dari XP baru via skillLevelFromXp.
 */
export async function applySkillGains(
  userId: string,
  gains: { skill: LearningSkillType; amount: number }[],
): Promise<void> {
  for (const gain of gains) {
    const amount = Math.max(1, Math.floor(gain.amount));
    const key = { userId_skill: { userId, skill: gain.skill } };
    const current = await db.learningSkill.findUnique({ where: key });
    const newXp = (current?.xp ?? 0) + amount;

    await db.learningSkill.upsert({
      where: key,
      update: { xp: newXp, level: skillLevelFromXp(newXp) },
      create: { userId, skill: gain.skill, xp: amount, level: skillLevelFromXp(amount) },
    });
  }
}

/**
 * Ambil profil skill user, diurutkan dari yang TERLEMAH (level naik, lalu XP
 * naik) supaya rekomendasi & CTA tahu skill mana yang paling butuh perhatian.
 */
export async function getSkillProfile(userId: string): Promise<SkillRow[]> {
  const rows: LearningSkill[] = await db.learningSkill.findMany({ where: { userId } });
  return rows
    .map((r) => ({ skill: r.skill, level: r.level, xp: r.xp }))
    .sort((a, b) => a.level - b.level || a.xp - b.xp);
}
