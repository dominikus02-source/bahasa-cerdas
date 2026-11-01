"use client";

import Link from "next/link";
import { Users, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { JumpaIcon, NaraIcon, GimIcon, JalurCerdasIcon } from "@/components/shared/FeatureIcons";

const features = [
  {
    icon: Users,
    title: "Main Bersama",
    desc: "Belajar bareng teman sekelas.",
    href: "/main-bersama",
    color: "bg-violet-100 text-violet-600",
    custom: false,
  },
  {
    icon: JumpaIcon,
    title: "JUMPA",
    desc: "Video kelas & webinar.",
    href: "/jumpa",
    color: "",
    custom: true,
  },
  {
    icon: GimIcon,
    title: "Gim Edukasi",
    desc: "Kuis Tempur & arena.",
    href: "/arena/game",
    color: "",
    custom: true,
  },
  {
    icon: JalurCerdasIcon,
    title: "Jalur Cerdas",
    desc: "Belajar langkah demi langkah.",
    href: "/arena/jalur-cerdas",
    color: "",
    custom: true,
  },
  {
    icon: NaraIcon,
    title: "NARA",
    desc: "Teman ngobrol untuk belajar.",
    href: "/arena/ai",
    color: "",
    custom: true,
  },
  {
    icon: Sparkles,
    title: "NARA untuk Guru",
    desc: "Rekan guru menyiapkan pembelajaran.",
    href: "/ai-bc",
    color: "bg-indigo-100 text-indigo-600",
    custom: false,
  },
];

export default function FiturUnggulanSection() {
  return (
    <section className="py-12 lg:py-16 bg-white" aria-labelledby="fitur-heading">
      <div className="section-container">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 id="fitur-heading" className="text-2xl lg:text-3xl font-bold text-zinc-900">
            Fitur Unggulan
          </h2>
        </motion.div>

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3"
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
                  className="group flex items-center gap-4 rounded-xl border border-zinc-100 bg-white p-4 hover:border-zinc-200 hover:shadow-md transition-all"
                >
                  <div className={f.custom ? "flex-shrink-0" : `flex-shrink-0 p-3 rounded-xl ${f.color}`}>
                    {f.custom ? <Icon size={48} /> : <Icon size={22} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-zinc-900 group-hover:text-primary transition-colors">
                      {f.title}
                    </h3>
                    <p className="text-sm text-zinc-500 truncate">{f.desc}</p>
                  </div>
                  <ArrowRight size={16} className="text-zinc-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
