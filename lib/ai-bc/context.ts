/**
 * AI BC 2.0 — Context engine.
 *
 * Mengumpulkan konteks pengguna yang RINGKAS dan aman (best-effort):
 * - Tiap sumber dibungkus try/catch — kegagalan = item di-skip, tidak pernah
 *   menggagalkan chat.
 * - Tidak pernah membuang seluruh data mentah (tidak ada dump tabel/JSON).
 * - Output dibatasi (maks ~1200 karakter) agar ringan untuk model.
 */

import { db } from "@/lib/db";
import { getSkillProfile } from "@/lib/learning-loop/skills";
import { getRecentActivity } from "@/lib/learning-loop/activity";
import type { ActivityType, User } from "@prisma/client";

/**
 * Peran konteks — diselaraskan dengan BcPersonaKey (personas.ts).
 * gatherBcContext hanya menghasilkan dua jalur data: student (data belajar
 * murid) dan teacher (data kelas guru). Founder/ADMIN memakai jalur guru.
 */
export type BcRole = "student" | "teacher" | "founder" | "admin" | "neutral";
export type BcHintRole = "student" | "teacher";

export interface BcContextItem {
  key: string;
  label: string;
  value: string;
}

export interface BcContext {
  role: BcRole;
  items: BcContextItem[];
}

/** Label Indonesia untuk aktivitas belajar (ActivityType → teks ringkas). */
const ACTIVITY_LABELS: Partial<Record<ActivityType, string>> = {
  LOGIN: "Masuk",
  JALUR_CERDAS: "Latihan Jalur Cerdas",
  LESSON: "Belajar materi",
  KARYA: "Menulis karya",
  LIKE: "Menyukai karya",
  COMMENT: "Mengomentari",
  QUIZ: "Mengerjakan kuis",
  SIMULASI_UKBI: "Simulasi UKBI",
  SIMULASI_TKA: "Simulasi TKA",
  PENUGASAN: "Mengerjakan tugas",
  GAME: "Bermain gim",
  QUEST: "Menyelesaikan misi",
  ARTICLE: "Membaca artikel",
  SHOP: "Berbelanja koin",
  LEAGUE: "Liga mingguan",
  SOCIAL: "Aktivitas sosial",
  AI: "Belajar dengan AI",
};

function activityLabel(type: string): string {
  return ACTIVITY_LABELS[type as ActivityType] ?? "Aktivitas belajar";
}

export const BC_CONTEXT_MAX_CHARS = 1200;
export const BC_CONTEXT_MAX_ITEMS = 6;
export const BC_CONTEXT_VALUE_MAX_CHARS = 90;

function condense(value: string, max = BC_CONTEXT_VALUE_MAX_CHARS): string {
  const oneLine = value.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}

function pushItem(items: BcContextItem[], key: string, label: string, value: string | number | null | undefined): void {
  if (items.length >= BC_CONTEXT_MAX_ITEMS) return;
  if (value === null || value === undefined || value === "") return;
  const text = String(value);
  if (!text.trim()) return;
  items.push({ key, label, value: condense(text) });
}

function roleOf(user: User): BcRole {
  return user.role === "GURU" || user.role === "ADMIN" || user.isFounder
    ? "teacher"
    : "student";
}

function displayName(user: User): string {
  return user.nickname || user.fullName || "Pengguna";
}

/**
 * Kumpulkan konteks ringkas per pengguna. Best-effort: setiap sumber
 * ditangani terpisah; error apa pun hanya melewati sumber tersebut.
 */
export async function gatherBcContext(user: User): Promise<BcContext> {
  const role = roleOf(user);
  const items: BcContextItem[] = [];

  pushItem(items, "nama", "Nama", displayName(user));

  if (role === "student") {
    const gambaran = await db.profile
      .findUnique({ where: { userId: user.id }, select: { grade: true, className: true, school: true } })
      .catch(() => null);
    pushItem(items, "kelas", "Kelas", gambaran?.className ?? gambaran?.grade);
    pushItem(items, "sekolah", "Sekolah", gambaran?.school);

    const profile = await db.playerProfile
      .findUnique({ where: { userId: user.id }, select: { level: true, streak: true } })
      .catch(() => null);
    pushItem(items, "level", "Level", profile?.level ? `Level ${profile.level}` : null);
    pushItem(items, "streak", "Rentetan harian", profile?.streak ? `${profile.streak} hari` : null);

    const skills = await getSkillProfile(user.id).catch(() => null);
    if (Array.isArray(skills) && skills.length > 0) {
      const weakest = [...skills].sort((a, b) => a.level - b.level || a.xp - b.xp)[0];
      pushItem(items, "skill", "Fokus belajar", weakest ? `${weakest.skill} (tingkat ${weakest.level})` : null);
    }

    // Aktivitas belajar terakhir (7 hari) — hanya data murid, best-effort.
    const activity = await getRecentActivity(user.id, 7).catch(() => []);
    const lastActivity = Array.isArray(activity) && activity.length > 0 ? activity[0] : null;
    pushItem(items, "aktivitas", "Aktivitas terakhir", lastActivity ? activityLabel(String(lastActivity.type)) : null);
  } else {
    const groups = await db.group
      .count({ where: { teacherId: user.id } })
      .catch(() => 0);
    pushItem(items, "kelas", "Kelas dikelola", groups > 0 ? `${groups} kelas` : null);

    const members = await db.groupMember
      .count({ where: { group: { teacherId: user.id } } })
      .catch(() => 0);
    pushItem(items, "murid", "Murid", members > 0 ? `${members} murid` : null);

    const karya = await db.studentKarya
      .count({ where: { user: { groupMemberships: { some: { group: { teacherId: user.id } } } } } })
      .catch(() => 0);
    pushItem(items, "karya", "Karya murid", karya > 0 ? `${karya} karya` : null);

    const penugasan = await db.penugasan
      .count({ where: { group: { teacherId: user.id } } })
      .catch(() => 0);
    pushItem(items, "penugasan", "Penugasan", penugasan > 0 ? `${penugasan} penugasan` : null);
  }

  return { role, items };
}

/**
 * Ubah konteks menjadi teks kompak untuk prompt — pure, mudah diuji.
 * Nilai dinormalisasi: spasi beruntun dirapikan, tiap nilai dibatasi,
 * total dibatasi BC_CONTEXT_MAX_CHARS.
 */
export function buildContextText(ctx: BcContext): string {
  if (!ctx || !Array.isArray(ctx.items) || ctx.items.length === 0) return "";

  const lines = ctx.items.slice(0, BC_CONTEXT_MAX_ITEMS).map((item) => {
    const value = condense(item.value);
    return `- ${item.label}: ${value}`;
  });

  let text = lines.join("\n");
  if (text.length > BC_CONTEXT_MAX_CHARS) {
    text = `${text.slice(0, BC_CONTEXT_MAX_CHARS - 1)}…`;
  }
  return text;
}

export interface BcHint {
  label: string;
  prompt: string;
}

const STATIC_HINTS: Record<BcHintRole, BcHint[]> = {
  student: [
    { label: "Arti kata", prompt: "Jelaskan arti kata 'apresiasi' beserta contoh kalimatnya." },
    { label: "Tata bahasa", prompt: "Apa perbedaan 'di mana' dan 'dimana'?" },
  ],
  teacher: [
    { label: "RPP", prompt: "Buatkan Rencana Pembelajaran 1 lembar materi puisi kelas 10." },
    { label: "Koreksi", prompt: "Koreksi tata bahasa paragraf berikut: [tempel teks]" },
  ],
};

/**
 * Dua saran percakapan awal per peran. Best-effort: bila konteks belajar
 * tersedia untuk murid, saran menyesuaikan skill terlemah.
 *
 * `roleOverride` opsional — dipakai permukaan yang perannya DIPAKSA dari sisi
 * server (mis. /arena/ai selalu permukaan murid, rule 6), sehingga guru yang
 * singgah pun tidak melihat saran guru.
 */
export async function getBcHints(user: User, roleOverride?: BcHintRole): Promise<BcHint[]> {
  const role: BcHintRole = roleOverride ?? (roleOf(user) === "teacher" ? "teacher" : "student");
  const hints = STATIC_HINTS[role].slice(0, 2);

  if (role === "student") {
    const skills = await getSkillProfile(user.id).catch(() => null);
    if (Array.isArray(skills) && skills.length > 0) {
      const weakest = [...skills].sort((a, b) => a.level - b.level || a.xp - b.xp)[0];
      hints[0] = { label: `Latihan ${weakest.skill}`, prompt: `Buatkan 3 soal latihan tentang ${weakest.skill} dan pandu jawabanku.` };
    }
  }

  return hints;
}