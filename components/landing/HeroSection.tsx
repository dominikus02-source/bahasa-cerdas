"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, Play, ChevronRight, Star } from "lucide-react";

const avatarUsers = [
  "https://api.dicebear.com/9.x/avataaars/svg?seed=teacher1&backgroundColor=c0aede",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=teacher2&backgroundColor=d1d4f9",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=teacher3&backgroundColor=ffd5dc",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=teacher4&backgroundColor=ffdfbf",
];

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
                {avatarUsers.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt="Guru"
                    className="w-8 h-8 rounded-full border-2 border-white bg-zinc-100"
                    loading="lazy"
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
              {/* Main Dashboard - Guru */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-zinc-900/10 border border-zinc-200 bg-white">
                <div className="aspect-[4/3] relative overflow-hidden bg-zinc-50">
                  <Image
                    src="/dasborguruBC.png"
                    alt="Dashboard Guru BahasaCerdas"
                    fill
                    className="object-cover object-top"
                  />
                </div>
              </div>

              {/* Floating Card - Murid Preview */}
              <div className="absolute -bottom-4 -left-4 w-56 rounded-xl overflow-hidden shadow-lg shadow-zinc-900/10 border border-zinc-200 bg-white animate-float">
                <div className="aspect-[16/9] relative bg-zinc-50">
                  <Image
                    src="/dasbormuridBC.png"
                    alt="Dashboard Murid BahasaCerdas"
                    fill
                    className="object-cover object-top"
                  />
                </div>
                <div className="px-3 py-2 bg-white">
                  <p className="text-xs font-semibold text-zinc-700">Dashboard Murid</p>
                </div>
              </div>

              {/* Floating Badge */}
              <div className="absolute -top-3 -right-3 px-4 py-2 rounded-xl bg-white border border-zinc-100 shadow-lg shadow-zinc-900/5 animate-float" style={{ animationDelay: "1.5s" }}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-zinc-700">Live • 234 online</span>
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
