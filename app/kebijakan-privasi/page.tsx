import type { Metadata } from "next";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — BahasaCerdas",
  description: "Kebijakan privasi BahasaCerdas. Pelajari bagaimana kami melindungi data pribadi Anda saat menggunakan platform edukasi Bahasa Indonesia.",
  alternates: {
    canonical: "https://www.bahasacerdas.com/kebijakan-privasi",
  },
};

export default function KebijakanPrivasiPage() {
  return (
    <main className="min-h-screen">
      <PageNavbar />
      <div className="section-container py-16 lg:py-20 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-zinc-900 mb-8">Kebijakan Privasi</h1>
        <div className="prose prose-zinc max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-zinc-800">1. Informasi yang Dikumpulkan</h2>
            <p className="text-zinc-600">
              Kami mengumpulkan informasi akun (nama, email), data penggunaan platform, dan informasi pembayaran yang diproses melalui Midtrans. Kami tidak menyimpan data kartu kredit.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-zinc-800">2. Penggunaan Data</h2>
            <p className="text-zinc-600">
              Data digunakan untuk menyediakan layanan, meningkatkan platform, dan komunikasi terkait akun. Data tidak dijual ke pihak ketiga.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-zinc-800">3. Keamanan Data</h2>
            <p className="text-zinc-600">
              Data disimpan di server yang aman dengan enkripsi. Pembayaran diproses oleh Midtrans dengan standar keamanan PCI DSS.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-zinc-800">4. Hak Pengguna</h2>
            <p className="text-zinc-600">
              Anda dapat meminta akses, koreksi, atau penghapusan data pribadi dengan menghubungi admin melalui{" "}
              <Link href="/guru/bantuan/pembayaran" className="text-primary hover:underline">halaman bantuan</Link>.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-zinc-800">5. Perubahan Kebijakan</h2>
            <p className="text-zinc-600">
              Kebijakan ini dapat diperbarui sewaktu-waktu. Perubahan akan diumumkan melalui platform.
            </p>
          </section>
        </div>
      </div>
      <PageFooter />
    </main>
  );
}
