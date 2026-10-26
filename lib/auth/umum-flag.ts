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
 */
export function isRoleUmumEnabled(): boolean {
  const v = (process.env.ENABLE_ROLE_UMUM || "").trim().toLowerCase();
  return v === "true" || v === "1";
}
