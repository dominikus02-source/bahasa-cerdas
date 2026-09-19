// ─── PinDisplay (§6/§10) — PIN sangat besar, mudah dibaca kelas ──

interface PinDisplayProps {
  pin: string;
  /** 'teacher' = ukuran sedang; 'projector' = sangat besar. */
  scale?: 'teacher' | 'projector';
}

export function PinDisplay({ pin, scale = 'teacher' }: PinDisplayProps) {
  return (
    <div
      className={`mb-pin mb-pin-${scale}`}
      role="text"
      aria-label={`PIN ruang: ${pin.split('').join(' ')}`}
    >
      {pin.split('').map((d, i) => (
        <span key={i} className="mb-pin-digit mb-number">
          {d}
        </span>
      ))}
      <style jsx>{`
        .mb-pin {
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
        }
      `}</style>
    </div>
  );
}
