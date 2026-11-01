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
 * Ruang MURID: gratis 8, premium 15. Webinar hanya Premium, 1x per minggu.
 * Ruang UMUM: selalu paket Gratis UMUM (lihat JUMPA_UMUM_TIERS); tanpa webinar.
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
    features: { recording: false, backgroundBlur: true },
  },
};

/** Ruang belajar bareng murid: gratis 8, premium 15. */
export const JUMPA_MURID_FREE: JumpaRoomLimits = { maxParticipants: 8, maxDurationMin: 60 };
export const JUMPA_MURID_PREMIUM: JumpaRoomLimits = { maxParticipants: 15, maxDurationMin: 60 };
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
  UMUM_FREE: { label: "Gratis", room: { maxParticipants: 10, maxDurationMin: 45 }, roomsPerDay: 3, maxCameraHeight: 720, maxScreenHeight: 720 },
  UMUM_PREMIUM: { label: "Premium", room: { maxParticipants: 25, maxDurationMin: 120 }, roomsPerDay: null, maxCameraHeight: 1080, maxScreenHeight: 1080 },
};
/** Kait paket UMUM berbayar. Jangan nyalakan tanpa alur pembayaran UMUM. */
export const JUMPA_UMUM_PREMIUM_ENABLED = false;

/** Paket UMUM yang berlaku. Selama premium belum aktif → selalu UMUM_FREE. */
export function umumTierDef(tier: JumpaTier): JumpaUmumTierDef {
  return JUMPA_UMUM_PREMIUM_ENABLED && tier === "PREMIUM" ? JUMPA_UMUM_TIERS.UMUM_PREMIUM : JUMPA_UMUM_TIERS.UMUM_FREE;
}

/** Webinar: hanya Premium, 1x per minggu, kapasitas lebih tinggi. */
export const JUMPA_WEBINAR: JumpaRoomLimits = { maxParticipants: 100, maxDurationMin: 180 };
export const JUMPA_WEBINAR_PER_WEEK = 1;

/** Fitur premium yang sudah dijanjikan di UI tetapi belum tersedia. */
export const JUMPA_PREMIUM_SOON = ["recording"] as const;

/** Ke mana tombol "Lihat Premium" membawa guru (halaman langganan yang ada). */
export const JUMPA_UPGRADE_URL = "/guru/berlangganan";

/** Tampilkan ajakan upgrade (khusus host guru paket Gratis) sebelum habis. */
export const JUMPA_UPGRADE_PROMPT_BEFORE_END_MIN = 5;

/** Batas ruang (peserta, durasi) untuk paket & jenis ruang. */
export function limitsFor(tier: JumpaTier, kind: JumpaKind, isWebinar = false): JumpaRoomLimits {
  if (isWebinar) {
    if (tier !== "PREMIUM" || kind === "UMUM") return { maxParticipants: 0, maxDurationMin: 0 };
    return { ...JUMPA_WEBINAR };
  }
  if (kind === "MURID") {
    return tier === "PREMIUM" ? { ...JUMPA_MURID_PREMIUM } : { ...JUMPA_MURID_FREE };
  }
  if (kind === "UMUM") return { ...umumTierDef(tier).room };
  return { ...JUMPA_TIERS[tier].rooms[kind] };
}

/** Tinggi kamera maksimum yang boleh dikirim di ruang ini. */
export function cameraCapFor(tier: JumpaTier, kind: JumpaKind): JumpaVideoCap {
  if (kind === "MURID") return JUMPA_MURID_MAX_CAMERA_HEIGHT;
  if (kind === "UMUM") return umumTierDef(tier).maxCameraHeight;
  return JUMPA_TIERS[tier].maxCameraHeight;
}

export function screenCapFor(tier: JumpaTier, kind: JumpaKind): JumpaVideoCap {
  if (kind === "MURID") return 720;
  if (kind === "UMUM") return umumTierDef(tier).maxScreenHeight;
  return JUMPA_TIERS[tier].maxScreenHeight;
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
  const dayOfWeek = (day.getUTCDay() + 6) % 7; // Senin = 0
  return new Date(day.getTime() - dayOfWeek * 86_400_000);
}

export type DailyQuotaDecision =
  | { ok: true; remaining: number | null }
  | { ok: false; code: "TIER_DAILY_LIMIT"; message: string; limit: number };

/** Boleh membuat ruang guru baru hari ini? (MURID tidak dihitung.) */
export function checkDailyQuota(tier: JumpaTier, kind: JumpaKind, createdToday: number): DailyQuotaDecision {
  const limit = kind === "UMUM" ? umumTierDef(tier).roomsPerDay : JUMPA_TIERS[tier].roomsPerDay;
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

export type WeeklyQuotaDecision =
  | { ok: true; remaining: number }
  | { ok: false; code: "WEBINAR_WEEKLY_LIMIT"; message: string; limit: number };

/** Boleh membuat webinar minggu ini? Hanya Premium. */
export function checkWebinarWeeklyQuota(tier: JumpaTier, webinarsThisWeek: number): WeeklyQuotaDecision {
  if (tier !== "PREMIUM") {
    return {
      ok: false,
      code: "WEBINAR_WEEKLY_LIMIT",
      limit: 0,
      message: "Webinar hanya untuk guru Premium.",
    };
  }
  if (webinarsThisWeek >= JUMPA_WEBINAR_PER_WEEK) {
    return {
      ok: false,
      code: "WEBINAR_WEEKLY_LIMIT",
      limit: JUMPA_WEBINAR_PER_WEEK,
      message: "Kuota webinar minggu ini sudah habis (maksimal 1 kali). Coba lagi minggu depan.",
    };
  }
  return { ok: true, remaining: JUMPA_WEBINAR_PER_WEEK - webinarsThisWeek - 1 };
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
  const canUpgrade = params.tier === "FREE" && params.kind !== "MURID" && params.kind !== "UMUM" && params.viewerIsGuruCreator;
  return {
    tier: params.tier,
    label: params.kind === "MURID" ? "Belajar bareng" : params.kind === "UMUM" ? umumTierDef(params.tier).label : JUMPA_TIERS[params.tier].label,
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
