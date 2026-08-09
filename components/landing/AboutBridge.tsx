"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { HeartHandshake, ArrowRight } from "lucide-react";

const founders = [
  { name: "Dominikus Wahyu", role: "Founder & CEO", image: "/founders/dominikus.png" },
  { name: "Alexander Suryanta", role: "Co-Founder & Konten", image: "/founders/alexander.jpg" },
  { name: "Washadi", role: "Co-Founder & Komunitas", image: "/founders/washadi.png" },
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
          <div className="grid lg:grid-cols-2 items-center gap-10 p-8 lg:p-12">
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
            <div className="grid grid-cols-3 gap-4">
              {founders.map((f) => (
                <div key={f.name} className="text-center">
                  <div className="relative w-14 h-14 mx-auto rounded-2xl overflow-hidden border-2 border-white shadow-md mb-2">
                    <Image
                      src={f.image}
                      alt={f.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
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