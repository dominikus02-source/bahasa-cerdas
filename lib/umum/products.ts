/**
 * Konfigurasi kartu produk dasbor UMUM (/umum). CLIENT-SAFE (tanpa ikon/DB).
 *
 * Semua tujuan ada di satu tempat supaya mudah diubah tanpa menyentuh UI.
 */

import { JUMPA_ENABLED } from "@/lib/features";

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
    description: "Teman berpikir, bertanya, mencari ide, dan berkarya.",
    // Langsung ke rute NARA Arena (persona netral untuk UMUM) — bukan /ai-bc
    // yang hanya meneruskan, jadi tidak ada lompatan/loop.
    href: "/arena/ai",
  },
  {
    key: "JUMPA",
    name: "JUMPA",
    label: "Ruang temu",
    description: "Ruang pertemuan dan diskusi daring.",
    // Siap (keputusan pendiri 2026-10-26): tanpa label pengembangan.
    // Pengaman: bila flag build NEXT_PUBLIC_JUMPA_ENABLED mati, /jumpa = 404,
    // jadi kartu kembali ke status pengembangan alih-alih menautkan ke 404.
    href: "/jumpa",
    ...(JUMPA_ENABLED ? {} : { status: "dev" as const }),
  },
  {
    key: "MAIN_BERSAMA",
    name: "MAIN BERSAMA",
    label: "Bermain bersama",
    description: "Belajar bahasa lewat permainan dan interaksi.",
    href: "/main-bersama",
    status: "dev",
  },
  {
    key: "JALUR_CERDAS",
    name: "JALUR CERDAS",
    label: "Tumbuh bertahap",
    description: "Perjalanan pengembangan kemampuan dan kompetensi.",
    href: "/arena/jalur-cerdas",
  },
  {
    key: "BIGT",
    name: "BIGT",
    label: "Ukur kompetensi",
    description: "Tes kompetensi sesuai kemampuan yang tersedia.",
    href: BIGT_EXTERNAL_URL,
    external: true,
  },
  {
    key: "AKSARA",
    name: "AKSARA",
    label: "Ruang baca",
    description: "Ruang baca dan karya untuk menjelajahi bacaan dan tulisan.",
    href: "/artikel",
  },
  {
    key: "TOKO_KARYA",
    name: "TOKO KARYA",
    label: "Temukan karya",
    description: "Ruang menemukan, menawarkan, dan membeli karya atau produk.",
    href: "/marketplace",
  },
  {
    key: "AKU_SASTRAWAN",
    name: "AKU SASTRAWAN",
    label: "Ruang kreatif",
    description: "Ruang pengembangan penulisan sastra dan kreativitas literer.",
    href: AKU_SASTRAWAN_HREF,
    status: "dev",
  },
];
