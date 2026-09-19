/**
 * Kota Cahaya base UI (§18): representasi sederhana 0–25–50–75–100%
 * dengan milestone Taman → Perpustakaan → Rumah → Pusat Kota.
 * Highlight BERDASARKAN `unlockedMilestones` dari backend —
 * frontend TIDAK menghitung ulang progress (§18).
 */

interface CityProgressProps {
  progressPercent: number; // 0..100 dari backend
  unlockedMilestones: string[];
}

const MILESTONES = [
  { key: 'garden', label: 'Taman', icon: '🌳' },
  { key: 'library', label: 'Perpustakaan', icon: '📚' },
  { key: 'homes', label: 'Rumah', icon: '🏠' },
  { key: 'town-center', label: 'Pusat Kota', icon: '🏙️' },
] as const;

export function CityProgress({ progressPercent, unlockedMilestones }: CityProgressProps) {
  const unlocked = new Set(unlockedMilestones);
  const value = Math.max(0, Math.min(100, progressPercent));
  return (
    <div className="mb-city" aria-label={`Progres kota ${Math.round(value)} persen`}>
      <div className="mb-city-track" aria-hidden>
        <div
          className="mb-city-fill mb-progress-transition"
          style={{ width: `${value}%` }}
        />
        {MILESTONES.map((m, i) => (
          <span
            key={m.key}
            className={`mb-city-node ${unlocked.has(m.key) ? 'mb-city-node-on' : ''}`}
            style={{ left: `${(i + 1) * 20}%` }}
          >
            <span className="mb-city-node-icon">{m.icon}</span>
          </span>
        ))}
      </div>
      <div className="mb-city-labels">
        {MILESTONES.map((m) => (
          <span
            key={m.key}
            className={`mb-city-label ${unlocked.has(m.key) ? 'mb-city-label-on' : ''}`}
          >
            {m.label}
          </span>
        ))}
      </div>
      <style jsx>{`
        .mb-city {
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
        }
        .mb-city-track {
          position: relative;
          height: 20px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: var(--mb-radius-pill);
        }
        .mb-city-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--mb-primary-strong), var(--mb-primary), var(--mb-accent));
          border-radius: var(--mb-radius-pill);
        }
        .mb-city-node {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--mb-surface);
          border: 2px solid rgba(255, 255, 255, 0.2);
          filter: grayscale(1);
          opacity: 0.6;
        }
        .mb-city-node-on {
          filter: none;
          opacity: 1;
          border-color: var(--mb-accent);
          box-shadow: 0 0 18px rgba(255, 201, 77, 0.55);
        }
        .mb-city-node-icon { font-size: 1.25rem; }
        .mb-city-labels {
          display: flex;
          justify-content: space-between;
          margin-top: var(--mb-space-2);
        }
        .mb-city-label {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--mb-text-secondary);
        }
        .mb-city-label-on { color: var(--mb-accent); }
      `}</style>
    </div>
  );
}
