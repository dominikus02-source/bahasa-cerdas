"use client";
// ─── Team Badge 8B — geometric mark per regu (interim polished vector).
// Original geometric language (no emoji, no stock): ring + abstract mark.
// Shape + name + color = triple identity (color-blind safe).

const TEAM_COLOR_VAR: Record<string, string> = {
  elang: 'var(--mb-team-elang)',
  harimau: 'var(--mb-team-harimau)',
  rusa: 'var(--mb-team-rusa)',
  badak: 'var(--mb-team-badak)',
};

function TeamMark({ teamId }: { teamId: string }) {
  const s = { fill: 'none', stroke: '#13253a', strokeWidth: 3.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  switch (teamId) {
    case 'elang': // upward wings — cepat, observatif
      return (
        <g {...s}>
          <path d="M7 29 L19 17 L24 23 L29 17 L41 29" />
          <circle cx="24" cy="33" r="2.4" fill="#13253a" stroke="none" />
        </g>
      );
    case 'harimau': // three bold slashes — berani, energetic
      return (
        <g {...s}>
          <path d="M18 10 L12 38" strokeWidth={4.4} />
          <path d="M27 10 L21 38" strokeWidth={4.4} />
          <path d="M36 10 L30 38" strokeWidth={4.4} />
        </g>
      );
    case 'rusa': // antler branches — lincah, graceful
      return (
        <g {...s}>
          <path d="M24 40 L24 16" />
          <path d="M24 24 L16 16" />
          <path d="M24 24 L32 16" />
          <path d="M24 32 L17 26" />
          <path d="M24 32 L31 26" />
        </g>
      );
    case 'badak': // hexagon + horn — kuat, steady
    default:
      return (
        <g {...s}>
          <path d="M24 12 L36 19 L36 33 L24 40 L12 33 L12 19 Z" />
          <path d="M24 12 L24 5" strokeWidth={4.4} />
        </g>
      );
  }
}

interface TeamBadgeProps {
  teamId: string;
  name?: string;
  size?: number;
}

export function TeamBadge({ teamId, name, size = 44 }: TeamBadgeProps) {
  const color = TEAM_COLOR_VAR[teamId] ?? 'var(--mb-primary)';
  return (
    <span
      className="mb-team-badge"
      data-team={teamId}
      style={{ '--mb-tc': color, width: size, height: size } as React.CSSProperties}
    >
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
        <circle cx="24" cy="24" r="22" fill="none" stroke={color} strokeWidth="3.5" />
        <circle cx="24" cy="24" r="17" fill={color} opacity="0.16" />
        <TeamMark teamId={teamId} />
      </svg>
      {name ? <span className="mb-team-badge-name">{name}</span> : null}
      <style jsx>{`
        .mb-team-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex: none;
        }
        .mb-team-badge-name { font-weight: 800; }
      `}</style>
    </span>
  );
}
