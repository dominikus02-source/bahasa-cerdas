import type { Metadata } from "next";
import Link from "next/link";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — BahasaCerdas",
  description: "Cara BahasaCerdas menggunakan data pribadi, melindungi data anak, dan menangani permintaan pengguna.",
  alternates: { canonical: "https://www.bahasacerdas.com/kebijakan-privasi" },
};

const sections = [
  [
    "Siapa yang mengelola data Anda",
    "PT Bahasa Cerdas Indonesia mengelola situs bahasacerdas.com dan aplikasi BahasaCerdas. Kantor kami berada di CFX Tower, Jl. Gatot Subroto Kav. 35–36, Kuningan Timur, Setiabudi, Jakarta Selatan 12950. Untuk urusan privasi, hubungi halo@bahasacerdas.com."
  ],
  [
    "Data yang digunakan",
    "Saat Anda membuat akun, kami menggunakan nama, alamat surel, peran akun, dan informasi sekolah yang Anda berikan. Jika Anda masuk dengan Google, kami dapat menerima nama, alamat surel, dan foto profil yang ditampilkan oleh Google.",
    "Saat Anda menggunakan kelas, latihan, gim, atau fitur berkarya, layanan menggunakan data seperti jawaban, hasil belajar, karya, dan aktivitas yang diperlukan untuk fitur tersebut. Jika Anda meminta bantuan, kami menggunakan informasi yang Anda sampaikan untuk menanganinya.",
    "Situs menggunakan kuki sesi untuk menjaga akses akun. Layanan juga dapat menggunakan informasi perangkat dan catatan diagnostik untuk menjaga keamanan atau memperbaiki gangguan. Notifikasi Android dapat menggunakan token Firebase. Pembayaran melalui penyedia pembayaran dapat melibatkan informasi pesanan dan status transaksi."
  ],
  [
    "Tujuan dan dasar pemrosesan",
    "Kami memproses data untuk menyediakan fungsi yang Anda minta, menjalankan transaksi, memberi dukungan, dan memenuhi kewajiban hukum yang berlaku. Untuk menjaga keamanan dan mencegah penyalahgunaan, kami mempertimbangkan kebutuhan layanan dan dampaknya terhadap hak pengguna.",
    "Jika pemrosesan memerlukan persetujuan, persetujuan diminta secara khusus untuk tujuan yang dijelaskan. Persetujuan dapat ditarik melalui kontak privasi. Untuk data pribadi anak, berlaku ketentuan khusus pada bagian berikut."
  ],
  [
    "Data anak dan peran orang tua atau wali",
    "Penggunaan fitur oleh anak mengikuti ketentuan usia dan tingkat risiko fitur. Untuk pemrosesan data pribadi anak, persetujuan orang tua atau wali diperlukan sesuai peraturan. Informasi bagi anak disampaikan dengan bahasa yang mudah dipahami. Jika Anda orang tua atau wali dan menduga data anak digunakan tanpa persetujuan yang diperlukan, hubungi kami agar dapat ditangani.",
    "Guru atau sekolah yang menggunakan kelas hanya boleh memberikan data murid sesuai kewenangan dan ketentuan yang berlaku. Jika Anda ragu siapa yang dapat melihat data atau karya anak, hubungi kanal bantuan sebelum membagikannya."
  ],
  [
    "JUMPA, karya, dan fitur AI",
    "Pada pertemuan JUMPA, audio, video, atau layar diproses ketika fitur terkait digunakan. Jika sesi direkam, periksa pemberitahuan dan pengaturan sesi untuk mengetahui siapa yang merekam dan siapa yang dapat mengakses hasilnya. Jangan membagikan data atau rekaman orang lain tanpa kewenangan.",
    "Karya dan informasi kelas dapat terlihat oleh pengguna lain sesuai fitur, peran, atau pengaturan berbagi. Jika menggunakan fitur AI, masukkan hanya informasi yang diperlukan. Materi yang Anda masukkan dapat diproses oleh penyedia AI untuk menghasilkan jawaban."
  ],
  [
    "Penerima dan lokasi pengolahan",
    "Kami tidak menjual data pribadi Anda. Data dapat diakses oleh pihak yang berwenang sesuai peran, termasuk pihak sekolah untuk fungsi kelas. Kami menggunakan penyedia untuk fungsi seperti infrastruktur, autentikasi Google apabila Anda memilihnya, notifikasi atau diagnostik Android, pembayaran, dan AI sesuai fitur yang digunakan. Kami dapat memberikan data kepada pihak berwenang apabila diwajibkan oleh hukum.",
    "Jika penyedia atau fungsi tertentu memproses data di luar Indonesia, kami wajib memenuhi ketentuan pemindahan data pribadi lintas negara. Hubungi kami untuk mendapatkan informasi lebih lanjut tentang pemrosesan pada fitur yang Anda gunakan."
  ],
  [
    "Penyimpanan, keamanan, dan penghapusan",
    "Data akun disimpan selama diperlukan untuk menyediakan layanan. Permintaan penghapusan diproses sesuai ketentuan yang berlaku. Kebijakan layanan menetapkan penghapusan data akun terkait dalam waktu 30 hari, dengan pengecualian untuk data yang wajib disimpan berdasarkan hukum. Petunjuknya tersedia pada halaman Hapus Akun.",
    "Kami menggunakan pengamanan seperti enkripsi saat pengiriman data dan pembatasan akses. Jika terjadi kegagalan pelindungan data pribadi, pemberitahuan dilakukan sesuai kewajiban hukum."
  ],
  [
    "Hak Anda dan cara mengajukan permintaan",
    "Sesuai peraturan, Anda dapat meminta informasi, akses atau salinan, koreksi, penghentian atau pembatasan pemrosesan, penghapusan, atau penarikan persetujuan. Hak lain dapat mencakup keberatan atas keputusan otomatis, pemindahan data, dan ganti rugi. Hubungi halo@bahasacerdas.com. Kami dapat memeriksa identitas dan kewenangan pemohon secara proporsional."
  ],
  [
    "Perubahan kebijakan",
    "Kami memperbarui pemberitahuan ketika praktik atau ketentuan berubah. Perubahan material akan diberitahukan melalui kanal yang sesuai. Persetujuan baru diminta jika diwajibkan untuk tujuan pemrosesan yang berubah."
  ]
];
const relatedLinks = [
  [
    "/hapus-akun",
    "Petunjuk Hapus Akun"
  ],
  [
    "/syarat-ketentuan",
    "Syarat dan Ketentuan"
  ]
];

export default function KebijakanPrivasiPage() {
  return (
    <main className="min-h-screen bg-bc-bg text-bc-text">
      <PageNavbar />
      <article className="section-container mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <h1 className="mb-4 text-center text-3xl font-bold sm:text-4xl">Kebijakan Privasi</h1>
        <p className="mb-8 text-center text-sm text-bc-text-2">Pembaruan 17 November 2026</p>
        <div className="space-y-8 leading-relaxed">
          {sections.map(([heading, ...paragraphs]) => (
            <section key={heading} className="space-y-3">
              <h2 className="text-xl font-semibold sm:text-2xl">{heading}</h2>
              {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ))}
          <nav aria-label="Dokumen terkait" className="flex flex-wrap gap-4 border-t border-bc-line pt-4">
            {relatedLinks.map(([href, label]) => (
              <Link key={href} href={href} className="text-bc-accent-strong underline focus-ring">{label}</Link>
            ))}
            <a href="mailto:halo@bahasacerdas.com" className="text-bc-accent-strong underline focus-ring">Hubungi kami</a>
          </nav>
        </div>
      </article>
      <PageFooter />
    </main>
  );
}
