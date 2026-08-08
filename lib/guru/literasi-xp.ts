/**
 * Literasi Guru — wiring "pertama kali terbit" (Artikel/Puisi) ke:
 *   1. XP Guru (GURU_ARTIKEL / GURU_PUISI) via awardGuruXp — idempotent.
 *   2. Aktivitas learning-loop (ActivityType.ARTICLE) + skill WRITING.
 *   3. Notifikasi "Guru Berkarya" ke guru lain.
 *
 * Best-effort total: kegagalan tidak pernah menggagalkan publikasi artikel.
 * Hanya dipanggil pada transisi draft → terbit (pertama kali), sehingga
 * edit/re-publish TIDAK mencairkan XP dua kali (dijamin awardXp reference unik).
 */

import { db } from "@/lib/db";
import { awardGuruXp, GURU_XP_NILAI, notifyGuruMurid } from "@/lib/gamification/teacher-xp";
import { recordActivity } from "@/lib/learning-loop/activity";

export type GuruLiterasiJenis = "ARTIKEL" | "PUISI";

/** Panjang konten minimal (karakter) agar layak dapat XP — anti-spam. */
export const MIN_PANJANG_KONTEN: Record<GuruLiterasiJenis, number> = {
  ARTIKEL: 40,
  PUISI: 20,
};

/**
 * Cairkan XP + catat aktivitas + notifikasi guru lain saat karya terbit
 * pertama kali. Idempoten — retry tidak menggandakan apa pun.
 */
export async function awardGuruLiterasiPublish({
  guruId,
  jenis,
  artikelId,
  judul,
  kontenPanjang,
}: {
  guruId: string;
  jenis: GuruLiterasiJenis;
  artikelId: string;
  judul: string;
  kontenPanjang: number;
}): Promise<{ xpDiberikan: number }> {
  const min = MIN_PANJANG_KONTEN[jenis];
  if (kontenPanjang < min) return { xpDiberikan: 0 };

  const sumber = jenis === "PUISI" ? "GURU_PUISI" : "GURU_ARTIKEL";
  const prefix = jenis === "PUISI" ? "puisi" : "artikel";
  const reference = `${prefix}-publish-${artikelId}`;

  const hasil = await awardGuruXp({ guruId, sumber, reference, metadata: { judul, artikelId } });
  if (hasil.xpDiberikan <= 0 || hasil.duplicate) return { xpDiberikan: 0 };

  // Catat aktivitas (best-effort) — hanya sekali per penerbitan.
  try {
    await recordActivity({
      userId: guruId,
      type: "ARTICLE",
      subtype: jenis === "PUISI" ? "PUISI_PUBLISH" : "ARTIKEL_PUBLISH",
      skill: "WRITING",
      skillDelta: 5,
      xp: GURU_XP_NILAI[sumber],
      coin: 0,
      reference,
      meta: { artikelId, judul, jenis },
      journey: {
        title: jenis === "PUISI" ? "Puisi diterbitkan" : "Artikel diterbitkan",
        description: judul,
        icon: jenis === "PUISI" ? "feather" : "book",
      },
    });
  } catch {
    // Logging aktivitas gagal — jangan blokir publikasi.
  }

  // Notifikasi ke guru lain (best-effort, batch).
  try {
    const otherGurus = await db.user.findMany({
      where: {
        OR: [{ role: "GURU" }, { role: "ADMIN" }, { isFounder: true }],
        id: { not: guruId },
      },
      select: { id: true },
      take: 200,
    });
    await notifyGuruMurid(
      otherGurus.map((g) => g.id),
      {
        title: jenis === "PUISI" ? "Puisi Guru Baru" : "Artikel Guru Baru",
        body: `Guru menerbitkan ${jenis === "PUISI" ? "puisi" : "artikel"}: "${judul}"`,
        type: "TEACHER_WORK_PUBLISHED",
        data: { link: "/guru/beranda" },
      }
    );
  } catch {
    // Notifikasi gagal — jangan blokir publikasi.
  }

  return { xpDiberikan: GURU_XP_NILAI[sumber] };
}
