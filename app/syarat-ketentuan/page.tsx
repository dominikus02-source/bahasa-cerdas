import type { Metadata } from "next";
import Link from "next/link";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan — BahasaCerdas",
  description: "Ketentuan akun, penggunaan kelas dan fitur BahasaCerdas, karya pengguna, transaksi, dan pengaduan.",
  alternates: { canonical: "https://www.bahasacerdas.com/syarat-ketentuan" },
};

const sections = [
  [
    "Pengelola dan ruang lingkup",
    "Layanan BahasaCerdas dikelola oleh PT Bahasa Cerdas Indonesia yang beralamat di CFX Tower, Jl. Gatot Subroto Kav. 35-36, Kuningan Timur, Setiabudi, Jakarta Selatan 12950. Ketentuan ini berlaku untuk situs bahasacerdas.com dan aplikasi BahasaCerdas. Bacalah ketentuan sebelum membuat akun atau menggunakan fitur yang meminta persetujuan."
  ],
  [
    "Akun dan penggunaan oleh anak",
    "Gunakan informasi yang akurat, jaga kerahasiaan akses, dan laporkan dugaan pengambilalihan akun. Gunakan peran guru, murid, atau pengguna umum sesuai kewenangan. Guru dan sekolah hanya boleh menambahkan murid sesuai tugas dan dasar yang sah.",
    "Akses anak mengikuti ketentuan usia dan risiko tiap fitur. Orang tua atau wali memberi persetujuan atau konfirmasi apabila diwajibkan. Kode kelas atau undangan digunakan untuk mengakses kelas. Persetujuan pemrosesan data anak diatur secara khusus dalam Kebijakan Privasi dan peraturan yang berlaku."
  ],
  [
    "Penggunaan layanan",
    "Gunakan layanan untuk belajar, mengajar, bekerja sama, dan keperluan lain yang diizinkan oleh fitur terkait. Pengguna dilarang menyamar, melecehkan, menyebarkan konten berbahaya, melanggar hak cipta, membuka data pribadi orang lain tanpa kewenangan, atau mengganggu keamanan layanan."
  ],
  [
    "Kelas, JUMPA, gim, dan AI",
    "Patuhi aturan kelas dan moderator. Periksa pemberitahuan jika sesi JUMPA direkam. Pengguna hanya boleh membagikan rekaman, hasil belajar, atau identitas peserta apabila memiliki kewenangan dan izin yang diperlukan. Laporkan perundungan, konten berbahaya, atau kontak yang tidak pantas ke kanal bantuan.",
    "Gunakan keluaran AI sebagai bahan bantu. Tinjau ketepatan dan kesesuaian hasil sebelum dipakai untuk pengajaran atau penilaian. Masukkan informasi pribadi atau rahasia hanya jika diperlukan dan diizinkan."
  ],
  [
    "Karya pengguna dan materi BahasaCerdas",
    "Hak atas karya yang Anda unggah tetap pada Anda atau pemegang haknya. Anda mengizinkan kami menyimpan, menampilkan, dan memproses karya sebatas penyediaan fitur yang Anda gunakan. Penggunaan yang memerlukan izin tambahan mengikuti kesepakatan tersendiri. Materi, logo, dan perangkat lunak milik PT atau pemberi lisensinya tetap mengikuti hak yang berlaku."
  ],
  [
    "Transaksi dan hak konsumen",
    "Sebelum membeli, periksa harga, manfaat, masa berlaku, dan ketentuan perpanjangan yang ditampilkan. Pembatalan, penggantian, dan pengembalian dana ditangani sesuai informasi transaksi dan hukum. Anda tetap dapat menggunakan hak konsumen atas informasi, pengaduan, dan penyelesaian sengketa sesuai peraturan."
  ],
  [
    "Pembatasan akses, pengaduan, dan penutupan akun",
    "Kami dapat membatasi konten atau akses secara proporsional karena pelanggaran, risiko keselamatan, atau kewajiban hukum. Jika memungkinkan dan diizinkan, kami menyampaikan alasan dan kanal tanggapan. Pengguna dapat meminta penutupan akun melalui kanal bantuan atau mengikuti petunjuk Hapus Akun.",
    "Untuk keluhan atau keberatan, hubungi halo@bahasacerdas.com. Sengketa dapat diselesaikan melalui musyawarah atau jalur penyelesaian yang tersedia menurut hukum Indonesia."
  ],
  [
    "Perubahan ketentuan",
    "Perubahan material akan diberitahukan melalui kanal yang sesuai. Jika persetujuan baru diperlukan, kami akan memintanya sebelum menerapkan perubahan pada pengguna terkait."
  ]
];
const relatedLinks = [
  [
    "/kebijakan-privasi",
    "Kebijakan Privasi"
  ],
  [
    "/hapus-akun",
    "Petunjuk Hapus Akun"
  ]
];

export default function SyaratKetentuanPage() {
  return (
    <main className="min-h-screen bg-bc-bg text-bc-text">
      <PageNavbar />
      <article className="section-container mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <h1 className="mb-4 text-center text-3xl font-bold sm:text-4xl">Syarat dan Ketentuan</h1>
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
