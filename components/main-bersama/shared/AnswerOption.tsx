"use client";

interface AnswerOptionProps {
  letter: string;
  text: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}

/**
 * Opsi jawaban siswa (§11/§28) — target sentuh besar, satu tangan,
 * huruf badge jelas, state terpilih tidak hanya via warna (badge ✓).
 */
export function AnswerOption({ letter, text, selected, disabled, onSelect }: AnswerOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`mb-answer ${selected ? 'mb-answer-selected' : ''}`}
    >
      <span className="mb-answer-letter mb-number" aria-hidden>{letter}</span>
      <span className="mb-answer-text">{text}</span>
      {selected ? (
        <span className="mb-answer-check" aria-hidden>✓</span>
      ) : null}
      <style jsx>{`
        .mb-answer {
          display: flex;
          align-items: center;
          gap: var(--mb-space-3);
          width: 100%;
          min-height: 64px; /* touch target nyaman (§28) */
          padding: var(--mb-space-3) var(--mb-space-4);
          text-align: left;
          background: var(--mb-surface-light-elevated);
          color: var(--mb-text-light-primary);
          border: 2px solid rgba(23, 38, 58, 0.12);
          border-radius: var(--mb-radius-md);
          cursor: pointer;
          transition: border-color var(--mb-motion-fast), transform var(--mb-motion-fast);
        }
        .mb-answer:hover:not(:disabled) { transform: translateY(-1px); border-color: var(--mb-primary); }
        .mb-answer:disabled { cursor: default; opacity: 0.85; }
        .mb-answer-selected {
          border-color: var(--mb-primary);
          background: var(--mb-primary-soft);
        }
        .mb-answer-letter {
          flex: none;
          display: grid;
          place-items: center;
          width: 40px;
          height: 40px;
          border-radius: var(--mb-radius-sm);
          background: var(--mb-bg);
          color: var(--mb-text-primary);
          font-weight: 800;
          font-size: 1.05rem;
        }
        .mb-answer-text {
          font-family: var(--mb-font-reading);
          font-size: 1.05rem;
          line-height: 1.45;
        }
        .mb-answer-check {
          margin-left: auto;
          color: var(--mb-primary-strong);
          font-weight: 800;
          font-size: 1.2rem;
        }
      `}</style>
    </button>
  );
}
