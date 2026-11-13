import type { Metadata } from "next";
import Link from "next/link";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";

export const metadata: Metadata = {
  title: "Hapus Akun — BahasaCerdas",
  description: "Cara menghapus akun dan data pribadi di BahasaCerdas. Halaman ini dapat diakses tanpa login. Tindakan penghapusan memerlukan verifikasi identitas.",
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
        <p className="text-center text-zinc-500 text-sm mb-8">BahasaCerdas • Informasi Penghapusan Akun</p>

        <div className="prose prose-zinc prose-lg max-w-none space-y-6 text-zinc-800 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">Informasi Publik</h2>
            <p>Halaman ini menjelaskan cara menghapus akun dan data pribadi Anda di BahasaCerdas. Anda dapat membaca informasi ini tanpa harus login.</p>
            <p>Tindakan penghapusan akun yang sebenarnya memerlukan verifikasi identitas (login) agar data Anda aman.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">Cara Menghapus Akun</h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Login ke akun Anda di <Link href="/login" className="text-primary hover:underline">bahasacerdas.com/login</Link>.</li>
              <li>Masuk ke pengaturan profil / akun.</li>
              <li>Pilih opsi <strong>Hapus Akun</strong> dan konfirmasi.</li>
              <li>Atau kirim permintaan tertulis ke <a href="mailto:halo@bahasacerdas.com" className="text-primary hover:underline">halo@bahasacerdas.com</a> dengan subjek “Permintaan Hapus Akun” dari email yang terdaftar.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">Apa yang Terjadi Setelah Permintaan</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Data akun dan data terkait akan dihapus dalam waktu <strong>30 hari</strong>.</li>
              <li>Data yang wajib disimpan berdasarkan hukum (misalnya log transaksi) dapat dipertahankan sesuai peraturan.</li>
              <li>Setelah dihapus, akun tidak dapat dipulihkan.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-zinc-900">Kontak</h2>
            <p>Jika Anda mengalami kesulitan atau ingin konfirmasi status permintaan, hubungi:</p>
            <p><strong>Email:</strong> <a href="mailto:halo@bahasacerdas.com" className="text-primary hover:underline">halo@bahasacerdas.com</a></p>
          </section>

          <p className="text-sm text-zinc-500">Lihat juga <Link href="/kebijakan-privasi" className="text-primary hover:underline">Kebijakan Privasi</Link>.</p>
        </div>
      </div>
      <PageFooter />
    </main>
  );
}
