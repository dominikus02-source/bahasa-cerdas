import { db } from "@/lib/db";

export const PROMO_VIDEO_KEY = "promo_video_id";

export async function getSetting(key: string): Promise<string | null> {
  try {
    const row = await db.siteSetting.findUnique({ where: { key } });
    return row?.value || null;
  } catch {
    return null;
  }
}

export async function setSetting(key: string, value: string | null) {
  return db.siteSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

/** Terima ID mentah atau URL YouTube penuh, kembalikan ID videonya saja. */
export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m) return m[1];
  }
  return null;
}
