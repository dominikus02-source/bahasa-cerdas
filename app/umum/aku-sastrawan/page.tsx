import { redirect } from "next/navigation";
import { AKU_SASTRAWAN_HREF } from "@/lib/umum/products";

/**
 * AKU SASTRAWAN untuk pengguna umum kini memakai halaman asli (/aku-sastrawan).
 * Rute lama ini hanya meneruskan; /aku-sastrawan sendiri yang mewajibkan login
 * dan memeriksa Premium di server (termasuk mode baca/unduh setelah Premium berakhir).
 */
export default function AkuSastrawanPage() {
  redirect(AKU_SASTRAWAN_HREF);
}
