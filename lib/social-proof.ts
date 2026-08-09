import { db } from "@/lib/db";
import { getOrSet } from "@/lib/cache/redis-cache";
import { withQueryTimeout } from "@/lib/db/with-query-timeout";

/**
 * Data social proof untuk halaman beranda — diambil dari DATABASE, bukan angka
 * statis. Dihitung dengan query Prisma yang sama dengan dashboard admin
 * (app/(dashboard)/admin/page.tsx) agar angka konsisten:
 *
 * - users    → total semua user terdaftar (db.user.count())
 * - students → user berperan MURID
 * - teachers → user berperan GURU
 * - works    → jumlah karya siswa (StudentKarya) — karya murid diterbitkan saat
 *              dibuat, sehingga semua baris valid/terpublikasi. Model tidak
 *              memiliki flag draft/published (konsisten dengan admin).
 *
 * Tidak ada flag demo/test di schema → demo account (email @demo.com) dihitung
 * sama seperti user lain, konsisten dengan metrik admin.
 *
 * Selalu fail-open: koneksi DB/Redis bermasalah → mengembalikan null, pemanggil
 * (landing page / API) harus menampilkan label tanpa angka, JANGAN pernah
 * menebak atau memakai angka statis.
 */

export interface SocialProofData {
  users: number;
  students: number;
  teachers: number;
  works: number;
  updatedAt: string;
}

export type SocialProofSnapshot = SocialProofData | null;

const CACHE_KEY = "bc:social-proof:v1";
const CACHE_TTL_SECONDS = 300; // 5 menit — sama dengan TTL cache API lain

async function queryCounts(): Promise<SocialProofData> {
  const [users, students, teachers, works] = await Promise.all([
    withQueryTimeout(db.user.count(), 8000, "Social proof: total users"),
    withQueryTimeout(db.user.count({ where: { role: "MURID" } }), 8000, "Social proof: students"),
    withQueryTimeout(db.user.count({ where: { role: "GURU" } }), 8000, "Social proof: teachers"),
    withQueryTimeout(db.studentKarya.count(), 8000, "Social proof: works"),
  ]);

  return {
    users,
    students,
    teachers,
    works,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Snapshot angka social proof, di-cache Redis 5 menit.
 * Mengembalikan null saat database tidak dapat diakses (fail-open) — tidak
 * pernah mengembalikan angka karangan.
 */
export async function getSocialProofSnapshot(): Promise<SocialProofSnapshot> {
  try {
    return await getOrSet(CACHE_KEY, CACHE_TTL_SECONDS, async () => {
      try {
        return await queryCounts();
      } catch {
        return null;
      }
    });
  } catch {
    return null;
  }
}