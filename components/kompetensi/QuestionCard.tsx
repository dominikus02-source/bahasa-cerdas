import { Flag } from "lucide-react";
import ListeningAudioPlayer from "./ListeningAudioPlayer";

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
  const hasPassage = !!question.passage;

  return (
    // With a passage: split into two columns on large screens (bacaan | soal).
    // Without: single column. On mobile it's always stacked.
    <div className={hasPassage ? "lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start" : ""}>
      {/* Passage — capped height with its own scroll so it never pushes the
          question far down on mobile; sticky beside the question on large screens. */}
      {hasPassage && (
        <div className="mb-4 lg:mb-0 lg:sticky lg:top-4 bg-slate-50 rounded-xl border border-slate-200/70 p-3.5 sm:p-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Bacaan
          </div>
          <div className="prose prose-sm max-w-none text-xs sm:text-sm text-slate-700 leading-relaxed overflow-y-auto pr-1 max-h-[38vh] lg:max-h-[calc(100vh-9rem)]">
            {question.passage}
          </div>
        </div>
      )}

      {/* Question + options */}
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

          {/* Audio player Mendengarkan — kontrol terbatas (maks 1× putar, tanpa seek) */}
          {isListening && question.audioUrl && (
            <div className="mb-4">
              <p className="mb-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                Simak audio berikut. Dengarkan dengan saksama sebelum menjawab.
              </p>
              <ListeningAudioPlayer
                src={question.audioUrl.includes("supabase.co") ? `/api/kompetensi/audio/${question.id}` : question.audioUrl}
                maxPlays={1}
                storageKey={question.id}
              />
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
      <div className="grid gap-2.5 sm:gap-3" role="radiogroup" aria-label="Pilihan jawaban">
        {question.options?.map((option) => {
          const optId = option.id || option.text;
          const optText = typeof option === "string" ? option : option.text;
          const isSelected = selectedAnswer === optId;

          return (
            <button
              key={optId}
              onClick={() => onSelectAnswer(question.id, optId)}
              role="radio"
              aria-checked={isSelected}
              aria-label={`Pilihan jawaban: ${optText}`}
              className={`w-full text-left rounded-xl sm:rounded-2xl p-3.5 sm:p-5 transition-all group ${
                isSelected
                  ? "bg-emerald-50 border-2 border-emerald-500 shadow-sm"
                  : "bg-white border-2 border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 hover:shadow-sm"
              }`}
            >
              <span
                className={`text-sm sm:text-base leading-snug block ${
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
    </div>
  );
}
