"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { HeartHandshake, ArrowRight } from "lucide-react";

type TeamMember = { name: string; role: string; image?: string; initials: string };

const coreTeam: TeamMember[] = [
  { name: "Dominikus Wahyu Heru Cahyadi", role: "Founder & CEO", image: "/founders/dominikus.png", initials: "DW" },
  { name: "Alexander Suryanta", role: "Co-Founder & CLO (Chief Learning Officer)", image: "/founders/alexander.jpg", initials: "AS" },
  { name: "Sugeng Riyanto", role: "CTO", image: "/founders/sugeng.jpg", initials: "SR" },
  { name: "Soleh Ahmad Nugraha", role: "CBO", image: "/founders/soleh.jpg", initials: "SA" },
];

const advisors: TeamMember[] = [
  { name: "Melany Kusumawati", role: "Advisor", image: "/founders/melany.jpg", initials: "MK" },
  { name: "Dr. B. Widharyanto, M.Pd.", role: "Advisor", image: "/founders/widharyanto.jpg", initials: "BW" },
];


function BridgePerson({ member }: { member: TeamMember }) {
  return (
    <div className="text-center">
      {member.image ? (
        <div className="relative w-14 h-14 mx-auto rounded-2xl overflow-hidden border-2 border-white shadow-md mb-2">
          <Image
            src={member.image}
            alt={member.name}
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
          {member.initials}
        </div>
      )}
      <p className="text-xs font-semibold text-bc-text leading-tight">{member.name}</p>
      <p className="text-[10px] text-bc-text-3 mt-0.5">{member.role}</p>
    </div>
  );
}

export default function AboutBridge() {
  return (
    <section className="relative py-16 lg:py-20 bg-bc-surface" aria-labelledby="tentang-bridge-heading">
      <div className="section-container">
        <motion.div
          className="rounded-3xl border border-bc-border bg-bc-surface-2 overflow-hidden"
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
              <h2 id="tentang-bridge-heading" className="heading-md text-bc-text mb-4">
                Ingin mengenal siapa di balik BahasaCerdas?
              </h2>
              <p className="text-base text-bc-text-2 leading-relaxed mb-6 max-w-xl">
                Kenali perjalanan, tim, visi, dan nilai yang menjadi dasar BahasaCerdas —
                dari gagasan hingga platform yang terus berkembang bersama guru dan
                siswa Indonesia.
              </p>
              <Link
                href="/tentang"
                className="group inline-flex items-center gap-2 text-sm font-semibold text-white bg-bc-brand hover:opacity-90 rounded-xl px-6 py-3 transition-all duration-200 shadow-lg hover:shadow-xl focus-ring"
                aria-label="Halaman tentang BahasaCerdas"
              >
                Tentang BahasaCerdas
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {coreTeam.map((f) => (
                  <BridgePerson key={f.name} member={f} />
                ))}
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-bc-text-3 text-center">
                Advisor
              </p>
              <div className="grid grid-cols-2 gap-4">
                {advisors.map((f) => (
                  <BridgePerson key={f.name} member={f} />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}