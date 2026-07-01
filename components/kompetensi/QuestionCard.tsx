import { Volume2, Flag } from "lucide-react";

interface Option {
  id: string;
  text: string;
}

interface QuestionCardProps {
  questionNumber: number;
  totalInSection: number;
  sectionName: string;
  question: {
    id: string;
    text: string;
    type?: string;
    passage?: string;
    audioUrl?: string;
    imageUrl?: string;
    options: Option[];
  };
  selectedAnswer: string | null;
  isFlagged: boolean;
  onSelectAnswer: (questionId: string, optionId: string) => void;
  onToggleFlag: () => void;
  isListening?: boolean;
}

export default function QuestionCard({
  questionNumber,
  totalInSection,
  sectionName,
  question,
  selectedAnswer,
  isFlagged,
  onSelectAnswer,
  onToggleFlag,
  isListening,
}: QuestionCardProps) {
  const LETTERS = ["A", "B", "C", "D", "E"];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Question card */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/70 shadow-sm">
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] sm:text-xs font-bold text-emerald-600 bg-emerald-50 px-2 sm:px-2.5 py-1 rounded-full border border-emerald-200/50">
                {sectionName}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium">
                Soal {questionNumber} dari {totalInSection}
              </span>
            </div>
            <button
              onClick={onToggleFlag}
              className={`shrink-0 p-1.5 sm:p-2 rounded-lg transition-colors ${
                isFlagged
                  ? "bg-amber-50 text-amber-500 border border-amber-200"
                  : "text-slate-300 hover:text-slate-400 hover:bg-slate-50"
              }`}
              title={isFlagged ? "Hapus tanda" : "Tandai ragu-ragu"}
            >
              <Flag className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Listening indicator */}
          {isListening && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
              <Volume2 className="w-4 h-4 text-indigo-500" />
              <span className="text-xs sm:text-sm text-indigo-700 font-medium">
                Simak audio dengan saksama, lalu jawab pertanyaan berikut.
              </span>
            </div>
          )}

          {/* Passage */}
          {question.passage && (
            <div className="mb-4 p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Bacaan
              </div>
              <div className="prose prose-sm max-w-none">{question.passage}</div>
            </div>
          )}

          {/* Image */}
          {question.imageUrl && (
            <div className="mb-4 rounded-xl overflow-hidden border border-slate-100">
              <img
                src={question.imageUrl}
                alt="Gambar soal"
                className="w-full max-h-48 sm:max-h-64 object-contain mx-auto"
              />
            </div>
          )}

          {/* Question text */}
          <div className="mb-1">
            <p className="text-sm sm:text-base text-slate-800 leading-relaxed font-medium">
              {question.text}
            </p>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="grid gap-2.5 sm:gap-3">
        {question.options?.map((option, idx) => {
          const optId = option.id || LETTERS[idx] || String(idx);
          const optText = option.text || option;
          const isSelected = selectedAnswer === optId;

          return (
            <button
              key={optId}
              onClick={() => onSelectAnswer(question.id, optId)}
              className={`w-full text-left rounded-xl sm:rounded-2xl p-3.5 sm:p-5 transition-all flex items-start gap-3 sm:gap-4 group ${
                isSelected
                  ? "bg-emerald-50 border-2 border-emerald-500 shadow-sm"
                  : "bg-white border-2 border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 hover:shadow-sm"
              }`}
            >
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-bold shrink-0 transition-all ${
                  isSelected
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-slate-50 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600"
                }`}
              >
                {optId}
              </div>
              <span
                className={`text-sm sm:text-base pt-0.5 sm:pt-1 leading-snug ${
                  isSelected ? "text-emerald-900 font-medium" : "text-slate-700"
                }`}
              >
                {optText}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
