import { db } from "@/lib/db";

export const PROMO_VIDEO_KEY = "promo_video_id";
export const MGMP_MEDIA_KEY = "mgmp_media";

export type MgmpMedia =
  | { type: "none" }
  | { type: "photo"; photos: { url: string; key: string }[] }
  | { type: "video"; videoId: string };

export async function getMgmpMedia(): Promise<MgmpMedia> {
  const raw = await getSetting(MGMP_MEDIA_KEY);
  if (!raw) return { type: "none" };
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type === "photo" && Array.isArray(parsed.photos)) return parsed;
    if (parsed?.type === "video" && typeof parsed.videoId === "string") return parsed;
    return { type: "none" };
  } catch {
    return { type: "none" };
  }
}

export async function setMgmpMedia(media: MgmpMedia) {
  return setSetting(MGMP_MEDIA_KEY, media.type === "none" ? null : JSON.stringify(media));
}

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
