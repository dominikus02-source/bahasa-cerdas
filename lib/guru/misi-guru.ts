export type MisiGuruId =
  | "mgmp"
  | "artikel"
  | "materi"
  | "kelas"
  | "kirim-materi"
  | "toko-karya"
  | "latihan";

export interface MisiGuruConfig {
  id: MisiGuruId;
  label: string;
  desc: string;
  xp: number;
  href: string;
  icon: string;
  iconBg: string;
}

export const XP_PER_LEVEL = 500;

export const MISI_GURU: MisiGuruConfig[] = [
  {
    id: "mgmp",
    label: "Ikut MGMP",
    desc: "Bergabung dengan komunitas MGMP",
    xp: 30,
    href: "/guru/komunitas",
    icon: "users",
    iconBg: "bg-violet-500/90",
  },
  {
    id: "artikel",
    label: "Menulis Artikel",
    desc: "Tulis artikel minggu ini",
    xp: 50,
    href: "/guru/artikel",
    icon: "pen",
    iconBg: "bg-sky-500/90",
  },
  {
    id: "materi",
    label: "Mengunggah Materi Ajar",
    desc: "Unggah materi ajar minggu ini",
    xp: 40,
    href: "/guru/materi",
    icon: "fileUp",
    iconBg: "bg-emerald-500/90",
  },
  {
    id: "kelas",
    label: "Membuat Kelas",
    desc: "Buat kelas baru minggu ini",
    xp: 20,
    href: "/guru/kelasku",
    icon: "kelas",
    iconBg: "bg-amber-500/90",
  },
  {
    id: "kirim-materi",
    label: "Mengirim Materi Ajar",
    desc: "Kirim materi ke kelas",
    xp: 30,
    href: "/guru/materi",
    icon: "send",
    iconBg: "bg-teal-500/90",
  },
  {
    id: "toko-karya",
    label: "Mengunggah ke Toko Karya",
    desc: "Jual karyamu di marketplace",
    xp: 60,
    href: "/guru/toko-karya",
    icon: "store",
    iconBg: "bg-orange-500/90",
  },
  {
    id: "latihan",
    label: "Mengirim Latihan dari Bank Soal",
    desc: "Bagikan latihan ke kelas",
    xp: 40,
    href: "/guru/bank-soal",
    icon: "database",
    iconBg: "bg-indigo-500/90",
  },
];

export const XP_MISI: Record<MisiGuruId, number> = Object.fromEntries(
  MISI_GURU.map((m) => [m.id, m.xp])
) as Record<MisiGuruId, number>;

export const XP_MAX_MINGGU = MISI_GURU.reduce((s, m) => s + m.xp, 0);

export function levelDariXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function xpDalamLevel(xp: number): number {
  return xp % XP_PER_LEVEL;
}
