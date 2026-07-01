import { CheckCircle2, XCircle, Clock, Award, BarChart3, ArrowLeft, RefreshCw, FileText } from "lucide-react";
import Link from "next/link";

interface ResultData {
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
  sectionScores?: Record<string, any>;
  startedAt: string;
  finishedAt: string;
  timeSpent: number;
  certificate?: { id: string; certificateNo: string };
}

const PREDIKAT_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  Istimewa: { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700", icon: "🏆" },
  "Sangat Unggul": { bg: "bg-green-50", border: "border-green-300", text: "text-green-700", icon: "🥇" },
  Unggul: { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700", icon: "🥈" },
  Madya: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700", icon: "🥉" },
  Semenjana: { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-700", icon: "📗" },
  Marginal: { bg: "bg-red-50", border: "border-red-300", text: "text-red-700", icon: "📙" },
  Terbatas: { bg: "bg-red-100", border: "border-red-400", text: "text-red-800", icon: "📕" },
  A: { bg: "bg-green-50", border: "border-green-300", text: "text-green-700", icon: "A" },
  B: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700", icon: "B" },
  C: { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700", icon: "C" },
  D: { bg: "bg-red-50", border: "border-red-300", text: "text-red-700", icon: "D" },
};

interface TestResultPanelProps {
  result: ResultData;
  paketId: string;
}

export default function TestResultPanel({ result, paketId }: TestResultPanelProps) {
  const style = PREDIKAT_STYLES[result.predikat] || { bg: "bg-slate-50", border: "border-slate-300", text: "text-slate-700", icon: "📋" };
  const passed = result.status === "COMPLETED";
  const title = result.paket?.title || result.paketTitle || "Hasil Latihan";

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s} detik`;
    return `${m} menit ${s} detik`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Back link */}
        <Link
          href="/kompetisi/latihan"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Latihan
        </Link>

        {/* Hero score */}
        <div className={`rounded-2xl sm:rounded-3xl border-2 ${style.bg} ${style.border} p-5 sm:p-8 text-center`}>
          <div className="text-3xl sm:text-5xl mb-2">{style.icon}</div>
          <h1 className={`text-2xl sm:text-4xl font-black ${style.text} mb-1`}>
            {result.predikat}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mb-1">
            Skor: {result.totalScore} / {result.maxScore || 100}
          </p>
          <p className="text-slate-400 text-[10px] sm:text-xs">
            Percobaan #{result.attemptNumber}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 p-3 sm:p-4 text-center shadow-sm">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-xs sm:text-sm font-bold text-slate-800">
              {result.sectionScores
                ? Object.values(result.sectionScores).reduce((s: number, v: any) => s + (v.benar || 0), 0)
                : 0}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-400">Benar</p>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 p-3 sm:p-4 text-center shadow-sm">
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 mx-auto mb-1" />
            <p className="text-xs sm:text-sm font-bold text-slate-800">
              {result.sectionScores
                ? Object.values(result.sectionScores).reduce((s: number, v: any) => s + (v.salah || 0), 0)
                : 0}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-400">Salah</p>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 p-3 sm:p-4 text-center shadow-sm">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 mx-auto mb-1" />
            <p className="text-xs sm:text-sm font-bold text-slate-800">
              {result.percentage.toFixed(0)}%
            </p>
            <p className="text-[10px] sm:text-xs text-slate-400">Nilai</p>
          </div>
        </div>

        {/* Section scores */}
        {result.sectionScores && Object.keys(result.sectionScores).length > 0 && (
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
              <h3 className="font-bold text-sm sm:text-base text-slate-800">Skor per Bagian</h3>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {Object.entries(result.sectionScores).map(([section, data]: [string, any]) => {
                const benar = data.benar ?? 0;
                const total = data.total ?? 0;
                const pct = total > 0 ? Math.round((benar / total) * 100) : 0;
                return (
                  <div key={section}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs sm:text-sm font-medium text-slate-700 truncate mr-2">
                        {section}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-500 shrink-0">
                        {benar}/{total}
                      </span>
                    </div>
                    <div className="w-full h-2 sm:h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommendation */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 p-4 sm:p-6 shadow-sm">
          <h3 className="font-bold text-sm sm:text-base text-slate-800 mb-2">
            Rekomendasi Belajar
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {result.percentage >= 85
              ? "Hasil Anda sangat baik! Pertahankan dan coba tingkatkan dengan latihan soal yang lebih menantang."
              : result.percentage >= 70
              ? "Hasil Anda sudah baik. Fokuslah pada bagian yang masih perlu ditingkatkan."
              : result.percentage >= 55
              ? "Teruslah berlatih! Identifikasi bagian yang masih lemah dan pelajari kembali materinya."
              : "Jangan menyerah! Ulangi latihan dan pelajari materi dengan lebih saksama."}
          </p>
        </div>

        {/* Certificate info */}
        {result.certificate && (
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
              <h3 className="font-bold text-sm sm:text-base text-slate-800">Dokumen Hasil Latihan</h3>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mb-1">Nomor</p>
            <p className="font-mono font-bold text-slate-800 text-xs sm:text-sm">
              {result.certificate.certificateNo}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Link
            href={`/kompetisi/${paketId}?retry=1`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors text-sm sm:text-base"
          >
            <RefreshCw className="w-4 h-4" />
            Ulangi Latihan
          </Link>
          <Link
            href="/kompetisi/latihan"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm sm:text-base"
          >
            <FileText className="w-4 h-4" />
            Paket Lainnya
          </Link>
          <Link
            href="/murid/dokumen-latihan"
            className="flex items-center justify-center gap-2 py-2.5 sm:py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm sm:text-base"
          >
            <Award className="w-4 h-4" />
            Dokumen Hasil Latihan
          </Link>
        </div>
      </div>
    </div>
  );
}
