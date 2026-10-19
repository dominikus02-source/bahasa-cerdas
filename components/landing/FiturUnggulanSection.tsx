"use client";

import Link from "next/link";
import { Users, Video, Gamepad2, Map, Bot, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/motion";

const features = [
  {
    icon: Users,
    title: "Main Bersama",
    desc: "Belajar bareng teman sekelas.",
    href: "/main-bersama",
    color: "bg-violet-100 text-violet-600",
  },
  {
    icon: Video,
    title: "JUMPA",
    desc: "Video kelas & webinar.",
    href: "/jumpa",
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    icon: Gamepad2,
    title: "Gim Edukasi",
    desc: "Kuis Tempur & arena.",
    href: "/arena/game",
    color: "bg-rose-100 text-rose-600",
  },
  {
    icon: Map,
    title: "Jalur Cerdas",
    desc: "Belajar langkah demi langkah.",
    href: "/arena/jalur-cerdas",
    color: "bg-sky-100 text-sky-600",
  },
  {
    icon: Bot,
    title: "Mentor AI",
    desc: "Pendamping belajar.",
    href: "/arena/ai",
    color: "bg-amber-100 text-amber-600",
  },
  {
    icon: Sparkles,
    title: "AI BC",
    desc: "Asisten untuk guru.",
    href: "/ai-bc",
    color: "bg-indigo-100 text-indigo-600",
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
                  <div className={`flex-shrink-0 p-3 rounded-xl ${f.color}`}>
                    <Icon size={22} />
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
