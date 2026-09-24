"use client";
// ─── Jelajah Trail 8B — "peta perjalanan bahasa" (bukan arena PvP).
// Winding trail + 4 lane-offset markers (tie-safe) + START/FINISH.
// 8C.1: markers animate READY → MOVE → CELEBRATE via CSS transform;
// marker now renders TeamMascot face (not letter) so pose tells the story.

import { useMemo } from "react";
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

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

// Trail centerline waypoints (matches the drawn path below).
const TRAIL_PTS: Array<[number, number]> = [
  [70, 205],
  [200, 190],
  [300, 140],
  [420, 135],
  [520, 180],
  [640, 150],
  [740, 95],
];

function trailY(x: number): number {
  const pts = TRAIL_PTS;
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if (x <= x1) {
      const k = (x - x0) / (x1 - x0);
      return y0 + k * (y1 - y0);
    }
  }
  return pts[pts.length - 1][1];
}

interface JelajahTrailProps {
  teams: TrailTeam[];
  progress: Record<string, number>;
  compact?: boolean;
  /** 8C.1: per-team transient pose (MOVING/CELEBRATE/READY). */
  poses?: Record<string, "ready" | "move" | "celebrate">;
}

export function JelajahTrail({
  teams,
  progress,
  compact = false,
  poses,
}: JelajahTrailProps) {
  const shown = teams.slice(0, 4);
  const t = (id: string) => clamp01(progress[id] ?? 0) / 100;
  // Tie nudge: teams within 3pp share x-shift alternation.
  const tiedAt = (id: string) =>
    shown.filter((o) => o.id !== id && Math.abs(t(o.id) - t(id)) < 0.03)
      .length > 0;

  const markerNodes = useMemo(
    () =>
      shown.map((team, i) => {
        const raw = t(team.id);
        const x =
          70 + raw * 660 + (tiedAt(team.id) ? (i % 2 === 0 ? -13 : 13) : 0);
        const y = trailY(x) - 22 + (i - 1.5) * 9;
        const color = TEAM_COLOR_VAR[team.id] ?? "var(--mb-primary)";
        const pose = poses?.[team.id] ?? "ready";
        const isMoving = pose === "move" || pose === "celebrate";
        return { team, i, raw, x, y, color, pose, isMoving };
      }),
    [shown, t, poses, tiedAt],
  );

  return (
    <svg
      viewBox="0 0 800 260"
      className="mb-trail"
      role="img"
      aria-label="Peta perjalanan regu"
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      {/* sky + sun + clouds */}
      <rect
        x="0"
        y="0"
        width="800"
        height="260"
        rx="18"
        fill="var(--mb-jelajah-sky)"
        opacity="0.35"
      />
      <circle cx="690" cy="52" r="26" fill="var(--mb-jelajah-highlight)" />
      <g fill="#ffffff" opacity="0.85">
        <ellipse cx="150" cy="48" rx="46" ry="14" />
        <ellipse cx="185" cy="40" rx="30" ry="12" />
        <ellipse cx="470" cy="70" rx="38" ry="11" />
      </g>
      {/* hills */}
      <path
        d="M0 210 Q 200 150 400 195 T 800 185 L800 260 L0 260 Z"
        fill="var(--mb-jelajah-land)"
        opacity="0.55"
      />
      <path
        d="M0 235 Q 260 195 520 225 T 800 220 L800 260 L0 260 Z"
        fill="var(--mb-jelajah-land)"
        opacity="0.8"
      />
      {/* winding trail (matches TRAIL_PTS centerline) */}
      <path
        d="M70 205 L200 190 L300 140 L420 135 L520 180 L640 150 L740 95"
        fill="none"
        stroke="var(--mb-jelajah-trail)"
        strokeWidth={compact ? 7 : 9}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2 14"
      />
      {/* literacy motifs — small scenery resting on the hills */}
      <g opacity="0.9" aria-hidden>
        {/* open book */}
        <g transform="translate(140 214)">
          <path d="M0 0 Q9 -6 18 0 L18 13 Q9 7 0 13 Z" fill="#fff" />
          <path d="M18 0 Q27 -6 36 0 L36 13 Q27 7 18 13 Z" fill="#fef3c7" />
          <path d="M18 0 L18 13" stroke="#13253a" strokeWidth="1.4" />
        </g>
        {/* Aa */}
        <text
          x="592"
          y="232"
          fontSize="22"
          fontWeight="900"
          fill="#fff"
          opacity="0.95"
          fontFamily="inherit"
        >
          Aa
        </text>
        {/* speech mark */}
        <text
          x="352"
          y="234"
          fontSize="26"
          fontWeight="900"
          fill="#fff"
          opacity="0.9"
          fontFamily="inherit"
        >
          ?
        </text>
      </g>
      {/* START */}
      <g>
        <rect x="34" y="188" width="64" height="26" rx="13" fill="#13253a" />
        <text
          x="66"
          y="206"
          textAnchor="middle"
          fontSize="13"
          fontWeight="800"
          fill="#fff"
          letterSpacing="2"
        >
          START
        </text>
      </g>
      {/* FINISH — glowing book monument (language monument, not racing flag) */}
      <g>
        <circle
          cx="740"
          cy="62"
          r="30"
          fill="var(--mb-jelajah-highlight)"
          opacity="0.55"
        />
        <rect x="724" y="96" width="32" height="10" rx="3" fill="#13253a" />
        <g transform="translate(718 62)">
          <path d="M0 0 Q11 -8 22 0 L22 18 Q11 10 0 18 Z" fill="#fff" />
          <path
            d="M22 0 Q33 -8 44 0 L44 18 Q33 10 22 18 Z"
            fill="var(--mb-jelajah-highlight)"
          />
          <path d="M22 0 L22 18" stroke="#13253a" strokeWidth="2" />
        </g>
      </g>
      {/* checkpoint dots ride the trail */}
      {[0.25, 0.5, 0.75].map((k) => {
        const x = 70 + k * 660;
        return (
          <circle
            key={k}
            cx={x}
            cy={trailY(x)}
            r="5"
            fill="#fff"
            opacity="0.9"
          />
        );
      })}
      {/* team markers ride the trail; lanes prevent total overlap */}
      {markerNodes.map(({ team, i, x, y, color, pose, isMoving }) => (
        <g
          key={team.id}
          data-team={team.id}
          data-progress={Math.round(t(team.id) * 100)}
          className={
            isMoving ? "mb-trail-marker mb-trail-moving" : "mb-trail-marker"
          }
          style={{
            transform: `translate(${x}px, ${y}px)`,
            transition: isMoving ? "transform 600ms ease-out" : "transform 0s",
          }}
        >
          {/* marker shadow */}
          <ellipse
            cx={0}
            cy={20}
            rx="16"
            ry="4.5"
            fill="#13253a"
            opacity="0.18"
          />
          {/* TeamMascot face instead of letter circle — pose tells the story */}
          <g style={{ transform: "translate(-22px, -22px)" }}>
            <TeamMascot
              teamId={team.id as "elang" | "harimau" | "rusa" | "badak"}
              pose={pose}
              size={44}
            />
          </g>
          {/* progress label beneath marker */}
          <text
            x={0}
            y={34}
            textAnchor="middle"
            fontSize="11"
            fontWeight="800"
            fill={color}
            opacity="0.95"
          >
            {Math.round(t(team.id) * 100)}%
          </text>
        </g>
      ))}
    </svg>
  );
}
