// ─── Display Name Validation (Tahap 6 §8) ───────────────────
// Nama tampil guest: bukan identity proof — hanya label UI.
// Aturan sengaja sederhana (TANPA censorship system):
//   - trim whitespace;
//   - panjang 2..24 karakter setelah trim;
//   - tidak boleh kosong / hanya whitespace;
//   - tidak menerima control characters (C0/C1 + DEL);
//   - karakter unicode lain (termasuk emoji) diterima — escaping
//     saat rendering adalah tanggung jawab presentation layer.

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 24;

export type DisplayNameResult =
  | { ok: true; value: string }
  | { ok: false; code: 'NAME_EMPTY' | 'NAME_TOO_SHORT' | 'NAME_TOO_LONG' | 'NAME_CONTROL_CHARS' };

/** Regex control char: C0 (0x00-0x1F), DEL (0x7F), C1 (0x80-0x9F). */
const CONTROL_CHARS = /[\u0000-\u001F\u007F\u0080-\u009F]/;

export function validateDisplayName(raw: unknown): DisplayNameResult {
  if (typeof raw !== 'string') return { ok: false, code: 'NAME_EMPTY' };
  const value = raw.trim();
  if (value.length === 0) return { ok: false, code: 'NAME_EMPTY' };
  if (value.length < DISPLAY_NAME_MIN) return { ok: false, code: 'NAME_TOO_SHORT' };
  if (value.length > DISPLAY_NAME_MAX) return { ok: false, code: 'NAME_TOO_LONG' };
  if (CONTROL_CHARS.test(value)) return { ok: false, code: 'NAME_CONTROL_CHARS' };
  return { ok: true, value };
}
