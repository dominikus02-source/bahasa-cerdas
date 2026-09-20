// ─── PinDisplay (§17/§24) — PIN sangat besar, mudah dibaca kelas ──
// Digit ditampilkan berkelompok 3+3 agar mudah dibaca/diktikkan.

interface PinDisplayProps {
  pin: string;
  /** 'teacher' = ukuran sedang; 'projector' = sangat besar. */
  scale?: 'teacher' | 'projector';
}

export function PinDisplay({ pin, scale = 'teacher' }: PinDisplayProps) {
  const digits = pin.split('');
  const groups: string[][] = [
    digits.slice(0, 3),
    digits.slice(3, 6),
  ];
  return (
    <div
      className={`mb-pin mb-pin-${scale}`}
      aria-label={`PIN ruang: ${digits.join(' ')}`}
    >
      {groups.map((g, gi) => (
        <span key={gi} className="mb-pin-group">
          {g.map((d, i) => (
            <span key={i} className="mb-pin-digit mb-number" aria-hidden>
              {d}
            </span>
          ))}
        </span>
      ))}
      <style jsx>{`
        .mb-pin {
          display: inline-flex;
          gap: var(--mb-space-4);
        }
        .mb-pin-group {
          display: inline-flex;
          gap: var(--mb-space-2);
        }
        .mb-pin-digit {
          display: grid;
          place-items: center;
          background: var(--mb-surface-elevated);
          border-radius: var(--mb-radius-md);
          font-weight: 800;
          color: var(--mb-text-primary);
          box-shadow: var(--mb-shadow-card);
        }
        .mb-pin-teacher .mb-pin-digit {
          width: 48px;
          height: 60px;
          font-size: 2rem;
        }
        .mb-pin-projector .mb-pin-digit {
          width: 110px;
          height: 140px;
          font-size: 5rem;
          border-radius: var(--mb-radius-lg);
          background: linear-gradient(160deg, var(--mb-surface-elevated), var(--mb-surface));
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
      `}</style>
    </div>
  );
}
