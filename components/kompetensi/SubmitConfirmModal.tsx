"use client";

import { AlertTriangle, CheckCircle2, HelpCircle, X } from "lucide-react";

interface SubmitConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
  answeredCount: number;
  totalQuestions: number;
  flaggedCount: number;
  sections: { sectionName: string; questions: { id: string }[] }[];
  answers: Record<string, string>;
  timeUp?: boolean;
}

export default function SubmitConfirmModal({
  open,
  onClose,
  onConfirm,
  submitting,
  answeredCount,
  totalQuestions,
  flaggedCount,
  sections,
  answers,
  timeUp,
}: SubmitConfirmModalProps) {
  if (!open) return null;

  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5 sm:pt-6 pb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${timeUp ? "bg-red-50" : "bg-amber-50"}`}>
              <AlertTriangle className={`w-5 h-5 ${timeUp ? "text-red-500" : "text-amber-500"}`} />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-900">
                {timeUp ? "Waktu Habis" : "Kirim Jawaban?"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                {timeUp ? "Waktu pengerjaan telah habis. Jawaban akan dikirim." : "Pastikan semua jawaban sudah final"}
              </p>
            </div>
          </div>
          {!timeUp && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-5 sm:px-6 py-3 space-y-3">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* Answered */}
            <div className="bg-emerald-50 rounded-xl p-3 sm:p-4 border border-emerald-100">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Sudah dijawab
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-emerald-700">
                {answeredCount}
                <span className="text-sm font-medium text-emerald-400">
                  /{totalQuestions}
                </span>
              </p>
            </div>

            {/* Unanswered */}
            <div className={unansweredCount > 0 ? "bg-red-50 rounded-xl p-3 sm:p-4 border border-red-100" : "bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-100"}>
              <div className="flex items-center gap-2 mb-1">
                <X className={`w-4 h-4 ${unansweredCount > 0 ? "text-red-500" : "text-slate-400"}`} />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider ${unansweredCount > 0 ? 'text-red-700' : 'text-slate-500'}">
                  Belum dijawab
                </span>
              </div>
              <p className={`text-xl sm:text-2xl font-black ${unansweredCount > 0 ? "text-red-600" : "text-slate-500"}`}>
                {unansweredCount}
              </p>
            </div>
          </div>

          {/* Flagged count */}
          {flaggedCount > 0 && (
            <div className="bg-amber-50 rounded-xl p-3 sm:p-4 border border-amber-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-500" />
                <span className="text-xs sm:text-sm font-medium text-amber-700">
                  {flaggedCount} soal ditandai ragu-ragu
                </span>
              </div>
            </div>
          )}

          {/* Per-section detail */}
          <div className="bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-100">
            <h3 className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Per Bagian
            </h3>
            <div className="space-y-1.5">
              {sections.map((section, idx) => {
                const answered = section.questions.filter((q) => answers[q.id]).length;
                const total = section.questions.length;
                const done = answered === total;
                return (
                  <div key={idx} className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-600 truncate mr-2">{section.sectionName}</span>
                    <span className={`shrink-0 font-medium ${done ? "text-emerald-600" : "text-slate-400"}`}>
                      {answered}/{total}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[10px] sm:text-xs text-slate-400 text-center">
            Setelah dikirim, Anda tidak dapat mengubah jawaban.
          </p>
        </div>

        {/* Actions */}
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-2 flex flex-col sm:flex-row gap-2 sm:gap-3">
          {!timeUp ? (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 sm:py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm sm:text-base"
            >
              Lanjut Kerjakan
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 sm:py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm sm:text-base"
            >
              Kembali
            </button>
          )}
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 py-2.5 sm:py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Mengirim...
              </>
            ) : (
              "Kirim Jawaban"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
