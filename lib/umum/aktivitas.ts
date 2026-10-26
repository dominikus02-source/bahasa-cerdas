import { db } from "@/lib/db";

/**
 * Aktivitas dasbor UMUM — data NYATA saja: XP yang tercatat (XpLedger) dan
 * pembelian karya yang lunas (Pembelian). Tanpa contoh/data palsu.
 */

/** Chip produk per baris aktivitas; warna = pasangan token semantik. */
export type AktivitasTone = "gim" | "jalur" | "karya" | "kompetensi" | "harian" | "toko";

export type Aktivitas = {
  id: string;
  kind: "xp" | "beli";
  title: string;
  detail: string;
  chip: string;
  tone: AktivitasTone;
  at: Date;
  href?: string;
};

const XP_SOURCE: Record<string, { label: string; chip: string; tone: AktivitasTone }> = {
  GAME: { label: "Bermain gim", chip: "GIM", tone: "gim" },
  KATASTRA: { label: "Berkarya", chip: "KARYA", tone: "karya" },
  MENARA: { label: "Menara Cerdas", chip: "GIM", tone: "gim" },
  TANTANG: { label: "Tantangan", chip: "GIM", tone: "gim" },
  JALUR_CERDAS: { label: "Jalur Cerdas", chip: "JALUR CERDAS", tone: "jalur" },
  KOMPETENSI: { label: "Uji kompetensi", chip: "KOMPETENSI", tone: "kompetensi" },
  PENUGASAN: { label: "Penugasan", chip: "TUGAS", tone: "kompetensi" },
  KOTAK_HARIAN: { label: "Kotak harian", chip: "HARIAN", tone: "harian" },
};

const fmtRupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const fmtTanggal = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" });

/** "baru saja" · "5 menit lalu" · "2 jam lalu" · "3 hari lalu" · lalu tanggal. */
export function waktuRelatif(at: Date, now: Date = new Date()): string {
  const s = Math.max(0, Math.round((now.getTime() - at.getTime()) / 1000));
  if (s < 60) return "baru saja";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return fmtTanggal.format(at);
}

export async function loadAktivitas(userId: string, take = 6): Promise<Aktivitas[]> {
  const [xp, beli] = await Promise.all([
    db.xpLedger
      .findMany({ where: { userId, amount: { gt: 0 } }, orderBy: { createdAt: "desc" }, take, select: { id: true, amount: true, source: true, createdAt: true } })
      .catch(() => []),
    db.pembelian
      .findMany({ where: { buyerId: userId, status: "PAID" }, orderBy: { createdAt: "desc" }, take, select: { id: true, amount: true, createdAt: true, karyaId: true, karya: { select: { title: true } } } })
      .catch(() => []),
  ]);
  const items: Aktivitas[] = [
    ...xp.map((x) => {
      const src = XP_SOURCE[x.source] ?? { label: "Aktivitas belajar", chip: "BELAJAR", tone: "kompetensi" as const };
      return { id: `xp-${x.id}`, kind: "xp" as const, title: src.label, detail: `+${x.amount} XP`, chip: src.chip, tone: src.tone, at: x.createdAt };
    }),
    ...beli.map((p) => ({
      id: `beli-${p.id}`,
      kind: "beli" as const,
      title: `Membeli karya: ${p.karya?.title || "Karya"}`,
      detail: fmtRupiah.format(p.amount),
      chip: "TOKO KARYA",
      tone: "toko" as const,
      at: p.createdAt,
      href: `/marketplace/${p.karyaId}`,
    })),
  ];
  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, take);
}
