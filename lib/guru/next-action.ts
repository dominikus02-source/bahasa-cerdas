/**
 * Guru Engagement 2.0 — Phase 1: Next Action Guru.
 *
 * Memilih SATU langkah berikutnya yang paling berdampak bagi guru dari data
 * Misi Guru yang SUDAH ADA (MisiGuruStatus). Murni (pure), tanpa DB, tanpa
 * LLM, tanpa sistem quest baru, tanpa XP engine baru.
 *
 * Prioritas:
 *   1. Misi "hampir selesai" (parsial) — saat ini TIDAK berlaku karena semua
 *      target misi adalah 1 (biner: selesai/belum), disediakan untuk masa
 *      depan bila target berubah menjadi multi-langkah.
 *   2. Misi belum selesai dengan XP tertinggi (reward mingguan maksimal).
 *   3. Semua misi selesai → fallback konten: Artikel → Puisi → Materi → Kelas
 *      → umpan balik karya murid.
 */

import { MISI_GURU, type MisiGuruConfig } from "@/lib/guru/misi-guru";
import type { MisiGuruStatus } from "@/lib/guru/misi-guru-status";

export type NextActionGuruType =
  | "misi"
  | "artikel"
  | "puisi"
  | "materi"
  | "kelas"
  | "karya";

export interface NextActionGuru {
  type: NextActionGuruType;
  label: string;
  desc: string;
  xp: number;
  href: string;
  icon: string;
  iconBg: string;
  misiId?: string;
  semuaSelesai: boolean;
}

const MISI_BY_ID = new Map(MISI_GURU.map((m) => [m.id, m]));

/** Tie-break konten saat XP sama (artikel > puisi > materi > kelas > lainnya). */
const PRIORITAS_MISI = [
  "artikel",
  "puisi",
  "materi",
  "kelas",
  "mgmp",
  "kirim-materi",
  "latihan",
  "toko-karya",
] as const;

/** Chain fallback saat SEMUA misi selesai (Artikel → Puisi → Materi → Kelas → karya). */
export const CTA_SELESAI: readonly NextActionGuru[] = [
  {
    type: "artikel",
    label: "Tulis Artikel",
    desc: "Bagikan praktik baikmu dan kumpulkan XP mingguan berikutnya",
    xp: 50,
    href: "/guru/artikel",
    icon: "pen",
    iconBg: "bg-sky-500/90",
    semuaSelesai: true,
  },
  {
    type: "puisi",
    label: "Tulis Puisi",
    desc: "Ajak murid melihat karya sastra dari gurunya sendiri",
    xp: 50,
    href: "/guru/artikel",
    icon: "pen",
    iconBg: "bg-purple-500/90",
    semuaSelesai: true,
  },
  {
    type: "materi",
    label: "Unggah Materi Ajar",
    desc: "Perkaya kelasmu dengan materi baru minggu ini",
    xp: 40,
    href: "/guru/materi-ajar",
    icon: "fileUp",
    iconBg: "bg-emerald-500/90",
    semuaSelesai: true,
  },
  {
    type: "kelas",
    label: "Buat Kelas Baru",
    desc: "Ajak lebih banyak murid belajar bersama",
    xp: 20,
    href: "/guru/kelasku",
    icon: "kelas",
    iconBg: "bg-amber-500/90",
    semuaSelesai: true,
  },
  {
    type: "karya",
    label: "Beri Umpan Balik Karya Murid",
    desc: "Pilih & apresiasi karya terbaik di Pusat Literasi",
    xp: 0,
    href: "/guru/feed-karya",
    icon: "users",
    iconBg: "bg-violet-500/90",
    semuaSelesai: true,
  },
];

/**
 * Next Action tunggal guru. Mengembalikan aksi misi XP tertinggi bila ada misi
 * yang belum selesai, atau CTA konten pertama (Artikel) bila semua selesai.
 */
export function hitungNextActionGuru(status: MisiGuruStatus): NextActionGuru {
  const belum = status.misi
    .filter((m) => !m.selesai)
    .map((m) => MISI_BY_ID.get(m.id))
    .filter((m): m is MisiGuruConfig => !!m);

  if (belum.length > 0) {
    const pilihan = [...belum].sort((a, b) => {
      const xp = b.xp - a.xp;
      if (xp !== 0) return xp;
      const ia = PRIORITAS_MISI.indexOf(a.id as (typeof PRIORITAS_MISI)[number]);
      const ib = PRIORITAS_MISI.indexOf(b.id as (typeof PRIORITAS_MISI)[number]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    })[0];

    return {
      type: "misi",
      misiId: pilihan.id,
      label: pilihan.label,
      desc: pilihan.desc,
      xp: pilihan.xp,
      href: pilihan.href,
      icon: pilihan.icon,
      iconBg: pilihan.iconBg,
      semuaSelesai: false,
    };
  }

  return { ...CTA_SELESAI[0] };
}

/** ID misi yang menjadi Next Action (untuk highlight di daftar misi), atau null. */
export function nextActionMisiId(status: MisiGuruStatus): string | null {
  const aksi = hitungNextActionGuru(status);
  return aksi.type === "misi" && aksi.misiId ? aksi.misiId : null;
}
