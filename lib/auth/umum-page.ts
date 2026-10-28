import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { isUmum } from "@/lib/auth/roles";
import { dashboardForUser } from "@/lib/auth/redirect";
import { canUseFounderDashboardSwitcher } from "@/lib/auth/founder-access";

/**
 * Guard server untuk halaman dasbor UMUM (/umum, /umum/koleksi, …).
 *
 * - Belum masuk → /login?next=<path>
 * - GURU / MURID / ADMIN / founder → dasbor masing-masing (dashboardForUser)
 * - UMUM → dikembalikan untuk dirender
 *
 * Dipanggil per halaman (bukan di layout) karena layout tidak dirender ulang
 * saat navigasi klien, dan supaya /umum/aku-sastrawan tetap halaman publik
 * "Sedang dalam pengembangan". Tujuan redirect tidak pernah kembali ke /umum
 * untuk peran non-UMUM → tanpa loop.
 *
 * Catatan flag: ENABLE_ROLE_UMUM hanya mengatur PENDAFTARAN UMUM baru. Akun
 * UMUM yang sudah ada tetap bisa membuka dasbornya walau flag dimatikan.
 */
export async function requireUmumPage(path: string) {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  if ((!isUmum(user.role) || user.isFounder) && !canUseFounderDashboardSwitcher(user)) redirect(dashboardForUser(user.role, user.isFounder));
  return user;
}
