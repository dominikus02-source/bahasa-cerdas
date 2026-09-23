/**
 * Kota Cahaya UI (§26): skyline primitif yang menyala progresif +
 * track 25–50–75–100% dengan milestone Taman → Perpustakaan →
 * Rumah → Pusat Kota. Highlight BERDASARKAN `unlockedMilestones`
 * dari backend — frontend TIDAK menghitung ulang progress.
 * Visual = CSS/SVG sederhana, mudah diganti city artwork final.
 */
import type { CSSProperties } from 'react';

interface CityProgressProps {
  progressPercent: number; // 0..100 dari backend
  unlockedMilestones: string[];
  /**
   * 8C.2 — true while the bar should travel via CSS (650ms ease-out).
   * False (mount/reconnect/correction/gated/reduced) snaps instantly.
   * Defaults true to preserve pre-8C.2 behavior for non-projector callers.
   */
  animate?: boolean;
  /** 8C.2 — transient REVEAL subset of unlockedMilestones. */
  revealMilestones?: string[];
  /**
   * 8C.2 — nilai AWAL travel (progres sebelumnya) dari useKotaMotion.
   *
   * Diisi HANYA saat animasi kenaikan berjalan. Wajib untuk surface yang
   * BARU di-mount (CLOSED/DISCUSSION punya subtree berbeda dari QUESTION):
   * elemen baru tidak punya "lebar sebelumnya", sehingga `transition`
   * tidak bergerak sama sekali. Dengan nilai awal eksplisit, travel
   * dianimasikan lewat keyframes dari nilai lama → nilai baru.
   */
  growFrom?: number | null;
}

const MILESTONES = [
  { key: 'garden', label: 'Taman', at: 25 },
  { key: 'library', label: 'Perpustakaan', at: 50 },
  { key: 'homes', label: 'Rumah', at: 75 },
  { key: 'town-center', label: 'Pusat Kota', at: 100 },
] as const;

export function CityProgress({
  progressPercent,
  unlockedMilestones,
  animate = true,
  revealMilestones = [],
  growFrom = null,
}: CityProgressProps) {
  const unlocked = new Set(unlockedMilestones);
  const revealing = new Set(revealMilestones);
  const litCount = MILESTONES.filter((m) => unlocked.has(m.key)).length;
  const value = Math.max(0, Math.min(100, progressPercent));
  const from = growFrom === null ? null : Math.max(0, Math.min(100, growFrom));
  // Travel via keyframes bila ada titik awal eksplisit (surface baru maupun
  // elemen yang sudah ter-mount). Kalau tidak, perilaku lama dipertahankan:
  // transition untuk `animate`, snap untuk sisanya.
  const grow = animate && from !== null && from < value;
  const fillClass = grow
    ? 'mb-city-fill-grow'
    : animate
      ? 'mb-city-fill-anim'
      : 'mb-city-fill-snap';
  const fillStyle: CSSProperties = grow
    ? ({
        width: `${value}%`,
        '--mb-city-from': `${from}%`,
        '--mb-city-to': `${value}%`,
      } as CSSProperties)
    : { width: `${value}%` };
  return (
    <div className="mb-city" aria-label={`Progres kota ${Math.round(value)} persen`}>
      <Skyline litCount={litCount} />
      <div className="mb-city-trackwrap">
        <div className="mb-city-track" aria-hidden>
          <div className={`mb-city-fill ${fillClass}`} style={fillStyle} />
        </div>
        {MILESTONES.map((m) => {
          const on = unlocked.has(m.key);
          const rev = on && revealing.has(m.key);
          return (
            <span
              key={m.key}
              className={`mb-city-node ${on ? 'mb-city-node-on' : ''}${rev ? ' mb-city-node-reveal' : ''}`}
              style={{ left: `${m.at}%` }}
              aria-hidden
            >
              <MilestoneGlyph kind={m.key} />
            </span>
          );
        })}
      </div>
      <div className="mb-city-labels" aria-hidden>
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
        /* Track: fill teal→amber; node di 25/50/75/100. */
        .mb-city-trackwrap { position: relative; height: 46px; }
        .mb-city-track {
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 14px;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.1);
          border-radius: var(--mb-radius-pill);
          overflow: hidden;
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
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: var(--mb-surface);
          border: 2px solid rgba(255, 255, 255, 0.22);
          color: var(--mb-text-secondary);
          opacity: 0.55;
        }
        .mb-city-node-on {
          color: var(--mb-accent);
          border-color: var(--mb-accent);
          background: var(--mb-surface-elevated);
          opacity: 1;
          box-shadow: 0 0 20px rgba(255, 201, 77, 0.5);
        }
        .mb-city-labels {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          margin-top: var(--mb-space-1);
          padding: 0 20px;
        }
        .mb-city-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--mb-text-secondary);
          text-align: center;
        }
        .mb-city-label:nth-child(1) { text-align: left; }
        .mb-city-label:nth-child(4) { text-align: right; }
        .mb-city-label-on { color: var(--mb-accent); }
        @media (max-width: 420px) {
          .mb-city-label { font-size: 0.66rem; }
          .mb-city-node { width: 34px; height: 34px; }
        }
      `}</style>
    </div>
  );
}

/** Skyline dekoratif — gedung menyala sesuai jumlah milestone terbuka. */
function Skyline({ litCount }: { litCount: number }) {
  const buildings = [
    { x: 6, w: 26, h: 34 },
    { x: 38, w: 34, h: 52 },
    { x: 78, w: 24, h: 42 },
    { x: 108, w: 30, h: 60 },
    { x: 144, w: 26, h: 46 },
  ];
  const litIndex = Math.min(litCount, buildings.length);
  return (
    <svg
      viewBox="0 0 176 64"
      width="100%"
      height="56"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden
      style={{ display: 'block', margin: '0 auto 4px', opacity: 0.9 }}
    >
      {buildings.map((b, i) => {
        const lit = i < litIndex;
        return (
          <g key={i}>
            <rect
              x={b.x}
              y={64 - b.h}
              width={b.w}
              height={b.h}
              rx="3"
              fill={lit ? 'var(--mb-primary-strong)' : 'rgba(255,255,255,0.12)'}
              style={{ transition: 'fill 400ms ease' }}
            />
            {/* Jendela menyala pada gedung yang sudah terbangun. */}
            {lit ? (
              <>
                <rect x={b.x + 5} y={64 - b.h + 8} width="5" height="5" rx="1" fill="var(--mb-accent)" />
                <rect x={b.x + b.w - 10} y={64 - b.h + 8} width="5" height="5" rx="1" fill="var(--mb-accent)" opacity="0.7" />
                <rect x={b.x + 5} y={64 - b.h + 20} width="5" height="5" rx="1" fill="var(--mb-accent)" opacity="0.7" />
                {b.h > 48 ? (
                  <rect x={b.x + b.w - 10} y={64 - b.h + 20} width="5" height="5" rx="1" fill="var(--mb-accent)" />
                ) : null}
              </>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/** Glyph milestone kecil (SVG primitif, tanpa emoji). */
function MilestoneGlyph({ kind }: { kind: string }) {
  const s = { stroke: 'currentColor', strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (kind === 'garden') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden {...{ fill: 'none', stroke: 'currentColor' }}>
        <path d="M12 3a5 5 0 0 1 5 5c0 2.5-2 4-5 7-3-3-5-4.5-5-7a5 5 0 0 1 5-5Z" {...s} />
        <path d="M12 15v6" {...s} />
      </svg>
    );
  }
  if (kind === 'library') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden {...{ fill: 'none', stroke: 'currentColor' }}>
        <path d="M4 20V8l8-4 8 4v12" {...s} />
        <path d="M9 20v-6h6v6" {...s} />
        <path d="M2 20h20" {...s} />
      </svg>
    );
  }
  if (kind === 'homes') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden {...{ fill: 'none', stroke: 'currentColor' }}>
        <path d="M4 11 12 4l8 7" {...s} />
        <path d="M6 10v9h12v-9" {...s} />
        <path d="M10 19v-5h4v5" {...s} />
      </svg>
    );
  }
  // town-center — gedung utama dengan bendera.
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden {...{ fill: 'none', stroke: 'currentColor' }}>
      <path d="M5 20V9h14v11" {...s} />
      <path d="M3 20h18" {...s} />
      <path d="M12 9V4" {...s} />
      <path d="M12 4h5v3h-5" {...s} />
      <path d="M9 20v-4h6v4" {...s} />
    </svg>
  );
}
