// ─── Credential Client Service (Tahap 7 §8) ─────────────────
// SATU tempat menyimpan/membaca reconnect credential di client.
// Komponen TIDAK PERNAH menyentuh localStorage langsung.
//
// Transport: header `x-mb-credential` (arsitektur Tahap 6 tetap).
// Catatan deployment (§8): `ayo.bahasacerdas.com` dan
// `bahasacerdas.com` berada dalam registrable domain yang sama —
// cookie lintas subdomain BUKAN mustahil. Header dipakai pada
// vertical slice agar tidak mengubah API architecture; strategi
// storage dapat ditinjau ulang saat production subdomain hardening.
//
// Keamanan: credential TIDAK PERNAH ditulis ke URL/query/DOM
// text/log/analytics. Penyimpanan = localStorage (per origin),
// kunci digabung dengan sessionId agar multi-room aman.

const KEY_PREFIX = 'mb-credential:';

export function saveCredential(sessionId: string, credential: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(KEY_PREFIX + sessionId, credential);
  } catch {
    // Storage penuh/blocked — reconnect via credential memory saja;
    // tidak crash UX.
  }
}

export function loadCredential(sessionId: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(KEY_PREFIX + sessionId);
  } catch {
    return null;
  }
}

export function clearCredential(sessionId: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(KEY_PREFIX + sessionId);
  } catch {
    // ignore
  }
}

/** Sesi terakhir yang diikuti (untuk tombol "lanjutkan bermain"). */
const LAST_SESSION_KEY = 'mb-last-session';

export function saveLastSessionId(sessionId: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LAST_SESSION_KEY, sessionId);
  } catch {
    // ignore
  }
}

export function loadLastSessionId(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(LAST_SESSION_KEY);
  } catch {
    return null;
  }
}

/** Kredensial sesi terakhir (jika ada) — kandidat reconnect. */
export function loadLastCredential(): { sessionId: string; credential: string } | null {
  const sessionId = loadLastSessionId();
  if (!sessionId) return null;
  const credential = loadCredential(sessionId);
  return credential ? { sessionId, credential } : null;
}
