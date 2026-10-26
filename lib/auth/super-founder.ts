/**
 * Super founder — satu-satunya akun yang boleh MENAMBAH atau MENCABUT founder.
 *
 * Founder lain punya akses admin penuh (termasuk uang), tapi tidak bisa
 * mengubah daftar founder. Daftar ini sengaja ada di kode (bukan env) supaya
 * perubahannya selalu lewat PR yang direview. Email dibandingkan huruf kecil.
 */
export const SUPER_FOUNDER_EMAILS: readonly string[] = ["dominikus.02@gmail.com"];

export function isSuperFounder(
  user: { email?: string | null; isFounder?: boolean | null } | null | undefined,
): boolean {
  if (!user || user.isFounder !== true || !user.email) return false;
  return SUPER_FOUNDER_EMAILS.includes(user.email.trim().toLowerCase());
}
