/** Jumlah peserta — chip kecil yang dipakai semua surface. */
export function ParticipantCount({ count, label = 'peserta' }: ParticipantCountProps) {
  return (
    <span className="mb-pcount">
      <UsersGlyph />
      <span className="mb-number">{count}</span> {label}
      <style jsx>{`
        .mb-pcount {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 14px;
          border-radius: var(--mb-radius-pill);
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.16);
          color: var(--mb-text-primary);
          font-weight: 700;
          font-size: 0.9rem;
        }
      `}</style>
    </span>
  );
}

interface ParticipantCountProps {
  count: number;
  /** Label alternatif (mis. "peserta"). */
  label?: string;
}

function UsersGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
