"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  ClipboardCheck,
  Feather,
  Gamepad2,
  MessageCircle,
  Route,
  ShoppingBag,
  Sparkles,
  Video,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const products = [
  {
    name: "NARA",
    label: "Teman berpikir",
    description: "Teman berpikir, berkata, dan berkarya bersama AI.",
    href: "/ai-bc",
    icon: MessageCircle,
    tone: "bg-bc-accent-soft text-bc-accent-strong",
  },
  {
    name: "JUMPA",
    label: "Ruang temu",
    description: "Bertemu, berdiskusi, dan berbagi gagasan secara daring.",
    href: "/jumpa",
    icon: Video,
    tone: "bg-bc-info-soft text-bc-info",
  },
  {
    name: "MAIN BERSAMA",
    label: "Belajar sambil bermain",
    description: "Asah pengetahuan bahasa lewat permainan interaktif.",
    href: "/main-bersama",
    icon: Gamepad2,
    tone: "bg-bc-violet-soft text-bc-violet",
  },
  {
    name: "JALUR CERDAS",
    label: "Tumbuh bertahap",
    description: "Jelajahi perjalanan untuk mengembangkan kompetensi.",
    href: "/arena/jalur-cerdas",
    icon: Route,
    tone: "bg-bc-accent-soft text-bc-accent-strong",
  },
  {
    name: "BIGT",
    label: "Ukur kompetensi",
    description: "Kenali kemampuan berbahasa melalui tes kompetensi.",
    href: "/murid/bigt",
    icon: ClipboardCheck,
    tone: "bg-bc-info-soft text-bc-info",
  },
  {
    name: "AKSARA",
    label: "Ruang baca dan karya",
    description: "Baca, tulis, dan bagikan gagasan dalam Bahasa Indonesia.",
    href: "/artikel",
    icon: BookOpenText,
    tone: "bg-bc-violet-soft text-bc-violet",
  },
  {
    name: "TOKO KARYA",
    label: "Temukan karya",
    description: "Jelajahi karya dan produk dari komunitas BahasaCerdas.",
    href: "/marketplace",
    icon: ShoppingBag,
    tone: "bg-bc-accent-soft text-bc-accent-strong",
  },
  {
    name: "AKU SASTRAWAN",
    label: "Ruang kreatif",
    description: "Kembangkan ide dan temukan suara kreatifmu lewat tulisan.",
    href: "/murid/katastra",
    icon: Feather,
    tone: "bg-bc-violet-soft text-bc-violet",
  },
] as const;

export default function UmumDashboardPage() {
  return (
    <main className="min-h-screen bg-bc-bg text-bc-text">
      <header className="sticky top-0 z-30 border-b border-bc-line bg-bc-bg/95">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/umum" className="flex min-w-0 items-center gap-3 rounded-bc-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bc-focus">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-bc-icon bg-bc-brand text-bc-on-brand">
              <span className="text-sm font-black tracking-tight">BC</span>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold tracking-tight">BahasaCerdas</span>
              <span className="block truncate text-xs text-bc-text-3">Dunia Bahasa Indonesia</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="ui-btn ui-btn--secondary ui-btn--sm"
            >
              Masuk
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10 lg:px-8 lg:pt-12">
        <section className="relative isolate overflow-hidden rounded-bc-hero border border-bc-line bg-bc-surface shadow-bc-depth">
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 hidden w-[48%] bg-bc-tint md:block" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border border-bc-line md:right-20 md:top-10 md:h-72 md:w-72" />
          <div className="relative grid gap-8 px-5 py-8 sm:px-8 sm:py-10 md:grid-cols-[1.2fr_0.8fr] md:items-center md:px-10 lg:gap-12 lg:px-14 lg:py-14">
            <div className="max-w-2xl">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-bc-line bg-bc-surface-2 px-3 py-1.5 text-xs font-bold text-bc-text-2">
                <Sparkles className="h-3.5 w-3.5 text-bc-accent" aria-hidden="true" />
                EKOSISTEM BAHASA INDONESIA
              </span>
              <h1 className="max-w-xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                Bahasa Indonesia.
                <span className="mt-1 block bg-bc-brand bg-clip-text text-transparent">Potensi tanpa batas.</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-bc-text-2 sm:text-base">
                Temukan ide, perluas wawasan, bertemu dengan orang lain, dan kembangkan karyamu dalam satu dunia bahasa yang terbuka untuk semua.
              </p>
              <Link href="#jelajahi" className="ui-btn ui-btn--primary ui-btn--lg mt-6">
                Jelajahi produk
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="relative hidden min-h-56 items-center justify-center md:flex">
              <div className="absolute h-52 w-52 rounded-full border border-bc-line" />
              <div className="absolute h-40 w-40 rounded-full border border-bc-line" />
              <div className="relative grid h-28 w-28 place-items-center rounded-[30px] bg-bc-brand text-bc-on-brand shadow-bc-2">
                <BookOpenText className="h-12 w-12" strokeWidth={1.5} aria-hidden="true" />
              </div>
              <span className="absolute right-8 top-5 rounded-bc-card border border-bc-line bg-bc-surface px-4 py-3 text-xs font-bold shadow-bc-1">Baca & tulis</span>
              <span className="absolute bottom-5 left-0 rounded-bc-card border border-bc-line bg-bc-surface px-4 py-3 text-xs font-bold shadow-bc-1">Ide & diskusi</span>
              <span className="absolute bottom-1 right-7 rounded-bc-card border border-bc-line bg-bc-surface px-4 py-3 text-xs font-bold shadow-bc-1">Karya & tumbuh</span>
            </div>
          </div>
        </section>

        <section id="jelajahi" className="scroll-mt-24 pt-10 sm:pt-14" aria-labelledby="products-heading">
          <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-bc-accent-strong">Ruang eksplorasi</p>
              <h2 id="products-heading" className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Mau mulai dari mana?</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-bc-text-2">Pilih ruang yang sesuai dengan rasa ingin tahu dan tujuanmu hari ini.</p>
            </div>
            <span className="text-xs font-medium text-bc-text-3">8 ruang untuk dijelajahi</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {products.map((product) => {
              const Icon = product.icon;
              return (
                <Link
                  key={product.name}
                  href={product.href}
                  className="group block h-full rounded-bc-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bc-focus"
                >
                  <Card variant="surface" interactive pad className="flex h-full min-h-[204px] flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-bc-icon ${product.tone}`}>
                        <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-bc-text-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                    </div>
                    <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-bc-text-3">{product.label}</p>
                    <h3 className="mt-1 text-lg font-extrabold tracking-tight">{product.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-bc-text-2">{product.description}</p>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        <footer className="mt-12 border-t border-bc-line pt-5 text-xs leading-5 text-bc-text-3 sm:mt-16">
          BahasaCerdas — Ekosistem Belajar Bahasa Indonesia.
        </footer>
      </div>
    </main>
  );
}
