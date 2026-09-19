/**
 * Safety guard untuk script QA yang melakukan MUTATION database
 * (deleteMany/create pada data Main Bersama).
 *
 * Jaminan (spec review Tahap 4 §3):
 * - Hanya menerima TEST_DATABASE_URL eksplisit — TIDAK ADA fallback
 *   ke DATABASE_URL (yang bisa menunjuk production Supabase).
 * - Hanya menerima host lokal (localhost/127.0.0.1/::1).
 * - Hanya menerima nama DB test khusus (`mbtest`).
 * - Menolak string yang tampak seperti managed provider.
 * Melempar TestDbGuardError (abort SEBELUM query mutation mana pun).
 */

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const REQUIRED_DB_NAME = 'mbtest';
const MANAGED_PROVIDER_PATTERNS = [
  /supabase/i,
  /amazonaws/i,
  /neon\.tech/i,
  /render\.com/i,
  /railway/i,
  /azure/i,
];

export class TestDbGuardError extends Error {}

/**
 * Validasi URL test DB. Mengembalikan URL yang sudah divalidasi,
 * atau melempar TestDbGuardError dengan pesan yang jelas.
 */
export function assertTestDatabaseUrl(raw: string | undefined): string {
  if (raw === undefined || raw.trim() === '') {
    throw new TestDbGuardError(
      'TEST_DATABASE_URL tidak diset. Script ini SENGAJA tidak fallback ke ' +
        'DATABASE_URL (proteksi production). Set TEST_DATABASE_URL ke DB test lokal, ' +
        'contoh: TEST_DATABASE_URL="postgresql://postgres:mbtest@localhost:54329/mbtest?schema=public"',
    );
  }

  const url = raw.trim();
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new TestDbGuardError(`TEST_DATABASE_URL bukan URL valid: "${url}"`);
  }

  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new TestDbGuardError(
      `TEST_DATABASE_URL harus skema postgresql:// (dapat: "${parsed.protocol}")`,
    );
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new TestDbGuardError(
      `TEST_DATABASE_URL host tidak diizinkan: "${parsed.hostname}" — ` +
        'hanya host lokal yang diketahui aman (localhost/127.0.0.1/::1)',
    );
  }

  if (parsed.pathname !== `/${REQUIRED_DB_NAME}`) {
    throw new TestDbGuardError(
      `TEST_DATABASE_URL harus menunjuk DB test khusus "${REQUIRED_DB_NAME}" (dapat: "${parsed.pathname}")`,
    );
  }

  const provider = MANAGED_PROVIDER_PATTERNS.find((rx) => rx.test(url));
  if (provider) {
    throw new TestDbGuardError(
      `TEST_DATABASE_URL terdeteksi menunjuk managed provider (pola "${provider.source}") — ditolak`,
    );
  }

  return url;
}
