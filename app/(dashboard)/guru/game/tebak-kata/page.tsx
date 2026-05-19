"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, Maximize, Minimize } from "lucide-react";
import Link from "next/link";
import TebakKataGame from "@/components/game/TebakKata";

export default function GuruTebakKataPage() {
  const [fullscreen, setFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  }, []);

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 ${fullscreen ? "p-0" : "p-8"}`}>
      {!fullscreen && (
        <div className="max-w-5xl mx-auto mb-6">
          <Link href="/guru/game" className="text-blue-600 hover:underline text-sm flex items-center gap-1 mb-4">
            ← Kembali ke Menu Gim
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tebak Kata</h1>
              <p className="text-gray-500 text-sm mt-1">Deskripsi muncul, tebak namanya! Semakin cepat, semakin tinggi skor.</p>
            </div>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              {fullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </button>
          </div>
        </div>
      )}
      <TebakKataGame />
    </div>
  );
}