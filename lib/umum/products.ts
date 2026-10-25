/**
 * Konfigurasi kartu produk dasbor UMUM (/umum). CLIENT-SAFE (tanpa ikon/DB).
 *
 * Semua tujuan ada di satu tempat supaya mudah diubah tanpa menyentuh UI.
 */

/**
 * AKU SASTRAWAN — sengaja menunjuk ke halaman status "Sedang dalam
 * pengembangan" milik dasbor UMUM. Halaman penuh sedang dibangun terpisah
 * (PR #183, rute /aku-sastrawan). Setelah #183 rilis, cukup ubah konstanta
 * ini (mis. ke "/aku-sastrawan") — tidak ada tempat lain yang perlu diubah.
 */
export const AKU_SASTRAWAN_HREF = "/umum/aku-sastrawan";

/**
 * BIGT untuk pengguna umum = situs eksternal. URL diambil dari sumber yang
 * sudah ada di kode (components/bigt/BigtInfoPage.tsx & identitas NARA:
 * bahasacerdas.site). Dibuka di tab baru (noopener noreferrer).
 */
export const BIGT_EXTERNAL_URL = "https://www.bahasacerdas.site";

export type UmumProductKey =
  | "NARA"
  | "JUMPA"
  | "MAIN_BERSAMA"
  | "JALUR_CERDAS"
  | "BIGT"
  | "AKSARA"
  | "TOKO_KARYA"
  | "AKU_SASTRAWAN";

export interface UmumProduct {
  key: UmumProductKey;
  name: string;
  label: string;
  description: string;
  href: string;
  external?: boolean;
  /** Kartu tampil, tetapi fiturnya untuk UMUM belum siap. */
  status?: "dev";
}

export const UMUM_PRODUCTS: readonly UmumProduct[] = [
  {
    key: "NARA",
    name: "NARA",
    label: "Teman berpikir",
    description: "Bertanya, berdiskusi, dan berkarya bersama asisten bahasa NARA.",
    // Langsung ke rute NARA Arena (persona netral untuk UMUM) — bukan /ai-bc
    // yang hanya meneruskan, jadi tidak ada lompatan/loop.
    href: "/arena/ai",
  },
  {
    key: "JUMPA",
    name: "JUMPA",
    label: "Ruang temu",
    description: "Ruang video untuk bertemu dan berdiskusi secara daring.",
    href: "/jumpa",
    status: "dev",
  },
  {
    key: "MAIN_BERSAMA",
    name: "MAIN BERSAMA",
    label: "Bermain bersama",
    description: "Main gim bahasa bersama teman dalam satu ruang.",
    href: "/main-bersama",
    status: "dev",
  },
  {
    key: "JALUR_CERDAS",
    name: "JALUR CERDAS",
    label: "Tumbuh bertahap",
    description: "Belajar bahasa Indonesia langkah demi langkah sesuai kemampuanmu.",
    href: "/arena/jalur-cerdas",
  },
  {
    key: "BIGT",
    name: "BIGT",
    label: "Ukur kompetensi",
    description: "Tes kompetensi bahasa Indonesia di situs resmi BIGT.",
    href: BIGT_EXTERNAL_URL,
    external: true,
  },
  {
    key: "AKSARA",
    name: "AKSARA",
    label: "Ruang baca",
    description: "Baca artikel dan gagasan seputar bahasa Indonesia.",
    href: "/artikel",
  },
  {
    key: "TOKO_KARYA",
    name: "TOKO KARYA",
    label: "Temukan karya",
    description: "Jelajahi dan beli karya dari komunitas BahasaCerdas.",
    href: "/marketplace",
  },
  {
    key: "AKU_SASTRAWAN",
    name: "AKU SASTRAWAN",
    label: "Ruang kreatif",
    description: "Ruang menulis dan berkarya sastra.",
    href: AKU_SASTRAWAN_HREF,
    status: "dev",
  },
];
