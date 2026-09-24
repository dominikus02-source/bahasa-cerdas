"use client";

import { TeamMascot } from "../registry";

interface TrailTeam {
  id: string;
  name: string;
}

const TEAM_COLOR_VAR: Record<string, string> = {
  elang: "var(--mb-team-elang)",
  harimau: "var(--mb-team-harimau)",
  rusa: "var(--mb-team-rusa)",
  badak: "var(--mb-team-badak)",
};

const LANE_Y = [62, 116, 170, 224];

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

interface JelajahTrailProps {
  teams: TrailTeam[];
  progress: Record<string, number>;
  compact?: boolean;
  poses?: Record<string, "ready" | "move" | "celebrate">;
}

/**
 * Panggung Jelajah: empat regu punya lajur sendiri, jadi seri tetap terbaca
 * tanpa saling menutupi. Backend tetap memberi 0..100; komponen hanya
 * memetakan persentase ke posisi visual.
 */
export function JelajahTrail({
  teams,
  progress,
  compact = false,
  poses,
}: JelajahTrailProps) {
  const shown = teams.slice(0, 4);

  return (
    <svg
      viewBox="0 0 800 260"
      className="mb-trail mb-jelajah-stage"
      role="img"
      aria-label="Perjalanan empat regu Jelajah Kata"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="mb-jelajah-sky-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#102a44" />
          <stop offset="1" stopColor="#173a55" />
        </linearGradient>
        <radialGradient id="mb-jelajah-lamp-glow">
          <stop offset="0" stopColor="#ffd57a" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffd57a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="800" height="260" rx="18" fill="url(#mb-jelajah-sky-grad)" />
      <circle cx="720" cy="40" r="25" fill="#ffd57a" opacity="0.92" />
      <circle cx="720" cy="40" r="47" fill="#ffd57a" opacity="0.09" />

      {!compact ? (
        <g className="mb-jelajah-clouds" fill="#e9f2f8" opacity="0.82">
          <ellipse cx="112" cy="33" rx="37" ry="9" />
          <ellipse cx="141" cy="29" rx="23" ry="8" />
          <ellipse cx="420" cy="42" rx="31" ry="8" />
          <ellipse cx="447" cy="38" rx="18" ry="6" />
        </g>
      ) : null}

      <path
        d="M0 226 C150 195 290 221 420 198 C552 178 680 211 800 190 L800 260 L0 260 Z"
        fill="#28536f"
        opacity="0.35"
      />
      <path
        d="M0 239 C160 217 300 244 460 220 C600 198 708 226 800 211 L800 260 L0 260 Z"
        fill="#2c6b68"
        opacity="0.55"
      />

      {shown.map((team, index) => {
        const y = LANE_Y[index] ?? 224;
        const pct = clampPercent(progress[team.id] ?? 0);
        const color = TEAM_COLOR_VAR[team.id] ?? "var(--mb-primary)";
        const markerX = 168 + (pct / 100) * 522;
        const pose = poses?.[team.id] ?? "ready";
        const moving = pose === "move" || pose === "celebrate";

        return (
          <g key={team.id} data-team={team.id}>
            <rect
              x="126"
              y={y - 15}
              width="588"
              height="30"
              rx="15"
              fill="#102a43"
              opacity="0.96"
            />
            <line
              x1="145"
              y1={y}
              x2="690"
              y2={y}
              stroke="rgba(255,255,255,.13)"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {[0.25, 0.5, 0.75].map((checkpoint) => {
              const x = 168 + checkpoint * 522;
              return (
                <g key={checkpoint}>
                  <circle
                    className="mb-jelajah-lamp-glow"
                    cx={x}
                    cy={y - 19}
                    r="17"
                    fill="url(#mb-jelajah-lamp-glow)"
                  />
                  <line
                    x1={x}
                    y1={y + 9}
                    x2={x}
                    y2={y - 16}
                    stroke="#28536f"
                    strokeWidth="2"
                  />
                  <circle cx={x} cy={y - 19} r="4" fill="#ffd57a" />
                </g>
              );
            })}

            <g transform={`translate(8 ${y - 17})`}>
              <rect
                width="110"
                height="34"
                rx="17"
                fill="#0d2438"
                stroke="rgba(255,255,255,.12)"
              />
              <rect width="6" height="34" rx="3" fill={color} />
              <circle cx="24" cy="17" r="11" fill={color} opacity="0.95" />
              <text
                x="43"
                y="21"
                fontSize="12"
                fontWeight="800"
                fill="#eaf2f9"
              >
                {team.name}
              </text>
            </g>

            <g transform={`translate(727 ${y})`}>
              <line
                x1="0"
                y1="13"
                x2="0"
                y2="-28"
                stroke="#eaf2f9"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <g className="mb-jelajah-finish-flag">
                <rect
                  x="0"
                  y="-28"
                  width="24"
                  height="16"
                  rx="2"
                  fill="#f2b93b"
                />
                <path d="M0 -28h12v8H0zM12 -20h12v8H12z" fill="#fff" opacity="0.9" />
              </g>
            </g>

            {moving ? (
              <g
                className="mb-jelajah-dust"
                style={{ transform: `translate(${markerX - 26}px, ${y + 2}px)` }}
              >
                <circle cx="0" cy="0" r="4" />
                <circle cx="-10" cy="3" r="3" />
                <circle cx="-18" cy="-1" r="2.5" />
              </g>
            ) : null}

            <g
              className={moving ? "mb-trail-marker mb-trail-moving" : "mb-trail-marker"}
              data-progress={Math.round(pct)}
              style={{
                transform: `translate(${markerX}px, ${y}px)`,
                transition: moving
                  ? "transform 600ms cubic-bezier(.25,.9,.3,1)"
                  : "transform 0s",
              }}
            >
              <ellipse cx="0" cy="18" rx="16" ry="4" fill="#06121f" opacity="0.42" />
              <circle cx="0" cy="0" r="23" fill={color} opacity="0.18" />
              <g style={{ transform: "translate(-22px, -23px)" }}>
                <TeamMascot
                  teamId={team.id as "elang" | "harimau" | "rusa" | "badak"}
                  pose={pose}
                  size={44}
                />
              </g>
              <g transform="translate(29 -12)">
                <rect
                  x="0"
                  y="0"
                  width="43"
                  height="24"
                  rx="12"
                  fill="#081726"
                  stroke={color}
                  strokeWidth="1.5"
                />
                <text
                  x="21.5"
                  y="16"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="900"
                  fill="#eaf2f9"
                >
                  {Math.round(pct)}%
                </text>
              </g>
            </g>
          </g>
        );
      })}

      <text x="145" y="253" fontSize="9" fontWeight="900" fill="#9fb6ca" letterSpacing="1.7">
        MULAI
      </text>
      <text x="690" y="253" textAnchor="end" fontSize="9" fontWeight="900" fill="#ffd57a" letterSpacing="1.7">
        FINIS
      </text>
    </svg>
  );
}
