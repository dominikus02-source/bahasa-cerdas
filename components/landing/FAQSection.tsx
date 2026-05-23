"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react"

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs = [
    {
      question: "Apakah benar-benar bisa mencoba Premium gratis 14 hari?",
      answer: "Ya, 100% gratis! Anda bisa mencoba semua fitur Premium selama 14 hari penuh tanpa perlu kartu kredit. Setelah masa trial berakhir, Anda bisa memilih untuk upgrade atau tetap di paket Free.",
    },
    {
      question: "Bagaimana cara export RPP yang sudah dibuat dengan AI?",
      answer: "Sangat mudah! Setelah AI generate RPP, Anda bisa edit sesuai kebutuhan, lalu klik tombol Export dan pilih format yang diinginkan (Word/PDF). RPP sudah dalam format siap cetak dan sesuai standar Kurikulum Merdeka.",
    },
    {
      question: "Apakah ada garansi uang kembali jika saya upgrade Premium?",
      answer: "Tentu! Kami memberikan garansi uang kembali 100% dalam 7 hari jika Anda tidak puas dengan layanan Premium. Tanpa pertanyaan rumit, proses refund cepat dan mudah.",
    },
    {
      question: "Bagaimana cara pembayaran untuk upgrade Premium?",
      answer: "Kami menerima berbagai metode pembayaran: QRIS (GoPay, OVO, DANA, ShopeePay), Virtual Account (BCA, BNI, Mandiri, BRI), transfer bank, dan e-wallet lainnya. Pembayaran diproses otomatis dan akses Premium langsung aktif.",
    },
    {
      question: "Apakah saya bisa menjual karya saya di Toko Karya?",
      answer: "Tentu! Semua member Premium bisa menjual karya (RPP, modul, video, ebook) di Toko Karya. Anda mendapat komisi 85-90% dari setiap penjualan. Proses upload mudah dan pencairan royalti cepat ke rekening Anda.",
    },
  ]

  return (
    <section className="py-20 lg:py-32 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold mb-6">
            <HelpCircle className="w-4 h-4" />
            FAQ
          </div>

          <h2 className="text-3xl lg:text-5xl font-extrabold text-slate-900 mb-6">
            Pertanyaan yang{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-pink-600">Sering Diajukan</span>
          </h2>

          <p className="text-lg text-slate-600">Temukan jawaban untuk pertanyaan umum tentang Bahasa Cerdas di sini.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border-2 border-slate-200 rounded-2xl overflow-hidden hover:border-red-300 transition-colors">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left bg-white hover:bg-slate-50 transition-colors"
              >
                <span className="font-bold text-slate-900 pr-8">{faq.question}</span>
                <div className="shrink-0">
                  {openIndex === index ? (
                    <ChevronUp className="w-6 h-6 text-red-600" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-slate-400" />
                  )}
                </div>
              </button>

              {openIndex === index && (
                <div className="p-6 pt-0 bg-slate-50">
                  <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
