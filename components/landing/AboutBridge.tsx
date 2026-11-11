"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { HeartHandshake, ArrowRight } from "lucide-react";

type TeamMember = { name: string; role: string; image?: string; initials: string };

const team: TeamMember[] = [
  { name: "Dominikus Wahyu Heru Cahyadi", role: "Founder & CEO", image: "/founders/dominikus.png", initials: "DW" },
  { name: "Melany Kusumawati", role: "Komisaris Utama", initials: "MK" },
  { name: "Alexander Suryanta", role: "Co-Founder & Head of Content", image: "/founders/alexander.jpg", initials: "AS" },
  { name: "Sugeng Riyanto", role: "Co-Founder & CTO", initials: "SR" },
  { name: "Soleh Ahmad Nugraha", role: "Co-Founder & CBO", initials: "SA" },
  { name: "Dr. B. Widharyanto, M.Pd.", role: "Validator Akademik", initials: "BW" },
];

export default function AboutBridge() {
  return (
    <section className="relative py-16 lg:py-20 bg-white" aria-labelledby="tentang-bridge-heading">
      <div className="section-container">
        <motion.div
          className="rounded-3xl border border-zinc-100 bg-zinc-50/70 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-10 p-8 lg:p-12">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
                <HeartHandshake size={12} className="text-primary" aria-hidden="true" />
                <span className="text-xs font-semibold text-primary">Di Balik BahasaCerdas</span>
              </div>
              <h2 id="tentang-bridge-heading" className="heading-md text-zinc-900 mb-4">
                Ingin mengenal siapa di balik BahasaCerdas?
              </h2>
              <p className="text-base text-zinc-500 leading-relaxed mb-6 max-w-xl">
                Kenali perjalanan, tim, visi, dan nilai yang menjadi dasar BahasaCerdas —
                dari gagasan hingga platform yang terus berkembang bersama guru dan
                siswa Indonesia.
              </p>
              <Link
                href="/tentang"
                className="group inline-flex items-center gap-2 text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl px-6 py-3 transition-all duration-200 shadow-lg hover:shadow-xl focus-ring"
                aria-label="Halaman tentang BahasaCerdas"
              >
                Tentang BahasaCerdas
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {team.map((f) => (
                <div key={f.name} className="text-center">
                  {f.image ? (
                    <div className="relative w-14 h-14 mx-auto rounded-2xl overflow-hidden border-2 border-white shadow-md mb-2">
                      <Image
                        src={f.image}
                        alt={f.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-14 h-14 mx-auto rounded-2xl border-2 border-white shadow-md mb-2 flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundImage: "var(--bc-grad-brand)" }}
                      aria-hidden="true"
                    >
                      {f.initials}
                    </div>
                  )}
                  <p className="text-xs font-semibold text-zinc-800 leading-tight">{f.name}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{f.role}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}