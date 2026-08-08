"use client";

import { useState } from "react";
import Link from "next/link";
import { Clapperboard, Newspaper, ChevronLeft, Video, FileText } from "lucide-react";

import VideoBelajarPage from "@/app/(dashboard)/guru/video-belajar/page";
import GuruArtikelPage from "@/app/(dashboard)/guru/artikel/page";

type Tab = "video" | "artikel";

/**
 * Media Pembelajaran — konsolidasi domain Video Pembelajaran + Artikel.
 * Route lama /guru/video-belajar dan /guru/artikel TETAP hidup (tidak dihapus);
 * halaman ini hanya menjadi satu destination dengan navigasi internal tab.
 */
export default function MediaPembelajaranPage() {
  const [tab, setTab] = useState<Tab>("video");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/guru/beranda" className="p-2 hover:bg-slate-100 rounded-lg">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clapperboard className="w-7 h-7 text-emerald-600" />
            Media Pembelajaran
          </h1>
          <p className="text-sm text-slate-500">Video belajar dan artikel dalam satu tempat</p>
        </div>
      </div>

      {/* Navigasi internal — bukan submenu sidebar */}
      <div className="flex gap-1.5 mb-5 bg-white border border-slate-100 rounded-2xl p-1.5 w-fit">
        <button
          type="button"
          onClick={() => setTab("video")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            tab === "video"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Video className="w-4 h-4" />
          Video
        </button>
        <button
          type="button"
          onClick={() => setTab("artikel")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            tab === "artikel"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Newspaper className="w-4 h-4" />
          Artikel
        </button>
      </div>

      {tab === "video" ? <VideoBelajarPage /> : <GuruArtikelPage />}
    </div>
  );
}
