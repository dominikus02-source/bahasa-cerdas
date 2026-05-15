"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Clock, Award, ChevronRight, GraduationCap, Shield } from "lucide-react";

export default function MuridUKBIPage() {
  const [pakets, setPakets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/kompetensi?limit=20")
      .then(r => r.json())
      .then(d => setPakets((d.data || []).filter((p: any) => p.type?.startsWith("UKBI"))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getSections = (p: any) => {
    try { return JSON.parse(p.sectionsData || p.sections || "[]"); } catch { return []; }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Simulasi UKBI</h1>
        <p className="text-sm text-gray-500 mt-1">Uji Kemahiran Berbahasa Indonesia — standar resmi Kemdikbud</p>
      </div>

      <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-6 mb-8 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={20} />
              <span className="text-sm font-semibold text-violet-200">UKBI • Kemahiran Berbahasa</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Tingkatkan Kemahiran Bahasa Indonesiamu</h2>
            <p className="text-violet-200 text-sm">Simulasi UKBI dengan sistem penilaian resmi</p>
          </div>
          <GraduationCap size={48} className="text-violet-300/50" />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center bg-white/10 rounded-xl p-3">
            <p className="text-2xl font-bold">5</p>
            <p className="text-[10px] text-violet-200">Seksi</p>
          </div>
          <div className="text-center bg-white/10 rounded-xl p-3">
            <p className="text-2xl font-bold">0-800</p>
            <p className="text-[10px] text-violet-200">Skala Skor</p>
          </div>
          <div className="text-center bg-white/10 rounded-xl p-3">
            <p className="text-2xl font-bold">7</p>
            <p className="text-[10px] text-violet-200">Predikat</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Memuat paket UKBI...</div>
      ) : pakets.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500">Belum ada paket UKBI tersedia</p>
          <p className="text-sm text-gray-400 mt-1">Hubungi admin untuk menambahkan paket</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pakets.map((p) => {
            const sections = getSections(p);
            const isPractice = p.mode === "LATIHAN";
            return (
              <Link key={p.id} href={`/kompetisi/${p.id}`}
                className="block bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-violet-200 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isPractice ? "bg-emerald-50 text-emerald-600" : "bg-violet-50 text-violet-600"}`}>
                        {isPractice ? "Latihan" : "Simulasi"}
                      </span>
                      <span className="text-xs text-gray-400">{p.duration} menit</span>
                    </div>
                    <h3 className="font-bold text-gray-900">{p.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{p.description}</p>
                    {sections.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {sections.map((s: any, i: number) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                            {s.name?.replace(/_/g, " ") || `Seksi ${i + 1}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ChevronRight size={20} className="text-gray-300 mt-2 shrink-0" />
                </div>
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Clock size={12} /> {p.duration} menit</span>
                  <span className="flex items-center gap-1"><BookOpen size={12} /> {sections.reduce((s: number, sec: any) => s + (sec.count || 0), 0)} soal</span>
                  {p.passingScore && <span>Lulus: {p.passingScore}</span>}
                </div>
                <div className="mt-3">
                  <div className="flex gap-1">
                    <span className={`text-[10px] font-bold ${isPractice ? "text-emerald-600" : "text-violet-600"}`}>
                      {isPractice ? "Mulai Latihan" : "Mulai Simulasi"} →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
