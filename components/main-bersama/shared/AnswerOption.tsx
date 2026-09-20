"use client";

interface AnswerOptionProps {
  letter: string;
  text: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}

/**
 * Opsi jawaban siswa (§21/§31) — target sentuh besar, satu tangan,
 * huruf badge jelas, state terpilih = border + badge + background
 * (bukan warna saja).
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
        <span className="mb-answer-check" aria-hidden>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
      ) : null}
    </button>
  );
}
