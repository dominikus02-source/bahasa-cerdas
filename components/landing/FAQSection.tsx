"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";

const faqs = [
  {
    q: "Apa itu BahasaCerdas?",
    a: "BahasaCerdas adalah platform all-in-one untuk guru Bahasa Indonesia. Kami menyediakan AI generator RPP, bank soal, kuis multiplayer, toko karya, dan komunitas MGMP terbesar di Indonesia. Semua dalam satu platform.",
  },
  {
    q: "Apakah BahasaCerdas gratis?",
    a: "Ya! Anda bisa mencoba gratis selama 14 hari tanpa komitmen. Setelah itu, tersedia paket Premium dengan fitur lengkap mulai dari Rp 50.000/bulan. Guru juga bisa mendapat akses gratis dengan bergabung di komunitas aktif.",
  },
  {
    q: "Bagaimana cara AI RPP bekerja?",
    a: "Cukup masukkan topik, kelas, dan durasi pembelajaran. AI kami akan menghasilkan RPP lengkap dengan tujuan pembelajaran, kegiatan inti, asesmen, dan lampiran — semuanya sesuai Kurikulum Merdeka terbaru.",
  },
  {
    q: "Apakah saya bisa menjual karya di Toko Karya?",
    a: "Tentu! Setiap guru bisa upload dan jual RPP, modul, PPT, soal, atau video pembelajaran. Anda mendapatkan 80% dari setiap penjualan. Pembayaran bisa dicairkan setiap bulan.",
  },
  {
    q: "Bagaimana cara bergabung dengan komunitas?",
    a: "Setelah mendaftar, Anda langsung bisa mengakses forum diskusi, grup MGMP, webinar, dan mentoring. Komunitas kami aktif setiap hari dengan ribuan guru dari seluruh Indonesia.",
  },
  {
    q: "Apakah tersedia untuk siswa?",
    a: "Ya! Siswa bisa bergabung melalui kode kelas yang diberikan guru. Mereka bisa mengerjakan tugas, mengikuti kuis multiplayer, dan melihat progres belajar mereka.",
  },
  {
    q: "Bagaimana keamanan data saya?",
    a: "Kami menggunakan enkripsi SSL 256-bit dan server yang aman. Data pribadi dan karya Anda dilindungi dan tidak akan dibagikan ke pihak ketiga tanpa izin.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="relative py-20 lg:py-28 bg-white">
      <div className="section-container">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
            <span className="text-xs font-semibold text-primary">FAQ</span>
          </div>
          <h2 className="heading-lg text-zinc-900 mb-5">
            Pertanyaan yang{" "}
            <span className="text-primary">Sering Diajukan</span>
          </h2>
          <p className="text-base lg:text-lg text-zinc-500 leading-relaxed">
            Masih ragu? Temukan jawaban untuk pertanyaan yang paling sering ditanyakan.
          </p>
        </div>

        {/* FAQ List */}
        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className={`rounded-2xl border transition-all duration-300 cursor-pointer ${
                  isOpen
                    ? "border-primary/20 bg-primary-light/30 shadow-sm"
                    : "border-zinc-100 bg-zinc-50/50 hover:bg-zinc-50 hover:border-zinc-200"
                }`}
                onClick={() => setOpenIndex(isOpen ? null : i)}
              >
                <div className="flex items-center justify-between p-5 lg:p-6">
                  <h3 className="text-sm lg:text-base font-semibold text-zinc-900 pr-4">
                    {faq.q}
                  </h3>
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                      isOpen ? "bg-primary text-white rotate-45" : "bg-zinc-100 text-zinc-400"
                    }`}
                  >
                    <Plus size={16} />
                  </div>
                </div>
                {isOpen && (
                  <div className="px-5 lg:px-6 pb-5 lg:pb-6 animate-fade-in">
                    <div className="w-8 h-0.5 bg-primary/30 rounded-full mb-4" />
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
