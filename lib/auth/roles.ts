/**
 * ROLE HELPERS — satu sumber kebenaran untuk pengecekan peran.
 *
 * CLIENT-SAFE: tidak ada import Node.js/Prisma — dipakai dari Server
 * Components, Route Handlers, maupun client components.
 *
 * PRINSIP (PR1 role UMUM):
 * - Semua pengecekan memakai ALLOWLIST eksplisit. Pola lama
 *   `role !== "MURID" ? guru : murid` (else = peran lain) TIDAK boleh dipakai
 *   lagi, karena peran baru (UMUM) atau nilai tak dikenal akan "jatuh" ke
 *   peran yang salah (mis. dianggap guru).
 * - Peran tak dikenal → default-deny (ROLE_DENIED_PATH), bukan guru/murid.
 * - Perilaku GURU / MURID / ADMIN / founder TIDAK berubah.
 *
 * UMUM = pengguna umum non-sekolah. Subkategori yang bisa dipilih pengguna:
 * Mahasiswa, Dosen, Umum (Profile.kategoriUmum; nilai lain hanya internal —
 * lihat lib/auth/kategori-umum.ts). UMUM hanya punya akses dasbor /umum,
 * NARA (persona netral), gim solo Arena, dan Jalur Cerdas.
 * UMUM TIDAK punya akses data kelas/guru/murid, JUMPA, gim multipemain,
 * Premium, maupun alat AI guru.
 */

export const KNOWN_ROLES = ["GURU", "MURID", "ADMIN", "UMUM"] as const;
export type KnownRole = (typeof KNOWN_ROLES)[number];

type RoleInput = string | null | undefined;

export function isKnownRole(role: unknown): role is KnownRole {
  return typeof role === "string" && (KNOWN_ROLES as readonly string[]).includes(role);
}

export function isGuru(role: RoleInput): boolean {
  return role === "GURU";
}

export function isMurid(role: RoleInput): boolean {
  return role === "MURID";
}

export function isUmum(role: RoleInput): boolean {
  return role === "UMUM";
}

export function isAdmin(role: RoleInput): boolean {
  return role === "ADMIN";
}

/**
 * Beranda UMUM: dasbor /umum (server-guarded, lihat lib/auth/umum-page.ts).
 */
export const UMUM_HOME = "/umum";

/**
 * Halaman terminal untuk peran tak dikenal. Statis — tidak memanggil
 * getUser()/redirect, sehingga tidak bisa menimbulkan loop redirect.
 */
export const ROLE_DENIED_PATH = "/auth/akses-ditolak";

/** Role-based dashboard destination (canonical, allowlist eksplisit). */
export function dashboardForRole(role: string): string {
  if (role === "MURID") return "/murid/beranda";
  if (role === "ADMIN") return "/admin";
  if (role === "GURU") return "/guru/beranda";
  if (role === "UMUM") return UMUM_HOME;
  return ROLE_DENIED_PATH;
}

/**
 * Rute Arena yang terbuka untuk UMUM (gim solo, Jalur Cerdas, NARA).
 * BIGT TIDAK di sini: untuk UMUM, BIGT adalah tautan ke situs eksternal.
 * Dicocokkan exact atau sebagai prefix segmen (`p` atau `p/...`).
 * `/arena/game` sendiri dicocokkan EXACT (hub, difilter) — sub-rutenya hanya
 * yang terdaftar di UMUM_GAME_IDS.
 */
export const UMUM_GAME_IDS = [
  "bermain-kata",
  "petualangan-kata",
  "tebak-kata",
  "susun-kata",
  "irama-kata",
  "benar-salah",
  "menara",
  "lari-kata",
  "teka-teki-silang",
] as const;

const UMUM_ARENA_PREFIXES: readonly string[] = [
  "/arena/ai",
  "/arena/jalur-cerdas",
  // Alias lama /arena/game/kata-play → redirect ke bermain-kata.
  "/arena/game/kata-play",
  ...UMUM_GAME_IDS.map((id) => `/arena/game/${id}`),
];

const UMUM_ARENA_EXACT: readonly string[] = ["/arena/game"];

function normalizePath(pathname: string): string {
  const clean = pathname.split("?")[0].split("#")[0];
  return clean.length > 1 && clean.endsWith("/") ? clean.slice(0, -1) : clean;
}

export function isUmumArenaPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const p = normalizePath(pathname);
  if (UMUM_ARENA_EXACT.includes(p)) return true;
  return UMUM_ARENA_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix + "/"));
}

export function isUmumGameId(id: string): boolean {
  return (UMUM_GAME_IDS as readonly string[]).includes(id);
}

/** Label peran untuk tampilan (eksplisit; tak dikenal → "Pengguna"). */
export function roleLabel(role: RoleInput, isFounder = false): string {
  if (isFounder) return "Founder";
  if (role === "GURU") return "Guru";
  if (role === "MURID") return "Murid";
  if (role === "ADMIN") return "Admin";
  if (role === "UMUM") return "Umum";
  return "Pengguna";
}

/** Pesan 403 standar untuk fitur yang tertutup bagi UMUM. */
export const UMUM_FORBIDDEN_MESSAGE =
  "Fitur ini khusus untuk guru dan murid sekolah.";
