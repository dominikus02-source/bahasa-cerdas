import { db } from "@/lib/db";
import { getSkillProfile } from "@/lib/learning-loop/skills";
import { SKILL_ACTION_MAP } from "@/lib/learning-loop/recommend";
import type { CtaView } from "@/lib/learning-loop/types";

/** Jendela "aktivitas belajar terakhir" untuk memutuskan CTA Jalur Cerdas. */
const RECENT_WINDOW_MS = 30 * 24 * 3600 * 1000;

/** Draft CTA internal (sebelum dipetakan ke CtaView). */
interface CtaDraft {
  ctaType: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  priority: number;
}

/**
 * Putuskan ulang & simpan satu "Aksi Berikutnya" terbaik untuk user.
 *
 * Prioritas keputusan:
 *   1. Ada progress Jalur Cerdas yang BELUM selesai dalam 30 hari → CTA
 *      "Lanjutkan Belajar".
 *   2. Tidak ada → pakai aksi dari skill TERLEMAH (via SKILL_ACTION_MAP).
 *   3. Belum punya profil skill sama sekali → CTA default "Bagikan Karyamu".
 *
 * Selalu di-bungkus try/catch supaya TIDAK pernah melempar error ke pemanggil.
 */
export async function refreshNextAction(userId: string): Promise<void> {
  try {
    const since = new Date(Date.now() - RECENT_WINDOW_MS);
    const inProgress = await db.userUnitProgress.findFirst({
      where: { userId, completed: false, createdAt: { gte: since } },
      select: { id: true },
    });

    let cta: CtaDraft;
    if (inProgress) {
      cta = {
        ctaType: "JALUR_CERDAS",
        title: "Lanjutkan Belajar",
        description: "Lanjutkan materi yang belum kamu selesaikan.",
        ctaLabel: "Lanjut Belajar",
        ctaHref: "/arena/jalur-cerdas",
        priority: 90,
      };
    } else {
      const profile = await getSkillProfile(userId);
      const weakest = profile[0];
      if (weakest) {
        const draft = SKILL_ACTION_MAP[weakest.skill];
        cta = {
          ctaType: draft.type,
          title: draft.title,
          description: draft.description,
          ctaLabel: draft.ctaLabel,
          ctaHref: draft.ctaHref,
          priority: draft.priority,
        };
      } else {
        cta = {
          ctaType: "KARYA",
          title: "Bagikan Karyamu",
          description: "Mulai tulis puisi atau cerpen pertama kamu.",
          ctaLabel: "Tulis Karya",
          ctaHref: "/arena/tulis",
          priority: 70,
        };
      }
    }

    const meta = JSON.parse(JSON.stringify(ctaMeta()));
    await db.playerCTA.upsert({
      where: { userId },
      update: { ...cta, meta },
      create: { userId, ...cta, meta },
    });
  } catch {
    // Kegagalan diabaikan — CTA lama tetap berlaku, jangan ganggu pemanggil.
  }
}

/**
 * Ambil "Aksi Berikutnya" aktif user (null bila belum pernah dibuat).
 */
export async function getNextAction(userId: string): Promise<CtaView | null> {
  const row = await db.playerCTA.findUnique({ where: { userId } });
  if (!row) return null;
  return {
    ctaType: row.ctaType,
    title: row.title,
    description: row.description,
    ctaLabel: row.ctaLabel,
    ctaHref: row.ctaHref,
    priority: row.priority,
  };
}

/** Metadata kecil untuk audit CTA (siapa & kapan membuatnya). */
function ctaMeta(): Record<string, unknown> {
  return { source: "LEARNING_LOOP", generatedAt: new Date().toISOString() };
}
