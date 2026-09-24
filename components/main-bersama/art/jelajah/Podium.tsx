"use client";
// ─── Podium 8B.2 — lightweight top-3 (ties share height, no forced winner).
// TeamBadge = fallback slot; full mascot art (`pose="podium"`) docks here
// once produced — ukuran slot-nya SAMA (size-driven), jadi tidak mengubah layout.
//
// Tinggi step sengaja diletakkan di CSS (di-key lewat `data-rank`, bukan
// inline style) supaya projector pendek bisa memadatkannya tanpa `!important`.
// Semantik peringkat & perilaku tie TIDAK berubah.

import { TeamMascot } from '../registry';

interface PodiumEntry {
  teamId: string;
  name: string;
  progress: number;
  rank: number;
}

const TEAM_COLOR_VAR: Record<string, string> = {
  elang: 'var(--mb-team-elang)',
  harimau: 'var(--mb-team-harimau)',
  rusa: 'var(--mb-team-rusa)',
  badak: 'var(--mb-team-badak)',
};

export function Podium({ ranking }: { ranking: PodiumEntry[] }) {
  const top = ranking.filter((t) => t.rank <= 3);
  // Visual order: 2nd, 1st(s), 3rd — ties share the top step.
  const ordered = [
    ...top.filter((t) => t.rank === 2),
    ...top.filter((t) => t.rank === 1),
    ...top.filter((t) => t.rank === 3),
  ];
  return (
    <div className="mb-podium" role="img" aria-label="Podium regu">
      {ordered.map((t) => (
        <div key={t.teamId} className="mb-podium-col" data-team={t.teamId} data-rank={t.rank}>
          <TeamMascot teamId={t.teamId} pose="podium" size={t.rank === 1 ? 72 : 56} />
          <span className="mb-podium-name">{t.name}</span>
          <div
            className="mb-podium-step"
            style={{ background: TEAM_COLOR_VAR[t.teamId] ?? 'var(--mb-primary)' }}
          >
            <span className="mb-number">{t.rank}</span>
          </div>
        </div>
      ))}
      <style jsx>{`
        .mb-podium {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: var(--mb-space-4);
          padding: var(--mb-space-5) var(--mb-space-4) 0;
        }
        .mb-podium-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          min-width: 96px;
        }
        .mb-podium-name { font-weight: 800; color: var(--mb-text-primary); }
        .mb-podium-step {
          width: 100%;
          display: grid;
          place-items: start center;
          padding-top: 10px;
          border-radius: 12px 12px 0 0;
          opacity: 0.92;
        }
        /* Tinggi step default (1080p) — key dari data-rank, bukan inline. */
        .mb-podium-col[data-rank="1"] .mb-podium-step { height: 120px; }
        .mb-podium-col[data-rank="2"] .mb-podium-step { height: 88px; }
        .mb-podium-col[data-rank="3"] .mb-podium-step { height: 64px; }
        .mb-podium-step .mb-number {
          font-size: 1.6rem;
          font-weight: 900;
          color: #13253a;
        }
      `}</style>
    </div>
  );
}
