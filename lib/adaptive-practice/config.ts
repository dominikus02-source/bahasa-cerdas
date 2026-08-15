export const ADAPTIVE_SELECTION_VERSION = "1.0" as const;
export const ADAPTIVE_ALLOWED_SIZES = [5, 10, 15] as const;
export const ADAPTIVE_MAX_CANDIDATES = 200;
export const ADAPTIVE_COOLDOWN_DAYS = 14;

export const ADAPTIVE_SUPPORTED_SOURCES = ["BANK_SOAL"] as const;

export const DIFFICULTY_ORDER = ["EASY", "MEDIUM", "HARD", "VERY_HARD"] as const;

/**
 * XP per sesi Adaptive Practice yang diselesaikan penuh.
 *
 * Nilai 50 mengikuti konvensi economy existing: Jalur Cerdas 50 per unit,
 * UKBI/TKA 50 per simulasi (XP_CONFIG). Formula di route:
 *   xp = Math.round(BASE_XP * (correctCount / questionCount))
 * Sesi harus DIJAWAB SEMUA (coverage gate) sebelum reward; akurasi 100%
 * memberi 50 XP, akurasi 50% memberi 25 XP, akurasi 0% memberi 0 XP.
 * Tidak pernah ada XP per-soal — sekali per sesi, reference = session.id.
 */
export const ADAPTIVE_SESSION_BASE_XP = 50 as const;

/**
 * Rate limit untuk action=start (POST /api/player/adaptive-practice).
 *
 * Threshold: 10 sesi per 30 menit per user (sesi via getClientKey — session-
 * scoped, bukan IP; cocok untuk akses NAT sekolah). Justifikasi:
 *   - Pembelajaran sah: 1 sesi = 5-15 soal ± 5-10 menit; pelajar serius
 *     menyelesaikan 2-5 sesi per sesi duduk → 10/30m sangat longgar.
 *   - Batas XP harian 5.000 (xp-guard) tetap jaring pengaman terakhir.
 *   - Alur My Day memakai GET mode=preview (tidak membuat sesi) → tidak
 *     tersentuh rate limit ini.
 * Ini asumsi eksplisit, bukan infrastruktur baru — reuse rateLimitRoute.
 */
export const ADAPTIVE_START_RATE_LIMIT = {
  maxRequests: 10,
  windowSeconds: 30 * 60,
  identifier: "bca-adaptive-start",
} as const;
