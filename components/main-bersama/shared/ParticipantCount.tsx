interface ParticipantCountProps {
  count: number;
  /** Label alternatif (mis. "peserta"). */
  label?: string;
}

/** Jumlah peserta — chip kecil yang dipakai semua surface. */
export function ParticipantCount({ count, label = 'peserta' }: ParticipantCountProps) {
  return (
    <span className="mb-pcount">
      <span aria-hidden>👥</span>
      <span className="mb-number">{count}</span> {label}
      <style jsx>{`
        .mb-pcount {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: var(--mb-radius-pill);
          background: var(--mb-surface-elevated);
          color: var(--mb-text-primary);
          font-weight: 700;
          font-size: 0.9rem;
        }
      `}</style>
    </span>
  );
}
