import type { Metadata } from "next";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan — BahasaCerdas",
  description: "Syarat dan ketentuan penggunaan platform BahasaCerdas. Baca ketentuan layanan, hak dan kewajiban pengguna platform edukasi Bahasa Indonesia.",
  alternates: {
    canonical: "https://www.bahasacerdas.com/syarat-ketentuan",
  },
};

export default function SyaratKetentuanPage() {
  return (
    <main className="min-h-screen">
      <PageNavbar />
      <div className="section-container py-16 lg:py-20 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-zinc-900 mb-8">Syarat & Ketentuan</h1>
        <div className="prose prose-zinc max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-zinc-800">1. Penerimaan Ketentuan</h2>
            <p className="text-zinc-600">
              Dengan mengakses dan menggunakan BahasaCerdas.com, Anda menyetujui syarat dan ketentuan ini. Jika tidak setuju, harap tidak menggunakan layanan kami.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-zinc-800">2. Layanan</h2>
            <p className="text-zinc-600">
              BahasaCerdas menyediakan platform digital untuk pembelajaran Bahasa Indonesia, termasuk AI tools, toko karya, dan komunitas guru. Layanan dapat berubah sewaktu-waktu.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-zinc-800">3. Akun Pengguna</h2>
            <p className="text-zinc-600">
              Anda bertanggung jawab menjaga kerahasiaan akun. BahasaCerdas berhak menonaktifkan akun yang melanggar ketentuan.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-zinc-800">4. Pembayaran</h2>
            <p className="text-zinc-600">
              Pembayaran diproses melalui Midtrans. Paket Guru Pro berlaku sesuai periode yang dibeli (30 atau 365 hari). Pembayaran tidak diperpanjang otomatis.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-zinc-800">5. Batasan Tanggung Jawab</h2>
            <p className="text-zinc-600">
              BahasaCerdas tidak bertanggung jawab atas kerugian tidak langsung akibat penggunaan platform. Layanan disediakan "sebagaimana adanya".
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-zinc-800">6. Kontak</h2>
            <p className="text-zinc-600">
              Untuk pertanyaan, hubungi admin melalui{" "}
              <Link href="/guru/bantuan/pembayaran" className="text-primary hover:underline">halaman bantuan</Link>.
            </p>
          </section>
        </div>
      </div>
      <PageFooter />
    </main>
  );
}
