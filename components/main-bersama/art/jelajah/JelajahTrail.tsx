"use client";

import { useId } from "react";
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

const LANE_OFFSETS = [-52, -18, 18, 52];
const START_X = 150;
const END_X = 1050;
const SPAN_X = END_X - START_X;
const SCENE_WIDTH = 1200;
const SCENE_HEIGHT = 600;
const BACKGROUND_COUNT = 7;

const JELAJAH_BACKGROUNDS = [
  "https://raw.githubusercontent.com/dominikus02-source/bahasa-cerdas/2fff163d2e776aadb8565c88e47b5ce60d86e559/public/main-bersama/jelajah/backgrounds/jk-1.png",
  "https://raw.githubusercontent.com/dominikus02-source/bahasa-cerdas/2fff163d2e776aadb8565c88e47b5ce60d86e559/public/main-bersama/jelajah/backgrounds/jk-2.png",
  "https://raw.githubusercontent.com/dominikus02-source/bahasa-cerdas/2fff163d2e776aadb8565c88e47b5ce60d86e559/public/main-bersama/jelajah/backgrounds/jk-3.png",
  "https://raw.githubusercontent.com/dominikus02-source/bahasa-cerdas/2fff163d2e776aadb8565c88e47b5ce60d86e559/public/main-bersama/jelajah/backgrounds/jk-4.png",
  "https://raw.githubusercontent.com/dominikus02-source/bahasa-cerdas/2fff163d2e776aadb8565c88e47b5ce60d86e559/public/main-bersama/jelajah/backgrounds/jk-5.png",
  "https://raw.githubusercontent.com/dominikus02-source/bahasa-cerdas/2fff163d2e776aadb8565c88e47b5ce60d86e559/public/main-bersama/jelajah/backgrounds/jk-6.png",
  "https://raw.githubusercontent.com/dominikus02-source/bahasa-cerdas/2fff163d2e776aadb8565c88e47b5ce60d86e559/public/main-bersama/jelajah/backgrounds/jk-7.png",
] as const;

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function centerPoint(pct: number) {
  const t = clampPercent(pct) / 100;
  const x = START_X + SPAN_X * t;
  const y =
    455 -
    282 * t +
    Math.sin(t * Math.PI * 2.05 + 0.35) * 54 +
    Math.sin(t * Math.PI * 4.15) * 18;
  return { x, y };
}

function tangentAt(pct: number) {
  const a = centerPoint(Math.max(0, pct - 0.6));
  const b = centerPoint(Math.min(100, pct + 0.6));
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    dx: dx / len,
    dy: dy / len,
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}

function lanePoint(index: number, pct: number) {
  const center = centerPoint(pct);
  const tangent = tangentAt(pct);
  const offset = LANE_OFFSETS[index] ?? 0;
  return {
    x: center.x - tangent.dy * offset,
    y: center.y + tangent.dx * offset,
    angle: tangent.angle,
  };
}

function buildPath(getPoint: (pct: number) => { x: number; y: number }) {
  const parts: string[] = [];
  for (let pct = 0; pct <= 100; pct += 2) {
    const p = getPoint(pct);
    parts.push(`${pct === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
  }
  return parts.join(" ");
}

interface JelajahTrailProps {
  teams: TrailTeam[];
  progress: Record<string, number>;
  compact?: boolean;
  poses?: Record<string, "ready" | "move" | "celebrate">;
}

/**
 * Jelajah Kata — latar ilustrasi menjadi dunia perjalanan utama.
 * Latar bergerak mengikuti progres kelas; maskot dan indikator regu
 * tetap berada di atasnya sebagai lapisan permainan.
 */
export function JelajahTrail({
  teams,
  progress,
  compact = false,
  poses,
}: JelajahTrailProps) {
  const shown = teams.slice(0, 4);
  const idBase = useId().replace(/:/g, "");
  const sceneProgress = Math.max(
    0,
    ...shown.map((team) => clampPercent(progress[team.id] ?? 0)),
  );
  const backgroundOffset =
    (sceneProgress / 100) * (BACKGROUND_COUNT - 1) * SCENE_WIDTH;
  const viewBox = compact ? "0 105 1200 390" : "0 0 1200 600";
  const clipId = `${idBase}-world`;

  return (
    <svg
      viewBox={viewBox}
      className="mb-trail mb-jelajah-stage mb-jelajah-stage-v4"
      data-compact={compact ? "true" : "false"}
      role="img"
      aria-label="Perjalanan regu Jelajah Kata menuju garis akhir"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={SCENE_WIDTH} height={SCENE_HEIGHT} rx="28" />
        </clipPath>
      </defs>

      {/* Dunia ilustrasi utama. Tidak lagi ditimpa gunung, sungai, atau jalan SVG lama. */}
      <g clipPath={`url(#${clipId})`} aria-hidden="true">
        <g
          transform={`translate(-${backgroundOffset} 0)`}
          style={{ transition: "transform 900ms cubic-bezier(.22,.9,.3,1)" }}
        >
          {JELAJAH_BACKGROUNDS.map((src, index) => (
            <image
              key={src}
              href={src}
              x={index * SCENE_WIDTH}
              y="0"
              width={SCENE_WIDTH}
              height={SCENE_HEIGHT}
              preserveAspectRatio="xMidYMid slice"
              decoding="async"
            />
          ))}
        </g>
      </g>

      {/* Indikator jalur regu — tipis agar tidak menutupi ilustrasi dunia. */}
      {shown.map((team, index) => {
        const pct = clampPercent(progress[team.id] ?? 0);
        const color = TEAM_COLOR_VAR[team.id] ?? "var(--mb-primary)";
        const pose = poses?.[team.id] ?? "ready";
        const moving = pose === "move" || pose === "celebrate";
        const lanePath = buildPath((pointPct) => lanePoint(index, pointPct));
        const marker = lanePoint(index, pct);
        const badgeLeft = pct > 82;
        const mascotSize = compact ? 46 : 62;

        return (
          <g key={team.id} data-team={team.id} className="mb-jelajah-v4-lane">
            <path
              d={lanePath}
              fill="none"
              stroke="#ffffff"
              strokeWidth={compact ? 7 : 9}
              strokeLinecap="round"
              opacity=".16"
            />
            <path
              d={lanePath}
              pathLength={100}
              fill="none"
              stroke={color}
              strokeWidth={compact ? 4 : 5}
              strokeLinecap="round"
              strokeDasharray={`${pct} ${100 - pct}`}
              className="mb-jelajah-v4-progress"
            />

            {[25, 50, 75].map((checkpoint) => {
              const cp = lanePoint(index, checkpoint);
              return (
                <circle
                  key={checkpoint}
                  cx={cp.x}
                  cy={cp.y}
                  r={compact ? 4 : 5}
                  fill={pct >= checkpoint ? color : "#ffffff"}
                  opacity={pct >= checkpoint ? 0.9 : 0.35}
                />
              );
            })}

            <g
              className={
                moving
                  ? "mb-trail-marker mb-trail-moving mb-jelajah-v4-marker"
                  : "mb-trail-marker mb-jelajah-v4-marker"
              }
              style={{
                transform: `translate(${marker.x}px, ${marker.y}px)`,
                transition: moving
                  ? "transform 620ms cubic-bezier(.22,.9,.3,1)"
                  : "transform 0s",
              }}
            >
              <ellipse
                cx="0"
                cy={compact ? 21 : 28}
                rx={compact ? 20 : 28}
                ry={compact ? 5 : 7}
                fill="#06121f"
                opacity=".35"
              />
              <circle r={compact ? 26 : 36} fill={color} opacity=".12" />
              <circle
                className="mb-jelajah-v4-marker-ring"
                r={compact ? 29 : 40}
                fill="none"
                stroke={color}
                strokeWidth="1.7"
                opacity=".3"
              />

              <foreignObject
                x={-mascotSize / 2}
                y={-mascotSize / 2 - 4}
                width={mascotSize}
                height={mascotSize}
                overflow="visible"
              >
                <div
                  style={{
                    width: mascotSize,
                    height: mascotSize,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <TeamMascot
                    teamId={team.id as "elang" | "harimau" | "rusa" | "badak"}
                    pose={pose}
                    size={mascotSize}
                    eager={!compact}
                  />
                </div>
              </foreignObject>

              <g
                transform={`translate(${
                  badgeLeft ? (compact ? -88 : -116) : compact ? 31 : 42
                } ${compact ? -20 : -27})`}
              >
                <rect
                  width={compact ? 70 : 98}
                  height={compact ? 27 : 34}
                  rx={compact ? 13.5 : 17}
                  fill="#071a2b"
                  fillOpacity=".86"
                  stroke={color}
                  strokeWidth="1.5"
                />
                {!compact ? (
                  <text
                    x="12"
                    y="21"
                    fontSize="10"
                    fontWeight="850"
                    fill="#e8f1f6"
                  >
                    {team.name.replace(/^Regu\s+/i, "").toUpperCase()}
                  </text>
                ) : null}
                <text
                  x={compact ? 35 : 78}
                  y={compact ? 18 : 22}
                  textAnchor={compact ? "middle" : "middle"}
                  fontSize={compact ? 11 : 11.5}
                  fontWeight="900"
                  fill={color}
                >
                  {Math.round(pct)}%
                </text>
              </g>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
