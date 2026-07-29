/**
 * XP Boost — barang toko koin bertipe `XP_BOOST` yang melipatgandakan XP murid
 * selama masa aktifnya.
 *
 * Sebelumnya murid bisa membeli "XP Boost 24 Jam" / "Double XP 15 Menit", tetapi
 * tidak ada satu pun jalur pemberian XP yang membacanya — koin terpakai, efeknya
 * nol. Modul ini jadi satu-satunya sumber kebenaran untuk:
 *   1. berapa lama sebuah boost aktif setelah dibeli (`getBoostDurationMs`), dan
 *   2. apakah seorang murid sedang punya boost aktif (`getXpMultiplier`).
 *
 * Prinsip penting: membaca boost TIDAK BOLEH menggagalkan pemberian XP. Setiap
 * error DB ditelan dan dianggap "tidak ada boost" (pengali 1), karena kehilangan
 * bonus jauh lebih ringan daripada kehilangan XP yang sudah diraih murid.
 */
import { db } from "@/lib/db";

/** Pengali XP saat boost aktif. Boost tidak bertumpuk: 2x tetap 2x. */
export const XP_BOOST_MULTIPLIER = 2;

const MENIT = 60 * 1000;
const JAM = 60 * MENIT;
const HARI = 24 * JAM;

/**
 * Durasi eksplisit per nama barang (lihat scripts/seed-store.ts).
 *
 * Dikunci pada NAMA, bukan ikon: kedua barang XP_BOOST memakai ikon "boost"
 * yang sama, jadi ikon tidak bisa membedakannya.
 */
const DURASI_BOOST_MS: Record<string, number> = {
  "XP Boost 24 Jam": 24 * JAM,
  "Double XP 15 Menit": 15 * MENIT,
};

/** Dipakai kalau nama barang tidak dikenal dan teksnya tidak menyebut durasi. */
const DURASI_BOOST_DEFAULT_MS = 24 * JAM;

/**
 * Baca durasi dari teks berbahasa Indonesia, mis. "15 Menit", "24 Jam", "1 Hari".
 * Jaring pengaman untuk barang XP_BOOST baru yang ditambahkan lewat seed/admin
 * tanpa sempat didaftarkan di DURASI_BOOST_MS.
 */
function bacaDurasiDariTeks(teks: string): number | null {
  const m = teks.match(/(\d+)\s*(menit|jam|hari)/i);
  if (!m) return null;
  const nilai = parseInt(m[1], 10);
  if (!Number.isFinite(nilai) || nilai <= 0) return null;
  const satuan = m[2].toLowerCase();
  if (satuan === "menit") return nilai * MENIT;
  if (satuan === "jam") return nilai * JAM;
  return nilai * HARI;
}

/**
 * Berapa lama boost ini aktif, dalam milidetik.
 * Urutan: tabel nama -> parsing nama/deskripsi -> default 24 jam.
 */
export function getBoostDurationMs(item: {
  name: string;
  description?: string | null;
}): number {
  const eksak = DURASI_BOOST_MS[item.name.trim()];
  if (eksak) return eksak;
  return (
    bacaDurasiDariTeks(`${item.name} ${item.description ?? ""}`) ??
    DURASI_BOOST_DEFAULT_MS
  );
}

/**
 * Kapan boost yang baru dibeli berakhir.
 *
 * Kalau murid masih punya boost aktif, durasinya DITAMBAHKAN di ujung boost
 * lama (bukan menimpanya) — karena `UserItem` unik per (userId, itemId),
 * pembelian kedua hanya menambah `quantity`, dan tanpa perpanjangan ini koinnya
 * hangus tanpa efek apa pun.
 */
export function hitungExpiresAtBoost(
  item: { name: string; description?: string | null },
  expiresAtSekarang?: Date | null,
): Date {
  const sekarang = Date.now();
  const mulai =
    expiresAtSekarang && expiresAtSekarang.getTime() > sekarang
      ? expiresAtSekarang.getTime()
      : sekarang;
  return new Date(mulai + getBoostDurationMs(item));
}

/**
 * Apakah murid ini sedang punya XP Boost aktif?
 *
 * Boost kedaluwarsa (expiresAt sudah lewat) tidak dihitung. Barisnya sengaja
 * TIDAK dihapus di sini — pembaca tidak boleh punya efek samping menghapus data.
 */
export async function hasActiveXpBoost(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const aktif = await db.userItem.findFirst({
      where: {
        userId,
        expiresAt: { gt: new Date() },
        item: { type: "XP_BOOST" },
      },
      select: { id: true },
    });
    return aktif !== null;
  } catch (error) {
    // Jangan pernah menghalangi pemberian XP karena masalah baca boost.
    console.error("[xp-boost] gagal memeriksa boost aktif:", error);
    return false;
  }
}

/** Pengali XP murid saat ini: 2 kalau boost aktif, 1 kalau tidak. */
export async function getXpMultiplier(userId: string): Promise<number> {
  return (await hasActiveXpBoost(userId)) ? XP_BOOST_MULTIPLIER : 1;
}

export type HasilBoost = {
  /** XP final yang harus disimpan & dipakai untuk hitung level/liga. */
  xp: number;
  /** XP sebelum dikali, untuk ditampilkan sebagai pembanding bila perlu. */
  baseXp: number;
  boosted: boolean;
  multiplier: number;
};

/**
 * Kalikan XP dasar dengan boost aktif murid.
 *
 * Satu-satunya fungsi yang perlu dipanggil route pemberian XP. XP 0 atau negatif
 * dilewatkan apa adanya (tidak ada gunanya query DB untuk nol).
 */
export async function applyXpBoost(
  userId: string,
  baseXp: number,
): Promise<HasilBoost> {
  const dasar = Number.isFinite(baseXp) ? baseXp : 0;
  if (dasar <= 0) {
    return { xp: dasar, baseXp: dasar, boosted: false, multiplier: 1 };
  }
  const multiplier = await getXpMultiplier(userId);
  return {
    xp: Math.round(dasar * multiplier),
    baseXp: dasar,
    boosted: multiplier > 1,
    multiplier,
  };
}
