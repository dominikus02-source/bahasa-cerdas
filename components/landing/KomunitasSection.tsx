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
    description: "Webinar dan workshop gratis seputar pengajaran Bahasa Indonesia, terjadwal berkala.",
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
Ruang bagi guru Bahasa Indonesia untuk berbagi, belajar, dan
berkembang bersama sesama pengajar.
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
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
              <div className="text-center pb-1">
                <div className="text-5xl font-display font-bold text-zinc-900 leading-none">
                  Aktif
                </div>
                <div className="text-sm text-zinc-500 mt-2">
                  Forum diskusi sudah live di platform
                </div>
                <div className="inline-flex items-center gap-1.5 mt-3 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full border border-green-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live sekarang
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
