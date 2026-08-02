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
  /** Where "Kembali ke Latihan" / "Paket Lainnya" go — the list the user came from. */
  backHref?: string;
  /** Where the "Dokumen Hasil Latihan" button goes — respects guru vs murid role. */
  certHref?: string;
}

export default function TestResultPanel({ result, paketId, backHref = "/kompetisi/latihan", certHref = "/murid/dokumen-latihan" }: TestResultPanelProps) {
  const style = PREDIKAT_STYLES[result.predikat] || { bg: "bg-slate-50", border: "border-slate-300", text: "text-slate-700", icon: "📋" };
  const passed = result.status === "COMPLETED";
  const title = result.paket?.title || result.paketTitle || "Hasil Latihan";

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s} detik`;
    return `${m} menit ${s} detik`;
  };

  // Weakest scored section → targeted "continue learning" recommendation.
  // Skips constructed sections (Menulis/Berbicara) and any still pending review.
  const lowestSection = result.sectionScores
    ? Object.entries(result.sectionScores)
        .filter(
          ([, s]: [string, any]) =>
            !s.constructed &&
            (s.pendingReview ?? 0) <= 0 &&
            (s.total ?? 0) > 0
        )
        .map(([name, s]: [string, any]) => ({
          name,
          pct: Math.round(((s.benar ?? 0) / s.total) * 100),
        }))
        .sort((a, b) => a.pct - b.pct)[0]
    : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Back link */}
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Latihan
        </Link>

        {/* Hero score — premium branded */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-6 sm:p-9 text-center shadow-xl shadow-slate-900/20 ring-1 ring-white/10">
          {/* Batik texture overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07] bg-cover bg-center"
            style={{ backgroundImage: "url('/batik-header-profile-bc.png')" }}
          />
          {/* Soft glow */}
          <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />

          {/* Brand row */}
          <div className="relative flex items-center justify-center gap-2">
            <img src="/BC-logo.png" alt="BahasaCerdas" className="h-7 w-7 sm:h-8 sm:w-8 object-contain" />
            <span className="text-sm sm:text-base font-extrabold tracking-wide text-white">
              Bahasa<span className="text-emerald-400">Cerdas</span>
            </span>
          </div>
          <div className="relative mx-auto my-4 h-px w-16 bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          {/* Score ring */}
          {(() => {
            const pct = Math.max(0, Math.min(100, result.percentage || 0));
            const R = 44;
            const C = 2 * Math.PI * R;
            const tier = pct >= 70 ? "#34d399" : pct >= 50 ? "#fbbf24" : "#fb7185";
            return (
              <div className="relative mx-auto h-32 w-32 sm:h-40 sm:w-40">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="7" />
                  <circle
                    cx="50" cy="50" r={R} fill="none" stroke={tier} strokeWidth="7" strokeLinecap="round"
                    strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl sm:text-5xl font-black leading-none text-white">{pct.toFixed(0)}</span>
                  <span className="mt-0.5 text-[10px] sm:text-xs font-medium text-white/50">Nilai</span>
                </div>
              </div>
            );
          })()}

          {/* Predikat badge */}
          <div className="relative mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
            <span className="text-base sm:text-lg">{style.icon}</span>
            <span className="text-sm sm:text-base font-bold text-white">{result.predikat}</span>
          </div>

          {/* Meta line */}
          <p className="relative mt-3 text-[11px] sm:text-xs text-white/60">
            {title}
          </p>
          <p className="relative mt-0.5 text-[10px] sm:text-[11px] text-white/40">
            Skor {result.totalScore} / {result.maxScore || 100} &middot; Percobaan #{result.attemptNumber}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 p-3 sm:p-4 text-center shadow-sm">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-xs sm:text-sm font-bold text-slate-800">
              {result.sectionScores
                // Constructed sections (Menulis/Berbicara) hold a 0-100 score,
                // not a question count — adding them here once produced
                // "151 Benar" on a 34-question test.
                ? Object.values(result.sectionScores).reduce((s: number, v: any) => s + (v.constructed ? 0 : v.benar || 0), 0)
                : 0}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-400">Benar</p>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 p-3 sm:p-4 text-center shadow-sm">
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 mx-auto mb-1" />
            <p className="text-xs sm:text-sm font-bold text-slate-800">
              {result.sectionScores
                ? Object.values(result.sectionScores).reduce((s: number, v: any) => s + (v.constructed ? 0 : v.salah || 0), 0)
                : 0}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-400">Salah</p>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 p-3 sm:p-4 text-center shadow-sm">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 mx-auto mb-1" />
            <p className="text-xs sm:text-sm font-bold text-slate-800">
              {Math.floor(result.timeSpent / 60)}:{String(result.timeSpent % 60).padStart(2, "0")}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-400">Waktu</p>
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
                // Menulis/Berbicara are graded by AI. When that grading did not
                // run, the section is NOT a zero — it is simply unmarked, and
                // must not be shown as a failing red bar.
                const pending = data.pendingReview ?? 0;
                return (
                  <div key={section}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs sm:text-sm font-medium text-slate-700 truncate mr-2">
                        {section}
                      </span>
                      {pending > 0 ? (
                        <span className="text-[10px] sm:text-xs font-bold text-amber-600 shrink-0">
                          Menunggu penilaian
                        </span>
                      ) : (
                        <span className="text-[10px] sm:text-xs font-bold text-slate-500 shrink-0">
                          {benar}/{total}
                        </span>
                      )}
                    </div>
                    <div className="w-full h-2 sm:h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          pending > 0
                            ? "bg-amber-300"
                            : pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-400"
                        }`}
                        style={{ width: pending > 0 ? "100%" : `${pct}%` }}
                      />
                    </div>
                    {pending > 0 && (
                      <p className="mt-1 text-[10px] sm:text-xs text-amber-700">
                        {pending} jawaban belum dinilai otomatis dan akan ditinjau gurumu. Ini bukan nilai nol.
                      </p>
                    )}
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
          {lowestSection && (
            <div className="mt-4 rounded-xl bg-violet-50 border border-violet-100 p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-violet-800 font-medium">
                Fokus tingkatkan bagian {lowestSection.name}. Buka Jalur Cerdas untuk latihan bertahap.
              </p>
              <a
                href="/arena/jalur-cerdas"
                className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 bg-violet-600 text-white text-xs sm:text-sm font-bold rounded-lg hover:bg-violet-700 transition-colors"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Latihan di Jalur Cerdas
              </a>
            </div>
          )}
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
            href={backHref}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm sm:text-base"
          >
            <FileText className="w-4 h-4" />
            Paket Lainnya
          </Link>
          <Link
            href={certHref}
            className="flex items-center justify-center gap-2 py-2.5 sm:py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm sm:text-base"
          >
            <Award className="w-4 h-4" />
            Dokumen Hasil Latihan
          </Link>
        </div>

        {/* Branded footer */}
        <div className="flex flex-col items-center gap-1 pt-2 pb-1">
          <div className="flex items-center gap-1.5 opacity-70">
            <img src="/BC-logo.png" alt="" className="h-4 w-4 object-contain" />
            <span className="text-[11px] font-bold tracking-wide text-slate-500">BahasaCerdas</span>
          </div>
          <p className="text-center text-[9px] sm:text-[10px] text-slate-400 max-w-sm leading-relaxed">
            Hasil latihan/simulasi di BahasaCerdas — bukan sertifikat resmi UKBI/TKA dari lembaga pemerintah.
          </p>
        </div>
      </div>
    </div>
  );
}
