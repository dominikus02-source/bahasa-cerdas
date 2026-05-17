"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen, Clock, Target, GraduationCap, Brain, Trophy,
  Headphones, FileText, PenTool, Mic, Award
} from "lucide-react";

type FilterType = "semua" | "UKBI_SIMULASI" | "UKBI_LATIHAN";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "UKBI_SIMULASI", label: "Simulasi UKBI" },
  { key: "UKBI_LATIHAN", label: "Latihan UKBI" },
];

function getTypeBadgeColor(type: string) {
  if (type.includes("SIMULASI")) return "bg-violet-100 text-violet-700";
  return "bg-emerald-100 text-emerald-700";
}

function getIconBoxColor(type: string) {
  if (type.includes("SIMULASI")) return "from-violet-500 to-purple-600";
  return "from-sky-500 to-blue-600";
}

function getPackageIcon(type: string) {
  if (type.includes("MENDENGARKAN")) return <Headphones size={20} className="text-white" />;
  if (type.includes("Kaidah")) return <FileText size={20} className="text-white" />;
  if (type.includes("Membaca")) return <BookOpen size={20} className="text-white" />;
  if (type.includes("Menulis")) return <PenTool size={20} className="text-white" />;
  if (type.includes("Berbicara")) return <Mic size={20} className="text-white" />;
  return <Headphones size={20} className="text-white" />;
}

function getTotalQuestions(p: any) {
  if (p.totalQuestions) return p.totalQuestions;
  try {
    const sections = JSON.parse(p.sectionsData || p.sections || "[]");
    return sections.reduce((s: number, sec: any) => s + (sec.count || 0), 0);
  } catch {
    return 0;
  }
}

export default function GuruUKBIPage() {
  const [pakets, setPakets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("semua");

  useEffect(() => {
    fetch("/api/kompetensi?limit=20")
      .then(r => r.json())
      .then(d => setPakets((d.data || []).filter((p: any) => p.type?.startsWith("UKBI"))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = pakets.filter(p => {
    if (filter === "semua") return true;
    return p.type === filter;
  });

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap size={24} />
          <h1 className="text-xl font-bold">UKBI untuk Guru</h1>
        </div>
        <p className="text-sm text-emerald-200 max-w-2xl">
          Latihan UKBI untuk persiapan sertifikasi guru. Standar Kemdikbud — 7 peringkat kemahiran.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 p-3 mb-6">
        <div className="flex gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f.key
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Package List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-200" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-5 bg-gray-200 rounded w-2/3 mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500">Belum ada paket UKBI</p>
          <Link href="/guru/pengaturan" className="mt-3 inline-block text-sm text-emerald-600 font-semibold hover:underline">
            Hubungi admin untuk menambahkan paket
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const totalQ = getTotalQuestions(p);
            const isSimulasi = p.mode === "SIMULASI";
            const iconColor = getIconBoxColor(p.type);
            const badgeColor = getTypeBadgeColor(p.type);

            return (
              <Link
                key={p.id}
                href={`/kompetisi/${p.id}`}
                className="block bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-emerald-200 transition-all group"
              >
                <div className="flex items-center gap-4">
                  {/* Icon Box */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${iconColor} flex items-center justify-center shrink-0 shadow-sm`}>
                    {getPackageIcon(p.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${badgeColor}`}>
                        {isSimulasi ? "Simulasi UKBI" : "Latihan UKBI"}
                      </span>
                      {isSimulasi && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700">
                          SIMULASI
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm group-hover:text-emerald-700 transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{p.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {p.duration} menit
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen size={12} /> {totalQ} soal
                      </span>
                      {p.passingScore > 0 && (
                        <span className="flex items-center gap-1">
                          <Award size={12} /> Passing: {p.passingGrade} ({p.passingScore})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mulai Button */}
                  <button className="shrink-0 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5">
                    {isSimulasi ? <GraduationCap size={14} /> : <BookOpen size={14} />}
                    Mulai
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
