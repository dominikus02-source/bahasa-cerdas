"use client";

import { useState } from "react";
import { X, Grid3X3 } from "lucide-react";

interface Section {
  sectionIndex: number;
  sectionName: string;
  questions: { id: string }[];
}

interface QuestionNavigatorProps {
  sections: Section[];
  currentSection: number;
  currentQuestion: number;
  answers: Record<string, string>;
  flagged: number[];
  onGoToQuestion: (sectionIdx: number, qIdx: number) => void;
}

export default function QuestionNavigator({
  sections,
  currentSection,
  currentQuestion,
  answers,
  flagged,
  onGoToQuestion,
}: QuestionNavigatorProps) {
  const [open, setOpen] = useState(false);

  const totalQuestions = sections.reduce((s, sec) => s + sec.questions.length, 0);
  const answeredCount = sections.reduce(
    (s, sec) => s + sec.questions.filter((q) => answers[q.id]).length,
    0
  );
  const globalIndex = (() => {
    let idx = 0;
    for (let s = 0; s < currentSection; s++) {
      idx += sections[s]?.questions.length || 0;
    }
    return idx + currentQuestion;
  })();

  const getStatus = (sIdx: number, qIdx: number) => {
    const q = sections[sIdx]?.questions[qIdx];
    if (!q) return "empty";
    if (flagged.includes(qIdx) && sIdx === currentSection) return "flagged";
    if (answers[q.id]) return "answered";
    return "unanswered";
  };

  const getGlobalIndex = (sIdx: number, qIdx: number) => {
    let idx = 0;
    for (let s = 0; s < sIdx; s++) {
      idx += sections[s]?.questions.length || 0;
    }
    return idx + qIdx;
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
      >
        <Grid3X3 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Navigasi Soal</span>
        <span className="sm:hidden">{globalIndex + 1}/{totalQuestions}</span>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Panel */}
          <div
            className="relative w-full sm:max-w-md max-h-[80vh] sm:max-h-[70vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Navigasi Soal</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {answeredCount} dijawab · {totalQuestions - answeredCount} belum
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              {sections.map((section, sIdx) => (
                <div key={sIdx}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {section.sectionName}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {section.questions.filter((q) => answers[q.id]).length}/{section.questions.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
                    {section.questions.map((q, qIdx) => {
                      const status = getStatus(sIdx, qIdx);
                      const isActive = sIdx === currentSection && qIdx === currentQuestion;
                      const gIdx = getGlobalIndex(sIdx, qIdx);

                      return (
                        <button
                          key={q.id}
                          onClick={() => {
                            onGoToQuestion(sIdx, qIdx);
                            setOpen(false);
                          }}
                          className={`w-full aspect-square rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                            isActive
                              ? "ring-2 ring-emerald-500 ring-offset-2"
                              : ""
                          } ${
                            status === "flagged"
                              ? "bg-amber-100 text-amber-700 border-2 border-amber-300"
                              : status === "answered"
                              ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-300"
                              : "bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100 hover:text-slate-600"
                          }`}
                        >
                          {gIdx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
                  Sudah dijawab
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
                  Ragu-ragu
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-slate-50 border border-slate-100" />
                  Belum dijawab
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
