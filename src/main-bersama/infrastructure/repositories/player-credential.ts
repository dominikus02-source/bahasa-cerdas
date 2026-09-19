// ─── Player Reconnect Credential (Tahap 6 §7 + Hardening §10/§11) ──
// Opaque reconnect credential stateless-signed: `playerId.sessionId.signature`.
//
// KEPUTUSAN DESAIN (§20 — schema change NIHIL):
// Schema Tahap 4 TIDAK menyediakan kolom credential. Credential
// STATELESS SIGNED:
//
//   credential = playerId "." sessionId "." HMAC-SHA256(secret, "player:" + playerId)
//
//  - secret: env MAIN_BERSAMA_CREDENTIAL_SECRET (≥32 byte entropi);
//    PRODUCTION: WAJIB tersedia — tanpa itu module HARD FAIL saat
//    dipakai (config error, bukan silent random fallback);
//  - dev/test: fallback random per proses BOLEH (§10);
//  - TIDAK ADA yang disimpan (kebocoran DB tidak membocorkan
//    apa pun — credential bukan data DB);
//  - verifikasi: recompute HMAC + timing-safe compare;
//  - TIDAK PERNAH dikirim ke teacher/projector; diberikan SEKALI
//    ke student pada join; transport = header x-mb-credential
//    (TIDAK pernah URL query/SSE/Broadcast/log — §11).

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/** Produksi Vercel: NODE_ENV=production ATAU env Vercel eksplisit. */
export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV !== undefined;
}

/**
 * Secret proses. Lazy: baca env saat pertama dipakai — bukan saat
 * module evaluation (memungkinkan test set env setelah import).
 * Produksi tanpa secret → throw configuration error (hard fail §10).
 * Dev/test fallback DI-MEMOIZE per proses (issue & resolve wajib
 * memakai secret yang sama dalam satu proses).
 */
let cachedDevSecret: string | null = null;
function getSecret(): string {
  const secret = process.env.MAIN_BERSAMA_CREDENTIAL_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (isProductionRuntime()) {
    throw new Error(
      'MAIN_BERSAMA_CREDENTIAL_SECRET wajib diset di production ' +
        '(minimum 32 karakter entropi) — reconnect credential tidak aman tanpa itu.',
    );
  }
  // Dev/test: random per proses boleh (memoize — bukan per panggilan);
  // reconnect lintas restart dev tidak dijamin (dokumentasi trade-off).
  if (!cachedDevSecret) {
    cachedDevSecret =
      process.env.MAIN_BERSAMA_DEV_SECRET ?? randomBytes(32).toString('base64url');
  }
  return cachedDevSecret;
}

function hmacOf(playerId: string): string {
  return createHmac('sha256', getSecret())
    .update(`player:${playerId}`)
    .digest('base64url');
}

/** Credential opaque: `playerId.sessionId.signature`. */
export function issuePlayerCredential(playerId: string, sessionId: string): string {
  return `${playerId}.${sessionId}.${hmacOf(playerId)}`;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export type ResolvePlayerResult =
  | { ok: true; playerId: string; sessionId: string }
  | { ok: false; code: 'MALFORMED_CREDENTIAL' | 'CREDENTIAL_MISMATCH' };

/**
 * Verifikasi credential opaque → {playerId, sessionId} (timing-safe).
 * TIDAK menyentuh DB — keberadaan player dicek application layer.
 */
export function resolvePlayerCredential(
  credential: unknown,
): ResolvePlayerResult {
  if (typeof credential !== 'string') {
    return { ok: false, code: 'MALFORMED_CREDENTIAL' };
  }
  const parts = credential.split('.');
  if (parts.length !== 3) return { ok: false, code: 'MALFORMED_CREDENTIAL' };
  const [playerId, sessionId, signature] = parts;
  // Guard karakter: id cuid/uuid alfanumerik; cegah payload aneh.
  if (
    !/^[A-Za-z0-9_-]{1,64}$/.test(playerId) ||
    !/^[A-Za-z0-9_-]{1,64}$/.test(sessionId)
  ) {
    return { ok: false, code: 'MALFORMED_CREDENTIAL' };
  }
  if (!safeEqual(hmacOf(playerId), signature)) {
    return { ok: false, code: 'CREDENTIAL_MISMATCH' };
  }
  return { ok: true, playerId, sessionId };
}

// ─── Transport (§11): header-only, TIDAK pernah di URL/log ──

/** Nama header transport credential. */
export const MB_CREDENTIAL_HEADER = 'x-mb-credential';

/**
 * Ambil credential dari request — HANYA header. Query string
 * DITOLAK eksplisit: URL query bocor ke log/Referer/history (§11).
 */
export function readCredentialFromRequest(headers: Headers, url: URL): string | null {
  const headerValue = headers.get(MB_CREDENTIAL_HEADER);
  if (headerValue && headerValue.trim() !== '') return headerValue.trim();
  // Legacy query param ditolak — keamanan konsisten lintas client.
  if (url.searchParams.get('credential')) return null;
  return null;
}
