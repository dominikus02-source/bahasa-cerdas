"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen, Clock, Target, GraduationCap, Brain, Trophy,
  ChevronRight, Headphones, FileText, PenTool, Mic,
  School, Award, Sparkles
} from "lucide-react";

type FilterType = "semua" | "UKBI" | "UKBI_SIMULASI" | "UKBI_LATIHAN" | "UKBI_SMP" | "UKBI_SMA" | "TKA_GURU" | "TKA_UTBK" | "TKA_SMP" | "TKA_SMA";

const PREDIKAT_UKBI = [
  { level: "Istimewa (I)", range: "725-800", color: "from-amber-400 to-yellow-500" },
  { level: "Sangat Unggul (II)", range: "641-724", color: "from-orange-400 to-amber-500" },
  { level: "Unggul (III)", range: "578-640", color: "from-blue-400 to-indigo-500" },
  { level: "Madya (IV)", range: "482-577", color: "from-violet-400 to-purple-500" },
  { level: "Semenjana (V)", range: "405-481", color: "from-slate-400 to-slate-500" },
  { level: "Marginal (VI)", range: "326-404", color: "from-rose-400 to-red-500" },
  { level: "Terbatas (VII)", range: "251-325", color: "from-red-400 to-red-600" },
];

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "UKBI", label: "UKBI" },
  { key: "UKBI_SIMULASI", label: "Simulasi UKBI" },
  { key: "UKBI_LATIHAN", label: "Latihan UKBI" },
  { key: "UKBI_SMP", label: "UKBI SMP" },
  { key: "UKBI_SMA", label: "UKBI SMA" },
  { key: "TKA_GURU", label: "TKA Guru" },
  { key: "TKA_SMP", label: "TKA SMP" },
  { key: "TKA_SMA", label: "TKA SMA" },
  { key: "TKA_UTBK", label: "TKA UTBK" },
];

function getTypeBadgeColor(type: string) {
  if (type === "UKBI_SMP") return "bg-indigo-100 text-indigo-700";
  if (type === "UKBI_SMA") return "bg-violet-100 text-violet-700";
  if (type.includes("UKBI")) return "bg-sky-100 text-sky-700";
  if (type.includes("TKA_GURU")) return "bg-emerald-100 text-emerald-700";
  if (type.includes("TKA_SMA")) return "bg-purple-100 text-purple-700";
  if (type.includes("TKA_SMP")) return "bg-teal-100 text-teal-700";
  if (type.includes("TKA_UTBK")) return "bg-orange-100 text-orange-700";
  return "bg-gray-100 text-gray-700";
}

function getTypeLabel(type: string) {
  if (type === "UKBI_SIMULASI") return "Simulasi UKBI";
  if (type === "UKBI_LATIHAN") return "Latihan UKBI";
  if (type === "UKBI_SMP") return "UKBI SMP";
  if (type === "UKBI_SMA") return "UKBI SMA";
  if (type === "TKA_GURU") return "TKA Guru";
  if (type === "TKA_SMP") return "TKA SMP";
  if (type === "TKA_SMA") return "TKA SMA";
  if (type === "TKA_UTBK") return "TKA UTBK";
  return type;
}

function getIconBoxColor(type: string) {
  if (type === "UKBI_SMP") return "from-indigo-500 to-blue-600";
  if (type === "UKBI_SMA") return "from-violet-500 to-purple-600";
  if (type.includes("UKBI")) return "from-sky-500 to-blue-600";
  if (type.includes("TKA_GURU")) return "from-emerald-500 to-teal-600";
  if (type.includes("TKA_SMA")) return "from-purple-500 to-fuchsia-600";
  if (type.includes("TKA_SMP")) return "from-teal-500 to-emerald-600";
  if (type.includes("TKA_UTBK")) return "from-orange-500 to-amber-600";
  return "from-gray-500 to-slate-600";
}

function getPackageIcon(type: string) {
  if (type.includes("UKBI")) {
    if (type.includes("MENDENGARKAN") || type.includes("Seksi I")) return <Headphones size={20} className="text-white" />;
    if (type.includes("Kaidah") || type.includes("Seksi II")) return <FileText size={20} className="text-white" />;
    if (type.includes("Membaca") || type.includes("Seksi III")) return <BookOpen size={20} className="text-white" />;
    if (type.includes("Menulis") || type.includes("Seksi IV")) return <PenTool size={20} className="text-white" />;
    if (type.includes("Berbicara") || type.includes("Seksi V")) return <Mic size={20} className="text-white" />;
    return <Headphones size={20} className="text-white" />;
  }
  if (type.includes("TKA_GURU")) return <Brain size={20} className="text-white" />;
  if (type.includes("TKA_SMA")) return <GraduationCap size={20} className="text-white" />;
  if (type.includes("TKA_SMP")) return <School size={20} className="text-white" />;
  if (type.includes("TKA_UTBK")) return <Target size={20} className="text-white" />;
  return <BookOpen size={20} className="text-white" />;
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

export default function UKBISimulationPage() {
  const [pakets, setPakets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("semua");

  useEffect(() => {
    fetch("/api/kompetensi?limit=50")
      .then(r => r.json())
      .then(d => setPakets(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = pakets.filter(p => {
    if (filter === "semua") return true;
    if (filter === "UKBI") return p.type.includes("UKBI");
    return p.type === filter;
  });

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen size={24} />
          <h1 className="text-xl font-bold">Simulasi & Latihan UKBI / TKA</h1>
        </div>
        <p className="text-sm text-violet-200 max-w-2xl">
          Latih kemampuan Bahasa Indonesia dan kompetensi Guru dengan soal-soal sesuai standar Kemdikbud.
          UKBI mengukur kemahiran berbahasa, TKA mengukur kompetensi pedagogik & profesional guru.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 p-3 mb-6 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                filter === f.key
                  ? "bg-violet-600 text-white shadow-sm"
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
          {Array.from({ length: 5 }).map((_, i) => (
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
          <p className="text-gray-500">Belum ada paket tersedia</p>
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
                className="block bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-violet-200 transition-all group"
              >
                <div className="flex items-center gap-4">
                  {/* Icon Box */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${iconColor} flex items-center justify-center shrink-0 shadow-sm`}>
                    {getPackageIcon(p.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${badgeColor}`}>
                        {getTypeLabel(p.type)}
                      </span>
                      {isSimulasi && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700">
                          SIMULASI
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm group-hover:text-violet-700 transition-colors">
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
                  <button className="shrink-0 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-1.5">
                    {isSimulasi ? <GraduationCap size={14} /> : <BookOpen size={14} />}
                    Mulai
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Info Predikat UKBI */}
      <div className="mt-8 bg-gradient-to-r from-violet-600 to-purple-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={20} />
          <h2 className="font-bold text-lg">Info Predikat UKBI</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PREDIKAT_UKBI.map(p => (
            <div key={p.level} className={`bg-gradient-to-br ${p.color} rounded-xl p-3 text-center`}>
              <p className="text-xs font-bold text-white">{p.level}</p>
              <p className="text-[10px] text-white/80 mt-0.5">{p.range}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
