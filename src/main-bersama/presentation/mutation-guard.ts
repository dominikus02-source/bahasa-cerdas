// ─── Mutation Safety Policy (Tahap 8A.4 final hardening) ─────
// Mencegah Main Bersama MENGUBAH data (membuat sesi, join, jawab)
// di lingkungan yang bukan production sungguhan.
//
// Kenapa perlu: `npm run dev` polos membaca `.env.local` dan menunjuk
// database produksi Supabase. "Perlindungan" lama hanya kebetulan —
// tabel Main Bersama belum ada di production, sehingga gagal dengan
// SESSION_STORE_UNAVAILABLE. Begitu migration production dijalankan,
// proteksi kebetulan itu HILANG dan dev lokal bisa menulis sesi uji
// ke database produksi.
//
// Kebijakan (Tahap 8A.4 §1) — HANYA berlaku untuk mutasi:
//   A. Vercel Production (`VERCEL_ENV === 'production'`) → boleh.
//   B. Automated tests (`NODE_ENV === 'test'`) → boleh.
//   C. Semua sisanya (dev lokal, local production build, Vercel
//      Preview, Vercel Development, self-hosted) → hanya boleh bila
//      `MAIN_BERSAMA_ALLOW_MUTATIONS === 'true'`.
//
// Catatan desain:
// - Sengaja TIDAK memakai `NODE_ENV === 'production'` sebagai bukti
//   production: `next start` lokal juga bernilai production, dan
//   justru itulah yang ingin diblokir.
// - READ-ONLY tidak pernah diblokir: GET state guru/siswa, proyektor,
//   health/readiness, dan evaluasi kompatibilitas paket tetap jalan
//   mengikuti auth/security existing.
// - Modul ini MURNI (tanpa next/react/Prisma) supaya dapat diuji
//   deterministik dari script QA.

/** Kode error HTTP saat mutasi ditolak karena lingkungan. */
export const MUTATIONS_DISABLED_CODE = 'MUTATIONS_DISABLED';

/** Variabel env yang menjadi escape hatch eksplisit (§1C). */
export const MUTATIONS_ALLOW_FLAG = 'MAIN_BERSAMA_ALLOW_MUTATIONS';

/** Pesan user-facing (Bahasa Indonesia) — tanpa detail env/DB. */
export const MUTATIONS_DISABLED_MESSAGE =
  'Main Bersama belum diaktifkan pada lingkungan ini.';

/** Dari mana izin mutasi berasal — untuk log server, bukan klien. */
export type MutationAllowSource =
  | 'vercel-production'
  | 'test-environment'
  | 'explicit-flag';

export interface MutationPolicy {
  allowed: boolean;
  /** Terisi hanya bila `allowed` — jejak audit keputusan. */
  source?: MutationAllowSource;
}

/** Subset env yang relevan — diinjeksi agar test deterministik. */
export interface MutationPolicyInput {
  nodeEnv?: string | undefined;
  vercelEnv?: string | undefined;
  allowMutations?: string | undefined;
}

/** Bandingkan flag secara toleran (`true`/`TRUE`/`1`) — bukan truthy string. */
function isFlagOn(value: string | undefined): boolean {
  if (typeof value !== 'string') return false;
  const v = value.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

/**
 * Keputusan murni — tanpa I/O. Urutan cabang = prioritas kebijakan:
 * production Vercel lebih dulu (tidak butuh flag), lalu test, lalu
 * flag eksplisit, sisanya blokir.
 */
export function evaluateMainBersamaMutationPolicy(
  env: MutationPolicyInput,
): MutationPolicy {
  if (env.vercelEnv === 'production') {
    return { allowed: true, source: 'vercel-production' };
  }
  if (env.nodeEnv === 'test') {
    return { allowed: true, source: 'test-environment' };
  }
  if (isFlagOn(env.allowMutations)) {
    return { allowed: true, source: 'explicit-flag' };
  }
  return { allowed: false };
}

/** Kebijakan untuk proses yang sedang berjalan. */
export function currentMutationPolicy(): MutationPolicy {
  return evaluateMainBersamaMutationPolicy({
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    allowMutations: process.env[MUTATIONS_ALLOW_FLAG],
  });
}

/**
 * Catat penolakan ke LOG SERVER saja. Tidak pernah ke respons HTTP.
 * Sengaja tidak menyertakan URL database / credential apa pun.
 */
export function logMutationBlocked(routeLabel: string): void {
  console.warn(
    `[main-bersama] mutasi diblokir pada lingkungan ini (${routeLabel}). ` +
      `Set ${MUTATIONS_ALLOW_FLAG}=true untuk mengaktifkan mutasi di ` +
      `lingkungan non-production (arahkan ke database review/staging, ` +
      `BUKAN production).`,
  );
}
