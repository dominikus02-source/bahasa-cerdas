/**
 * Simulation Package Resolver
 *
 * Provides runtime wiring between UI simulation pages and PaketKompetensi records.
 * Distinguishes UKBI_SD/SMP/SMA/GURU and TKA_SD/SMP/SMA/UTBK/GURU tracks.
 * Handles legacy pakets with limited data and marks them appropriately.
 */

import { db } from "@/lib/db";
import type { KompetensiType } from "@prisma/client";

// ── UKBI Type Registry ──
const UKBI_TYPES: KompetensiType[] = [
  "UKBI_SD", "UKBI_SMP", "UKBI_SMA", "UKBI", "UKBI_SIMULASI", "UKBI_LATIHAN",
  "UKBI_LATIHAN_SD", "UKBI_LATIHAN_SMP", "UKBI_LATIHAN_SMA",
  "UKBI_GURU_SIMULASI", "UKBI_GURU_LATIHAN",
];

// ── TKA Type Registry ──
const TKA_TYPES: KompetensiType[] = [
  "TKA_SD", "TKA_SMP", "TKA_SMA", "TKA_UTBK",
  "TKA_GURU", "TKA_GURU_SIMULASI", "TKA_GURU_LATIHAN",
];

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
  isLegacy?: boolean
  track: string
  type: string
}

const UKBI_TRACK_DEFS: Record<string, Omit<SimulationTrack, "questionCount" | "duration" | "paketId" | "available" | "isLegacy">> = {
  SD:   { id: "ukbi-sd", label: "UKBI SD Practice", description: "Latihan Bahasa Indonesia untuk peserta SD", target: "Peserta SD kelas 4–6", icon: "School", bgGradient: "from-cyan-500 to-blue-500", track: "SD", type: "UKBI_SD" },
  SMP:  { id: "ukbi-smp", label: "UKBI SMP", description: "Latihan Bahasa Indonesia untuk peserta SMP", target: "Peserta SMP kelas 7–9", icon: "BookOpen", bgGradient: "from-indigo-500 to-blue-600", track: "SMP", type: "UKBI_SMP" },
  SMA:  { id: "ukbi-sma", label: "UKBI SMA", description: "Latihan Bahasa Indonesia untuk peserta SMA", target: "Peserta SMA kelas 10–12", icon: "GraduationCap", bgGradient: "from-violet-500 to-purple-600", track: "SMA", type: "UKBI_SMA" },
  GURU: { id: "ukbi-guru", label: "UKBI Guru/Umum", description: "Latihan Bahasa Indonesia untuk guru dan umum", target: "Guru & masyarakat umum", icon: "Award", bgGradient: "from-emerald-500 to-teal-600", track: "GURU", type: "UKBI_GURU_SIMULASI" },
};

const TKA_TRACK_DEFS: Record<string, Omit<SimulationTrack, "questionCount" | "duration" | "paketId" | "available" | "isLegacy">> = {
  SD:   { id: "tka-sd", label: "TKA Kelas 6", description: "Latihan soal Bahasa Indonesia untuk persiapan ujian SD", target: "Siswa kelas 6 SD", icon: "PencilRuler", bgGradient: "from-rose-500 to-pink-500", track: "SD", type: "TKA_SD" },
  SMP:  { id: "tka-smp", label: "TKA Kelas 9", description: "Latihan soal Bahasa Indonesia untuk persiapan ujian SMP", target: "Siswa kelas 9 SMP", icon: "Layers", bgGradient: "from-teal-500 to-emerald-600", track: "SMP", type: "TKA_SMP" },
  SMA:  { id: "tka-sma", label: "TKA Kelas 12", description: "Latihan soal Bahasa Indonesia untuk persiapan ujian SMA/SMK/MA", target: "Siswa kelas 12 SMA", icon: "GraduationCap", bgGradient: "from-purple-500 to-fuchsia-600", track: "SMA", type: "TKA_SMA" },
  UTBK: { id: "tka-utbk", label: "TKA UTBK", description: "Latihan soal Bahasa Indonesia untuk persiapan UTBK", target: "Peserta UTBK", icon: "Target", bgGradient: "from-orange-500 to-amber-600", track: "UTBK", type: "TKA_UTBK" },
  GURU: { id: "tka-guru", label: "TKA Bahasa Indonesia Lanjutan", description: "Latihan Bahasa Indonesia tingkat lanjut", target: "Guru & profesional", icon: "UserCheck", bgGradient: "from-emerald-500 to-teal-600", track: "GURU", type: "TKA_GURU" },
};

export async function getUKBIPackages(): Promise<SimulationTrack[]> {
  const pakets = await db.paketKompetensi.findMany({
    where: { isActive: true, type: { in: UKBI_TYPES } },
    orderBy: { createdAt: "desc" },
  });

  const trackMap: Record<string, SimulationTrack> = {};
  for (const [trackKey, def] of Object.entries(UKBI_TRACK_DEFS)) {
    trackMap[trackKey] = { ...def, questionCount: 0, duration: 0, available: false };
  }

  for (const p of pakets) {
    const track = getUKBITrack(p.type);
    if (trackMap[track]) {
      trackMap[track].questionCount += p.totalQuestions || 0;
      trackMap[track].duration = Math.max(trackMap[track].duration, p.duration);
      trackMap[track].available = true;
      if (!trackMap[track].paketId) {
        trackMap[track].paketId = p.id;
      }
    }
  }

  // Mark limited legacy banks
  if (trackMap["SMP"] && trackMap["SMP"].questionCount <= 25) {
    trackMap["SMP"].isLegacy = true;
  }
  if (trackMap["SMA"] && trackMap["SMA"].questionCount <= 25) {
    trackMap["SMA"].isLegacy = true;
  }

  return Object.values(trackMap);
}

export async function getTKAPackages(): Promise<SimulationTrack[]> {
  const pakets = await db.paketKompetensi.findMany({
    where: { isActive: true, type: { in: TKA_TYPES } },
    orderBy: { createdAt: "desc" },
  });

  const trackMap: Record<string, SimulationTrack> = {};
  for (const [trackKey, def] of Object.entries(TKA_TRACK_DEFS)) {
    trackMap[trackKey] = { ...def, questionCount: 0, duration: 0, available: false };
  }

  for (const p of pakets) {
    const track = getTKATrack(p.type);
    if (trackMap[track]) {
      trackMap[track].questionCount += p.totalQuestions || 0;
      trackMap[track].duration = Math.max(trackMap[track].duration, p.duration);
      trackMap[track].available = true;
      if (!trackMap[track].paketId) {
        trackMap[track].paketId = p.id;
      }
    }
  }

  // Mark limited legacy banks
  if (trackMap["SD"] && trackMap["SD"].questionCount <= 10) {
    trackMap["SD"].isLegacy = true;
  }
  if (trackMap["SMP"] && trackMap["SMP"].questionCount <= 35) {
    trackMap["SMP"].isLegacy = true;
  }
  if (trackMap["SMA"] && trackMap["SMA"].questionCount <= 33) {
    trackMap["SMA"].isLegacy = true;
  }

  return Object.values(trackMap);
}

export async function getSimulationPackageByTrack(track: string, product: "UKBI" | "TKA"): Promise<SimulationTrack | null> {
  const packages = product === "UKBI" ? await getUKBIPackages() : await getTKAPackages();
  return packages.find(p => p.track === track) || null;
}

export function normalizeSimulationPackage(pkg: SimulationTrack): SimulationTrack {
  return {
    ...pkg,
    description: pkg.available
      ? pkg.description
      : `${pkg.label} — Segera tersedia`,
  };
}
