import { AKU_SASTRAWAN_HREF } from "@/lib/umum/products";

/**
 * AKU SASTRAWAN untuk pengguna umum kini memakai halaman asli (/aku-sastrawan).
 * Rute lama ini hanya meneruskan dengan 307 (tautan relatif, aman di balik proxy).
 * /aku-sastrawan sendiri yang mewajibkan login dan memeriksa Premium di server
 * (termasuk mode baca/unduh setelah Premium berakhir).
 */
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(null, {
    status: 307,
    headers: { Location: AKU_SASTRAWAN_HREF, "Cache-Control": "no-store" },
  });
}
