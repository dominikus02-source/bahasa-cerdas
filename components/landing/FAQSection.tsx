"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/motion";

const faqs = [
  {
    q: "Apa itu BahasaCerdas?",
    a: "BahasaCerdas adalah ekosistem belajar Bahasa Indonesia yang menghubungkan guru, murid, kelas, materi, latihan, permainan, karya, komunitas, dan asesmen dalam satu platform. Bukan sekadar tempat belajar atau alat AI — melainkan ekosistem yang dirancang mengelilingi perjalanan belajar Bahasa Indonesia.",
  },
  {
    q: "Apakah BahasaCerdas gratis?",
    a: "Ya. Guru dan murid dapat memulai tanpa biaya. Guru mendapat uji coba Guru Pro selama 30 hari tanpa komitmen, lalu tersedia paket Guru Pro mulai Rp 49.000/bulan bagi yang ingin mengakses AI tools dan kuota ekspor lebih besar.",
  },
  {
    q: "Apa yang bisa dilakukan murid di BahasaCerdas?",
    a: "Murid bisa belajar di Jalur Cerdas, berlatih soal, bermain gim edukasi, menulis dan mempublikasikan karya (puisi, cerpen, pantun), mengumpulkan XP dan lencana, naik peringkat di liga mingguan, serta mengikuti simulasi UKBI/TKA.",
  },
  {
    q: "Apa yang bisa dilakukan guru?",
    a: "Guru dapat mengelola kelas, menyiapkan materi ajar, membuat dan membagikan latihan, menilai karya dan tugas, memantau buku nilai, menyusun perangkat ajar dengan bantuan AI, serta menjual karya di Toko Karya BahasaCerdas.",
  },
  {
    q: "Apa itu AI di BahasaCerdas?",
    a: "AI di BahasaCerdas membantu pekerjaan berulang seperti menyusun perangkat ajar, membuat soal, mengoreksi EYD, dan menilai karangan — agar guru memiliki lebih banyak waktu untuk membimbing murid. AI membantu, guru yang memutuskan.",
  },
  {
    q: "Apakah tersedia untuk siswa?",
    a: "Ya! Siswa bisa bergabung melalui kode kelas yang diberikan guru, atau langsung belajar melalui Arena — Jalur Cerdas, gim, karya, simulasi, dan liga tersedia untuk semua murid.",
  },
  {
    q: "Bagaimana keamanan data saya?",
    a: "Kami menggunakan enkripsi SSL 256-bit dan server yang aman. Data pribadi dan karya Anda dilindungi dan tidak akan dibagikan ke pihak ketiga tanpa izin.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleFAQ(index);
      }
    },
    [toggleFAQ]
  );

  return (
    <section className="relative py-20 lg:py-28 bg-white" aria-labelledby="faq-heading">
      <div className="section-container">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16 lg:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
            <span className="text-xs font-semibold text-primary">FAQ</span>
          </div>
          <h2 id="faq-heading" className="heading-lg text-zinc-900 mb-5">
            Pertanyaan yang{" "}
            <span className="text-primary">Sering Diajukan</span>
          </h2>
          <p className="text-base lg:text-lg text-zinc-500 leading-relaxed">
            Masih ragu? Temukan jawaban untuk pertanyaan yang paling sering ditanyakan.
          </p>
        </motion.div>

        <motion.div
          className="max-w-3xl mx-auto space-y-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
          }}
        >
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            const panelId = `faq-panel-${i}`;
            const buttonId = `faq-button-${i}`;
            return (
              <motion.div
                key={i}
                variants={fadeInUp}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={`rounded-2xl border transition-all duration-300 ${
                  isOpen
                    ? "border-primary/20 bg-primary-light/30 shadow-sm"
                    : "border-zinc-100 bg-zinc-50/50 hover:bg-zinc-50 hover:border-zinc-200"
                }`}
              >
                <h3>
                  <button
                    id={buttonId}
                    onClick={() => toggleFAQ(i)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex items-center justify-between w-full p-5 lg:p-6 text-left focus-ring rounded-2xl"
                  >
                    <span className="text-sm lg:text-base font-semibold text-zinc-900 pr-4">
                      {faq.q}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                        isOpen ? "bg-primary text-white rotate-45" : "bg-zinc-100 text-zinc-400"
                      }`}
                      aria-hidden="true"
                    >
                      <Plus size={16} />
                    </div>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!isOpen}
                  className={isOpen ? "animate-fade-in" : ""}
                >
                  {isOpen && (
                    <div className="px-5 lg:px-6 pb-5 lg:pb-6">
                      <div className="w-8 h-0.5 bg-primary/30 rounded-full mb-4" />
                      <p className="text-sm text-zinc-500 leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="text-center mt-10">
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark transition-colors focus-ring rounded"
          >
            Lihat semua pertanyaan
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
