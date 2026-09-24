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
        <span key={gi} className="mb-pin-cluster">
          <span className="mb-pin-group">
            {g.map((d, i) => (
              <span
                key={i}
                className="mb-pin-digit mb-number"
                style={{ animationDelay: `${(gi * 3 + i) * 45}ms` }}
                aria-hidden
              >
                {d}
              </span>
            ))}
          </span>
          {gi === 0 ? (
            <span className="mb-pin-separator" aria-hidden>•</span>
          ) : null}
        </span>
      ))}
      <style jsx>{`
        .mb-pin {
          display: inline-flex;
          align-items: center;
          gap: var(--mb-space-3);
        }
        .mb-pin-cluster {
          display: inline-flex;
          align-items: center;
          gap: var(--mb-space-3);
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
          animation: mb-pin-pop 360ms cubic-bezier(.2,1.15,.3,1) both;
        }
        .mb-pin-separator {
          display: none;
          color: var(--mb-accent);
          font-size: 2rem;
          font-weight: 900;
          opacity: 0.8;
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
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.12),
            0 14px 30px rgba(0,0,0,.28);
        }
        .mb-pin-projector .mb-pin-separator {
          display: inline;
        }
        @keyframes mb-pin-pop {
          from { opacity: 0; transform: translateY(10px) scale(.94); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mb-pin-digit { animation: none; }
        }
      `}</style>
    </div>
  );
}
