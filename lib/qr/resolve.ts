/**
 * Pengalih QR buku teks: `/b/{KODE}` → halaman platform.
 *
 * CLIENT-SAFE: tanpa import Node.js/Prisma, jadi dipakai oleh route
 * `app/b/[kode]` maupun skrip tes (`scripts/test-qr-short-links.ts`).
 */
import {
  QR_CHAPTERS,
  QR_SUMATIF,
  SMA_FEATURES,
  SMP_FEATURES,
  SUMATIF_FEATURE,
  type QrChapter,
  type QrFeatureRule,
  type QrSumatif,
} from "@/data/qr-codes";

export interface QrEntry {
  /** Kode kanonik (huruf besar), seperti tercetak di buku. */
  kode: string;
  fitur: string;
  rule: QrFeatureRule;
  /** Bab buku; null untuk kode Tes Sumatif. */
  bab: QrChapter | null;
  sumatif: QrSumatif | null;
}

export interface QrViewer {
  role: string;
  isFounder: boolean;
}

export type QrDestination =
  | { kind: "redirect"; href: string }
  | { kind: "login"; href: string }
  | { kind: "info"; href: string };

const FEATURE_SETS: Record<"SMP" | "SMA", Record<string, QrFeatureRule>> = {
  SMP: SMP_FEATURES,
  SMA: SMA_FEATURES,
};

function buildIndex(): Map<string, QrEntry> {
  const index = new Map<string, QrEntry>();
  const add = (alias: string, entry: QrEntry) => {
    const key = alias.toUpperCase();
    const existing = index.get(key);
    if (existing && existing.kode !== entry.kode) {
      throw new Error(`Kode QR ganda: ${key} (${existing.kode} vs ${entry.kode})`);
    }
    index.set(key, entry);
  };

  for (const bab of QR_CHAPTERS) {
    const jenjang = bab.prefix.startsWith("BC-SMA") ? "SMA" : "SMP";
    for (const fitur of bab.fitur) {
      const rule = FEATURE_SETS[jenjang][fitur];
      if (!rule) throw new Error(`Fitur QR tidak dikenal: ${bab.prefix}-${fitur}`);
      const kode = `${bab.prefix}-${fitur}`;
      add(kode, { kode, fitur, rule, bab, sumatif: null });
    }
  }

  for (const sumatif of QR_SUMATIF) {
    const entry: QrEntry = { kode: sumatif.kode, fitur: "SUMATIF", rule: SUMATIF_FEATURE, bab: null, sumatif };
    add(sumatif.kode, entry);
    for (const alias of sumatif.alias) add(alias, entry);
  }

  return index;
}

const INDEX = buildIndex();

/** Kode kanonik yang tercetak di buku (tanpa alias). */
export function allQrCodes(): string[] {
  return [...new Set([...INDEX.values()].map((e) => e.kode))];
}

/** Normalisasi masukan dari URL: decode, rapikan spasi, huruf besar. */
export function normalizeQrCode(raw: string): string {
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    // Biarkan apa adanya bila bukan URI-encoded yang sah.
  }
  return value.trim().toUpperCase();
}

/** Cari kode (tidak peka huruf besar/kecil). Null bila kode tidak dikenal. */
export function findQrCode(raw: string): QrEntry | null {
  return INDEX.get(normalizeQrCode(raw)) ?? null;
}

export function qrShortPath(kode: string): string {
  return `/b/${kode}`;
}

export function qrInfoPath(kode: string): string {
  return `/b/${kode}/info`;
}

function fill(path: string, entry: QrEntry): string {
  return entry.bab ? path.replace("{unit}", entry.bab.unitId) : path;
}

export type QrAudienceResolved = "murid" | "guru" | "tamu" | "lainnya";

export function audienceFor(viewer: QrViewer | null): QrAudienceResolved {
  if (!viewer) return "tamu";
  if (viewer.isFounder || viewer.role === "GURU") return "guru";
  if (viewer.role === "MURID") return "murid";
  return "lainnya";
}

/** Halaman tujuan untuk satu audiens; null = halaman info "Segera hadir". */
export function targetFor(entry: QrEntry, audience: "murid" | "guru"): string | null {
  const path = entry.rule[audience];
  return path ? fill(path, entry) : null;
}

/**
 * Tentukan tujuan akhir. Murid → halaman murid, guru → halaman guru.
 * Belum masuk → halaman publik bila ada, selain itu login dengan `next`
 * kembali ke `/b/{KODE}` (lalu dipilah lagi menurut peran).
 * Peran lain (ADMIN/UMUM) → halaman publik bila ada, selain itu halaman info.
 */
export function resolveQrDestination(entry: QrEntry, viewer: QrViewer | null): QrDestination {
  const audience = audienceFor(viewer);
  if (audience === "tamu") {
    if (entry.rule.tamu) return { kind: "redirect", href: fill(entry.rule.tamu, entry) };
    return { kind: "login", href: `/login?next=${encodeURIComponent(qrShortPath(entry.kode))}` };
  }
  if (audience === "lainnya") {
    if (entry.rule.tamu) return { kind: "redirect", href: fill(entry.rule.tamu, entry) };
    return { kind: "info", href: qrInfoPath(entry.kode) };
  }
  const href = targetFor(entry, audience);
  return href ? { kind: "redirect", href } : { kind: "info", href: qrInfoPath(entry.kode) };
}

/** Teks singkat asal kode, mis. "Jelajah Kata Kelas 7 · Bab 1 Teks Deskripsi". */
export function describeQrEntry(entry: QrEntry): string {
  if (entry.bab) return `${entry.bab.buku} Kelas ${entry.bab.kelas} · Bab ${entry.bab.bab} ${entry.bab.judul}`;
  if (entry.sumatif) return `${entry.sumatif.buku} Kelas ${entry.sumatif.kelas} · Tes Sumatif Semester ${entry.sumatif.semester} (${entry.sumatif.cakupan})`;
  return entry.kode;
}
