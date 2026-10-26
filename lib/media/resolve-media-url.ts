/**
 * Satu pintu untuk URL media unggahan (sampul artikel/karya, foto, file).
 *
 * Sejak cutover ke VPS, Storage BahasaCerdas adalah Supabase self-host yang
 * dilayani di domain utama (Caddy meneruskan /storage/v1/* → supabase-envoy),
 * dan NEXT_PUBLIC_SUPABASE_URL produksi = https://www.bahasacerdas.com.
 * Proyek Supabase Cloud lama (*.supabase.co) sudah mati: URL yang masih
 * tersimpan di DB tidak akan pernah termuat lagi.
 *
 * Aturan untuk URL *.supabase.co:
 *  - host sama dengan NEXT_PUBLIC_SUPABASE_URL (mis. staging yang masih Cloud)
 *    → dibiarkan;
 *  - host lain + path /storage/v1/object/public/... → path yang sama di Storage
 *    yang sedang dipakai (sebagian objek sudah ikut dipindah saat cutover). Bila
 *    objeknya tidak ada, <img> gagal dan pemanggil memakai sampul buatan;
 *  - selain itu → null (dianggap tidak ada media, langsung sampul buatan).
 * URL ini tidak pernah boleh lewat optimizer next/image (lihat isStorageMediaUrl).
 */

const STORAGE_PUBLIC_PATH = "/storage/v1/object/public/";

function parseHttpUrl(value: string | null | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function hostOf(value: string | null | undefined): string | null {
  return parseHttpUrl(value)?.host.toLowerCase() ?? null;
}

/** true untuk URL apa pun di *.supabase.co (Supabase Cloud). */
export function isSupabaseCloudUrl(src: string | null | undefined): boolean {
  const host = hostOf(src?.trim());
  return !!host && (host === "supabase.co" || host.endsWith(".supabase.co"));
}

/**
 * true bila URL menunjuk ke Storage (path /storage/v1/...). Dipakai untuk
 * memaksa `unoptimized` pada next/image: optimizer tidak boleh mengambil URL
 * Storage (host self-host tidak ada di remotePatterns, host Cloud sudah mati).
 */
export function isStorageMediaUrl(src: string | null | undefined): boolean {
  if (!src) return false;
  const trimmed = src.trim();
  if (trimmed.startsWith("/storage/v1/")) return true;
  const url = parseHttpUrl(trimmed);
  return !!url && url.pathname.startsWith("/storage/v1/");
}

/** Versi murni (base diberikan) supaya bisa diuji tanpa env. */
export function resolveMediaUrlWithBase(
  src: string | null | undefined,
  storageBase: string | null | undefined,
): string | null {
  if (!src) return null;

  const trimmed = src.trim();
  if (!trimmed) return null;

  const base = parseHttpUrl(storageBase?.trim());
  const baseOrigin = base ? base.origin : "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    if (!isSupabaseCloudUrl(trimmed)) return trimmed;

    const url = parseHttpUrl(trimmed);
    if (!url) return null;
    if (base && base.host.toLowerCase() === url.host.toLowerCase()) return trimmed;
    if (base && url.pathname.startsWith(STORAGE_PUBLIC_PATH)) {
      return `${baseOrigin}${url.pathname}${url.search}`;
    }
    return null;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  // Skema lain (javascript:, vbscript:, data: non-gambar, …) tidak pernah sah
  // sebagai media. blob: & data:image/ tetap boleh (pratinjau unggahan).
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return /^(blob:|data:image\/)/i.test(trimmed) ? trimmed : null;
  }

  if (baseOrigin && trimmed.includes("/storage/v1/")) {
    return `${baseOrigin}/${trimmed}`;
  }

  return trimmed;
}

export function resolveMediaUrl(src: string | null | undefined): string | null {
  return resolveMediaUrlWithBase(src, process.env.NEXT_PUBLIC_SUPABASE_URL || "");
}
