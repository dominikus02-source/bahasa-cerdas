import { db } from "@/lib/db";
import type { KompetensiType } from "@prisma/client";

const UKBI_TYPES: KompetensiType[] = ["UKBI_SD", "UKBI_SMP", "UKBI_SMA", "UKBI", "UKBI_SIMULASI", "UKBI_LATIHAN", "UKBI_LATIHAN_SD", "UKBI_LATIHAN_SMP", "UKBI_LATIHAN_SMA", "UKBI_GURU_SIMULASI", "UKBI_GURU_LATIHAN"];

const TKA_TYPES: KompetensiType[] = ["TKA_SD", "TKA_SMP", "TKA_SMA", "TKA_UTBK", "TKA_GURU", "TKA_GURU_SIMULASI", "TKA_GURU_LATIHAN"];

export function isUKBIType(type: string): boolean {
  return (UKBI_TYPES as string[]).includes(type);
}

export function isTKAType(type: string): boolean {
  return (TKA_TYPES as string[]).includes(type);
}

export function getUKBITrack(type: string): "SD" | "SMP" | "SMA" | "GURU" | "UMUM" {
  if (type.includes("SD")) return "SD";
  if (type.includes("SMP")) return "SMP";
  if (type.includes("SMA")) return "SMA";
  if (type.includes("GURU")) return "GURU";
  return "UMUM";
}

export function getTKATrack(type: string): "SD" | "SMP" | "SMA" | "UTBK" | "GURU" {
  if (type.includes("SD")) return "SD";
  if (type.includes("SMP")) return "SMP";
  if (type.includes("SMA")) return "SMA";
  if (type.includes("UTBK")) return "UTBK";
  if (type.includes("GURU")) return "GURU";
  return "SMA";
}

export interface SimulationTrack {
  id: string
  label: string
  description: string
  target: string
  questionCount: number
  duration: number
  icon: string
  bgGradient: string
  paketId?: string
  available: boolean
}

export async function getUKBIPackages(): Promise<SimulationTrack[]> {
  const pakets = await db.paketKompetensi.findMany({
    where: { isActive: true, type: { in: UKBI_TYPES } },
    orderBy: { createdAt: "desc" },
  });

  const trackMap: Record<string, SimulationTrack> = {
    SD: { id: "ukbi-sd", label: "UKBI SD", description: "Latihan Bahasa Indonesia untuk tingkat SD", target: "Siswa SD kelas 4-6", questionCount: 0, duration: 0, icon: "🎒", bgGradient: "from-cyan-500 to-blue-500", available: false },
    SMP: { id: "ukbi-smp", label: "UKBI SMP", description: "Latihan Bahasa Indonesia untuk tingkat SMP", target: "Siswa SMP kelas 7-9", questionCount: 0, duration: 0, icon: "📚", bgGradient: "from-indigo-500 to-blue-600", available: false },
    SMA: { id: "ukbi-sma", label: "UKBI SMA", description: "Latihan Bahasa Indonesia untuk tingkat SMA", target: "Siswa SMA kelas 10-12", questionCount: 0, duration: 0, icon: "🎓", bgGradient: "from-violet-500 to-purple-600", available: false },
    GURU: { id: "ukbi-guru", label: "UKBI Guru/Umum", description: "Latihan Bahasa Indonesia untuk guru dan umum", target: "Guru & masyarakat umum", questionCount: 0, duration: 0, icon: "👨‍🏫", bgGradient: "from-emerald-500 to-teal-600", available: false },
  };

  for (const p of pakets) {
    const track = getUKBITrack(p.type);
    if (trackMap[track]) {
      trackMap[track].questionCount += p.totalQuestions || 0;
      trackMap[track].duration = Math.max(trackMap[track].duration, p.duration);
      trackMap[track].available = true;
      if (!trackMap[track].paketId) trackMap[track].paketId = p.id;
    }
  }

  return Object.values(trackMap);
}

export async function getTKAPackages(): Promise<SimulationTrack[]> {
  const pakets = await db.paketKompetensi.findMany({
    where: { isActive: true, type: { in: TKA_TYPES } },
    orderBy: { createdAt: "desc" },
  });

  const trackMap: Record<string, SimulationTrack> = {
    SD: { id: "tka-sd", label: "TKA Kelas 6", description: "Latihan soal Bahasa Indonesia untuk persiapan ujian SD", target: "Siswa kelas 6 SD", questionCount: 0, duration: 0, icon: "🎒", bgGradient: "from-rose-500 to-pink-500", available: false },
    SMP: { id: "tka-smp", label: "TKA Kelas 9", description: "Latihan soal Bahasa Indonesia untuk persiapan ujian SMP", target: "Siswa kelas 9 SMP", questionCount: 0, duration: 0, icon: "📚", bgGradient: "from-teal-500 to-emerald-600", available: false },
    SMA: { id: "tka-sma", label: "TKA Kelas 12", description: "Latihan soal Bahasa Indonesia untuk persiapan ujian SMA", target: "Siswa kelas 12 SMA", questionCount: 0, duration: 0, icon: "🎓", bgGradient: "from-purple-500 to-fuchsia-600", available: false },
    UTBK: { id: "tka-utbk", label: "TKA UTBK", description: "Latihan soal Bahasa Indonesia untuk persiapan UTBK", target: "Peserta UTBK", questionCount: 0, duration: 0, icon: "🎯", bgGradient: "from-orange-500 to-amber-600", available: false },
    GURU: { id: "tka-guru", label: "TKA Bahasa Indonesia Lanjutan", description: "Latihan Bahasa Indonesia tingkat lanjut untuk guru", target: "Guru & profesional", questionCount: 0, duration: 0, icon: "👨‍🏫", bgGradient: "from-emerald-500 to-teal-600", available: false },
  };

  for (const p of pakets) {
    const track = getTKATrack(p.type);
    if (trackMap[track]) {
      trackMap[track].questionCount += p.totalQuestions || 0;
      trackMap[track].duration = Math.max(trackMap[track].duration, p.duration);
      trackMap[track].available = true;
      if (!trackMap[track].paketId) trackMap[track].paketId = p.id;
    }
  }

  return Object.values(trackMap);
}
