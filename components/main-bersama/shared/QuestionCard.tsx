import type { PublicQuestionView } from '@/src/main-bersama/domain/entities/question';

interface QuestionCardProps {
  question: PublicQuestionView;
  /** Nomor putaran "3 / 8" — ditampilkan di atas kartu. */
  roundLabel?: string;
}

/**
 * Kartu soal (§11/§12) — light reading surface: passage readable,
 * max-width terjaga, pertanyaan menonjol, tanpa tumpukan card.
 */
export function QuestionCard({ question, roundLabel }: QuestionCardProps) {
  return (
    <div className="mb-qcard mb-reading mb-entrance">
      {roundLabel ? (
        <span className="mb-qcard-round mb-number">{roundLabel}</span>
      ) : null}
      {question.passage ? (
        <div className="mb-qcard-passage" tabIndex={0}>
          {question.passage.title ? (
            <strong className="mb-qcard-passage-title">{question.passage.title}</strong>
          ) : null}
          {question.passage.content}
        </div>
      ) : null}
      <h2 className="mb-qcard-prompt">{question.prompt}</h2>
      <style jsx>{`
        .mb-qcard {
          position: relative;
          width: 100%;
          max-width: 640px;
          margin: 0 auto;
          padding: var(--mb-space-5);
          box-shadow: var(--mb-shadow-light);
        }
        .mb-qcard-round {
          display: inline-block;
          margin-bottom: var(--mb-space-3);
          padding: 2px 12px;
          border-radius: var(--mb-radius-pill);
          background: var(--mb-primary-soft);
          color: var(--mb-primary-strong);
          font-weight: 700;
          font-size: 0.85rem;
        }
        .mb-qcard-passage {
          max-height: 38dvh;
          overflow-y: auto;
          padding: var(--mb-space-4);
          margin-bottom: var(--mb-space-4);
          background: #f3f1ec;
          border-radius: var(--mb-radius-md);
          font-size: 1.05rem;   /* jangan mengecilkan teks (§12) */
          line-height: 1.75;
        }
        .mb-qcard-passage-title {
          display: block;
          margin-bottom: var(--mb-space-2);
        }
        .mb-qcard-prompt {
          margin: 0;
          font-family: var(--mb-font-reading);
          font-size: 1.25rem;
          font-weight: 700;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
