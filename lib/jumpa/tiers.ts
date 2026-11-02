import { JUMPA_TRIAL } from "./trial-policy";
/**
 * JUMPA uji coba: satu kebijakan untuk semua akun (trial-policy.ts).
 * FREE/PREMIUM dipertahankan sebagai format metadata lama, bukan pembeda
 * kapasitas atau izin media. Ruang baru memakai batas runtime server-limits.ts.
 * Batas ruang lama tetap disimpan di DB; buat ruang baru untuk kebijakan baru.
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
  rooms: Record<Exclude<JumpaKind, "MURID" | "UMUM">, JumpaRoomLimits>;
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
      KELAS: { maxParticipants: JUMPA_TRIAL.maxParticipants, maxDurationMin: JUMPA_TRIAL.maxDurationMin },
      GURU: { maxParticipants: JUMPA_TRIAL.maxParticipants, maxDurationMin: JUMPA_TRIAL.maxDurationMin },
    },
    roomsPerDay: null,
    maxCameraHeight: 720,
    maxScreenHeight: 720,
    features: { recording: false, backgroundBlur: true },
  },
  PREMIUM: {
    label: "Premium",
    rooms: {
      KELAS: { maxParticipants: JUMPA_TRIAL.maxParticipants, maxDurationMin: JUMPA_TRIAL.maxDurationMin },
      GURU: { maxParticipants: JUMPA_TRIAL.maxParticipants, maxDurationMin: JUMPA_TRIAL.maxDurationMin },
    },
    roomsPerDay: null,
    maxCameraHeight: 720,
    maxScreenHeight: 720,
    features: { recording: false, backgroundBlur: true },
  },
};

/** Ruang belajar bareng murid: gratis 8, premium 15. */
export const JUMPA_MURID_FREE: JumpaRoomLimits = { maxParticipants: JUMPA_TRIAL.maxParticipants, maxDurationMin: JUMPA_TRIAL.maxDurationMin };
export const JUMPA_MURID_PREMIUM: JumpaRoomLimits = { maxParticipants: JUMPA_TRIAL.maxParticipants, maxDurationMin: JUMPA_TRIAL.maxDurationMin };
export const JUMPA_MURID_MAX_CAMERA_HEIGHT: JumpaVideoCap = 720;

/**
 * Paket ruang UMUM (akun umum: mahasiswa/dosen/masyarakat). Mengikuti paket
 * Gratis guru: 10 orang, 45 menit, 720p, 3 ruang/hari. Tanpa webinar.
 * UMUM_PREMIUM = kait untuk paket berbayar UMUM nanti; BELUM aktif
 * (JUMPA_UMUM_PREMIUM_ENABLED = false) sehingga semua ruang UMUM = Gratis.
 */
export interface JumpaUmumTierDef {
  label: string;
  room: JumpaRoomLimits;
  roomsPerDay: number | null;
  maxCameraHeight: JumpaVideoCap;
  maxScreenHeight: JumpaVideoCap;
}
export const JUMPA_UMUM_TIERS: Record<"UMUM_FREE" | "UMUM_PREMIUM", JumpaUmumTierDef> = {
  UMUM_FREE: { label: "Gratis", room: { maxParticipants: JUMPA_TRIAL.maxParticipants, maxDurationMin: JUMPA_TRIAL.maxDurationMin }, roomsPerDay: null, maxCameraHeight: 720, maxScreenHeight: 720 },
  UMUM_PREMIUM: { label: "Premium", room: { maxParticipants: JUMPA_TRIAL.maxParticipants, maxDurationMin: JUMPA_TRIAL.maxDurationMin }, roomsPerDay: null, maxCameraHeight: 720, maxScreenHeight: 720 },
};
/** Kait paket UMUM berbayar. Jangan nyalakan tanpa alur pembayaran UMUM. */
export const JUMPA_UMUM_PREMIUM_ENABLED = false;

/** Paket UMUM yang berlaku. Selama premium belum aktif → selalu UMUM_FREE. */
export function umumTierDef(tier: JumpaTier): JumpaUmumTierDef {
  return JUMPA_UMUM_PREMIUM_ENABLED && tier === "PREMIUM" ? JUMPA_UMUM_TIERS.UMUM_PREMIUM : JUMPA_UMUM_TIERS.UMUM_FREE;
}

/** Webinar: hanya Premium, 1x per minggu, kapasitas lebih tinggi. */
export const JUMPA_WEBINAR: JumpaRoomLimits = { maxParticipants: JUMPA_TRIAL.maxParticipants, maxDurationMin: JUMPA_TRIAL.maxDurationMin };
export const JUMPA_WEBINAR_PER_WEEK = 1;

/** Fitur premium yang sudah dijanjikan di UI tetapi belum tersedia. */
export const JUMPA_PREMIUM_SOON = ["recording"] as const;

/** Ke mana tombol "Lihat Premium" membawa guru (halaman langganan yang ada). */
export const JUMPA_UPGRADE_URL = "/guru/berlangganan";

/** Tampilkan ajakan upgrade (khusus host guru paket Gratis) sebelum habis. */
export const JUMPA_UPGRADE_PROMPT_BEFORE_END_MIN = 5;

/** Batas ruang (peserta, durasi) untuk paket & jenis ruang. */
export function limitsFor(tier: JumpaTier, kind: JumpaKind, isWebinar = false): JumpaRoomLimits {
  void tier; void kind; void isWebinar;
  return { maxParticipants: JUMPA_TRIAL.maxParticipants, maxDurationMin: JUMPA_TRIAL.maxDurationMin };
}

/** Tinggi kamera maksimum yang boleh dikirim di ruang ini. */
export function cameraCapFor(tier: JumpaTier, kind: JumpaKind): JumpaVideoCap {
  void tier; void kind;
  return JUMPA_TRIAL.maxCameraHeight;
}

export function screenCapFor(tier: JumpaTier, kind: JumpaKind): JumpaVideoCap {
  void tier; void kind;
  return JUMPA_TRIAL.maxScreenHeight;
}

/** Awal hari (00:00 WIB, UTC+7) untuk hitungan "ruang per hari". */
export function startOfJakartaDay(now: Date): Date {
  const WIB_MS = 7 * 3_600_000;
  const local = new Date(now.getTime() + WIB_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - WIB_MS);
}

/** Awal minggu (Senin 00:00 WIB) untuk kuota webinar. */
export function startOfJakartaWeek(now: Date): Date {
  const day = startOfJakartaDay(now);
  const dayOfWeek = (new Date(day.getTime() + 7 * 3_600_000).getUTCDay() + 6) % 7; // Senin = 0
  return new Date(day.getTime() - dayOfWeek * 86_400_000);
}

export type DailyQuotaDecision =
  | { ok: true; remaining: number | null }
  | { ok: false; code: "TIER_DAILY_LIMIT"; message: string; limit: number };

/** Boleh membuat ruang guru baru hari ini? (MURID tidak dihitung.) */
export function checkDailyQuota(tier: JumpaTier, kind: JumpaKind, createdToday: number): DailyQuotaDecision {
  void tier; void kind; void createdToday;
  return { ok: true, remaining: null };
}

export type WeeklyQuotaDecision =
  | { ok: true; remaining: number }
  | { ok: false; code: "WEBINAR_WEEKLY_LIMIT"; message: string; limit: number };

/** Boleh membuat webinar minggu ini? Hanya Premium. */
export function checkWebinarWeeklyQuota(tier: JumpaTier, webinarsThisWeek: number): WeeklyQuotaDecision {
  void tier; void webinarsThisWeek;
  return { ok: true, remaining: 1 };
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
  // UMUM: belum ada paket berbayar → tidak pernah ada ajakan upgrade.
  const canUpgrade = false;
  return {
    tier: params.tier,
    label: JUMPA_TRIAL.label,
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
