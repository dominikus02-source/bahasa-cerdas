"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Target, Clock, BookOpen, Award, GraduationCap } from "lucide-react";

function getTotalQuestions(p: any) {
  if (p.totalQuestions) return p.totalQuestions;
  try {
    const sections = JSON.parse(p.sectionsData || p.sections || "[]");
    return sections.reduce((s: number, sec: any) => s + (sec.count || 0), 0);
  } catch {
    return 0;
  }
}

export default function MuridTKAUTBKPage() {
  const [pakets, setPakets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/kompetensi?limit=20")
      .then(r => r.json())
      .then(d => setPakets(d.data?.filter((p: any) => p.type === "TKA_UTBK") || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Target size={24} />
          <h1 className="text-xl font-bold">TKA UTBK</h1>
        </div>
        <p className="text-sm text-orange-200 max-w-2xl">
          Tes Kompetensi Akademik untuk persiapan UTBK/SNBP. Latih kemampuan literasi dan penalaranmu.
        </p>
      </div>

      {/* Package List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
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
      ) : pakets.length === 0 ? (
        <div className="text-center py-16">
          <Target size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500">Belum ada paket TKA UTBK tersedia</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pakets.map(p => {
            const totalQ = getTotalQuestions(p);
            const isSimulasi = p.mode === "SIMULASI";

            return (
              <Link
                key={p.id}
                href={`/kompetisi/${p.id}`}
                className="block bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-orange-200 transition-all group"
              >
                <div className="flex items-center gap-4">
                  {/* Icon Box */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shrink-0 shadow-sm">
                    <Target size={20} className="text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-orange-100 text-orange-700">
                        TKA UTBK
                      </span>
                      {isSimulasi && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700">
                          SIMULASI
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm group-hover:text-orange-700 transition-colors">
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
                          <Award size={12} /> Passing: {p.passingGrade} ({p.passingScore}%)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mulai Button */}
                  <button className="shrink-0 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-1.5">
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
