"use client";

import Link from "next/link";
import { Users, MessageCircle, Calendar, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import BatikDecor from "@/components/landing/batik-decor";
import { fadeInUp, staggerContainer } from "@/lib/motion";

const features = [
  {
    icon: MessageCircle,
    title: "Forum Diskusi Aktif",
    description: "Diskusikan materi, metode mengajar, dan berbagi pengalaman dengan sesama guru.",
    color: "bg-red-50 text-primary",
  },
  {
    icon: Calendar,
    title: "Webinar & Workshop",
    description: "Ikuti webinar dan workshop gratis dari praktisi pendidikan terkemuka di Indonesia.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Users,
    title: "MGMP Digital",
    description: "Musyawarah Guru Mata Pelajaran secara digital. Kolaborasi lintas sekolah dan kota.",
    color: "bg-emerald-50 text-emerald-600",
  },
];

export default function KomunitasSection() {
  return (
    <section className="relative py-20 lg:py-28 bg-zinc-50 overflow-hidden">
      {/* Non-blocking batik decor */}
      <div
        className="absolute left-0 top-0 w-[500px] h-full opacity-[0.015] pointer-events-none select-none"
        style={{
          backgroundImage: "url('/batik bg bc.png')",
          backgroundSize: "cover",
          backgroundPosition: "left center",
        }}
        aria-hidden="true"
      />

      <div className="section-container relative z-10">
        <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <motion.div
            className="lg:col-span-3"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
              <Users size={12} className="text-primary" />
              <span className="text-xs font-semibold text-primary">
                Komunitas MGMP
              </span>
            </div>
            <h2 className="heading-lg text-zinc-900 mb-5">
              Bergabung dengan{" "}
              <span className="text-primary">Sesama Guru</span>{" "}
              Bahasa Indonesia
            </h2>
            <p className="text-base lg:text-lg text-zinc-500 leading-relaxed mb-8 max-w-xl">
              Komunitas guru Bahasa Indonesia terbesar di Indonesia. Tempat
              berbagi, belajar, dan tumbuh bersama.
            </p>

            {/* Feature List */}
            <motion.div
              className="space-y-5 mb-8"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={f.title}
                    variants={fadeInUp}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="flex items-start gap-4"
                  >
                    <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-zinc-900 mb-1">{f.title}</h4>
                      <p className="text-sm text-zinc-500">{f.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            <Link
              href="/guru/komunitas"
              className="group inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl transition-all duration-200 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
            >
              Gabung Komunitas Sekarang
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

          {/* Right - Stats Card */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          >
            <div className="relative p-8 lg:p-10 rounded-2xl bg-white border border-zinc-100 shadow-xl shadow-zinc-900/5">
              <div className="absolute -top-3 -right-3 w-full h-full rounded-2xl bg-zinc-900 -z-10" />
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-4xl lg:text-5xl font-bold text-zinc-900">10.000+</p>
                  <p className="text-sm text-zinc-500">Guru Terdaftar</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-xl bg-zinc-50">
                    <p className="text-2xl font-bold text-zinc-900">500+</p>
                    <p className="text-xs text-zinc-400">Sekolah Aktif</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-zinc-50">
                    <p className="text-2xl font-bold text-zinc-900">34</p>
                    <p className="text-xs text-zinc-400">Provinsi</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-xl bg-zinc-50">
                    <p className="text-2xl font-bold text-zinc-900">200+</p>
                    <p className="text-xs text-zinc-400">Webinar/Tahun</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-zinc-50">
                    <p className="text-2xl font-bold text-zinc-900">4.8</p>
                    <p className="text-xs text-zinc-400">Skor Kepuasan</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
