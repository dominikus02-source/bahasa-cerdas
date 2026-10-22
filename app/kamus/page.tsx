"use client";

import { BookOpen, ExternalLink, Search, Sparkles, ArrowRight, Home } from "lucide-react";
import Link from "next/link";

export default function KamusPage() {
  return (
    <div className="min-h-screen bg-bc-bg flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-6 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <BookOpen size={20} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-xl">Kamus Bahasa Indonesia</h1>
              <p className="text-primary-foreground/80 text-sm">Cari kata di KBBI Online</p>
            </div>
          </div>
          <Link href="/" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 rounded-xl text-primary-foreground font-medium hover:bg-white/20 transition-all">
            <Home size={16} /> Beranda
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center">
          {/* Icon */}
          <div className="w-24 h-24 rounded-3xl bg-primary flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/30">
            <Search size={48} className="text-primary-foreground" />
          </div>

          <h2 className="text-3xl font-extrabold text-bc-text mb-3 tracking-tight">Kamus KBBI</h2>
          <p className="text-bc-text-2 mb-8 leading-relaxed">
            Cari arti kata, sinonim, antonim, dan definisi lengkap di Kamus Besar Bahasa Indonesia Online
          </p>

          {/* KBBI Button */}
          <a
            href="https://kbbi.web.id/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-primary text-primary-foreground font-bold py-4 px-8 rounded-2xl text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <ExternalLink size={20} /> Buka KBBI Online
          </a>

          <p className="text-xs text-bc-text-3 mt-4">Akan dibuka di tab baru</p>

          {/* AI BC Suggestion */}
          <div className="mt-10 bg-bc-surface rounded-2xl p-6 border border-bc-line shadow-sm">
            <div className="flex items-center gap-2 mb-3 justify-center">
              <Sparkles size={18} className="text-primary" />
              <span className="text-sm font-semibold text-bc-text">Butuh bantuan?</span>
            </div>
            <p className="text-xs text-bc-text-2 mb-4">Tanya AI BC tentang arti kata, sinonim, atau contoh kalimat</p>
            <Link href="/ai-bc" className="inline-flex items-center gap-2 text-sm text-primary font-semibold hover:text-primary-dark transition-colors">
              Chat AI BC <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
