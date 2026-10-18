/**
 * JUMPA Fase 3 — TABEL PAKET (Gratis vs Premium). SATU-SATUNYA tempat angka
 * batas paket JUMPA. Murni (tanpa I/O) supaya bisa dites dan dipakai klien.
 *
 * Paket ruang ditentukan oleh PEMBUAT ruang saat ruang dibuat
 * (lib/jumpa/entitlement.ts → resolvePlan(): FOUNDER/PRO/trial = PREMIUM).
 * Batas peserta & durasi disalin ke baris JumpaRoom (maxParticipants,
 * maxDurationMin) dan ditegakkan server di:
 *   - POST /api/jumpa/rooms              → ruang per hari, batas ruang
 *   - POST /api/jumpa/rooms/[code]/token → kapasitas, waktu habis, kualitas
 *   - cron /api/cron/jumpa-sweep         → mengakhiri ruang yang lewat waktu
 *   - LiveKit maxParticipants            → pagar terakhir di server media
 *
 * Ruang MURID (belajar bareng) SELALU memakai baris MURID: gratis, aman,
 * tidak bergantung paket siapa pun, dan murid tidak pernah melihat ajakan
 * upgrade.
 *
 * Mengubah angka: ubah tabel di bawah, jalankan `npm run test:jumpa-tiers`,
 * dan perbarui tabel di docs/JUMPA_PHASE3_PERFORMA_TIER.md. Ruang yang
 * sudah dibuat tetap memakai angka saat dibuat.
 */
import type { JumpaKind } from "./caps";

export type JumpaTier = "FREE" | "PREMIUM";

/** Batas kualitas kirim kamera (tinggi piksel). */
export type JumpaVideoCap = 360 | 540 | 720 | 1080;

export interface JumpaRoomLimits {
  maxParticipants: number;
  maxDurationMin: number;
}

export interface JumpaTierDef {
  /** Label UI (Bahasa Indonesia). */
  label: string;
  /** Batas per jenis ruang yang boleh dibuat guru (KELAS, GURU). */
  rooms: Record<Exclude<JumpaKind, "MURID">, JumpaRoomLimits>;
  /** Maks ruang KELAS+GURU baru per hari (WIB). null = tanpa batas. */
  roomsPerDay: number | null;
  /** Resolusi kamera tertinggi yang boleh dikirim (pilihan "HD"). */
  maxCameraHeight: JumpaVideoCap;
  /** Resolusi berbagi layar tertinggi. */
  maxScreenHeight: JumpaVideoCap;
  /** Fitur premium (true = tersedia). Yang belum dibangun ditandai `soon`. */
  features: {
    recording: boolean;
    backgroundBlur: boolean;
  };
}

export const JUMPA_TIERS: Record<JumpaTier, JumpaTierDef> = {
  FREE: {
    label: "Gratis",
    rooms: {
      // 45 menit = 1 JP SMA (SMP 40, SD 35): satu jam pelajaran utuh muat.
      // 30 orang (keputusan CEO, 18-10-2026): kelas kecil/menengah muat;
      // rombel penuh (hingga 36 murid + guru) perlu Premium.
      KELAS: { maxParticipants: 30, maxDurationMin: 45 },
      GURU: { maxParticipants: 10, maxDurationMin: 45 },
    },
    roomsPerDay: 3,
    maxCameraHeight: 720,
    maxScreenHeight: 720,
    features: { recording: false, backgroundBlur: false },
  },
  PREMIUM: {
    label: "Premium",
    rooms: {
      KELAS: { maxParticipants: 50, maxDurationMin: 120 },
      GURU: { maxParticipants: 25, maxDurationMin: 120 },
    },
    roomsPerDay: null,
    maxCameraHeight: 1080,
    maxScreenHeight: 1080,
    // Rekaman & latar blur belum dibangun (Fase 4). Saat siap, cukup ubah
    // ke true di sini — UI membaca flag ini.
    features: { recording: false, backgroundBlur: false },
  },
};

/** Ruang belajar bareng murid: selalu sama, gratis, terlepas dari paket. */
export const JUMPA_MURID_ROOM: JumpaRoomLimits = { maxParticipants: 8, maxDurationMin: 60 };
export const JUMPA_MURID_MAX_CAMERA_HEIGHT: JumpaVideoCap = 720;

/** Fitur premium yang sudah dijanjikan di UI tetapi belum tersedia. */
export const JUMPA_PREMIUM_SOON = ["recording", "backgroundBlur"] as const;

/** Ke mana tombol "Lihat Premium" membawa guru (halaman langganan yang ada). */
export const JUMPA_UPGRADE_URL = "/guru/berlangganan";

/** Tampilkan ajakan upgrade (khusus host guru paket Gratis) sebelum habis. */
export const JUMPA_UPGRADE_PROMPT_BEFORE_END_MIN = 5;

/** Batas ruang (peserta, durasi) untuk paket & jenis ruang. */
export function limitsFor(tier: JumpaTier, kind: JumpaKind): JumpaRoomLimits {
  if (kind === "MURID") return { ...JUMPA_MURID_ROOM };
  return { ...JUMPA_TIERS[tier].rooms[kind] };
}

/** Tinggi kamera maksimum yang boleh dikirim di ruang ini. */
export function cameraCapFor(tier: JumpaTier, kind: JumpaKind): JumpaVideoCap {
  if (kind === "MURID") return JUMPA_MURID_MAX_CAMERA_HEIGHT;
  return JUMPA_TIERS[tier].maxCameraHeight;
}

export function screenCapFor(tier: JumpaTier, kind: JumpaKind): JumpaVideoCap {
  if (kind === "MURID") return 720;
  return JUMPA_TIERS[tier].maxScreenHeight;
}

/** Awal hari (00:00 WIB, UTC+7) untuk hitungan "ruang per hari". */
export function startOfJakartaDay(now: Date): Date {
  const WIB_MS = 7 * 3_600_000;
  const local = new Date(now.getTime() + WIB_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - WIB_MS);
}

export type DailyQuotaDecision =
  | { ok: true; remaining: number | null }
  | { ok: false; code: "TIER_DAILY_LIMIT"; message: string; limit: number };

/** Boleh membuat ruang guru baru hari ini? (MURID tidak dihitung.) */
export function checkDailyQuota(tier: JumpaTier, kind: JumpaKind, createdToday: number): DailyQuotaDecision {
  const limit = JUMPA_TIERS[tier].roomsPerDay;
  if (kind === "MURID" || limit === null) return { ok: true, remaining: null };
  if (createdToday >= limit) {
    return {
      ok: false,
      code: "TIER_DAILY_LIMIT",
      limit,
      message: `Kuota ${limit} ruang per hari sudah habis. Coba lagi besok.`,
    };
  }
  return { ok: true, remaining: limit - createdToday - 1 };
}

/** Ringkasan paket untuk UI (dikirim server ke klien, tanpa rahasia). */
export interface JumpaTierView {
  tier: JumpaTier;
  label: string;
  kind: JumpaKind;
  maxParticipants: number;
  maxDurationMin: number;
  maxCameraHeight: JumpaVideoCap;
  maxScreenHeight: JumpaVideoCap;
  /** true bila ajakan upgrade boleh tampil untuk penonton ini. */
  canUpgrade: boolean;
  upgradeUrl: string | null;
}

export function tierView(params: {
  tier: JumpaTier;
  kind: JumpaKind;
  maxParticipants: number;
  maxDurationMin: number;
  /** Penonton adalah guru pembuat ruang (bukan murid, bukan tamu). */
  viewerIsGuruCreator: boolean;
}): JumpaTierView {
  const canUpgrade = params.tier === "FREE" && params.kind !== "MURID" && params.viewerIsGuruCreator;
  return {
    tier: params.tier,
    label: params.kind === "MURID" ? "Belajar bareng" : JUMPA_TIERS[params.tier].label,
    kind: params.kind,
    maxParticipants: params.maxParticipants,
    maxDurationMin: params.maxDurationMin,
    maxCameraHeight: cameraCapFor(params.tier, params.kind),
    maxScreenHeight: screenCapFor(params.tier, params.kind),
    canUpgrade,
    upgradeUrl: canUpgrade ? JUMPA_UPGRADE_URL : null,
  };
}

/** Paket tersimpan di metadata event ROOM_CREATED; ruang lama = PREMIUM. */
export function tierFromCreatedMetadata(meta: unknown): JumpaTier {
  if (meta && typeof meta === "object" && (meta as { tier?: unknown }).tier === "FREE") return "FREE";
  return "PREMIUM";
}
