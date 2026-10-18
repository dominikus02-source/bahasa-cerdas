import { notFound } from "next/navigation";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";
import MarketplaceClient from "@/app/marketplace/MarketplaceClient";

export const dynamic = "force-dynamic";

const CONTOH = [
  { id: "c1", title: "RPP Teks Eksposisi Kelas 8 (Kurikulum Merdeka)", type: "RPP", price: 25000, description: "Lengkap dengan asesmen dan rubrik.", downloads: 132, seller: { fullName: "Bu Rina Kartika" } },
  { id: "c2", title: "Bank Soal Kata Baku 100 Butir", type: "SOAL", price: 0, description: "Pilihan ganda dan kunci jawaban.", downloads: 410, seller: { fullName: "Pak Dedi" } },
  { id: "c3", title: "PPT Majas untuk SMP", type: "PPT", price: 15000, description: "40 slide siap pakai.", downloads: 58, seller: { fullName: "Bu Sari" } },
  { id: "c4", title: "Modul Menulis Cerpen", type: "MODUL", price: 30000, description: "Langkah demi langkah dengan contoh.", downloads: 77, seller: { fullName: "Pak Andi" } },
];

/** Pratinjau lokal Toko Karya publik dengan data contoh. Hanya bila BC_UI_PREVIEW=1. */
export default function Page() {
  if (process.env.BC_UI_PREVIEW !== "1") notFound();
  return (
    <>
      <PageNavbar />
      <MarketplaceClient initialItems={CONTOH} />
      <PageFooter />
    </>
  );
}
