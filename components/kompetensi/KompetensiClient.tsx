"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BookOpen, Award, Clock, ChevronRight, Trophy, Star, TrendingUp, GraduationCap, FileText, CheckCircle } from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; Icon: React.ComponentType<{ className?: string }>; color: string }> = {
  UKBI: { label: "UKBI", Icon: BookOpen, color: "bg-blue-500" },
  UKBI_SIMULASI: { label: "Simulasi UKBI", Icon: GraduationCap, color: "bg-indigo-500" },
  UKBI_LATIHAN: { label: "Latihan UKBI", Icon: FileText, color: "bg-cyan-500" },
  TKA_GURU: { label: "TKA Guru", Icon: Award, color: "bg-emerald-500" },
  TKA_UTBK: { label: "TKA UTBK", Icon: Trophy, color: "bg-amber-500" },
};

const PREDICAT_COLORS: Record<string, string> = {
  "Istimewa": "text-yellow-600 bg-yellow-50 border-yellow-200",
  "Sangat Unggul": "text-green-600 bg-green-50 border-green-200",
  "Unggul": "text-emerald-600 bg-emerald-50 border-emerald-200",
  "Madya": "text-blue-600 bg-blue-50 border-blue-200",
  "Semenjana": "text-orange-600 bg-orange-50 border-orange-200",
  "Marginal": "text-red-600 bg-red-50 border-red-200",
  "Terbatas": "text-red-700 bg-red-100 border-red-300",
  "A": "text-green-600 bg-green-50 border-green-200",
  "B": "text-blue-600 bg-blue-50 border-blue-200",
  "C": "text-yellow-600 bg-yellow-50 border-yellow-200",
  "D": "text-red-600 bg-red-50 border-red-200",
};

interface Paket {
  id: string;
  title: string;
  description: string | null;
  type: string;
  mode: string;
  duration: number;
  passingScore: number;
  passingGrade: string;
  totalQuestions: number;
  isPremium: boolean;
  thumbnailUrl: string | null;
  attemptLimit: number;
  myResults: any[];
  myBestCert: any | null;
}

export default function KompetensiClient() {
  const [pakets, setPakets] = useState<Paket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);

  const fetchPakets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("type", activeTab);
      params.set("page", page.toString());

      const res = await fetch(`/api/kompetensi?${params.toString()}`);
      const data = await res.json();
      if (data.data) {
        setPakets(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch packages:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    fetchPakets();
  }, [fetchPakets]);

  const tabs = [
    { key: "all", label: "Semua" },
    { key: "UKBI", label: "UKBI" },
    { key: "UKBI_SIMULASI", label: "Simulasi UKBI" },
    { key: "UKBI_LATIHAN", label: "Latihan UKBI" },
    { key: "TKA_GURU", label: "TKA Guru" },
  ];

  const getTypeConfig = (type: string) => TYPE_CONFIG[type] || TYPE_CONFIG["UKBI"];
  const formatDuration = (mins: number) => `${mins} menit`;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-8 h-8" />
            <h1 className="text-2xl font-bold">Simulasi & Latihan UKBI / TKA</h1>
          </div>
          <p className="text-indigo-100 text-sm max-w-2xl">
            Latih kemampuan Bahasa Indonesia dan kompetensi Guru dengan soal-soal sesuai standar Kemdikbud. 
            UKBI mengukur kemahiran berbahasa, TKA mengukur kompetensi pedagogik & profesional guru.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.key
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Memuat paket...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pakets.map((paket) => {
              const typeConfig = getTypeConfig(paket.type);
              const bestResult = paket.myResults?.[0];
              const attempts = paket.myResults?.length || 0;
              const hasCert = paket.myBestCert;
              
              return (
                <div key={paket.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all">
                  <div className="p-5">
                    <div className="flex flex-col md:flex-row items-start gap-4">
                      <div className="flex items-start gap-4 w-full md:w-auto md:flex-1">
                        <div className={`w-14 h-14 ${typeConfig.color} rounded-xl flex items-center justify-center shrink-0`}>
                          <typeConfig.Icon className="w-6 h-6 text-white" />
                        </div>
                      
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 ${typeConfig.color} text-white text-xs font-bold rounded-full`}>
                            {typeConfig.label}
                          </span>
                          {paket.mode === "SIMULASI" && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
                              SIMULASI
                            </span>
                          )}
                          {hasCert && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                              <Award className="w-3 h-3" /> Selesai
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-slate-900 text-lg mb-1">{paket.title}</h3>
                        {paket.description && (
                          <p className="text-sm text-slate-500 line-clamp-2 mb-3">{paket.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {formatDuration(paket.duration)}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" /> {paket.totalQuestions} soal
                          </span>
                          {paket.passingScore > 0 && (
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3.5 h-3.5" /> Passing: {paket.passingGrade} ({paket.passingScore}%)
                            </span>
                          )}
                          {attempts > 0 && (
                            <span className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-yellow-500" /> {attempts}x mencoba
                            </span>
                          )}
                        </div>

                        {bestResult && (
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-slate-500">Skor terbaik:</span>
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${PREDICAT_COLORS[bestResult.predikat] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                              {bestResult.predikat} ({bestResult.totalScore})
                            </span>
                            {bestResult.status === "COMPLETED" && <CheckCircle className="w-4 h-4 text-green-500" />}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                        {bestResult?.status === "COMPLETED" ? (
                          <>
                            <Link
                              href={`/kompetisi/${paket.id}/hasil`}
                              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors"
                            >
                              <Award className="w-4 h-4" />
                              Lihat Hasil
                            </Link>
                            <Link
                              href={`/kompetisi/${paket.id}?retry=1`}
                              className="text-center text-xs text-indigo-600 hover:underline font-medium"
                            >
                              Coba Lagi
                            </Link>
                          </>
                        ) : (
                          <>
                            <Link
                              href={`/kompetisi/${paket.id}`}
                              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                            >
                              {paket.mode === "SIMULASI" ? <GraduationCap className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                              Mulai
                            </Link>
                            {bestResult && (
                              <Link
                                href={`/kompetisi/${paket.id}/hasil`}
                                className="text-center text-xs text-indigo-600 hover:underline font-medium"
                              >
                                Lihat Riwayat
                              </Link>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {pakets.length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
                <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="font-bold text-slate-600 mb-2">Belum ada paket tersedia</h3>
                <p className="text-sm text-slate-400">Paket simulasi dan latihan akan segera ditambahkan.</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Info Predikat UKBI
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {[
              { predikat: "Istimewa (I)", range: "725-800", color: "bg-yellow-500/20 border-yellow-400/30" },
              { predikat: "Sangat Unggul (II)", range: "641-724", color: "bg-green-500/20 border-green-400/30" },
              { predikat: "Unggul (III)", range: "578-640", color: "bg-emerald-500/20 border-emerald-400/30" },
              { predikat: "Madya (IV)", range: "482-577", color: "bg-blue-500/20 border-blue-400/30" },
              { predikat: "Semenjana (V)", range: "405-481", color: "bg-orange-500/20 border-orange-400/30" },
              { predikat: "Marginal (VI)", range: "326-404", color: "bg-red-500/20 border-red-400/30" },
              { predikat: "Terbatas (VII)", range: "251-325", color: "bg-red-700/20 border-red-600/30" },
            ].map((item) => (
              <div key={item.predikat} className={`${item.color} border rounded-xl p-3 text-center`}>
                <p className="font-bold text-sm">{item.predikat}</p>
                <p className="text-xs opacity-70">{item.range}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}