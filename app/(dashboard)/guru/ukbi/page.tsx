"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Clock, Award, ChevronRight, GraduationCap } from "lucide-react";

export default function GuruUKBIPage() {
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
        <h1 className="text-2xl font-bold text-gray-900">UKBI untuk Guru</h1>
        <p className="text-sm text-gray-600 mt-1">Latihan UKBI untuk persiapan sertifikasi guru</p>
      </div>

      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 mb-8 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap size={20} />
              <span className="text-sm font-semibold text-emerald-200">UKBI • Persiapan Sertifikasi</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Uji Kemahiran Berbahasa Indonesia</h2>
            <p className="text-emerald-200 text-sm">Standar Kemdikbud — 7 peringkat kemahiran</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Memuat paket UKBI...</div>
      ) : pakets.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500">Belum ada paket UKBI</p>
          <Link href="/guru/pengaturan" className="mt-3 inline-block text-sm text-emerald-600 font-semibold hover:underline">
            Hubungi admin untuk menambahkan paket
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pakets.map((p) => {
            const sections = getSections(p);
            const isPractice = p.mode === "LATIHAN";
            return (
              <Link key={p.id} href={`/kompetisi/${p.id}`}
                className="block bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-emerald-200 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isPractice ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}>
                    {isPractice ? "Latihan" : "Simulasi"}
                  </span>
                  <span className="text-xs text-gray-400">{p.duration} menit</span>
                </div>
                <h3 className="font-bold text-gray-900">{p.title}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.description}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><BookOpen size={12} /> {sections.reduce((s: number, sec: any) => s + (sec.count || 0), 0)} soal</span>
                  {p.passingScore && <span>Lulus: {p.passingScore}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
