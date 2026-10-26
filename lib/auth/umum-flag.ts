/**
 * Flag server ENABLE_ROLE_UMUM (default MATI).
 *
 * SERVER-ONLY: sengaja BUKAN NEXT_PUBLIC_* — klien mengetahui status flag
 * hanya lewat GET /api/auth/role-options. Saat MATI:
 * - opsi "Umum" disembunyikan di /register dan /auth/pilih-peran;
 * - server MENOLAK pembuatan akun/intent/role UMUM (role-intent, complete-role,
 *   create-user) dan intent UMUM yang sudah tersegel dianggap tidak valid.
 * Akun UMUM yang SUDAH ada tetap bisa masuk dan memakai /umum (data lama tetap
 * terbaca); flag hanya mengatur pendaftaran baru.
 *
 * JUMPA: flag ini JUGA menggerbangi JUMPA untuk akun UMUM (bersama flag JUMPA
 * NEXT_PUBLIC_JUMPA_ENABLED). Saat MATI, akun UMUM tidak punya peran efektif
 * JUMPA (lib/jumpa/permissions.ts → effectiveRole = null) sehingga membuat &
 * masuk ruang ditolak seperti sebelumnya. Lihat docs/JUMPA_UMUM.md.
 */
export function isRoleUmumEnabled(): boolean {
  const v = (process.env.ENABLE_ROLE_UMUM || "").trim().toLowerCase();
  return v === "true" || v === "1";
}
