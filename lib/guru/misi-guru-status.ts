import { db } from "@/lib/db";
import {
  MISI_GURU,
  XP_MAX_MINGGU,
  XP_MISI,
  XP_PER_LEVEL,
  levelDariXp,
  xpDalamLevel,
} from "@/lib/guru/misi-guru";
import type { MisiGuruId } from "@/lib/guru/misi-guru";

export interface MisiStatus {
  id: MisiGuruId;
  selesai: boolean;
  jumlah: number;
  target: number;
}

export interface MisiGuruStatus {
  mingguMulai: string;
  misi: MisiStatus[];
  totalSelesai: number;
  totalMisi: number;
  xp: number;
  xpMax: number;
  level: number;
  xpLevel: number;
  xpPerLevel: number;
  streak: number;
  semuaSelesai: boolean;
}

function startOfWeek(now: Date): Date {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function hitungStreak(hariAktif: Set<string>): number {
  const cur = new Date();
  cur.setHours(0, 0, 0, 0);
  if (!hariAktif.has(dayKey(cur))) cur.setDate(cur.getDate() - 1);
  let streak = 0;
  while (hariAktif.has(dayKey(cur))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

export async function cekMisiGuru(teacherId: string): Promise<MisiGuruStatus> {
  const awalMinggu = startOfWeek(new Date());

  const [mgmp, artikel, materi, kelas, kirimMateri, tokoKarya, latihan] =
    await Promise.all([
      db.communityMember.count({
        where: { userId: teacherId, community: { type: "MGMP" } },
      }),
      db.artikel.count({
        where: { authorId: teacherId, createdAt: { gte: awalMinggu } },
      }),
      db.materi.count({
        where: { uploaderId: teacherId, createdAt: { gte: awalMinggu } },
      }),
      db.group.count({
        where: { teacherId, createdAt: { gte: awalMinggu } },
      }),
      db.materiKirim.count({
        where: { teacherId, createdAt: { gte: awalMinggu } },
      }),
      db.karya.count({
        where: { sellerId: teacherId, createdAt: { gte: awalMinggu } },
      }),
      db.quizAssignment.count({
        where: {
          quiz: { creatorId: teacherId, type: "LATIHAN" },
          assignedAt: { gte: awalMinggu },
        },
      }),
    ]);

  const batasStreak = new Date(awalMinggu);
  batasStreak.setDate(batasStreak.getDate() - 14);

  const [artikelDates, materiDates, kelasDates, kirimDates, karyaDates, latihanDates] =
    await Promise.all([
      db.artikel.findMany({
        where: { authorId: teacherId, createdAt: { gte: batasStreak } },
        select: { createdAt: true },
        take: 300,
      }),
      db.materi.findMany({
        where: { uploaderId: teacherId, createdAt: { gte: batasStreak } },
        select: { createdAt: true },
        take: 300,
      }),
      db.group.findMany({
        where: { teacherId, createdAt: { gte: batasStreak } },
        select: { createdAt: true },
        take: 300,
      }),
      db.materiKirim.findMany({
        where: { teacherId, createdAt: { gte: batasStreak } },
        select: { createdAt: true },
        take: 300,
      }),
      db.karya.findMany({
        where: { sellerId: teacherId, createdAt: { gte: batasStreak } },
        select: { createdAt: true },
        take: 300,
      }),
      db.quizAssignment.findMany({
        where: {
          quiz: { creatorId: teacherId, type: "LATIHAN" },
          assignedAt: { gte: batasStreak },
        },
        select: { assignedAt: true },
        take: 300,
      }),
    ]);

  const hariAktif = new Set<string>();
  for (const list of [
    artikelDates,
    materiDates,
    kelasDates,
    kirimDates,
    karyaDates,
    latihanDates,
  ]) {
    for (const item of list) {
      const d = "createdAt" in item ? (item as { createdAt: Date }).createdAt : (item as { assignedAt: Date }).assignedAt;
      hariAktif.add(dayKey(d));
    }
  }
  const streak = hitungStreak(hariAktif);

  const selesaiMap: Record<MisiGuruId, boolean> = {
    mgmp: mgmp > 0,
    artikel: artikel > 0,
    materi: materi > 0,
    kelas: kelas > 0,
    "kirim-materi": kirimMateri > 0,
    "toko-karya": tokoKarya > 0,
    latihan: latihan > 0,
  };

  const misi: MisiStatus[] = MISI_GURU.map((m) => {
    const jumlah = selesaiMap[m.id] ? 1 : 0;
    return { id: m.id, selesai: jumlah === 1, jumlah, target: 1 };
  });

  const totalSelesai = misi.filter((m) => m.selesai).length;
  const xp = misi.reduce((s, m) => (m.selesai ? s + XP_MISI[m.id] : s), 0);

  return {
    mingguMulai: awalMinggu.toISOString(),
    misi,
    totalSelesai,
    totalMisi: MISI_GURU.length,
    xp,
    xpMax: XP_MAX_MINGGU,
    level: levelDariXp(xp),
    xpLevel: xpDalamLevel(xp),
    xpPerLevel: XP_PER_LEVEL,
    streak,
    semuaSelesai: totalSelesai === MISI_GURU.length,
  };
}
