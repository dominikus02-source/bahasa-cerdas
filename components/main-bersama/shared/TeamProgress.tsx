import type { TeamPublicInfo } from '@/src/main-bersama/contracts/views/common';

interface TeamProgressProps {
  teams: TeamPublicInfo[];
  /** progress 0..100 per teamId — dari backend, BUKAN dihitung UI (§25). */
  progress: Record<string, number>;
}

/** Warna regu dari token (§14). */
const TEAM_COLOR_VAR: Record<string, string> = {
  elang: 'var(--mb-team-elang)',
  harimau: 'var(--mb-team-harimau)',
  rusa: 'var(--mb-team-rusa)',
  badak: 'var(--mb-team-badak)',
};

/**
 * Visual track Jelajah (§25): jalur MULAI → FINIS per regu dengan
 * token titik; backend `0..100` dipetakan ke posisi — frontend
 * TIDAK menghitung scoring. Koordinat TIDAK disimpan di domain;
 * tie tampil benar (tiap regu punya lane sendiri).
 */
export function TeamProgress({ teams, progress }: TeamProgressProps) {
  return (
    <div className="mb-teams" role="list" aria-label="Perjalanan regu">
      <div className="mb-teams-ends" aria-hidden>
        <span>MULAI</span>
        <span>FINIS</span>
      </div>
      {teams.map((team) => {
        const value = Math.max(0, Math.min(100, progress[team.id] ?? 0));
        const color = TEAM_COLOR_VAR[team.id] ?? 'var(--mb-primary)';
        return (
          <div key={team.id} className="mb-team-row" role="listitem">
            <span className="mb-team-name">
              <i className="mb-team-dot" style={{ background: color }} aria-hidden />
              {team.name}
            </span>
            <div
              className="mb-team-track"
              style={{ '--mb-tc': color } as React.CSSProperties}
              aria-label={`Regu ${team.name} mencapai ${Math.round(value)} persen`}
            >
              <i className="mb-team-tick" style={{ left: '25%' }} aria-hidden />
              <i className="mb-team-tick" style={{ left: '50%' }} aria-hidden />
              <i className="mb-team-tick" style={{ left: '75%' }} aria-hidden />
              <div
                className="mb-team-fill mb-progress-transition"
                style={{ width: `${value}%` }}
              />
              <span
                className="mb-team-token mb-progress-transition"
                style={{ left: `${value}%` }}
                aria-hidden
              />
            </div>
            <span className="mb-team-pct mb-number">{Math.round(value)}%</span>
          </div>
        );
      })}
      <style jsx>{`
        .mb-teams {
          display: flex;
          flex-direction: column;
          gap: var(--mb-space-2);
          width: 100%;
          max-width: 620px;
          margin: 0 auto;
        }
        .mb-teams-ends {
          display: flex;
          justify-content: space-between;
          padding-left: 108px;
          padding-right: 52px;
          color: var(--mb-text-secondary);
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.14em;
        }
        .mb-team-row {
          display: grid;
          grid-template-columns: 96px 1fr 52px;
          align-items: center;
          gap: var(--mb-space-3);
          padding: 6px 0;
        }
        .mb-team-name {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 800;
          font-size: 0.95rem;
        }
        .mb-team-dot {
          width: 10px;
          height: 10px;
          flex: none;
          border-radius: 50%;
        }
        /* Jalur: dash road + checkpoint + token bergerak. */
        .mb-team-track {
          position: relative;
          height: 14px;
          border-radius: var(--mb-radius-pill);
          background:
            linear-gradient(90deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.1));
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.25);
        }
        .mb-team-tick {
          position: absolute;
          top: 2px;
          bottom: 2px;
          width: 2px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.18);
        }
        .mb-team-fill {
          height: 100%;
          border-radius: var(--mb-radius-pill);
          background: linear-gradient(90deg,
            color-mix(in srgb, var(--mb-tc) 55%, transparent),
            var(--mb-tc));
        }
        .mb-team-token {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--mb-tc);
          border: 3px solid var(--mb-bg);
          box-shadow: 0 0 10px color-mix(in srgb, var(--mb-tc) 70%, transparent);
        }
        .mb-team-pct {
          text-align: right;
          color: var(--mb-text-secondary);
          font-weight: 700;
          font-size: 0.9rem;
        }
        @media (max-width: 420px) {
          .mb-teams-ends { padding-left: 0; padding-right: 0; }
          .mb-team-row { grid-template-columns: 78px 1fr 44px; }
          .mb-team-name { font-size: 0.85rem; }
        }
      `}</style>
    </div>
  );
}
