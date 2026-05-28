"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ChevronDown } from "lucide-react";

const navLinks = [
  { href: "/fitur", label: "Fitur" },
  { href: "/marketplace", label: "Toko Karya" },
  { href: "/video-belajar", label: "Video" },
  { href: "/artikel", label: "Artikel" },
  { href: "/tentang", label: "Tentang" },
];

export default function PageNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredDropdown, setHoveredDropdown] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-zinc-100 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="section-container">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="relative w-8 h-8 lg:w-9 lg:h-9">
              <Image
                src="/logo.png"
                alt="BahasaCerdas"
                fill
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base lg:text-lg text-zinc-900 leading-tight">
                Bahasa<span className="text-primary">Cerdas</span>
              </span>
              <span className="text-[10px] lg:text-[11px] text-zinc-400 font-medium leading-tight -mt-0.5 hidden sm:block">
                Platform Guru Bahasa Indonesia
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-4 py-2 text-sm text-zinc-600 hover:text-primary font-medium rounded-xl hover:bg-primary-light/50 transition-all duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:text-primary transition-colors"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="relative px-6 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl transition-all duration-200 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
            >
              Daftar Gratis
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden relative z-50 p-2.5 rounded-xl hover:bg-zinc-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X size={20} className="text-zinc-700" />
            ) : (
              <Menu size={20} className="text-zinc-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 top-0 z-40 bg-white animate-fade-in">
          <div className="flex flex-col h-full pt-24 px-6 pb-8">
            <nav className="flex-1 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3.5 text-base font-medium text-zinc-700 hover:text-primary hover:bg-primary-light/50 rounded-xl transition-all"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="space-y-3 pt-6 border-t border-zinc-100">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center px-4 py-3 text-sm font-semibold text-zinc-700 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center px-4 py-3 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
              >
                Daftar Gratis
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
