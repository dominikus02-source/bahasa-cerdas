import type { Metadata } from "next";
import { Feather } from "lucide-react";
import { ComingSoon } from "@/components/umum/ComingSoon";

export const metadata: Metadata = {
  title: "Aku Sastrawan — BahasaCerdas",
  robots: { index: false, follow: false },
};

/**
 * AKU SASTRAWAN untuk pengguna umum — halaman belum dibangun.
 * Sengaja TIDAK menautkan ke /murid/katastra (area murid). Statis & publik.
 */
export default function AkuSastrawanPage() {
  return (
    <ComingSoon
      title="Aku Sastrawan"
      icon={Feather}
      description="Ruang menulis dan berkarya sastra untuk pengguna umum sedang kami siapkan. Nantikan segera."
    />
  );
}
