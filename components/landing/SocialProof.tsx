"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, GraduationCap, Star, PenLine } from "lucide-react";
import { fadeInUp, staggerContainer, sectionProps, itemProps } from "@/lib/motion";
import { motion } from "framer-motion";
import { formatSocialProofNumber } from "@/lib/format-social-proof";

interface SocialProofInput {
  users: number | null;
  students: number | null;
  teachers: number | null;
  works: number | null;
  updatedAt?: string | null;
}

const STATS = [
  { key: "users", icon: Users, label: "Pengguna", note: "guru, murid, dan sekolah" },
  { key: "students", icon: GraduationCap, label: "Murid", note: "belajar aktif di platform" },
  { key: "teachers", icon: Star, label: "Guru", note: "mengajar dan berkarya" },
  { key: "works", icon: PenLine, label: "Karya Siswa", note: "puisi, cerpen, pantun, dan lainnya" },
] as const;

type StatKey = (typeof STATS)[number]["key"];

const fallbackLabel = "—";

/**
 * Angka diambil dari /api/public/social-proof (data database terverifikasi).
 * Jika angka belum tersedia (DB tidak terjangkau), tampilkan label saja —
 * tidak pernah menampilkan angka karangan.
 *
 * `initial` berisi snapshot server-side (Redis/DB) agar angka tampil tanpa
 * menunggu fetch client; fetch client tetap berjalan untuk menyegarkan data.
 */
export default function SocialProof({
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
      // Gagal → biarkan nilai awal (label saja) — tidak pernah mengarang angka.
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
      : fallbackLabel;

  return (
    <section
      className="relative py-10 lg:py-14 bg-white border-y border-zinc-100"
      aria-label="Aktivitas pengguna BahasaCerdas"
    >
      <div className="section-container">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Sudah digunakan oleh guru dan murid Bahasa Indonesia · Data diperbarui secara berkala
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-200 rounded-2xl overflow-hidden border border-zinc-200"
          variants={staggerContainer}
          {...sectionProps}
        >
          {STATS.map((s) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.key}
                {...itemProps}
                className="bg-white px-6 py-6 text-center flex flex-col items-center"
              >
                <div className="w-11 h-11 rounded-xl bg-primary-light flex items-center justify-center mb-3">
                  <Icon size={20} className="text-primary" aria-hidden="true" />
                </div>
                <div className="text-2xl lg:text-3xl font-display font-bold text-zinc-900 leading-none mb-1.5">
                  {valueFor(s.key)}
                </div>
                <div className="text-sm font-semibold text-zinc-700 mb-0.5">{s.label}</div>
                <div className="text-[11px] text-zinc-400">{s.note}</div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}