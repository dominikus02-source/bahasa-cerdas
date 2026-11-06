import type { Metadata } from "next";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";

export const metadata: Metadata = {
  title: "Hapus Akun — BahasaCerdas",
  description: "Cara menghapus akun dan data pribadi Anda di BahasaCerdas. Sesuai dengan persyaratan Google Play dan UU PDP.",
  alternates: {
    canonical: "https://www.bahasacerdas.com/hapus-akun",
  },
};

export default function HapusAkunPage() {
  return (
    <main className="min-h-screen bg-white">
      <PageNavbar />
      <div className="section-container py-12 lg:py-16 max-w-3xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-4 text-center">Hapus Akun</h1>
        <p className="text-center text-zinc-500 text-sm mb-8">BahasaCerdas • Terakhir diperbarui: 6 November 2026</p>

        <div className="prose prose-zinc prose-lg max-w-none space-y-8 text-zinc-800 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">Cara Menghapus Akun Anda</h2>
            <p>Anda dapat menghapus akun BahasaCerdas beserta data pribadi yang terkait kapan saja. Berikut cara melakukannya:</p>

            <h3 className="text-xl font-medium text-zinc-800 mt-6">Melalui Aplikasi / Website</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Masuk ke akun Anda di <a href="https://www.bahasacerdas.com" className="text-primary hover:underline">bahasacerdas.com</a></li>
              <li>Buka menu <strong>Pengaturan</strong> atau <strong>Profil</strong></li>
              <li>Pilih opsi <strong>Hapus Akun</strong> atau <strong>Delete Account</strong></li>
              <li>Konfirmasi penghapusan</li>
            </ol>

            <h3 className="text-xl font-medium text-zinc-800 mt-6">Melalui Email</h3>
            <p>Jika Anda tidak bisa masuk, kirim permintaan ke:</p>
            <p><strong>Email:</strong> <a href="mailto:halo@bahasacerdas.com" className="text-primary hover:underline">halo@bahasacerdas.com</a></p>
            <p>Sertakan alamat email akun yang ingin dihapus. Kami akan memproses permintaan dalam waktu maksimal <strong>30 hari</strong>.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">Apa yang Terjadi Setelah Penghapusan?</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Akun Anda akan dinonaktifkan segera setelah konfirmasi</li>
              <li>Data pribadi (nama, email, profil, progres belajar) akan dihapus dalam 30 hari</li>
              <li>Data yang wajib disimpan berdasarkan hukum (misalnya log transaksi) dapat disimpan lebih lama sesuai peraturan yang berlaku</li>
              <li>Setelah dihapus, data tidak dapat dipulihkan</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">Data yang Dihapus</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Informasi akun (nama, email, foto profil)</li>
              <li>Data sekolah (jika ada)</li>
              <li>Progres belajar, karya, dan aktivitas di platform</li>
              <li>Token notifikasi (FCM)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">Kontak</h2>
            <p>Jika ada pertanyaan tentang penghapusan akun atau data pribadi, hubungi:</p>
            <p><strong>Email:</strong> <a href="mailto:halo@bahasacerdas.com" className="text-primary hover:underline">halo@bahasacerdas.com</a><br />
            <strong>Website:</strong> <a href="https://www.bahasacerdas.com" className="text-primary hover:underline">https://www.bahasacerdas.com</a></p>
          </section>

          <section className="bg-zinc-50 rounded-lg p-6 mt-8">
            <p className="text-sm text-zinc-600">
              Halaman ini disediakan untuk memenuhi persyaratan <strong>Google Play Data Safety</strong> dan <strong>UU Pelindungan Data Pribadi (UU PDP)</strong> Indonesia.
            </p>
          </section>
        </div>
      </div>
      <PageFooter />
    </main>
  );
}
