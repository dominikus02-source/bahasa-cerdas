"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, Play, ChevronRight, Star } from "lucide-react";

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      containerRef.current.style.setProperty("--mouse-x", String(x));
      containerRef.current.style.setProperty("--mouse-y", String(y));
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section className="relative min-h-[90vh] lg:min-h-screen flex items-center overflow-hidden bg-gradient-to-b from-white via-white to-zinc-50">
      {/* Batik Background Decor */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <div
          className="absolute top-0 right-0 w-[600px] lg:w-[800px] h-[600px] lg:h-[800px] opacity-[0.04]"
          style={{
            backgroundImage: "url('/batik bg bc.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: "scaleX(-1)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] lg:w-[600px] h-[400px] lg:h-[600px] opacity-[0.03]"
          style={{
            backgroundImage: "url('/batik-header-profile-bc.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      </div>

      {/* Subtle Grid */}
      <div className="absolute inset-0 bg-grid opacity-40" />

      {/* Hero Content */}
      <div
        ref={containerRef}
        className="section-container relative z-10 pt-24 lg:pt-32 pb-16 lg:pb-24"
        style={
          {
            "--mouse-x": "0",
            "--mouse-y": "0",
          } as React.CSSProperties
        }
      >
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - Text Content */}
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-6 animate-fade-in-up">
              <Sparkles size={14} className="text-primary" />
              <span className="text-xs font-semibold text-primary">
                Platform Terlengkap untuk Guru Bahasa Indonesia
              </span>
            </div>

            {/* Headline */}
            <h1 className="heading-xl text-zinc-900 mb-6 leading-[1.08] animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              Platform Terlengkap{" "}
              <span className="text-primary">Guru Bahasa Indonesia</span>
              <br />
              <span className="text-zinc-500 text-3xl sm:text-4xl lg:text-5xl block mt-2">
                MGMP + AI + Toko Karya
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-base lg:text-lg text-zinc-500 leading-relaxed mb-8 max-w-xl animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              Hemat waktu persiapan mengajar hingga 10x lipat dengan AI canggih,
              akses ribuan materi MGMP berkualitas, jual karya mengajar Anda,
              dan bergabung dengan komunitas guru terbesar di Indonesia.
            </p>

            {/* Social Proof */}
            <div className="flex items-center gap-3 mb-8 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-white bg-zinc-200"
                  />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-zinc-400 font-medium">
                  Dipercaya oleh{" "}
                  <span className="text-zinc-700 font-semibold">10.000+</span> guru
                  di seluruh Indonesia
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              <Link
                href="/register"
                className="group relative inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl transition-all duration-200 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5"
              >
                Coba Gratis 14 Hari
                <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/demo"
                className="group inline-flex items-center gap-2.5 px-8 py-3.5 text-base font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-all duration-200"
              >
                <Play size={18} className="text-primary" />
                Tonton Demo 2 Menit
              </Link>
            </div>
          </div>

          {/* Right - Dashboard Preview */}
          <div className="relative animate-fade-in-up hidden lg:block" style={{ animationDelay: "0.35s" }}>
            <div className="relative">
              {/* Main Dashboard Mockup */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-zinc-900/10 border border-zinc-200 bg-white">
                <div className="aspect-[4/3] bg-gradient-to-br from-zinc-50 to-white relative overflow-hidden">
                  <Image
                    src="/logo.png"
                    alt="BahasaCerdas Dashboard"
                    fill
                    className="object-contain p-16 opacity-10"
                  />
                  {/* Decorative UI Elements */}
                  <div className="absolute inset-0 p-6">
                    {/* Top bar */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <div className="w-4 h-4 rounded bg-primary" />
                      </div>
                      <div className="flex gap-1.5">
                        <div className="w-16 h-2.5 rounded-full bg-zinc-200" />
                        <div className="w-20 h-2.5 rounded-full bg-zinc-100" />
                        <div className="w-14 h-2.5 rounded-full bg-zinc-100" />
                      </div>
                    </div>
                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-3 rounded-xl bg-white border border-zinc-100">
                          <div className="w-12 h-2 rounded-full bg-zinc-200 mb-2" />
                          <div className="w-20 h-3 rounded-full bg-primary/20" />
                          <div className="w-10 h-2 rounded-full bg-zinc-100 mt-1.5" />
                        </div>
                      ))}
                    </div>
                    {/* Content area */}
                    <div className="flex gap-3">
                      <div className="flex-1 p-3 rounded-xl bg-white border border-zinc-100">
                        <div className="w-16 h-2 rounded-full bg-zinc-200 mb-3" />
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-lg bg-zinc-100" />
                            <div className="w-24 h-2 rounded-full bg-zinc-100" />
                            <div className="w-8 h-2 rounded-full bg-primary/10 ml-auto" />
                          </div>
                        ))}
                      </div>
                      <div className="w-24 p-3 rounded-xl bg-white border border-zinc-100">
                        <div className="w-12 h-2 rounded-full bg-zinc-200 mb-3" />
                        <div className="w-8 h-8 rounded-full bg-primary/10 mx-auto mb-2" />
                        <div className="w-14 h-2 rounded-full bg-zinc-100 mx-auto" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Card 1 */}
              <div className="absolute -bottom-4 -left-4 w-48 p-4 rounded-xl bg-white border border-zinc-100 shadow-lg shadow-zinc-900/5 animate-float">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/30" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-900">RPP Siap Pakai</p>
                    <p className="text-xs text-zinc-400">Generated by AI</p>
                  </div>
                </div>
              </div>

              {/* Floating Card 2 */}
              <div className="absolute -top-4 -right-4 w-44 p-4 rounded-xl bg-white border border-zinc-100 shadow-lg shadow-zinc-900/5 animate-float" style={{ animationDelay: "1.5s" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-violet-500/30" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-900">Bank Soal</p>
                    <p className="text-xs text-zinc-400">1.200+ siap pakai</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient Transition */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}
