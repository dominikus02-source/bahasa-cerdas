import type { Metadata } from "next";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — BahasaCerdas",
  description: "Kebijakan privasi BahasaCerdas. Pelajari bagaimana kami melindungi data pribadi Anda saat menggunakan platform edukasi Bahasa Indonesia.",
  alternates: {
    canonical: "https://www.bahasacerdas.com/kebijakan-privasi",
  },
};

export default function KebijakanPrivasiPage() {
  return (
    <main className="min-h-screen bg-white">
      <PageNavbar />
      <div className="section-container py-12 lg:py-16 max-w-3xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-4 text-center">Kebijakan Privasi</h1>
        <p className="text-center text-zinc-500 text-sm mb-8">Aplikasi & Platform BahasaCerdas • Terakhir diperbarui: 5 November 2026</p>

        <div className="prose prose-zinc prose-lg max-w-none space-y-8 text-zinc-800 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">1. Pendahuluan</h2>
            <p>Kebijakan Privasi ini menjelaskan bagaimana aplikasi dan platform BahasaCerdas ("Aplikasi", "kami", "kita") mengumpulkan, menggunakan, menyimpan, dan melindungi informasi pribadi pengguna ("Anda", "Pengguna").</p>
            <p>Dengan mengunduh, menginstal, atau menggunakan Aplikasi/Platform, Anda menyetujui pengumpulan dan penggunaan informasi sesuai dengan Kebijakan Privasi ini. Jika Anda tidak setuju, mohon jangan gunakan layanan kami.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">2. Informasi yang Kami Kumpulkan</h2>
            <p><strong>Kami mengumpulkan jenis data berikut:</strong></p>
            <h3 className="text-xl font-medium text-zinc-800 mt-4">2.1 Informasi Akun dan Identitas</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nama lengkap</li>
              <li>Alamat email</li>
              <li>Informasi dari login Google (Google Sign-In), termasuk nama, email, dan foto profil yang Anda setujui untuk dibagikan</li>
            </ul>
            <h3 className="text-xl font-medium text-zinc-800 mt-4">2.2 Informasi Sekolah</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nama sekolah</li>
              <li>Alamat sekolah</li>
            </ul>
            <h3 className="text-xl font-medium text-zinc-800 mt-4">2.3 Data Analytics dan Penggunaan</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Data penggunaan aplikasi (halaman yang dikunjungi, fitur yang digunakan, durasi sesi)</li>
              <li>Informasi perangkat (model perangkat, sistem operasi, versi aplikasi)</li>
              <li>Log diagnostik dan crash (untuk memperbaiki bug dan meningkatkan stabilitas)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">3. Cara Kami Menggunakan Informasi</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Membuat dan mengelola akun pengguna</li>
              <li>Menyediakan fitur pembelajaran dan personalisasi konten</li>
              <li>Memverifikasi identitas melalui Google Login</li>
              <li>Menganalisis penggunaan aplikasi untuk meningkatkan fitur dan pengalaman pengguna</li>
              <li>Mengirimkan informasi terkait layanan (pembaruan, notifikasi penting)</li>
              <li>Memenuhi kewajiban hukum dan mencegah penyalahgunaan</li>
              <li>Menghubungi Anda terkait dukungan pelanggan</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">4. Pembagian Data dengan Pihak Ketiga</h2>
            <p>Kami tidak menjual data pribadi Anda. Data dapat dibagikan kepada:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Google (untuk autentikasi Google Sign-In dan layanan analytics jika menggunakan Google Analytics / Firebase)</li>
              <li>Penyedia infrastruktur cloud dan hosting yang memproses data atas nama kami</li>
              <li>Pihak berwenang jika diwajibkan oleh hukum</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">5. Keamanan Data</h2>
            <p>Kami menerapkan langkah-langkah keamanan yang wajar, termasuk enkripsi data saat transit (HTTPS/TLS) dan kontrol akses internal. Namun, tidak ada metode transmisi atau penyimpanan yang 100% aman.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">6. Penyimpanan dan Retensi Data</h2>
            <p>Data akun disimpan selama akun aktif. Data analytics disimpan dalam bentuk teragregasi atau dianonimkan setelah jangka waktu tertentu. Anda dapat meminta penghapusan data kapan saja.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">7. Hak Pengguna</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Mengakses data pribadi Anda</li>
              <li>Memperbaiki data yang tidak akurat</li>
              <li>Meminta penghapusan akun dan data terkait</li>
              <li>Menarik persetujuan (dengan konsekuensi pembatasan fitur tertentu)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">8. Penghapusan Akun dan Data</h2>
            <p>Anda dapat menghapus akun melalui pengaturan di dalam Aplikasi atau dengan menghubungi kami. Setelah permintaan diterima, data akan dihapus dalam waktu 30 hari, kecuali data yang wajib disimpan berdasarkan hukum.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">9. Anak-anak</h2>
            <p>Aplikasi ini ditujukan untuk pengguna berusia 13 tahun ke atas atau dengan izin orang tua/wali. Kami tidak dengan sengaja mengumpulkan data dari anak di bawah 13 tahun tanpa persetujuan yang sesuai.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">10. Perubahan Kebijakan</h2>
            <p>Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Perubahan signifikan akan diberitahukan melalui Aplikasi atau email. Penggunaan berkelanjutan setelah perubahan berarti Anda menerima kebijakan yang diperbarui.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">11. Kontak</h2>
            <p>Untuk pertanyaan terkait privasi atau permintaan data, hubungi:</p>
            <p><strong>Email:</strong> halo@bahasacerdas.com<br />
            <strong>Pengembang:</strong> Dominikus Wahyu<br />
            <strong>Website:</strong> <a href="https://www.bahasacerdas.com" className="text-primary hover:underline">https://www.bahasacerdas.com</a></p>
          </section>
        </div>
      </div>
      <PageFooter />
    </main>
  );
}
