import { CheckCircle2, Circle, HelpCircle } from "lucide-react";

interface SectionData {
  sectionIndex: number;
  sectionName: string;
  questions: { id: string }[];
}

interface SectionProgressProps {
  sections: SectionData[];
  currentSection: number;
  answers: Record<string, string>;
  flagged: number[];
  onGoToSection: (sectionIdx: number) => void;
}

export default function SectionProgress({
  sections,
  currentSection,
  answers,
  flagged,
  onGoToSection,
}: SectionProgressProps) {
  const getSectionStatus = (section: SectionData) => {
    const answered = section.questions.filter((q) => answers[q.id]).length;
    const total = section.questions.length;
    if (total === 0) return "empty";
    if (answered === total) return "complete";
    if (answered > 0) return "partial";
    return "empty";
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/70 shadow-sm p-3 sm:p-4">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
        Bagian
      </h3>
      <div className="space-y-1.5">
        {sections.map((section, idx) => {
          const status = getSectionStatus(section);
          const isActive = idx === currentSection;
          const answered = section.questions.filter((q) => answers[q.id]).length;
          const total = section.questions.length;

          return (
            <button
              key={idx}
              onClick={() => onGoToSection(idx)}
              className={`w-full flex items-center gap-2.5 p-2 rounded-xl transition-all text-left ${
                isActive
                  ? "bg-emerald-50 border border-emerald-200"
                  : "hover:bg-slate-50 border border-transparent"
              }`}
            >
              {status === "complete" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : status === "partial" ? (
                <HelpCircle className="w-4 h-4 text-amber-500 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-slate-300 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-xs font-medium truncate ${
                    isActive ? "text-emerald-900" : "text-slate-600"
                  }`}
                >
                  {section.sectionName}
                </p>
                <p className="text-[10px] text-slate-400">
                  {answered}/{total}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
