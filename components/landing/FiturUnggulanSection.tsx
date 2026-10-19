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
    image: "/landing/fitur/main-bersama-sm.jpg",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: Video,
    title: "JUMPA",
    desc: "Video kelas & webinar.",
    href: "/jumpa",
    image: "/landing/fitur/jumpa-sm.jpg",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: Gamepad2,
    title: "Gim Edukasi",
    desc: "Kuis Tempur & arena.",
    href: "/arena/game",
    image: "/landing/fitur/gim-sm-xs.jpg",
    color: "from-rose-500 to-pink-600",
  },
  {
    icon: Map,
    title: "Jalur Cerdas",
    desc: "Belajar langkah demi langkah.",
    href: "/arena/jalur-cerdas",
    image: "/landing/fitur/jalur-sm.jpg",
    color: "from-sky-500 to-blue-600",
  },
  {
    icon: Bot,
    title: "Mentor AI",
    desc: "Pendamping belajar.",
    href: "/arena/ai",
    image: "/landing/fitur/mentor-sm.jpg",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Sparkles,
    title: "AI BC",
    desc: "Asisten untuk guru.",
    href: "/ai-bc",
    image: "/landing/fitur/ai-bc-sm-xs.jpg",
    color: "from-indigo-500 to-violet-600",
  },
];

export default function FiturUnggulanSection() {
  return (
    <section className="py-14 lg:py-20 bg-white" aria-labelledby="fitur-heading">
      <div className="section-container">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 id="fitur-heading" className="text-2xl lg:text-3xl font-bold text-zinc-900">
            Fitur Unggulan
          </h2>
        </motion.div>

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title} variants={fadeInUp}>
                <Link href={f.href} className="group block rounded-2xl overflow-hidden border border-zinc-100 hover:shadow-lg transition-all bg-white">
                  <div className="relative h-36 bg-zinc-100 overflow-hidden">
                    <img src={f.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className={`absolute top-3 left-3 p-2 rounded-lg bg-gradient-to-br ${f.color} text-white`}>
                      <Icon size={16} />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-zinc-900 group-hover:text-primary transition-colors flex items-center justify-between">
                      {f.title}
                      <ArrowRight size={14} className="text-zinc-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">{f.desc}</p>
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
