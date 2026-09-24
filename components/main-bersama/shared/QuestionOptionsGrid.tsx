import type { PublicQuestionView } from "@/src/main-bersama/domain/entities/question";

const LETTERS = ["A", "B", "C", "D", "E"];

export function QuestionOptionsGrid({
  question,
  compact = false,
}: {
  question: PublicQuestionView;
  compact?: boolean;
}) {
  return (
    <div className={`mb-stage-options ${compact ? "mb-stage-options-compact" : ""}`} aria-label="Pilihan jawaban">
      {question.options.map((option, index) => (
        <div key={option.id} className="mb-stage-option">
          <span className="mb-stage-option-letter mb-number">{LETTERS[index] ?? "•"}</span>
          <span className="mb-stage-option-text">{option.text}</span>
        </div>
      ))}
    </div>
  );
}
