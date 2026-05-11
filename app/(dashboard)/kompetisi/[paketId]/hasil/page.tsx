"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Award, CheckCircle, XCircle, ChevronLeft, RefreshCw, BookOpen, Clock } from "lucide-react";

const PREDICAT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "Istimewa": { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700" },
  "Sangat Unggul": { bg: "bg-green-50", border: "border-green-300", text: "text-green-700" },
  "Unggul": { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700" },
  "Madya": { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700" },
  "Semenjana": { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-700" },
  "Marginal": { bg: "bg-red-50", border: "border-red-300", text: "text-red-700" },
  "Terbatas": { bg: "bg-red-100", border: "border-red-400", text: "text-red-800" },
  "A": { bg: "bg-green-50", border: "border-green-300", text: "text-green-700" },
  "B": { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700" },
  "C": { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700" },
  "D": { bg: "bg-red-50", border: "border-red-300", text: "text-red-700" },
};

interface Result {
  id: string;
  paketId: string;
  paketTitle?: string;
  paket?: { title: string; type: string };
  attemptNumber: number;
  totalScore: number;
  rawScore: number;
  maxScore: number;
  percentage: number;
  predikat: string;
  status: string;
  sectionScores?: any;
  startedAt: string;
  finishedAt: string;
  timeSpent: number;
  certificate?: {
    id: string;
    certificateNo: string;
    pdfUrl?: string;
  };
}

export default function HasilPage({ params }: { params: Promise<{ paketId: string }> }) {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [paketId, setPaketId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(p => setPaketId(p.paketId));
  }, [params]);

  useEffect(() => {
    if (!paketId) return;
    const fetchResult = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/kompetensi/${paketId}/submit`);
        const data = await res.json();
        if (data.result) {
          setResult(data.result);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [paketId]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} menit ${s} detik`;
  };

  const predikatStyle = result ? PREDICAT_COLORS[result.predikat] || { bg: "bg-slate-50", border: "border-slate-300", text: "text-slate-700" } : null;
  const passed = result?.status === "COMPLETED";
  const title = result?.paket?.title || result?.paketTitle || "Hasil Tes";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Memuat hasil...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-8 shadow-sm max-w-md">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="font-bold text-xl mb-2">Hasil tidak ditemukan</h2>
          <Link href="/kompetisi/latihan" className="mt-4 inline-block px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">
            Kembali ke Latihan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/kompetisi/latihan" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-4 text-sm">
            <ChevronLeft className="w-4 h-4" /> Kembali ke Latihan
          </Link>
          <div className="flex items-center gap-3">
            {passed ? <Award className="w-10 h-10" /> : <BookOpen className="w-10 h-10" />}
            <div>
              <h1 className="text-2xl font-bold">Hasil: {title}</h1>
              <p className="text-indigo-100 text-sm">Percobaan #{result.attemptNumber}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className={`rounded-2xl border-2 p-6 text-center ${predikatStyle?.bg} ${predikatStyle?.border}`}>
          {passed ? (
            <CheckCircle className={`w-16 h-16 ${predikatStyle?.text} mx-auto mb-3`} />
          ) : (
            <XCircle className={`w-16 h-16 ${predikatStyle?.text} mx-auto mb-3`} />
          )}
          <p className={`text-4xl font-black ${predikatStyle?.text} mb-1`}>{result.predikat}</p>
          <p className="text-slate-500 text-sm">Skor: {result.totalScore} / {result.maxScore || 100}</p>
          {result.percentage > 0 && (
            <div className="mt-3 w-full bg-white/50 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${passed ? "bg-green-500" : "bg-orange-500"}`}
                style={{ width: `${Math.min(result.percentage, 100)}%` }}
              />
            </div>
          )}
          {result.certificate && (
            <div className="mt-4 bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Nomor Sertifikat</p>
              <p className="font-mono font-bold text-slate-800 text-sm">{result.certificate.certificateNo}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 grid grid-cols-2 gap-4">
          <div className="text-center">
            <Clock className="w-5 h-5 text-slate-400 mx-auto mb-1" />
            <p className="text-xs text-slate-500">Waktu Pengerjaan</p>
            <p className="font-bold text-slate-800">{formatTime(result.timeSpent || 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Persentase</p>
            <p className="font-bold text-slate-800 text-lg">{result.percentage.toFixed(1)}%</p>
          </div>
        </div>

        {result.sectionScores && Object.keys(result.sectionScores).length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h3 className="font-bold text-slate-800 mb-3">Skor per Seksi</h3>
            <div className="space-y-2">
              {Object.entries(result.sectionScores).map(([section, data]: [string, any]) => (
                <div key={section} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-sm font-medium text-slate-700">{section}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-white rounded-full h-2">
                      <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${data.percentage}%` }} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 w-16 text-right">{data.score}/{data.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link
            href={`/kompetisi/${paketId}`}
            className="flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Coba Lagi
          </Link>
          <Link
            href="/kompetisi/latihan"
            className="flex items-center justify-center gap-2 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Paket Lainnya
          </Link>
        </div>
      </div>
    </div>
  );
}