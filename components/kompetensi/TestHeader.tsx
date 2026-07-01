import { Clock, X, CheckCircle, AlertTriangle } from "lucide-react";

interface TestHeaderProps {
  title: string;
  type: string;
  currentSection: number;
  totalSections: number;
  currentQuestion: number;
  totalInSection: number;
  timeLeft: number;
  answeredCount: number;
  totalQuestions: number;
  onExit: () => void;
}

export default function TestHeader({
  title,
  type,
  currentSection,
  totalSections,
  currentQuestion,
  totalInSection,
  timeLeft,
  answeredCount,
  totalQuestions,
  onExit,
}: TestHeaderProps) {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isLowTime = timeLeft <= 60 && timeLeft > 0;
  const isCritical = timeLeft <= 0;

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={onExit}
              className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors text-xs sm:text-sm font-medium"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
            <div className="h-6 w-px bg-slate-200 shrink-0 hidden sm:block" />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate leading-tight">
                {title}
              </h1>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-medium">
                  {type}
                </span>
                <span className="hidden xs:inline">
                  Bagian {currentSection + 1}/{totalSections}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 rounded-lg text-xs font-bold text-slate-600">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              {answeredCount}/{totalQuestions}
            </div>

            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono font-bold text-xs sm:text-sm transition-all ${
                isCritical
                  ? "bg-red-100 text-red-600 animate-pulse"
                  : isLowTime
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-slate-50 text-slate-700"
              }`}
            >
              <Clock className={`w-3.5 h-3.5 ${isLowTime || isCritical ? "animate-pulse" : ""}`} />
              <span className="tabular-nums">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pb-2 sm:hidden">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{
                width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-[10px] font-medium text-slate-500 tabular-nums">
            {currentQuestion + 1}/{totalInSection}
          </span>
        </div>
      </div>
    </header>
  );
}
