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
    // Bahasa warna fungsional (keluarga asesmen yang sama, bukan rainbow):
    // cyan/royal/teal/slate — aksen ikon muted pada chip transparan.
    accent: "text-cyan-600 dark:text-cyan-300 bg-cyan-500/10",
  },
  {
    href: "/murid/simulasi/tka",
    label: "Simulasi TKA",
    desc: "Latihan menghadapi Tes Kemampuan Akademik",
    cta: "Mulai",
    icon: BookOpenCheck,
    accent: "text-[var(--px-royal)] bg-[var(--px-royal)]/10",
  },
  {
    href: "/murid/bigt",
    label: "BIGT",
    desc: "Latihan bahasa Indonesia tingkat internasional",
    cta: "Mulai",
    icon: Globe2,
    accent: "text-teal-600 dark:text-teal-300 bg-teal-500/10",
  },
  {
    href: "/murid/dokumen-latihan",
    label: "Hasil Latihan",
    desc: "Lihat hasil dan riwayat latihanmu",
    cta: "Lihat Hasil",
    icon: FileText,
    accent: "text-slate-500 dark:text-slate-300 bg-slate-400/10",
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
          <h2 className="text-xl font-semibold tracking-tight text-[var(--px-text)]">Simulasi &amp; Ujian</h2>
          <p className="text-xs text-[var(--px-text-faint)]">Bersiap mengukur kemampuanmu</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 border-t section-rule">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="group section-rule border-b px-2 py-4 hover:bg-slate-900/[0.025] dark:hover:bg-white/[0.05] transition-colors flex flex-col gap-2"
            >
              <span
                className={`w-8 h-8 flex items-center justify-center rounded-lg ${item.accent}`}
              >
                <Icon size={16} strokeWidth={1.8} />
              </span>
              <div className="relative">
                <h3 className="text-sm font-medium text-[var(--px-text)]">{item.label}</h3>
                <p className="text-xs text-[var(--px-text-faint)] mt-1 leading-relaxed">{item.desc}</p>
              </div>
              <div className="relative mt-auto pt-1">
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--px-royal)] hover:underline"
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
