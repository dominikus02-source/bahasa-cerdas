import type { PublicQuestionView } from '@/src/main-bersama/domain/entities/question';

interface QuestionCardProps {
  question: PublicQuestionView;
  /** Nomor putaran "3 / 8" — ditampilkan di atas kartu. */
  roundLabel?: string;
}

/**
 * Kartu soal (§21/§22) — light reading surface: passage readable
 * (tinggi + line-height + max-width), pertanyaan menonjol, tanpa
 * card bertumpuk.
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
          min-width: 0;
          max-width: 640px;
          box-sizing: border-box;
          margin: 0 auto;
          padding: var(--mb-space-5);
          box-shadow: var(--mb-shadow-light);
        }
        .mb-qcard-round {
          display: inline-block;
          margin-bottom: var(--mb-space-3);
          padding: 4px 14px;
          border-radius: var(--mb-radius-pill);
          background: var(--mb-primary-soft);
          color: var(--mb-primary-strong);
          font-weight: 800;
          font-size: 0.85rem;
        }
        .mb-qcard-passage {
          max-width: 100%;
          max-height: 44dvh;
          overflow-wrap: anywhere;
          overflow-y: auto;
          padding: var(--mb-space-4);
          margin-bottom: var(--mb-space-4);
          background: #f3f1ec;
          border-radius: var(--mb-radius-md);
          font-size: 1.05rem;   /* jangan mengecilkan teks (§22) */
          line-height: 1.8;
        }
        .mb-qcard-passage-title {
          display: block;
          margin-bottom: var(--mb-space-2);
          font-size: 1.1rem;
        }
        .mb-qcard-prompt {
          margin: 0;
          max-width: 100%;
          overflow-wrap: anywhere;
          word-break: normal;
          font-family: var(--mb-font-reading);
          font-size: 1.3rem;
          font-weight: 800;
          line-height: 1.5;
        }
        @media (max-width: 420px) {
          .mb-qcard { padding: var(--mb-space-4); }
          .mb-qcard-prompt { font-size: 1.2rem; }
        }
      `}</style>
    </div>
  );
}
