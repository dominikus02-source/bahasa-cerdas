"use client";

import Link from "next/link";
import { BookOpenCheck, Ear, FileText, Globe2 } from "lucide-react";

const ITEMS = [
  {
    href: "/murid/simulasi/ukbi",
    label: "Simulasi UKBI",
    desc: "Ukur kemampuan Bahasa Indonesiamu",
    cta: "Mulai",
    icon: Ear,
    accent: "from-violet-500 to-purple-600 shadow-violet-500/30",
  },
  {
    href: "/murid/simulasi/tka",
    label: "Simulasi TKA",
    desc: "Latihan menghadapi Tes Kemampuan Akademik",
    cta: "Mulai",
    icon: BookOpenCheck,
    accent: "from-[var(--px-royal)] to-[var(--px-royal-2)] shadow-[var(--px-royal)]/30",
  },
  {
    href: "/murid/bigt",
    label: "BIGT",
    desc: "Latihan bahasa Indonesia tingkat internasional",
    cta: "Mulai",
    icon: Globe2,
    accent: "from-emerald-400 to-teal-600 shadow-emerald-500/30",
  },
  {
    href: "/murid/dokumen-latihan",
    label: "Hasil Latihan",
    desc: "Lihat hasil dan riwayat latihanmu",
    cta: "Lihat Hasil",
    icon: FileText,
    accent: "from-amber-400 to-orange-500 shadow-amber-500/30",
  },
];

export function SimulasiUjianSection() {
  return (
    <section aria-label="Simulasi dan ujian">
      <div className="flex items-end justify-between mb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--px-royal-2)]">
            Simulasi &amp; Ujian
          </p>
          <h2 className="text-lg font-extrabold text-[var(--px-text)]">Simulasi &amp; Ujian</h2>
          <p className="text-xs text-[var(--px-text-faint)]">Bersiap mengukur kemampuanmu</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="group px-card px-5 py-5 relative overflow-hidden ring-1 ring-white/10 hover:bg-white/[0.08] transition-colors flex flex-col gap-3"
            >
              <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-white/5 blur-2xl pointer-events-none" />
              <span
                className={`relative w-11 h-11 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg ${item.accent}`}
              >
                <Icon size={20} className="text-white" />
              </span>
              <div className="relative">
                <h3 className="text-sm font-extrabold text-[var(--px-text)]">{item.label}</h3>
                <p className="text-xs text-[var(--px-text-faint)] mt-1 leading-relaxed">{item.desc}</p>
              </div>
              <div className="relative mt-auto pt-1">
                <Link
                  href={item.href}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-full px-5 py-2.5 shadow-lg shadow-violet-500/30 transition-transform group-hover:scale-[1.03]"
                  aria-label={`${item.cta} ${item.label}`}
                >
                  {item.cta}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
