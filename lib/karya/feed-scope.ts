// GLOBAL STUDENT WORKS DISCOVERY — scope resolusi feed karya murid.
//
// Murni (tanpa impor Next/Prisma runtime) agar bisa diuji unit tanpa DB dan
// dipakai oleh route /api/siswa/karya. Memisahkan tiga scope berbeda:
//
//   global   — discovery nasional: semua karya public, TANPA syarat relasi
//              guru↔murid, sekolah sama, follow, atau keanggotaan kelas.
//   school   — karya murid dalam sekolah yang sama dengan penonton
//              (dicocokkan lewat Profile.school string — tanpa schema baru).
//   students — monitoring: hanya karya murid yang terhubung ke guru
//              (groupId member). Khusus role GURU.
//
// Prinsip keamanan dipertahankan:
//   - Tidak ada field visibility baru — seluruh karya bersifat public
//     by-design (tidak ada konsep "private" di StudentKarya).
//   - "EMPTY" (bukan null) berarti feed harus kosong tanpa query ke DB.
//   - Murid/anonymous tidak pernah menerima scope "students".

export type KaryaFeedScope = "global" | "school" | "students";

export const KARYA_FEED_SCOPES: KaryaFeedScope[] = ["global", "school", "students"];

export function isKaryaFeedScope(value: string): value is KaryaFeedScope {
  return value === "global" || value === "school" || value === "students";
}

/** Resolusi param `scope` dengan default backward-compatible:
 *  - GURU tanpa param → "students" (perilaku lama: monitoring murid sendiri).
 *  - Selain itu (MURID/anon/param lain) → "global" (perilaku lama: feed nasional).
 *  - "students" hanya berlaku untuk role GURU; murid yang memaksanya jatuh ke
 *    "global" agar filter tidak meniadakan feed. */
export function resolveKaryaFeedScope(raw: string | null | undefined, role?: string | null): KaryaFeedScope {
  if (raw && isKaryaFeedScope(raw)) {
    if (raw === "students" && role !== "GURU") return "global";
    return raw;
  }
  return role === "GURU" ? "students" : "global";
}

/**
 * Bangun fragment Prisma `where` untuk sebuah scope.
 * - null  → tanpa restriksi (feed global utuh).
 * - "EMPTY" → feed harus kosong (tanpa sekolah / tanpa murid), pemanggil
 *   wajib mengembalikan karya: [] tanpa query tambahan.
 * - objek → fragment digabung ke `where` utama.
 */
export function buildKaryaScopeWhere(
  scope: KaryaFeedScope,
  memberIds: string[],
  viewerSchool?: string | null
): Record<string, unknown> | "EMPTY" | null {
  switch (scope) {
    case "global":
      return null;
    case "school": {
      const school = viewerSchool?.trim();
      if (!school) return "EMPTY";
      return {
        user: {
          profile: { school: { equals: school, mode: "insensitive" as const } },
        },
      };
    }
    case "students":
      return memberIds.length > 0 ? { userId: { in: memberIds } } : "EMPTY";
  }
}
