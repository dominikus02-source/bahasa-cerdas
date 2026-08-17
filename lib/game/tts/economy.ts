/**
 * Ekonomi & progres Teka-Teki Silang (murni, tanpa localStorage/UI).
 *
 * - **Nyawa**: maks 6, pulih 1 setiap HEART_REGEN_MS; tersimpan sebagai
 *   { hearts, updatedAt } sehingga pemain yang kembali setelah lama otomatis
 *   dapat nyawa penuh. Pola Duolingo: salah = -1 nyawa, habis = harus tunggu
 *   (atau lanjut tanpa hadiah). Rebalance: 6 nyawa (bantalan lebih besar) dan
 *   regen 8 menit (full refill ~48 menit) biar main singkat tetap nyaman.
 * - **Peringkat pemain**: naik dari total XP lokal (Pemula → Legenda);
 *   threshold diselaraskan dengan XP per main v3 (cap L12 = 240 XP).
 * - **Rentetan harian**: main tiap hari berturut-turut → streak; putus bila
 *   bolong sehari. Bonus +3 XP/hari, cap 10 hari (maks +30).
 */

export const HEARTS_MAX = 6;
export const HEART_REGEN_MS = 8 * 60 * 1000; // 1 nyawa / 8 menit

export interface HeartsState {
  hearts: number;
  updatedAt: number; // epoch ms — kapan terakhir dipakai/diatur
}

export function freshHearts(now = Date.now()): HeartsState {
  return { hearts: HEARTS_MAX, updatedAt: now };
}

/** Tambahkan nyawa yang pulih selama waktu berlalu (cap HEARTS_MAX). */
export function regenHearts(state: HeartsState, now = Date.now()): HeartsState {
  if (state.hearts >= HEARTS_MAX) return { ...state };
  const elapsed = Math.max(0, now - state.updatedAt);
  const gained = Math.floor(elapsed / HEART_REGEN_MS);
  if (gained <= 0) return { ...state };
  return {
    hearts: Math.min(HEARTS_MAX, state.hearts + gained),
    updatedAt: state.updatedAt + gained * HEART_REGEN_MS,
  };
}

/** Kurangi satu nyawa (dari state yang sudah diregen). */
export function spendHeart(state: HeartsState, now = Date.now()): HeartsState {
  const live = regenHearts(state, now);
  return { hearts: Math.max(0, live.hearts - 1), updatedAt: now };
}

/** Milidetik sampai nyawa berikutnya pulih (0 bila penuh). */
export function nextHeartInMs(state: HeartsState, now = Date.now()): number {
  const live = regenHearts(state, now);
  if (live.hearts >= HEARTS_MAX) return 0;
  return Math.max(0, HEART_REGEN_MS - (now - live.updatedAt));
}

export interface PlayerTier {
  min: number;
  name: string;
}

export const PLAYER_TIERS: PlayerTier[] = [
  { min: 0, name: "Pemula Kata" },
  { min: 250, name: "Pengeja" },
  { min: 600, name: "Perangkai Kata" },
  { min: 1200, name: "Maestro Kata" },
  { min: 2000, name: "Legenda Bahasa" },
];

export function tierFor(xp: number): {
  tier: PlayerTier;
  next: PlayerTier | null;
  progress: number; // 0..1 menuju tier berikutnya
} {
  let tier = PLAYER_TIERS[0];
  let next: PlayerTier | null = null;
  for (let i = 0; i < PLAYER_TIERS.length; i++) {
    if (xp >= PLAYER_TIERS[i].min) {
      tier = PLAYER_TIERS[i];
      next = PLAYER_TIERS[i + 1] ?? null;
    } else break;
  }
  let progress = 1;
  if (next) {
    const span = next.min - tier.min;
    progress = span > 0 ? Math.min(1, Math.max(0, (xp - tier.min) / span)) : 1;
  }
  return { tier, next, progress };
}

export interface StreakState {
  lastDate: string; // YYYY-MM-DD lokal
  streak: number;
}

export const STREAK_KEY = "tts-streak-v2";

export function todayLocal(d = new Date()): string {
  // en-CA menghasilkan YYYY-MM-DD sesuai zona waktu lokal.
  return d.toLocaleDateString("en-CA");
}

export function yesterdayLocal(d = new Date()): string {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return y.toLocaleDateString("en-CA");
}

/** Catat main hari ini; kembalikan streak baru (putus bila bolong sehari). */
export function bumpStreak(state: StreakState, now = new Date()): StreakState {
  const today = todayLocal(now);
  if (state.lastDate === today) return state;
  const next = state.lastDate === yesterdayLocal(now) ? state.streak + 1 : 1;
  return { lastDate: today, streak: next };
}

/** Bonus XP rentetan: +3 per hari berturut, cap 10 hari (maks +30). */
export function streakXpBonus(streak: number): number {
  if (streak < 2) return 0;
  return Math.min(streak, 10) * 3;
}
