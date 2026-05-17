"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen, Clock, Target, GraduationCap, Brain, Trophy,
  Headphones, FileText, PenTool, Mic, Award
} from "lucide-react";

type FilterType = "semua" | "UKBI_GURU" | "TKA_GURU";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "UKBI_GURU", label: "UKBI Guru" },
  { key: "TKA_GURU", label: "TKA Guru" },
];

function getTypeBadgeColor(type: string) {
  if (type.includes("SIMULASI")) return "bg-violet-100 text-violet-700";
  if (type.includes("UKBI_GURU")) return "bg-emerald-100 text-emerald-700";
  if (type.includes("TKA_GURU")) return "bg-blue-100 text-blue-700";
  return "bg-emerald-100 text-emerald-700";
}

function getIconBoxColor(type: string) {
  if (type.includes("SIMULASI")) return "from-violet-500 to-purple-600";
  if (type.includes("UKBI_GURU")) return "from-emerald-500 to-teal-600";
  if (type.includes("TKA_GURU")) return "from-blue-500 to-indigo-600";
  return "from-emerald-500 to-teal-600";
}

function getPackageIcon(type: string) {
  if (type.includes("UKBI_GURU")) return <BookOpen size={20} className="text-white" />;
  if (type.includes("TKA_GURU")) return <Brain size={20} className="text-white" />;
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

export default function GuruUKBIPage() {
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

  // Filter: only show NEW GURU packages, hide student packages and old Guru packages
  const filtered = pakets.filter(p => {
    // Hide student packages (SMP/SMA)
    if (["UKBI_SMP", "UKBI_SMA", "UKBI_LATIHAN_SMP", "UKBI_LATIHAN_SMA", "TKA_SMP", "TKA_SMA"].includes(p.type)) {
      return false;
    }
    // Hide old TKA_GURU (without _SIMULASI/_LATIHAN suffix)
    if (p.type === "TKA_GURU" && !p.type.includes("_SIMULASI") && !p.type.includes("_LATIHAN")) {
      return false;
    }
    // Hide old UKBI_SIMULASI and UKBI_LATIHAN (general)
    if (p.type === "UKBI_SIMULASI" || p.type === "UKBI_LATIHAN") {
      return false;
    }
    // Show only new Guru packages
    if (filter === "semua") return p.type.includes("UKBI_GURU") || p.type.includes("TKA_GURU");
    if (filter === "UKBI_GURU") return p.type.includes("UKBI_GURU");
    if (filter === "TKA_GURU") return p.type.includes("TKA_GURU");
    return false;
  });

  const getTypeLabel = (type: string) => {
    if (type === "UKBI_GURU_SIMULASI") return "UKBI Guru";
    if (type === "UKBI_GURU_LATIHAN") return "Latihan UKBI";
    if (type === "TKA_GURU_SIMULASI") return "TKA Guru";
    if (type === "TKA_GURU_LATIHAN") return "Latihan TKA";
    return type;
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap size={24} />
          <h1 className="text-xl font-bold">Latihan UKBI & TKA Guru</h1>
        </div>
        <p className="text-sm text-emerald-200 max-w-2xl">
          Latih kemampuan berbahasa Indonesia dan kompetensi pedagogik-profesional untuk persiapan UKG dan sertifikasi guru.
          UKBI menguji kemahiran berbahasa, TKA menguji kompetensi mengajar sesuai standar Kemdikbud.
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
          <Link href="/guru/buat-tka" className="mt-3 inline-block text-sm text-emerald-600 font-semibold hover:underline">
            Buat Paket Baru →
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
                href={`/guru/ukbi/${p.id}`}
                className="block bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-emerald-200 transition-all group"
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