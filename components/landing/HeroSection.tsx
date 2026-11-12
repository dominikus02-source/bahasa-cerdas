"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { formatSocialProofNumber } from "@/lib/format-social-proof";

interface SocialProofInput {
  users: number | null;
  students: number | null;
  teachers: number | null;
  works: number | null;
  updatedAt?: string | null;
}

const TRUST_STATS = [
  { key: "users", label: "Pengguna", note: "dari umum, murid, hingga guru" },
  { key: "students", label: "Murid", note: "aktif belajar" },
  { key: "teachers", label: "Guru", note: "mengajar dan membimbing" },
  { key: "works", label: "Karya Siswa", note: "puisi, cerpen, pantun, dan lainnya" },
] as const;

type StatKey = (typeof TRUST_STATS)[number]["key"];

const ROLE_CHIPS = [
  { href: "/register?role=umum", label: "Umum" },
  { href: "/register?role=murid", label: "Murid" },
  { href: "/register?role=guru", label: "Guru" },
] as const;

const PRODUCTS = ["AKSARA", "NARA", "BIGT", "Jalur Cerdas", "Arena", "MAIN BERSAMA", "Toko Karya", "MGMP"];

export default function HeroSection({
  initial = null,
}: {
  initial?: SocialProofInput | null;
}) {
  const [data, setData] = useState<SocialProofInput | null>(initial);

  const refresh = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("/api/public/social-proof", {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timer);
      if (!res.ok) return;
      const json = (await res.json()) as SocialProofInput;
      if (json && typeof json === "object") setData(json);
    } catch {
      // Biarkan nilai awal — tidak pernah mengarang angka.
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const hasData =
    data !== null &&
    typeof data === "object" &&
    (typeof data.users === "number" ||
      typeof data.students === "number" ||
      typeof data.teachers === "number" ||
      typeof data.works === "number");

  const valueFor = (key: StatKey): string =>
    hasData && typeof data?.[key] === "number"
      ? formatSocialProofNumber(data[key] as number)
      : "—";

  return (
    <section
      className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-bc-surface pt-20"
      aria-labelledby="hero-heading"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full opacity-70 blur-3xl sm:h-[36rem] sm:w-[36rem]"
          style={{ background: "color-mix(in srgb, var(--clr-accent) 32%, transparent)" }}
        />
        <div
          className="absolute -left-20 top-32 h-[22rem] w-[22rem] rounded-full opacity-80 blur-3xl"
          style={{ background: "color-mix(in srgb, var(--clr-violet) 28%, transparent)" }}
        />
        <div
          className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full opacity-60 blur-3xl"
          style={{ background: "color-mix(in srgb, var(--clr-info) 24%, transparent)" }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-2/3 opacity-90"
          style={{ backgroundImage: "var(--bc-grad-tint)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "url('/brand/batik-accent.webp')",
            backgroundSize: "720px",
            backgroundRepeat: "repeat",
          }}
        />
      </div>

      <div className="section-container relative z-10 min-w-0 w-full py-8 sm:py-10 lg:py-12">
        <motion.div
          className="mx-auto min-w-0 max-w-6xl"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <p className="mb-4 text-[11px] font-extrabold uppercase tracking-[0.18em] text-bc-accent sm:mb-5 sm:text-xs">
            Untuk umum, murid, dan guru
          </p>

          <motion.h1
            id="hero-heading"
            variants={fadeInUp}
            className="mb-5 min-w-0 break-words font-sans text-[clamp(1.85rem,6.4vw,4rem)] font-extrabold leading-[1.05] tracking-tight text-bc-text"
          >
            <span className="block">Bahasa menghubungkan</span>
            <span
              className="mt-1 block bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--bc-grad-brand)" }}
            >
              gagasan, manusia, dan masa depan.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="mb-6 max-w-2xl text-base font-medium leading-relaxed text-bc-text-2 sm:mb-8 sm:text-lg"
          >
            Satu tempat untuk belajar, berlatih, bermain, dan berkarya dalam Bahasa Indonesia, untuk siapa saja.
          </motion.p>

          <motion.div variants={fadeInUp} className="mb-8 flex min-w-0 flex-col gap-3 sm:mb-9 sm:gap-4">
            <Link
              href="/register"
              className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-bc-ctl px-8 py-3.5 text-base font-semibold text-bc-on-brand bg-bc-brand shadow-bc-glow transition-all duration-200 hover:-translate-y-0.5 focus-ring sm:w-auto sm:self-start"
              aria-label="Mulai gratis, daftar sekarang"
            >
              Mulai Gratis
              <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2">
              <span className="text-xs font-medium text-bc-text-3 sm:text-sm">Atau mulai sebagai:</span>
              <div className="flex min-w-0 flex-wrap items-center gap-1.5" role="group" aria-label="Mulai sebagai">
                {ROLE_CHIPS.map((chip, i) => (
                  <span key={chip.href} className="inline-flex min-w-0 items-center gap-1.5">
                    {i > 0 && (
                      <span className="text-bc-text-3" aria-hidden="true">
                        ·
                      </span>
                    )}
                    <Link
                      href={chip.href}
                      className="inline-flex min-h-9 items-center justify-center rounded-full border border-bc-border bg-bc-surface/80 px-3.5 py-1.5 text-sm font-semibold text-bc-text backdrop-blur-sm transition-all duration-200 hover:border-bc-accent hover:text-bc-accent-strong focus-ring"
                    >
                      {chip.label}
                    </Link>
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.dl
            variants={fadeInUp}
            className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-4 border-t border-bc-line pt-5 sm:grid-cols-4 sm:gap-6 sm:pt-6"
            aria-label="Angka kepercayaan BahasaCerdas"
          >
            {TRUST_STATS.map((s) => (
              <div key={s.key} className="min-w-0">
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-sans text-2xl font-extrabold leading-none tracking-tight text-bc-text sm:text-3xl lg:text-4xl">
                  {valueFor(s.key)}
                </dd>
                <div className="mt-1.5 text-xs font-semibold text-bc-text sm:text-sm">{s.label}</div>
                <div className="text-[11px] leading-snug text-bc-text-3">{s.note}</div>
              </div>
            ))}
          </motion.dl>

          <p className="mt-6 hidden min-w-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-bc-text-3 sm:block">
            {PRODUCTS.join("  ·  ")}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
