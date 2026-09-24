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

const STARS: Array<[number, number, number, number]> = [
  [58, 48, 1.4, .2], [105, 92, 1.1, 1.1], [168, 38, 1.7, 2.4],
  [235, 84, 1.2, 3.8], [302, 47, 1.4, 1.9], [366, 98, 1.1, 4.2],
  [436, 38, 1.5, 2.7], [506, 79, 1.1, .8], [585, 34, 1.4, 3.4],
  [657, 76, 1.1, 2.1], [731, 41, 1.6, 4.6], [808, 92, 1.1, 1.2],
  [878, 34, 1.3, 3.7], [952, 74, 1.5, 2.5], [1024, 39, 1.1, 4.1],
  [1092, 92, 1.3, 1.5],
];

const FIREFLIES: Array<[number, number, number, number]> = [
  [188, 422, 6.3, .5], [252, 360, 7.2, 2.3], [322, 286, 8.0, 4.1],
  [424, 366, 6.7, 3.0], [742, 282, 7.8, 1.4], [832, 238, 8.3, 4.6],
  [904, 184, 6.6, 2.4], [978, 260, 7.1, .8],
];

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
    Math.sin(t * Math.PI * 2.05 + .35) * 54 +
    Math.sin(t * Math.PI * 4.15) * 18;
  return { x, y };
}

function tangentAt(pct: number) {
  const a = centerPoint(Math.max(0, pct - .6));
  const b = centerPoint(Math.min(100, pct + .6));
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

function Pine({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-3" y="30" width="6" height="15" rx="2" fill="#10293a" />
      <path d="M0 -10 18 18H-18Z" fill="#12394a" />
      <path d="M0 2 24 34H-24Z" fill="#164857" />
      <path d="M0 16 29 52H-29Z" fill="#185760" />
    </g>
  );
}

function Boulder({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-28 16-11-13 9-5 25 18Z" fill="#263f4e" />
      <path d="M-2 18 13-20 38 18Z" fill="#31505d" />
      <path d="M-12-10-4-3 8-4" fill="none" stroke="#668291" strokeWidth="2" opacity=".42" />
    </g>
  );
}

function Lantern({
  x,
  y,
  active,
}: {
  x: number;
  y: number;
  active: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {active ? <circle className="mb-jelajah-v4-lantern-glow" r="30" fill="#ffd56a" opacity=".12" /> : null}
      <path d="M0 18V3" stroke="#35586c" strokeWidth="4" strokeLinecap="round" />
      <path d="M-8 2Q0-7 8 2" fill="none" stroke="#53758a" strokeWidth="2.5" />
      <circle r={active ? 7 : 5.5} fill={active ? "#ffd56a" : "#4a6272"} />
    </g>
  );
}

function ZoneBadge({
  x,
  y,
  label,
  active,
}: {
  x: number;
  y: number;
  label: string;
  active: boolean;
}) {
  return (
    <g
      className="mb-jelajah-v4-zone"
      data-active={active ? "true" : "false"}
      transform={`translate(${x} ${y})`}
    >
      <rect x="-62" y="-17" width="124" height="34" rx="17" />
      <circle cx="-44" cy="0" r="5" />
      <text x="9" y="4" textAnchor="middle">{label}</text>
    </g>
  );
}

function BridgeLandmark({ active }: { active: boolean }) {
  const p = centerPoint(50);
  const t = tangentAt(50);
  return (
    <g transform={`translate(${p.x} ${p.y}) rotate(${t.angle})`}>
      <rect x="-70" y="-60" width="140" height="120" rx="18" fill="#071b2a" opacity=".24" />
      <rect x="-67" y="-51" width="134" height="102" rx="14" fill="#604d37" stroke="#8c7454" strokeWidth="3" />
      {[-48, -24, 0, 24, 48].map((x) => (
        <line key={x} x1={x} y1="-46" x2={x} y2="46" stroke="#a58a63" strokeWidth="4" opacity=".72" />
      ))}
      <line x1="-61" y1="-56" x2="61" y2="-56" stroke="#2f302b" strokeWidth="5" />
      <line x1="-61" y1="56" x2="61" y2="56" stroke="#2f302b" strokeWidth="5" />
      {active ? (
        <rect
          className="mb-jelajah-v4-bridge-glow"
          x="-67"
          y="-51"
          width="134"
          height="102"
          rx="14"
          fill="none"
          stroke="#ffd76a"
          strokeWidth="3"
          opacity=".34"
        />
      ) : null}
    </g>
  );
}

function FinishGate({ active }: { active: boolean }) {
  const p = centerPoint(100);
  const t = tangentAt(100);
  return (
    <g
      className="mb-jelajah-v4-finish"
      data-active={active ? "true" : "false"}
      transform={`translate(${p.x} ${p.y}) rotate(${t.angle})`}
    >
      <circle cx="0" cy="0" r="94" />
      <path d="M-54 74V-64H-39V74M54 74V-64H39V74M-47-58H47" fill="none" stroke="#d9e7ed" strokeWidth="8" strokeLinecap="round" />
      <rect x="-45" y="-84" width="90" height="34" rx="10" />
      <text x="0" y="-62" textAnchor="middle">GARIS AKHIR</text>
      <path d="M48-44H100V-10H48Z" fill="#f2b93a" />
      <path d="M48-44H74V-27H48ZM74-27H100V-10H74Z" fill="#f0b93a" />
      <path d="M74-44H100V-27H74ZM48-27H74V-10H48Z" fill="#edf4f8" />
      {active ? <circle className="mb-jelajah-v4-finish-pulse" cx="0" cy="-68" r="62" /> : null}
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
 * Jelajah Kata v4 — satu peta ekspedisi, empat jalur regu.
 * Backend tetap hanya mengirim progress 0..100. Seluruh route geometry,
 * world reveal, landmark, dan animation di sini murni presentation.
 */
export function JelajahTrail({
  teams,
  progress,
  compact = false,
  poses,
}: JelajahTrailProps) {
  const shown = teams.slice(0, 4);
  const idBase = useId().replace(/:/g, "");
  const id = (name: string) => `${idBase}-${name}`;
  const sceneProgress = Math.max(0, ...shown.map((team) => clampPercent(progress[team.id] ?? 0)));
  const roadPath = buildPath(centerPoint);
  const viewBox = compact ? "0 105 1200 390" : "0 0 1200 600";

  return (
    <svg
      viewBox={viewBox}
      className="mb-trail mb-jelajah-stage mb-jelajah-stage-v4"
      data-compact={compact ? "true" : "false"}
      role="img"
      aria-label="Peta perjalanan empat regu Jelajah Kata menuju garis akhir"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#071325" />
          <stop offset=".52" stopColor="#0b2137" />
          <stop offset="1" stopColor="#174251" />
        </linearGradient>
        <linearGradient id={id("aurora")} x1="0" y1="0" x2="1" y2=".15">
          <stop offset="0" stopColor="#48d8c9" stopOpacity="0" />
          <stop offset=".34" stopColor="#48d8c9" stopOpacity=".2" />
          <stop offset=".65" stopColor="#8c76e2" stopOpacity=".16" />
          <stop offset="1" stopColor="#48d8c9" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id("road")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9e825c" />
          <stop offset=".5" stopColor="#7d684d" />
          <stop offset="1" stopColor="#574a3b" />
        </linearGradient>
        <linearGradient id={id("river")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#184c68" />
          <stop offset=".5" stopColor="#2c7189" />
          <stop offset="1" stopColor="#123f5d" />
        </linearGradient>
        <radialGradient id={id("moon")}>
          <stop offset="0" stopColor="#fff2cb" stopOpacity=".44" />
          <stop offset="1" stopColor="#fff2cb" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("finishGlow")}>
          <stop offset="0" stopColor="#ffd970" stopOpacity=".28" />
          <stop offset="1" stopColor="#ffd970" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1200" height="600" rx="28" fill={`url(#${id("sky")})`} />
      {!compact ? (
        <path
          className="mb-jelajah-aurora"
          d="M-70 156C162 40 372 153 580 72 774-2 984 112 1270 24V-40H-70Z"
          fill={`url(#${id("aurora")})`}
        />
      ) : null}

      <g aria-hidden>
        {STARS.slice(0, compact ? 12 : STARS.length).map(([x, y, r, delay], i) => (
          <circle
            key={i}
            className="mb-jelajah-star"
            cx={x}
            cy={y}
            r={r}
            fill="#dfeaf4"
            style={{ animationDelay: `-${delay}s` }}
          />
        ))}
      </g>

      <circle cx="1090" cy="76" r="82" fill={`url(#${id("moon")})`} />
      <circle cx="1090" cy="76" r="30" fill="#eee5c7" />
      <circle cx="1080" cy="67" r="5" fill="#d5c9a7" opacity=".65" />

      {/* layered background */}
      <path d="M-30 318 132 178 278 272 438 147 617 268 788 154 960 252 1230 132V600H-30Z" fill="#0c2034" />
      <path d="M-30 368 142 280 330 350 524 250 710 338 900 258 1080 326 1230 282V600H-30Z" fill="#113148" />
      <path d="M0 425C180 376 360 430 548 390 734 350 960 400 1200 346V600H0Z" fill="#123944" />

      {/* progressive scenery */}
      <g className="mb-jelajah-v4-forest" data-active={sceneProgress >= 25 ? "true" : "false"}>
        {[190, 226, 266, 312, 356, 398].map((x, i) => (
          <Pine key={x} x={x} y={355 - (i % 2) * 18} scale={.78 + (i % 3) * .1} />
        ))}
        <Lantern x={322} y={336} active={sceneProgress >= 25} />
      </g>

      <g aria-hidden>
        <Boulder x={760} y={292} scale={.7} />
        <Boulder x={815} y={258} scale={.5} />
        <Boulder x={885} y={230} scale={.58} />
      </g>

      {/* river crosses the expedition road */}
      <path
        d="M550 134C575 220 535 302 584 374 621 428 603 500 638 610H772C726 510 758 444 714 369 671 296 704 217 665 132Z"
        fill={`url(#${id("river")})`}
        opacity=".88"
      />
      <path
        className="mb-jelajah-water-shine"
        d="M612 146C629 220 601 292 642 362 677 424 660 485 689 574"
        fill="none"
        stroke="#83bfd3"
        strokeWidth="4"
        strokeLinecap="round"
        opacity=".28"
      />

      {/* one shared road = journey first, progress bars second */}
      <path d={roadPath} fill="none" stroke="#061724" strokeWidth="112" strokeLinecap="round" strokeLinejoin="round" opacity=".44" />
      <path d={roadPath} fill="none" stroke="#2b3d35" strokeWidth="94" strokeLinecap="round" strokeLinejoin="round" opacity=".68" />
      <path d={roadPath} fill="none" stroke={`url(#${id("road")})`} strokeWidth="78" strokeLinecap="round" strokeLinejoin="round" />
      <path d={roadPath} fill="none" stroke="#d5bd8d" strokeWidth="2" strokeDasharray="4 15" strokeLinecap="round" opacity=".26" />

      {!compact ? (
        <>
          <ZoneBadge x={318} y={286} label="HUTAN KATA" active={sceneProgress >= 25} />
          <ZoneBadge x={625} y={182} label="JEMBATAN MAKNA" active={sceneProgress >= 50} />
          <ZoneBadge x={860} y={180} label="BUKIT CERITA" active={sceneProgress >= 75} />
        </>
      ) : null}

      <BridgeLandmark active={sceneProgress >= 50} />

      {/* 75% hill / lookout */}
      <g className="mb-jelajah-v4-lookout" data-active={sceneProgress >= 75 ? "true" : "false"}>
        <path d="M792 274C842 209 929 201 984 256L1006 300H760Z" fill="#163c45" />
        <path d="M826 244 854 210 883 244Z" fill="#2c4e50" />
        <path d="M918 238 946 199 976 238Z" fill="#29494d" />
        <Lantern x={895} y={210} active={sceneProgress >= 75} />
      </g>

      <FinishGate active={sceneProgress >= 100} />

      {/* 4 lanes are subtle offsets inside the same expedition road */}
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
              stroke="#10202c"
              strokeWidth={compact ? 8 : 10}
              strokeLinecap="round"
              opacity=".5"
            />
            <path
              d={lanePath}
              fill="none"
              stroke={color}
              strokeWidth={compact ? 3 : 4}
              strokeLinecap="round"
              opacity=".25"
            />
            <path
              d={lanePath}
              pathLength={100}
              fill="none"
              stroke={color}
              strokeWidth={compact ? 5 : 6}
              strokeLinecap="round"
              strokeDasharray={`${pct} ${100 - pct}`}
              className="mb-jelajah-v4-progress"
            />

            {[25, 50, 75].map((checkpoint) => {
              const cp = lanePoint(index, checkpoint);
              return (
                <g key={checkpoint} transform={`translate(${cp.x} ${cp.y})`}>
                  <circle r={compact ? 4 : 5} fill={pct >= checkpoint ? color : "#5b6c79"} />
                  <circle
                    className={pct >= checkpoint ? "mb-jelajah-v4-checkpoint-on" : ""}
                    r={compact ? 8 : 10}
                    fill="none"
                    stroke={pct >= checkpoint ? color : "#8293a0"}
                    strokeWidth="1.4"
                    opacity={pct >= checkpoint ? .42 : .18}
                  />
                </g>
              );
            })}

            {moving ? (
              <g
                className="mb-jelajah-v4-motion"
                style={{
                  transform: `translate(${marker.x}px, ${marker.y}px) rotate(${marker.angle}deg)`,
                  color,
                }}
              >
                <path d="M-62-12H-14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity=".34" />
                <path d="M-52 0H-12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".24" />
                <path d="M-40 11H-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".17" />
                <g className="mb-jelajah-v4-dust">
                  <circle cx="-8" cy="20" r="5" />
                  <circle cx="-21" cy="22" r="4" />
                  <circle cx="-34" cy="18" r="3" />
                </g>
              </g>
            ) : null}

            <g
              className={moving ? "mb-trail-marker mb-trail-moving mb-jelajah-v4-marker" : "mb-trail-marker mb-jelajah-v4-marker"}
              style={{
                transform: `translate(${marker.x}px, ${marker.y}px)`,
                transition: moving
                  ? "transform 620ms cubic-bezier(.22,.9,.3,1)"
                  : "transform 0s",
              }}
            >
              <ellipse cx="0" cy={compact ? 21 : 28} rx={compact ? 20 : 28} ry={compact ? 5 : 7} fill="#06121f" opacity=".42" />
              <circle r={compact ? 26 : 36} fill={color} opacity=".1" />
              <circle className="mb-jelajah-v4-marker-ring" r={compact ? 29 : 40} fill="none" stroke={color} strokeWidth="1.7" opacity=".22" />

              <foreignObject
                x={-mascotSize / 2}
                y={-mascotSize / 2 - 4}
                width={mascotSize}
                height={mascotSize}
                overflow="visible"
              >
                <div style={{ width: mascotSize, height: mascotSize, display: "grid", placeItems: "center" }}>
                  <TeamMascot
                    teamId={team.id as "elang" | "harimau" | "rusa" | "badak"}
                    pose={pose}
                    size={mascotSize}
                    eager={!compact}
                  />
                </div>
              </foreignObject>

              <g transform={`translate(${badgeLeft ? (compact ? -88 : -116) : (compact ? 31 : 42)} ${compact ? -20 : -27})`}>
                <rect
                  width={compact ? 70 : 98}
                  height={compact ? 27 : 34}
                  rx={compact ? 13.5 : 17}
                  fill="#071a2b"
                  stroke={color}
                  strokeWidth="1.5"
                />
                {!compact ? (
                  <text x="12" y="21" fontSize="10" fontWeight="850" fill="#e8f1f6">
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

      {/* start camp: one origin, four racers */}
      <g className="mb-jelajah-v4-start" transform="translate(96 480)">
        <path d="M0 0 24-38 48 0Z" fill="#b36d3d" stroke="#d79a68" strokeWidth="2" />
        <path d="M24-38V0" stroke="#6e4933" strokeWidth="2" />
        <circle cx="67" cy="-4" r="18" fill="#ffbf46" opacity=".08" />
        <path d="M59 1C62-8 66-13 68-21 73-13 75-7 73 1Z" fill="#f7a52f" />
        <path d="M63 1C65-5 68-9 68-14 72-8 73-3 71 1Z" fill="#ffd36b" />
        {!compact ? <text x="25" y="24" textAnchor="middle">MULAI</text> : null}
      </g>

      {!compact ? (
        <g aria-hidden>
          {FIREFLIES.map(([x, y, duration, delay], i) => (
            <circle
              key={i}
              className="mb-jelajah-firefly"
              cx={x}
              cy={y}
              r="2.4"
              fill="#ffe6a5"
              style={{ animationDuration: `${duration}s`, animationDelay: `-${delay}s` }}
            />
          ))}
        </g>
      ) : null}
    </svg>
  );
}
