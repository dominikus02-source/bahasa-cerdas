/**
 * Teacher XP — pintu XP & notifikasi khusus guru (additive, tidak menyentuh
 * engine murid). Guru mendapat XP dari aktivitas muridnya (berkarya, karya
 * di-like/dikomentari) dan dari aktivitas mengajarnya sendiri (mengirim
 * tugas, membuat pengumuman, memilih karya).
 *
 * Semua pemberian XP tetap lewat awardXp() (lib/award-xp.ts) — satu-satunya
 * pintu XP resmi — dan setelahnya badge guru dievaluasi (evaluateBadges).
 */

import { db } from "@/lib/db";
import { awardXp } from "@/lib/award-xp";
import { evaluateBadges } from "@/lib/gamification/badge-engine";

/** Sumber XP guru (bukan enum DB — kolom source adalah string bebas). */
export const GURU_XP_SOURCES = {
  MURID_KARYA: "MURID_KARYA", // murid menerbitkan karya → guru
  MURID_LIKE: "MURID_LIKE", // karya murid dapat like → guru
  MURID_KOMENTAR: "MURID_KOMENTAR", // karya murid dapat komentar → guru
  GURU_TUGAS: "GURU_TUGAS", // guru mengirim penugasan ke kelas
  GURU_PENGUMUMAN: "GURU_PENGUMUMAN", // guru membuat pengumuman
  GURU_FEATURED: "GURU_FEATURED", // guru memilih karya murid (Editor Choice)
  GURU_GAME: "GURU_GAME", // guru menyelesaikan game di GIM Guru (solo)
} as const;

/** Nilai XP per sumber guru. */
export const GURU_XP_NILAI: Record<keyof typeof GURU_XP_SOURCES, number> = {
  MURID_KARYA: 10,
  MURID_LIKE: 2,
  MURID_KOMENTAR: 3,
  GURU_TUGAS: 20,
  GURU_PENGUMUMAN: 15,
  GURU_FEATURED: 25,
  GURU_GAME: 10,
};

export interface AwardGuruXpParams {
  guruId: string;
  sumber: keyof typeof GURU_XP_SOURCES;
  /** Referensi idempotency — WAJIB unik per peristiwa agar retry tidak menggandakan XP. */
  reference: string;
  metadata?: Record<string, unknown>;
}

/**
 * Beri XP ke seorang guru + evaluasi badge guru. Best-effort: dipanggil
 * fire-and-forget dari route fitur — kegagalan tidak boleh menggagalkan
 * aksi utama (karya/like/komentar murid tetap berhasil).
 */
export async function awardGuruXp({ guruId, sumber, reference, metadata }: AwardGuruXpParams): Promise<{ xpDiberikan: number; duplicate: boolean }> {
  const xp = GURU_XP_NILAI[sumber] ?? 0;
  if (xp <= 0) return { xpDiberikan: 0, duplicate: false };

  const hasil = await awardXp(guruId, GURU_XP_SOURCES[sumber], xp, reference);
  if (hasil.xpDiberikan > 0) {
    await evaluateBadges(guruId).catch(() => {});
  }
  return { xpDiberikan: hasil.xpDiberikan, duplicate: hasil.xpDiberikan === 0 };
}

/**
 * ID semua murid milik seorang guru (via keanggotaan kelasnya). Unik, tanpa
 * duplikat antar kelas.
 */
export async function getGuruMuridIds(guruId: string): Promise<string[]> {
  const groups = await db.group.findMany({
    where: { teacherId: guruId },
    select: { id: true },
  });
  if (groups.length === 0) return [];

  const members = await db.groupMember.findMany({
    where: { groupId: { in: groups.map((g) => g.id) } },
    select: { userId: true },
  });
  return [...new Set(members.map((m) => m.userId))];
}

/**
 * Guru-guru dari seorang murid (via keanggotaan kelasnya). Dipakai untuk
 * notifikasi/XP "muridku berkarya" ke seluruh guru pengajar.
 */
export async function getMuridGuruIds(muridId: string): Promise<string[]> {
  const memberships = await db.groupMember.findMany({
    where: { userId: muridId },
    select: { groupId: true },
  });
  if (memberships.length === 0) return [];

  const groups = await db.group.findMany({
    where: { id: { in: memberships.map((m) => m.groupId) } },
    select: { teacherId: true },
  });
  return [...new Set(groups.map((g) => g.teacherId))];
}

/** Notifikasi ke semua guru dari murid tertentu (best-effort, batch). */
export async function notifyGuruMurid(guruIds: string[], payload: { title: string; body: string; type: string; data?: Record<string, unknown> }) {
  if (guruIds.length === 0) return;
  await db.notifikasi.createMany({
    data: guruIds.map((userId) => ({
      userId,
      title: payload.title,
      body: payload.body,
      type: payload.type,
      data: (payload.data ?? {}) as object,
    })),
    skipDuplicates: true,
  });
}

/**
 * Teacher Leaderboard — peringkat guru berdasarkan TEACHER XP (sumber
 * GURU_* di XPTransaction), BUKAN Player XP. Query langsung ke XPTransaction
 * dengan filter source guru; dijumlahkan per guru, lalu diurutkan menurun.
 */
export interface TeacherLeaderboardEntry {
  userId: string;
  fullName: string | null;
  avatar: string | null;
  xp: number;
  streak: number;
  myRank?: number | null;
}

export async function getTeacherLeaderboard({
  limit = 20,
  selfUserId,
}: {
  limit?: number;
  selfUserId?: string;
}): Promise<{ entries: TeacherLeaderboardEntry[]; myRank: number | null }> {
  const sources = Object.values(GURU_XP_SOURCES);

  const grouped = await db.xPTransaction.groupBy({
    by: ["userId"],
    where: { source: { in: sources } },
    _sum: { amount: true },
  });

  const sorted = grouped
    .filter((g) => (g._sum.amount ?? 0) > 0)
    .sort((a, b) => (b._sum.amount ?? 0) - (a._sum.amount ?? 0))
    .slice(0, limit);

  const userIds = sorted.map((g) => g.userId);
  const users = userIds.length
    ? await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, fullName: true, avatar: true, streak: true },
      })
    : [];

  const userMap = new Map(users.map((u) => [u.id, u]));

  const entries: TeacherLeaderboardEntry[] = sorted.map((g) => {
    const u = userMap.get(g.userId);
    return {
      userId: g.userId,
      fullName: u?.fullName ?? null,
      avatar: u?.avatar ?? null,
      xp: g._sum.amount ?? 0,
      streak: u?.streak ?? 0,
    };
  });

  let myRank: number | null = null;
  if (selfUserId) {
    const allSorted = grouped
      .filter((g) => (g._sum.amount ?? 0) > 0)
      .sort((a, b) => (b._sum.amount ?? 0) - (a._sum.amount ?? 0));
    const idx = allSorted.findIndex((g) => g.userId === selfUserId);
    if (idx >= 0) myRank = idx + 1;
  }

  return { entries, myRank };
}
