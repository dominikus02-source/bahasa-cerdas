import type { TeamPublicInfo } from '@/src/main-bersama/contracts/views/common';

interface TeamProgressProps {
  teams: TeamPublicInfo[];
  /** progress 0..100 per teamId — dari backend, BUKAN dihitung UI (§17). */
  progress: Record<string, number>;
}

/** Warna regu dari token (§24). */
const TEAM_COLOR_VAR: Record<string, string> = {
  elang: 'var(--mb-team-elang)',
  harimau: 'var(--mb-team-harimau)',
  rusa: 'var(--mb-team-rusa)',
  badak: 'var(--mb-team-badak)',
};

/**
 * Trail progres Jelajah (§17): peta 0..100 → posisi visual sederhana
 * (persentase width) — mudah diganti illustrated environment nanti.
 * Koordinat TIDAK disimpan di domain; tie tampil benar (marker
 * bertumpuk diberi offset vertikal per baris regu).
 */
export function TeamProgress({ teams, progress }: TeamProgressProps) {
  return (
    <div className="mb-teams" role="list" aria-label="Progres regu">
      {teams.map((team) => {
        const value = Math.max(0, Math.min(100, progress[team.id] ?? 0));
        return (
          <div key={team.id} className="mb-team-row" role="listitem">
            <span
              className="mb-team-icon"
              style={{ background: TEAM_COLOR_VAR[team.id] ?? 'var(--mb-primary)' }}
              aria-hidden
            >
              {team.symbol}
            </span>
            <span className="mb-team-name">{team.name}</span>
            <div className="mb-team-track">
              <div
                className="mb-team-fill mb-progress-transition"
                style={{ width: `${value}%`, background: TEAM_COLOR_VAR[team.id] ?? 'var(--mb-primary)' }}
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
          gap: var(--mb-space-3);
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
        }
        .mb-team-row {
          display: grid;
          grid-template-columns: 40px 76px 1fr 52px;
          align-items: center;
          gap: var(--mb-space-3);
        }
        .mb-team-icon {
          display: grid;
          place-items: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          font-size: 1.2rem;
        }
        .mb-team-name {
          font-weight: 700;
          font-size: 0.95rem;
        }
        .mb-team-track {
          height: 16px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: var(--mb-radius-pill);
          overflow: hidden;
        }
        .mb-team-fill {
          height: 100%;
          border-radius: var(--mb-radius-pill);
        }
        .mb-team-pct {
          text-align: right;
          color: var(--mb-text-secondary);
          font-weight: 700;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}
