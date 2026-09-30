"use client";

import { TeamMascot } from "../registry";

interface TrailTeam {
  id: string;
  name: string;
}

const TEAM_COLORS: Record<string, string> = {
  elang: "#f5b83d",
  harimau: "#f06a4d",
  rusa: "#d58b57",
  badak: "#718a9a",
};

const LANE_OFFSETS = [-42, -14, 14, 42];
const START_X = 255;
const MASCOT_TRAVEL = 250;
const BACKGROUND_TRAVEL = 320;

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/**
 * Jelajah Kata — latar dunia menjadi elemen yang bergerak.
 *
 * Kemajuan regu tetap memakai nilai progress dari engine.
 * Maskot hanya maju sedikit; pergerakan utama terasa dari pergeseran latar.
 */
export function JelajahTrail({
  teams,
  progress,
  compact = false,
  poses,
}: {
  teams: TrailTeam[];
  progress: Record<string, number>;
  compact?: boolean;
  poses?: Record<string, "ready" | "move" | "celebrate">;
}) {
  const shown = teams.slice(0, 4);
  const sceneProgress = Math.max(
    0,
    ...shown.map((team) => clampPercent(progress[team.id] ?? 0)),
  );

  const backgroundOffset =
    -(sceneProgress / 100) * BACKGROUND_TRAVEL;
  const viewBox = compact ? "0 90 1200 440" : "0 0 1200 600";

  return (
    <div
      className="mb-jelajah-world"
      data-compact={compact ? "true" : "false"}
      style={
        {
          "--mb-bg-shift": `${backgroundOffset}px`,
        } as React.CSSProperties
      }
    >
      <svg
        viewBox={viewBox}
        className="mb-jelajah-world-svg"
        role="img"
        aria-label="Dunia perjalanan Jelajah Kata"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="jelajah-vignette" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#10283a" stopOpacity=".08" />
            <stop offset=".72" stopColor="#10283a" stopOpacity="0" />
            <stop offset="1" stopColor="#10283a" stopOpacity=".12" />
          </linearGradient>
        </defs>

        <clipPath id="jelajah-world-clip">
          <rect x="0" y="0" width="1200" height="600" rx="28" />
        </clipPath>

        <g clipPath="url(#jelajah-world-clip)">
          <g
            className="mb-jelajah-background"
            style={{
              transform: `translateX(${backgroundOffset}px)`,
            }}
          >
            <image
              href="/main-bersama/jelajah/backgrounds/jelajah-latar-utama.webp"
              x="0"
              y="0"
              width="1600"
              height="600"
              preserveAspectRatio="none"
            />
            <image
              href="/main-bersama/jelajah/backgrounds/jelajah-latar-utama.webp"
              x="1600"
              y="0"
              width="1600"
              height="600"
              preserveAspectRatio="none"
            />
          </g>

          <rect
            x="0"
            y="0"
            width="1200"
            height="600"
            fill="url(#jelajah-vignette)"
            pointerEvents="none"
          />

          {shown.map((team, index) => {
            const pct = clampPercent(progress[team.id] ?? 0);
            const x = START_X + (pct / 100) * MASCOT_TRAVEL;
            const y = 470 + (LANE_OFFSETS[index] ?? 0);
            const color = TEAM_COLORS[team.id] ?? "#0f766e";
            const pose = poses?.[team.id] ?? "ready";
            const moving = pose === "move";

            return (
              <g
                key={team.id}
                className={moving ? "mb-jelajah-mascot is-moving" : "mb-jelajah-mascot"}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  color,
                }}
              >
                <ellipse
                  cx="0"
                  cy="30"
                  rx={compact ? 27 : 34}
                  ry="9"
                  fill="#10283a"
                  opacity=".22"
                />

                <g className="mb-jelajah-mascot-art">
                  <foreignObject
                    x={compact ? -28 : -36}
                    y={compact ? -54 : -66}
                    width={compact ? 56 : 72}
                    height={compact ? 72 : 88}
                  >
                    <div
                      xmlns="http://www.w3.org/1999/xhtml"
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <TeamMascot
                        teamId={team.id}
                        pose={pose}
                        size={compact ? 48 : 62}
                        name={team.name}
                        eager
                      />
                    </div>
                  </foreignObject>
                </g>

                <g className="mb-jelajah-team-tag">
                  <rect
                    x={compact ? -39 : -48}
                    y={compact ? 38 : 46}
                    width={compact ? 78 : 96}
                    height="22"
                    rx="11"
                    fill="#ffffff"
                    opacity=".92"
                  />
                  <circle
                    cx={compact ? -28 : -35}
                    cy={compact ? 49 : 57}
                    r="4"
                    fill={color}
                  />
                  <text
                    x={compact ? -20 : -26}
                    y={compact ? 53 : 61}
                    fontSize={compact ? "9" : "10"}
                    fontWeight="800"
                    fill="#17354b"
                  >
                    {team.name}
                  </text>
                </g>

                {moving ? (
                  <g className="mb-jelajah-dust">
                    <circle cx="-25" cy="20" r="5" />
                    <circle cx="-40" cy="24" r="3.5" />
                    <circle cx="-52" cy="19" r="2.5" />
                  </g>
                ) : null}

                {pose === "celebrate" ? (
                  <g className="mb-jelajah-celebrate" aria-hidden="true">
                    <circle cx="-35" cy="-42" r="3" />
                    <circle cx="32" cy="-48" r="3" />
                    <circle cx="45" cy="-28" r="2.5" />
                    <path d="M-30-35l-8-8M30-40l8-8" />
                  </g>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="mb-jelajah-world-caption">
        <span>🌿 Dunia Jelajah Kata</span>
        <strong>Perjalanan terus bergerak bersama kemajuan regu</strong>
      </div>

      <style jsx>{`
        .mb-jelajah-world {
          position: relative;
          width: 100%;
          overflow: hidden;
          border-radius: 26px;
          background: #dff3ec;
          box-shadow: 0 18px 50px rgba(23, 53, 75, 0.12);
        }

        .mb-jelajah-world-svg {
          display: block;
          width: 100%;
          height: auto;
          min-height: 360px;
        }

        .mb-jelajah-background {
          transition: transform 900ms cubic-bezier(.22,.9,.3,1);
          will-change: transform;
        }

        .mb-jelajah-mascot {
          transition: transform 900ms cubic-bezier(.22,.9,.3,1);
          transform-box: fill-box;
          transform-origin: center;
        }

        .mb-jelajah-mascot.is-moving {
          animation: jelajah-bob .6s ease-in-out infinite alternate;
        }

        .mb-jelajah-mascot-art {
          filter: drop-shadow(0 7px 8px rgba(16, 40, 58, .16));
        }

        .mb-jelajah-team-tag text {
          font-family: inherit;
          dominant-baseline: middle;
        }

        .mb-jelajah-dust circle {
          fill: currentColor;
          opacity: .25;
          animation: jelajah-dust .6s ease-out infinite;
        }

        .mb-jelajah-dust circle:nth-child(2) {
          animation-delay: .12s;
        }

        .mb-jelajah-dust circle:nth-child(3) {
          animation-delay: .22s;
        }

        .mb-jelajah-celebrate circle {
          fill: #ffd76a;
          animation: jelajah-pop .8s ease-out both;
        }

        .mb-jelajah-celebrate path {
          fill: none;
          stroke: #ffd76a;
          stroke-width: 3;
          stroke-linecap: round;
          animation: jelajah-pop .8s ease-out both;
        }

        .mb-jelajah-world-caption {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 14px 12px;
          background: rgba(255,255,255,.94);
          border-top: 1px solid rgba(23,53,75,.08);
        }

        .mb-jelajah-world-caption span {
          color: #0f766e;
          font-size: .68rem;
          font-weight: 900;
        }

        .mb-jelajah-world-caption strong {
          color: #526a77;
          font-size: .68rem;
          font-weight: 700;
        }

        @keyframes jelajah-bob {
          from { transform: translateY(0); }
          to { transform: translateY(-5px); }
        }

        @keyframes jelajah-dust {
          from { opacity: .28; transform: scale(1); }
          to { opacity: 0; transform: translate(-14px, 8px) scale(.4); }
        }

        @keyframes jelajah-pop {
          0% { opacity: 0; transform: scale(.4); }
          35% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.3); }
        }

        @media (prefers-reduced-motion: reduce) {
          .mb-jelajah-background,
          .mb-jelajah-mascot {
            transition: none;
          }

          .mb-jelajah-mascot.is-moving,
          .mb-jelajah-dust circle,
          .mb-jelajah-celebrate circle,
          .mb-jelajah-celebrate path {
            animation: none;
          }
        }

        @media (max-width: 760px) {
          .mb-jelajah-world-caption {
            flex-direction: column;
            align-items: flex-start;
          }

          .mb-jelajah-world-svg {
            min-height: 300px;
          }
        }
      `}</style>
    </div>
  );
}
