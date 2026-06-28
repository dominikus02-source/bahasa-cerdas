import type { Metadata } from "next";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";
import JsonLd from "@/components/aeo/JsonLd";
import { faqPageLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Pertanyaan yang Sering Diajukan (FAQ) — BahasaCerdas",
  description:
    "Temukan jawaban atas pertanyaan umum tentang BahasaCerdas: cara daftar, harga Guru Pro, fitur AI, toko karya, komunitas MGMP, dan banyak lagi.",
  alternates: {
    canonical: "https://www.bahasacerdas.com/faq",
  },
  openGraph: {
    title: "FAQ | BahasaCerdas",
    description: "Jawaban atas pertanyaan umum tentang BahasaCerdas.",
    url: "https://www.bahasacerdas.com/faq",
  },
};

const faqs = [
  {
    q: "Apa itu BahasaCerdas?",
    a: "BahasaCerdas adalah platform edukasi Bahasa Indonesia yang menyediakan AI generator RPP, bank soal HOTS, kuis multiplayer, toko karya guru, dan komunitas MGMP dalam satu platform. Dibangun khusus untuk guru Bahasa Indonesia di SMP, SMA, SMK, dan MA.",
  },
  {
    q: "Apakah BahasaCerdas gratis?",
    a: "Ya, BahasaCerdas gratis untuk memulai. Guru dapat mendaftar dan langsung menggunakan fitur dasar tanpa biaya. Paket Guru Pro tersedia untuk akses penuh ke semua fitur AI dan premium, dengan uji coba 30 hari.",
  },
  {
    q: "Berapa harga Guru Pro?",
    a: "Paket Guru Pro tersedia mulai dari Rp 49.000 per bulan. Pembayaran dilakukan satu kali (tidak berlangganan otomatis). Setelah masa aktif habis, pengguna dapat memperpanjang secara manual.",
  },
  {
    q: "Fitur AI apa saja yang tersedia?",
    a: "BahasaCerdas memiliki enam alat AI: AI Generator RPP (buat RPP Kurikulum Merdeka dalam 30 detik), Generator Soal HOTS (soal level kognitif C4-C6), Koreksi EYD Otomatis, Analisis Teks Kebahasaan, Feedback Karangan Otomatis, dan Asisten BC untuk membantu persiapan mengajar.",
  },
  {
    q: "Bagaimana cara AI Generator RPP bekerja?",
    a: "Cukup masukkan topik pembelajaran, kelas, dan durasi. AI akan menghasilkan RPP lengkap dengan tujuan pembelajaran, kegiatan inti, asesmen, dan lampiran — semuanya sesuai Kurikulum Merdeka terbaru. Proses hanya membutuhkan waktu sekitar 30 detik.",
  },
  {
    q: "Siapa saja yang bisa menggunakan BahasaCerdas?",
    a: "BahasaCerdas dirancang untuk guru Bahasa Indonesia di semua jenjang (SMP, SMA, SMK, MA) dan siswa yang ingin belajar Bahasa Indonesia dengan cara interaktif. Guru mendapat akses ke alat AI dan manajemen kelas. Siswa bisa mengerjakan tugas dan mengikuti kuis.",
  },
  {
    q: "Apa itu Toko Karya Guru?",
    a: "Toko Karya adalah marketplace untuk guru menjual dan membeli perangkat ajar seperti RPP, modul ajar, PPT, soal, video pembelajaran, dan administrasi guru. Penjual mendapatkan 80% dari setiap penjualan, dan sisanya 20% untuk pengembangan platform.",
  },
  {
    q: "Bagaimana cara bergabung dengan komunitas MGMP?",
    a: "Setelah mendaftar, guru bisa langsung mengakses forum diskusi, grup MGMP, webinar, dan mentoring. Komunitas aktif setiap hari dengan diskusi seputar metode mengajar, kurikulum, dan pengembangan karir.",
  },
  {
    q: "Apa saja jenis kuis yang tersedia?",
    a: "BahasaCerdas memiliki beberapa jenis kuis: Kuis Tempur (multiplayer real-time), Tebak Kata, Susun Kata, Katastra (permainan kata), dan Adu Cepat (matchmaking). Semua kuis dirancang untuk membuat pembelajaran Bahasa Indonesia lebih interaktif.",
  },
  {
    q: "Apakah siswa bisa menggunakan BahasaCerdas?",
    a: "Ya. Siswa bisa bergabung melalui kode kelas yang diberikan guru. Mereka bisa mengerjakan tugas, mengikuti kuis multiplayer, menulis karya (puisi, cerpen, artikel), dan melihat progres belajar.",
  },
  {
    q: "Bagaimana cara mendaftar sebagai guru?",
    a: "Kunjungi bahasacerdas.com, klik \u201CDaftar sebagai Guru\u201D, isi data diri (nama, email, sekolah), dan verifikasi email. Setelah itu, Anda langsung bisa menggunakan platform.",
  },
  {
    q: "Apakah data saya aman?",
    a: "Ya. BahasaCerdas menggunakan enkripsi SSL 256-bit dan server yang aman. Data pribadi dan karya Anda dilindungi dan tidak akan dibagikan ke pihak ketiga tanpa izin. Pembayaran diproses oleh Midtrans dengan standar PCI DSS.",
  },
  {
    q: "Apa perbedaan Guru Pro dengan akun gratis?",
    a: "Akun gratis bisa mengakses fitur dasar seperti materi pembelajaran, kuis, toko karya, dan komunitas. Guru Pro mendapatkan akses penuh ke semua alat AI (RPP generator, soal HOTS, koreksi EYD), kuota lebih besar, dan fitur premium lainnya.",
  },
  {
    q: "Bagaimana cara menghubungi tim BahasaCerdas?",
    a: "Anda bisa menghubungi tim melalui email di halo@bahasacerdas.com atau melalui halaman bantuan di dalam platform setelah login.",
  },
];

export default function FAQPage() {
  return (
    <>
      <JsonLd data={faqPageLd(faqs)} />
      <main className="min-h-screen">
        <PageNavbar />
        <div className="section-container py-16 lg:py-20 max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl lg:text-4xl font-bold text-zinc-900 mb-4">
              Pertanyaan yang Sering Diajukan
            </h1>
            <p className="text-lg text-zinc-500">
              Temukan jawaban untuk pertanyaan seputar BahasaCerdas.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-zinc-100 bg-zinc-50/50 hover:border-zinc-200 transition-colors overflow-hidden"
              >
                <summary className="flex items-center justify-between p-5 lg:p-6 cursor-pointer text-sm lg:text-base font-semibold text-zinc-900 list-none [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="ml-4 w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 group-open:bg-primary group-open:text-white transition-all duration-300 group-open:rotate-45">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </span>
                </summary>
                <div className="px-5 lg:px-6 pb-5 lg:pb-6">
                  <div className="w-8 h-0.5 bg-primary/30 rounded-full mb-4" />
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
        <PageFooter />
      </main>
    </>
  );
}
