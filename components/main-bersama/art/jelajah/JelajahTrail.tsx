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

const LANE_Y = [150, 245, 340, 435];
const LANE_PHASE = [0.1, 1.25, 2.35, 3.4];
const START_X = 190;
const END_X = 1000;
const TRAIL_SPAN = END_X - START_X;

const STARS: Array<[number, number, number, number]> = [
  [48, 32, 1.3, 0], [92, 78, 1.1, 1.2], [150, 45, 1.7, 2.4],
  [212, 95, 1.1, 3.6], [268, 31, 1.4, 1.8], [327, 68, 1.0, 4.1],
  [389, 42, 1.5, 2.8], [455, 88, 1.2, 0.8], [516, 30, 1.3, 3.3],
  [583, 71, 1.0, 2.1], [650, 39, 1.6, 4.7], [715, 87, 1.0, 1.1],
  [781, 32, 1.2, 3.8], [842, 69, 1.5, 2.6], [905, 41, 1.0, 4.3],
  [964, 91, 1.2, 1.5], [1025, 28, 1.5, 3.1], [1086, 66, 1.1, 0.4],
];

const FIREFLIES: Array<[number, number, number, number]> = [
  [248, 206, 6.2, .7], [305, 394, 7.4, 2.1], [380, 282, 8.1, 4.2],
  [478, 448, 6.8, 3.4], [688, 198, 7.8, 1.3], [748, 376, 8.4, 4.8],
  [826, 268, 6.5, 2.6], [930, 454, 7.2, .9],
];

const PINES: Array<[number, number, number]> = [
  [215, 118, .72], [245, 134, .9], [279, 110, .66], [320, 130, .82],
  [350, 115, .58], [384, 132, .76], [820, 118, .62], [854, 134, .82],
  [887, 112, .68], [918, 131, .74],
];

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function lanePoint(index: number, pct: number) {
  const t = clampPercent(pct) / 100;
  const phase = LANE_PHASE[index] ?? 0;
  const baseY = LANE_Y[index] ?? LANE_Y[LANE_Y.length - 1];
  const x = START_X + TRAIL_SPAN * t;
  const y =
    baseY +
    Math.sin(t * Math.PI * 2 + phase) * 6 +
    Math.sin(t * Math.PI * 4 + phase * .7) * 2.6;
  return { x, y };
}

function trailPath(index: number): string {
  const points: string[] = [];
  for (let pct = 0; pct <= 100; pct += 4) {
    const { x, y } = lanePoint(index, pct);
    points.push(`${pct === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return points.join(" ");
}

function Pine({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity=".88">
      <rect x="-2.5" y="30" width="5" height="12" rx="2" fill="#102739" />
      <path d="M0 -6 L18 22 H-18 Z" fill="#12344a" />
      <path d="M0 6 L22 36 H-22 Z" fill="#153f4e" />
      <path d="M0 18 L25 48 H-25 Z" fill="#174b52" />
    </g>
  );
}

function RockCluster({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity=".92">
      <path d="M-28 14 L-13 -9 L8 -2 L20 18 Z" fill="#243c4d" />
      <path d="M-5 18 L10 -17 L35 18 Z" fill="#2d4b59" />
      <path d="M13 18 L28 -5 L47 18 Z" fill="#1e3648" />
      <path d="M-13 -9 L-5 -2 L8 -2" fill="none" stroke="#527181" strokeWidth="2" opacity=".48" />
    </g>
  );
}

function Bridge({
  x,
  y,
  color,
  reached,
}: {
  x: number;
  y: number;
  color: string;
  reached: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-45" y="-9" width="90" height="18" rx="7" fill="#604b36" stroke="#81684c" strokeWidth="2" />
      {[-32, -16, 0, 16, 32].map((px) => (
        <line key={px} x1={px} y1="-7" x2={px} y2="7" stroke="#a48a66" strokeWidth="2" opacity=".7" />
      ))}
      <line x1="-44" y1="-12" x2="44" y2="-12" stroke="#3a3229" strokeWidth="2" />
      {reached ? (
        <line
          className="mb-jelajah-bridge-shine"
          x1="-35"
          y1="-13"
          x2="35"
          y2="-13"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
      ) : null}
    </g>
  );
}

function Checkpoint({
  x,
  y,
  reached,
  color,
  label,
}: {
  x: number;
  y: number;
  reached: boolean;
  color: string;
  label: string;
}) {
  return (
    <g className="mb-jelajah-checkpoint" data-reached={reached ? "true" : "false"}>
      <circle
        className="mb-jelajah-checkpoint-glow"
        cx={x}
        cy={y}
        r="18"
        fill={reached ? color : "#263f51"}
        opacity={reached ? .15 : .08}
      />
      <circle
        cx={x}
        cy={y}
        r="7"
        fill={reached ? color : "#375166"}
        stroke={reached ? "#eaf6f5" : "#6e8799"}
        strokeWidth="2"
      />
      <text
        x={x}
        y={y + 3.2}
        textAnchor="middle"
        fontSize="6.5"
        fontWeight="900"
        fill={reached ? "#071726" : "#a4b4c1"}
      >
        {label}
      </text>
    </g>
  );
}

interface JelajahTrailProps {
  teams: TrailTeam[];
  progress: Record<string, number>;
  compact?: boolean;
  poses?: Record<string, "ready" | "move" | "celebrate">;
}

/**
 * Jelajah Kata v3 — expedition world.
 *
 * Domain tetap hanya memberi normalized progress 0..100. Seluruh path,
 * landmark, checkpoint, depth dan motion di bawah murni presentation.
 * Empat regu tetap punya lane terpisah agar tie tidak pernah overlap.
 */
export function JelajahTrail({
  teams,
  progress,
  compact = false,
  poses,
}: JelajahTrailProps) {
  const shown = teams.slice(0, 4);
  const rawId = useId().replace(/:/g, "");
  const id = (name: string) => `${rawId}-${name}`;
  const viewBox = compact ? "0 68 1200 410" : "0 0 1200 520";

  return (
    <svg
      viewBox={viewBox}
      className="mb-trail mb-jelajah-stage"
      data-compact={compact ? "true" : "false"}
      role="img"
      aria-label="Perjalanan empat regu Jelajah Kata melalui hutan, jembatan, bukit, dan garis akhir"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#061426" />
          <stop offset=".48" stopColor="#0b2238" />
          <stop offset="1" stopColor="#163d50" />
        </linearGradient>
        <linearGradient id={id("aurora")} x1="0" y1="0" x2="1" y2=".12">
          <stop offset="0" stopColor="#35c8bd" stopOpacity="0" />
          <stop offset=".34" stopColor="#35c8bd" stopOpacity=".19" />
          <stop offset=".66" stopColor="#8a78df" stopOpacity=".15" />
          <stop offset="1" stopColor="#35c8bd" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id("ground")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#173f49" />
          <stop offset=".56" stopColor="#102e3c" />
          <stop offset="1" stopColor="#091b2b" />
        </linearGradient>
        <linearGradient id={id("trail")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8c7657" />
          <stop offset="1" stopColor="#5f513f" />
        </linearGradient>
        <linearGradient id={id("river")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#174a67" />
          <stop offset=".5" stopColor="#26708a" />
          <stop offset="1" stopColor="#16445f" />
        </linearGradient>
        <radialGradient id={id("moon")}>
          <stop offset="0" stopColor="#fff0c8" stopOpacity=".42" />
          <stop offset="1" stopColor="#fff0c8" stopOpacity="0" />
        </radialGradient>
        <filter id={id("soft")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      {/* Layer 0 — malam & atmosfer. */}
      <rect width="1200" height="520" rx="26" fill={`url(#${id("sky")})`} />
      {!compact ? (
        <path
          className="mb-jelajah-aurora"
          d="M-60 138 C170 36 365 145 575 69 C762 1 958 96 1260 18 L1260 -30 L-60 -30 Z"
          fill={`url(#${id("aurora")})`}
        />
      ) : null}

      <g aria-hidden>
        {STARS.slice(0, compact ? 12 : STARS.length).map(([x, y, r, delay], index) => (
          <circle
            key={index}
            className="mb-jelajah-star"
            cx={x}
            cy={y}
            r={r}
            fill="#dce9f5"
            style={{ animationDelay: `-${delay}s` }}
          />
        ))}
      </g>

      <circle cx="1080" cy="62" r="72" fill={`url(#${id("moon")})`} />
      <circle cx="1080" cy="62" r="27" fill="#eee4c5" />
      <circle cx="1071" cy="54" r="5" fill="#d8ccaa" opacity=".66" />
      <circle cx="1090" cy="70" r="3.6" fill="#d8ccaa" opacity=".58" />

      {/* Layer 1 — pegunungan jauh, langsung diadaptasi dari prototype Galeri Panggung. */}
      <path
        d="M-30 246 L145 134 L298 222 L460 116 L635 214 L812 128 L995 220 L1230 148 L1230 520 L-30 520 Z"
        fill="#0c2035"
      />
      <path
        d="M-30 296 L170 216 L366 278 L575 198 L785 274 L1006 214 L1230 258 L1230 520 L-30 520 Z"
        fill="#123047"
        opacity=".94"
      />

      {/* Layer 2 — hutan dan bukit tengah. */}
      <g aria-hidden>
        {PINES.map(([x, y, scale], index) => (
          <Pine key={index} x={x} y={y} scale={scale} />
        ))}
      </g>
      <path
        d="M0 188 C120 168 236 190 338 172 C455 151 514 184 628 170 C759 154 872 188 982 169 C1070 154 1148 165 1200 154 L1200 520 L0 520 Z"
        fill="#123243"
        opacity=".33"
      />

      {/* Layer 3 — tanah foreground + sungai sebagai landmark nyata. */}
      <path
        d="M0 118 C220 106 390 125 560 113 C760 99 984 126 1200 108 L1200 520 L0 520 Z"
        fill={`url(#${id("ground")})`}
        opacity=".9"
      />

      <path
        d="M555 91 C580 148 565 206 596 263 C627 320 596 387 635 458 C650 484 661 507 667 530 L770 530 C751 494 736 463 725 432 C705 376 735 315 699 257 C663 199 684 146 653 91 Z"
        fill={`url(#${id("river")})`}
        opacity=".82"
      />
      <path
        className="mb-jelajah-water-shine"
        d="M614 104 C626 160 615 208 645 264 C671 314 646 372 676 431"
        fill="none"
        stroke="#78bad1"
        strokeWidth="4"
        strokeLinecap="round"
        opacity=".26"
      />

      {!compact ? (
        <>
          <g className="mb-jelajah-location-label" transform="translate(322 90)">
            <rect x="-56" y="-15" width="112" height="30" rx="15" />
            <text textAnchor="middle" y="4">HUTAN KATA</text>
          </g>
          <g className="mb-jelajah-location-label" transform="translate(620 90)">
            <rect x="-72" y="-15" width="144" height="30" rx="15" />
            <text textAnchor="middle" y="4">JEMBATAN MAKNA</text>
          </g>
          <g className="mb-jelajah-location-label" transform="translate(860 90)">
            <rect x="-59" y="-15" width="118" height="30" rx="15" />
            <text textAnchor="middle" y="4">BUKIT CERITA</text>
          </g>
        </>
      ) : null}

      <g aria-hidden>
        <RockCluster x={842} y={127} scale={.7} />
        <RockCluster x={907} y={154} scale={.52} />
        <RockCluster x={964} y={127} scale={.42} />
      </g>

      {/* Finish landmark: tujuan bersama, tetapi empat posisi regu tetap terpisah. */}
      <g className="mb-jelajah-finish-landmark" transform="translate(1050 104)">
        <circle cx="56" cy="41" r="56" fill="#f7cc67" opacity=".06" />
        <path d="M15 334 V42 H28 V334" fill="#172d3e" stroke="#35566b" strokeWidth="2" />
        <path d="M99 334 V42 H112 V334" fill="#172d3e" stroke="#35566b" strokeWidth="2" />
        <path d="M21 49 H106" stroke="#35566b" strokeWidth="8" strokeLinecap="round" />
        <rect x="30" y="28" width="68" height="30" rx="8" fill="#0b2236" stroke="#4a6d7f" strokeWidth="2" />
        <text x="64" y="47" textAnchor="middle" fontSize="9" fontWeight="900" fill="#ffd975" letterSpacing="1.5">
          FINIS
        </text>
        <g className="mb-jelajah-finish-flag">
          <path d="M112 70 H150 V96 H112 Z" fill="#f2b93b" />
          <path d="M112 70 H131 V83 H112 Z M131 83 H150 V96 H131 Z" fill="#f2b93b" />
          <path d="M131 70 H150 V83 H131 Z M112 83 H131 V96 H112 Z" fill="#edf4f8" />
        </g>
      </g>

      {/* Empat rute. Completed trail menyala sesuai warna regu. */}
      {shown.map((team, index) => {
        const pct = clampPercent(progress[team.id] ?? 0);
        const color = TEAM_COLOR_VAR[team.id] ?? "var(--mb-primary)";
        const pose = poses?.[team.id] ?? "ready";
        const moving = pose === "move" || pose === "celebrate";
        const path = trailPath(index);
        const marker = lanePoint(index, pct);
        const mascotSize = compact ? 48 : 58;

        return (
          <g key={team.id} data-team={team.id} className="mb-jelajah-lane">
            {/* shadow + trail surface */}
            <path
              d={path}
              fill="none"
              stroke="#071724"
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity=".42"
            />
            <path
              d={path}
              fill="none"
              stroke={`url(#${id("trail")})`}
              strokeWidth="18"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={path}
              pathLength={100}
              fill="none"
              stroke={color}
              strokeWidth="22"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${pct} ${100 - pct}`}
              opacity=".11"
              className="mb-jelajah-progress-glow"
            />
            <path
              d={path}
              pathLength={100}
              fill="none"
              stroke={color}
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${pct} ${100 - pct}`}
              opacity=".88"
              className="mb-jelajah-progress-line"
            />

            {/* checkpoint 25 / 50 / 75. */}
            {[25, 50, 75].map((checkpoint) => {
              const cp = lanePoint(index, checkpoint);
              return (
                <Checkpoint
                  key={checkpoint}
                  x={cp.x}
                  y={cp.y}
                  reached={pct >= checkpoint}
                  color={color}
                  label={String(checkpoint)}
                />
              );
            })}

            {/* Bridge is physical scenery, not a progress mechanic. */}
            <Bridge
              x={lanePoint(index, 50).x}
              y={lanePoint(index, 50).y}
              color={color}
              reached={pct >= 50}
            />

            {/* Team identity plaque. */}
            <g transform={`translate(14 ${(LANE_Y[index] ?? 435) - 23})`}>
              <rect
                width="150"
                height="46"
                rx="17"
                fill="#081e31"
                stroke="rgba(255,255,255,.12)"
              />
              <rect width="7" height="46" rx="3.5" fill={color} />
              <circle cx="29" cy="23" r="13" fill={color} opacity=".92" />
              <path d="M24 23h10M29 18v10" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".8" />
              <text x="50" y="20" fontSize="11" fontWeight="700" fill="#8ea8b9">
                REGU
              </text>
              <text x="50" y="35" fontSize="13" fontWeight="900" fill="#eaf2f9">
                {team.name.replace(/^Regu\s+/i, "")}
              </text>
            </g>

            {/* Movement payoff: directional streak + dust, inspired by prototype setPawnJ(). */}
            {moving ? (
              <g
                className="mb-jelajah-motion-trail"
                style={{ transform: `translate(${marker.x - 26}px, ${marker.y}px)`, color }}
              >
                <path d="M-50 -9 H-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity=".34" />
                <path d="M-42 3 H-12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".24" />
                <path d="M-33 12 H-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".18" />
                <g className="mb-jelajah-dust">
                  <circle cx="-8" cy="16" r="5" />
                  <circle cx="-20" cy="18" r="3.8" />
                  <circle cx="-31" cy="14" r="3" />
                </g>
              </g>
            ) : null}

            <g
              className={moving ? "mb-trail-marker mb-trail-moving" : "mb-trail-marker"}
              data-progress={Math.round(pct)}
              style={{
                transform: `translate(${marker.x}px, ${marker.y}px)`,
                transition: moving
                  ? "transform 600ms cubic-bezier(.22,.9,.3,1)"
                  : "transform 0s",
              }}
            >
              <ellipse cx="0" cy="26" rx="25" ry="7" fill="#06121f" opacity=".42" />
              <circle cx="0" cy="0" r={compact ? 28 : 33} fill={color} opacity=".12" />
              <circle className="mb-jelajah-marker-ring" cx="0" cy="0" r={compact ? 31 : 36} fill="none" stroke={color} strokeWidth="1.5" opacity=".22" />
              <foreignObject
                x={-mascotSize / 2}
                y={-mascotSize / 2 - 3}
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

              <g transform={`translate(${compact ? 30 : 36} -14)`}>
                <rect
                  width={compact ? 47 : 53}
                  height="28"
                  rx="14"
                  fill="#061827"
                  stroke={color}
                  strokeWidth="1.5"
                />
                <text
                  x={compact ? 23.5 : 26.5}
                  y="18.5"
                  textAnchor="middle"
                  fontSize={compact ? 11 : 12}
                  fontWeight="900"
                  fill="#edf5f8"
                >
                  {Math.round(pct)}%
                </text>
              </g>
            </g>
          </g>
        );
      })}

      {/* Foreground micro-life. */}
      {!compact ? (
        <g aria-hidden>
          {FIREFLIES.map(([x, y, duration, delay], index) => (
            <circle
              key={index}
              className="mb-jelajah-firefly"
              cx={x}
              cy={y}
              r="2.3"
              fill="#ffe6a5"
              style={{
                animationDuration: `${duration}s`,
                animationDelay: `-${delay}s`,
              }}
            />
          ))}
        </g>
      ) : null}

      <text x="165" y="500" fontSize="9" fontWeight="900" fill="#91a9b9" letterSpacing="1.8">
        MULAI
      </text>
      <text x="1028" y="500" textAnchor="end" fontSize="9" fontWeight="900" fill="#ffd57a" letterSpacing="1.8">
        GARIS AKHIR
      </text>
    </svg>
  );
}
