/**
 * Identitas "layar saja" untuk berbagi layar native Android.
 *
 * Android WebView tidak punya getDisplayMedia, jadi aplikasi Android
 * menerbitkan layar lewat koneksi LiveKit native terpisah. Koneksi itu
 * memakai identitas turunan server `screen:<userId>` yang:
 *  - hanya boleh menerbitkan SCREEN_SHARE (tanpa kamera/mik/data/subscribe),
 *  - tidak dihitung sebagai kehadiran dan tidak tampil sebagai tile peserta,
 *  - ikut dibersihkan saat pemilik dikeluarkan/dihentikan/izin dicabut.
 * Modul ini murni (dipakai server & klien).
 */
export const SCREEN_IDENTITY_PREFIX = "screen:";
/** Token join layar sangat singkat: hanya untuk tersambung, bukan sesi. */
export const SCREEN_TOKEN_TTL_SEC = 60;

const OWNER_RE = /^[A-Za-z0-9_-]{1,128}$/;

export function screenIdentityFor(userId: string): string {
  if (!OWNER_RE.test(userId)) throw new Error("INVALID_SCREEN_OWNER");
  return `${SCREEN_IDENTITY_PREFIX}${userId}`;
}

export function isScreenIdentity(identity: string | null | undefined): boolean {
  return typeof identity === "string" && identity.startsWith(SCREEN_IDENTITY_PREFIX);
}

/** Pemilik identitas layar, atau null bila bukan identitas layar yang valid. */
export function screenOwnerOf(identity: string | null | undefined): string | null {
  if (!isScreenIdentity(identity)) return null;
  const owner = identity!.slice(SCREEN_IDENTITY_PREFIX.length);
  return OWNER_RE.test(owner) ? owner : null;
}

/** Seperti screenIdentityFor, tetapi null untuk identitas yang tidak sah (tanpa throw). */
export function screenIdentityOrNull(userId: string | null | undefined): string | null {
  return typeof userId === "string" && OWNER_RE.test(userId) ? `${SCREEN_IDENTITY_PREFIX}${userId}` : null;
}

/**
 * Identitas layar yang baru tersambung harus diputus bila pemiliknya sudah
 * tidak tersambung atau sudah dikeluarkan (token 60 dtk bisa dicetak sesaat
 * sebelum pemilik keluar/di-kick — balapan ini ditutup oleh webhook).
 */
export function shouldEvictScreen(input: {
  ownerConnected: boolean;
  ownerRemoved: boolean;
  ownerKnown: boolean;
}): boolean {
  return !input.ownerKnown || input.ownerRemoved || !input.ownerConnected;
}
