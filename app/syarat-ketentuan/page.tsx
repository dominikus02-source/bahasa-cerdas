import type { Metadata } from "next";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan — BahasaCerdas",
  description: "Syarat dan ketentuan penggunaan platform BahasaCerdas. Baca ketentuan layanan, hak dan kewajiban pengguna platform edukasi Bahasa Indonesia.",
  alternates: {
    canonical: "https://www.bahasacerdas.com/syarat-ketentuan",
  },
};

export default function SyaratKetentuanPage() {
  return (
    <main className="min-h-screen bg-white">
      <PageNavbar />
      <div className="section-container py-12 lg:py-16 max-w-3xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-4 text-center">Syarat & Ketentuan</h1>
        <p className="text-center text-zinc-500 text-sm mb-8">Aplikasi & Platform BahasaCerdas • Terakhir diperbarui: 5 November 2026</p>

        <div className="prose prose-zinc prose-lg max-w-none space-y-8 text-zinc-800 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">1. Penerimaan Syarat</h2>
            <p>Platform BahasaCerdas dikelola oleh <strong>PT Bahasa Cerdas Indonesia</strong>, beralamat di CFX Tower, Jl. Gatot Subroto Kav. 35-36, Kuningan Timur, Setiabudi, Jakarta Selatan 12950.</p>
            <p>Dengan mengunduh, menginstal, atau menggunakan aplikasi dan platform BahasaCerdas ("Aplikasi"), Anda setuju untuk terikat oleh Syarat dan Ketentuan ini. Jika Anda tidak setuju, mohon berhenti menggunakan layanan kami.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">2. Lisensi Penggunaan</h2>
            <p>Kami memberikan Anda lisensi terbatas, non-eksklusif, tidak dapat dipindahtangankan, dan dapat dicabut untuk menggunakan Aplikasi hanya untuk keperluan pribadi dan non-komersial, sesuai dengan Syarat ini.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">3. Akun Pengguna</h2>
            <p>Anda bertanggung jawab untuk:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Menjaga kerahasiaan informasi akun</li>
              <li>Semua aktivitas yang terjadi di bawah akun Anda</li>
              <li>Memberikan informasi yang akurat (nama, email, sekolah, alamat sekolah)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">4. Penggunaan yang Dilarang</h2>
            <p>Anda dilarang untuk:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Menggunakan Aplikasi untuk tujuan ilegal atau melanggar hukum</li>
              <li>Mencoba meretas, reverse engineer, atau mengganggu layanan</li>
              <li>Mengunggah konten yang melanggar hak pihak ketiga</li>
              <li>Menggunakan bot, script, atau otomatisasi yang merugikan sistem</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">5. Konten dan Hak Kekayaan Intelektual</h2>
            <p>Seluruh konten dalam Aplikasi (teks, gambar, logo, kode) adalah milik pengembang atau pemberi lisensi. Anda tidak memperoleh hak kepemilikan atas konten tersebut.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">6. Pembatasan Tanggung Jawab</h2>
            <p>Aplikasi disediakan "sebagaimana adanya". Kami tidak menjamin Aplikasi bebas dari kesalahan atau gangguan. Kami tidak bertanggung jawab atas kerugian tidak langsung yang timbul dari penggunaan Aplikasi, sejauh diizinkan oleh hukum yang berlaku.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">7. Penghentian</h2>
            <p>Kami berhak menghentikan atau menangguhkan akses Anda ke Aplikasi kapan saja jika terjadi pelanggaran terhadap Syarat ini, tanpa pemberitahuan sebelumnya.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">8. Perubahan Syarat</h2>
            <p>Kami dapat memperbarui Syarat ini sewaktu-waktu. Versi terbaru akan tersedia di dalam Aplikasi atau melalui tautan resmi. Penggunaan berkelanjutan setelah perubahan berarti penerimaan terhadap Syarat yang baru.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">9. Hukum yang Berlaku</h2>
            <p>Syarat ini diatur oleh hukum Republik Indonesia. Setiap sengketa akan diselesaikan melalui musyawarah atau melalui pengadilan yang berwenang di Indonesia.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">10. Kontak</h2>
            <p>Untuk pertanyaan terkait Syarat dan Ketentuan, hubungi:</p>
            <p><strong>Pengelola:</strong> PT Bahasa Cerdas Indonesia<br />
            <strong>Alamat:</strong> CFX Tower, Jl. Gatot Subroto Kav. 35-36, Kuningan Timur, Setiabudi, Jakarta Selatan 12950<br />
            <strong>Email:</strong> halo@bahasacerdas.com<br />
            <strong>Website:</strong> <a href="https://www.bahasacerdas.com" className="text-primary hover:underline">https://www.bahasacerdas.com</a></p>
          </section>
        </div>
      </div>
      <PageFooter />
    </main>
  );
}
