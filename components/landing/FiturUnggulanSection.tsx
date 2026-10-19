"use client";

import Link from "next/link";
import {
  Users,
  Video,
  Gamepad2,
  Map,
  Bot,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/motion";

const features = [
  {
    icon: Users,
    title: "Main Bersama",
    desc: "Belajar bareng teman sekelas secara langsung. Kerjakan soal, diskusi, dan saling bantu.",
    href: "/main-bersama",
    color: "from-violet-500 to-purple-600",
    chip: "Kelas · Live",
  },
  {
    icon: Video,
    title: "JUMPA",
    desc: "Ruang video untuk mengajar, diskusi, dan webinar. Hingga 200 peserta untuk Premium.",
    href: "/jumpa",
    color: "from-emerald-500 to-teal-600",
    chip: "Video · Webinar",
  },
  {
    icon: Gamepad2,
    title: "Gim Edukasi",
    desc: "Kuis Tempur dan gim lainnya. Belajar sambil bermain, skor dan peringkat langsung terlihat.",
    href: "/arena/game",
    color: "from-rose-500 to-pink-600",
    chip: "Kuis Tempur · Arena",
  },
  {
    icon: Map,
    title: "Jalur Cerdas",
    desc: "Alur belajar terstruktur dari dasar hingga mahir. Murid tahu langkah berikutnya.",
    href: "/arena/jalur-cerdas",
    color: "from-sky-500 to-blue-600",
    chip: "Belajar · Terarah",
  },
  {
    icon: Bot,
    title: "Mentor AI",
    desc: "Pendamping belajar yang menjawab pertanyaan dan memberi arahan sesuai materi.",
    href: "/arena/ai",
    color: "from-amber-500 to-orange-600",
    chip: "AI · Pendamping",
  },
  {
    icon: Sparkles,
    title: "AI BC",
    desc: "Bantuan AI untuk guru: buat Rencana Pembelajaran, soal HOTS, koreksi, dan analisis teks.",
    href: "/ai-bc",
    color: "from-indigo-500 to-violet-600",
    chip: "Guru · Asisten",
  },
];

export default function FiturUnggulanSection() {
  return (
    <section className="relative py-16 lg:py-24 bg-gradient-to-b from-white to-zinc-50" aria-labelledby="fitur-heading">
      <div className="section-container">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
            Fitur Unggulan
          </span>
          <h2 id="fitur-heading" className="text-2xl lg:text-3xl font-bold text-zinc-900 mb-3">
            Semua yang dibutuhkan, dalam satu tempat
          </h2>
          <p className="text-zinc-500">
            Dari belajar bareng, video kelas, gim, hingga bantuan AI — semuanya terhubung.
          </p>
        </motion.div>

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title} variants={fadeInUp}>
                <Link
                  href={f.href}
                  className="group block rounded-2xl border border-zinc-100 bg-white p-5 hover:border-zinc-200 hover:shadow-lg transition-all"
                >
                  <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${f.color} text-white mb-4`}>
                    <Icon size={20} />
                  </div>
                  <h3 className="font-semibold text-zinc-900 mb-1 group-hover:text-primary transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-sm text-zinc-500 leading-relaxed mb-3">{f.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">{f.chip}</span>
                    <ArrowRight size={14} className="text-zinc-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
