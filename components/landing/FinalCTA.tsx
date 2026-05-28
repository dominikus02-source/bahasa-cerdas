import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Shield, Clock } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="relative py-20 lg:py-32 bg-zinc-900 overflow-hidden">
      {/* Batik Background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "url('/batik bg bc.png')",
          backgroundSize: "400px",
          backgroundRepeat: "repeat",
        }}
      />

      {/* Radial Gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent opacity-60" />

      <div className="section-container relative z-10 text-center">
        <div className="max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 mb-6">
            <Sparkles size={14} className="text-gold-400" />
            <span className="text-xs font-semibold text-gold-400">
              Gratis 14 Hari — Tanpa Kartu Kredit
            </span>
          </div>

          {/* Headline */}
          <h2 className="heading-lg text-white mb-6">
            Siap Merevolusi Cara{" "}
            <span className="text-gold-400">Anda Mengajar</span>?
          </h2>

          <p className="text-base lg:text-lg text-zinc-400 leading-relaxed mb-10 max-w-xl mx-auto">
            Bergabung dengan 10.000+ guru Bahasa Indonesia yang sudah
            menggunakan BahasaCerdas. Hemat waktu, tingkatkan kualitas
            pembelajaran.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-zinc-900 bg-white hover:bg-zinc-100 rounded-xl transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
            >
              Mulai Gratis 14 Hari
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-all duration-200"
            >
              Masuk ke Akun Saya
            </Link>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-6 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <Shield size={14} className="text-emerald-400" />
              Data Aman & Terenkripsi
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-emerald-400" />
              Batal Kapan Saja
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-400" />
              No Credit Card Required
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
