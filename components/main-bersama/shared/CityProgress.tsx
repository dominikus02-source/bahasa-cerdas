/**
 * Kota Cahaya progress rail — visual pendamping scene kota, bukan skyline
 * kedua. State tetap 100% authoritative dari backend:
 * progressPercent + unlockedMilestones + transient reveal dari useKotaMotion.
 */
import type { CSSProperties } from 'react';

interface CityProgressProps {
  progressPercent: number;
  unlockedMilestones: string[];
  animate?: boolean;
  revealMilestones?: string[];
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
  const value = Math.max(0, Math.min(100, progressPercent));
  const from = growFrom === null ? null : Math.max(0, Math.min(100, growFrom));
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
    <div
      className="mb-city"
      role="img"
      aria-label={`Progres Kota Cahaya ${Math.round(value)} persen. ${unlocked.size} dari 4 bagian kota telah menyala.`}
    >
      <div className="mb-city-head" aria-hidden>
        <span className="mb-city-eyebrow">
          <i />
          Energi Kota
        </span>
        <strong className="mb-number">{Math.round(value)}%</strong>
      </div>

      <div className="mb-city-rail" aria-hidden>
        <div className="mb-city-track">
          <div className="mb-city-track-glow" />
          <div className={`mb-city-fill ${fillClass}`} style={fillStyle}>
            <span className="mb-city-fill-shine" />
          </div>
        </div>

        {MILESTONES.map((m) => {
          const on = unlocked.has(m.key);
          const rev = on && revealing.has(m.key);
          return (
            <span
              key={m.key}
              className={`mb-city-stop ${on ? 'mb-city-stop-on' : ''}${rev ? ' mb-city-stop-reveal' : ''}`}
              style={{ left: `${m.at}%` }}
            >
              <span className="mb-city-stop-ring">
                <MilestoneGlyph kind={m.key} />
              </span>
              <span className="mb-city-stop-label">{m.label}</span>
            </span>
          );
        })}
      </div>

      <style jsx>{`
        .mb-city {
          width: min(100%, 680px);
          margin: 0 auto;
          padding: 12px 18px 18px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, .08);
          background:
            radial-gradient(320px 80px at 50% 100%, rgba(255, 201, 77, .08), transparent 72%),
            linear-gradient(180deg, rgba(8, 29, 47, .7), rgba(6, 23, 39, .56));
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, .035),
            0 12px 28px rgba(0, 0, 0, .12);
          backdrop-filter: blur(8px);
        }
        .mb-city-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 13px;
        }
        .mb-city-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #abc0cf;
          font-size: .69rem;
          font-weight: 850;
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        .mb-city-eyebrow i {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ffd463;
          box-shadow: 0 0 14px rgba(255, 212, 99, .65);
        }
        .mb-city-head strong {
          color: #ffe094;
          font-size: 1rem;
          line-height: 1;
          text-shadow: 0 0 18px rgba(255, 210, 95, .25);
        }
        .mb-city-rail {
          position: relative;
          height: 62px;
          margin: 0 18px;
        }
        .mb-city-track {
          position: absolute;
          top: 17px;
          left: 0;
          right: 0;
          height: 9px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, .075);
          border: 1px solid rgba(255, 255, 255, .055);
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, .2);
        }
        .mb-city-track-glow {
          position: absolute;
          inset: -10px 0;
          background: linear-gradient(90deg, rgba(20,184,166,.08), rgba(255,201,77,.12));
          filter: blur(10px);
          pointer-events: none;
        }
        .mb-city-fill {
          position: relative;
          height: 100%;
          overflow: hidden;
          border-radius: inherit;
          background: linear-gradient(90deg, #19b7a8 0%, #55d7c5 48%, #ffd05b 100%);
          box-shadow:
            0 0 15px rgba(45, 205, 184, .25),
            0 0 20px rgba(255, 201, 77, .16);
        }
        .mb-city-fill-shine {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.52), transparent);
          transform: translateX(-110%);
          animation: mb-city-rail-shine 3.8s ease-in-out infinite;
        }
        .mb-city-stop {
          position: absolute;
          top: 0;
          display: grid;
          justify-items: center;
          gap: 5px;
          width: 76px;
          transform: translateX(-50%);
          color: #70889c;
        }
        .mb-city-stop:last-child {
          transform: translateX(-70%);
        }
        .mb-city-stop-ring {
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1.5px solid rgba(255,255,255,.15);
          background: #112b42;
          box-shadow: 0 7px 16px rgba(0,0,0,.18);
          transition:
            color 420ms ease,
            border-color 420ms ease,
            background 420ms ease,
            box-shadow 420ms ease,
            transform 420ms cubic-bezier(.2,1.08,.32,1);
        }
        .mb-city-stop-label {
          white-space: nowrap;
          font-size: .65rem;
          line-height: 1;
          font-weight: 750;
          letter-spacing: -.01em;
        }
        .mb-city-stop-on {
          color: #ffdb7e;
        }
        .mb-city-stop-on .mb-city-stop-ring {
          color: #ffe194;
          border-color: rgba(255, 211, 103, .72);
          background:
            radial-gradient(circle at 50% 35%, rgba(255, 220, 125, .18), transparent 64%),
            #17354a;
          box-shadow:
            0 0 0 5px rgba(255, 207, 83, .055),
            0 0 22px rgba(255, 204, 78, .2),
            0 8px 18px rgba(0,0,0,.18);
        }
        .mb-city-stop-reveal .mb-city-stop-ring {
          animation: mb-city-stop-pop 650ms cubic-bezier(.2,1.14,.32,1) both;
        }
        @keyframes mb-city-rail-shine {
          0%, 62%, 100% { transform: translateX(-110%); opacity: 0; }
          72% { opacity: .65; }
          92% { transform: translateX(110%); opacity: 0; }
        }
        @keyframes mb-city-stop-pop {
          0% { transform: scale(.72); filter: brightness(1); }
          52% { transform: scale(1.16); filter: brightness(1.35); }
          100% { transform: scale(1); filter: brightness(1); }
        }
        @media (max-width: 540px) {
          .mb-city { padding-inline: 10px; }
          .mb-city-rail { margin-inline: 12px; }
          .mb-city-stop { width: 58px; }
          .mb-city-stop-ring { width: 34px; height: 34px; }
          .mb-city-stop-label { font-size: .57rem; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mb-city-fill-shine,
          .mb-city-stop-reveal .mb-city-stop-ring {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function MilestoneGlyph({ kind }: { kind: string }) {
  const s = {
    stroke: 'currentColor',
    strokeWidth: 1.9,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (kind === 'garden') {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none">
        <path d="M12 20v-8" {...s} />
        <path d="M12 14c-4.2-.3-6.5-2.5-6.8-6.8 4.2.2 6.5 2.5 6.8 6.8Z" {...s} />
        <path d="M12 11.6c3.8-.2 5.9-2.2 6.2-6.1-3.8.2-5.9 2.2-6.2 6.1Z" {...s} />
      </svg>
    );
  }
  if (kind === 'library') {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none">
        <path d="M3 20h18M5 18V9l7-4 7 4v9M8 11v5M12 11v5M16 11v5" {...s} />
      </svg>
    );
  }
  if (kind === 'homes') {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none">
        <path d="m3 12 6-5 6 5M5 11v8h8v-8M13 13l3-2.5 5 4.3M15 12v7h5v-5" {...s} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none">
      <path d="M6 20V9h12v11M4 20h16M12 9V3M12 3h5v3h-5M9 13h2M13 13h2M9 17h2M13 17h2" {...s} />
    </svg>
  );
}
