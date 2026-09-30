"use client";

import Image from "next/image";
import { useEffect, useMemo } from "react";
import { TeamMascot } from "../registry";

interface TrailTeam {
  id: string;
  name: string;
}

const TEAM_COLORS: Record<string, string> = {
  elang: "#f5b83d",
  harimau: "#f06a4d",
  rusa: "#57a67a",
  badak: "#718a9a",
};

const LANE_Y = [68, 82, 96, 110];
const SCENE_COUNT = 7;

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function sceneUrl(index: number) {
  return `/main-bersama/jelajah/backgrounds/jk-${index + 1}.webp`;
}

/** Ilustrasi resmi adalah dunia; SVG hanya dipakai untuk jalur dan progres. */
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
  const sceneProgress = Math.max(0, ...shown.map((team) => clampPercent(progress[team.id] ?? 0)));
  const sceneIndex = Math.min(SCENE_COUNT - 1, Math.floor((sceneProgress / 100) * SCENE_COUNT));
  const nextSceneIndex = Math.min(SCENE_COUNT - 1, sceneIndex + 1);
  const sceneMotion = ((sceneProgress / 100) * SCENE_COUNT - sceneIndex) * 10;

  const markers = useMemo(
    () => shown.map((team, index) => ({
      team,
      color: TEAM_COLORS[team.id] ?? "#0f766e",
      progress: clampPercent(progress[team.id] ?? 0),
      x: 8 + clampPercent(progress[team.id] ?? 0) * 0.84,
      y: LANE_Y[index] ?? 110,
    })),
    [progress, shown],
  );

  useEffect(() => {
    if (nextSceneIndex === sceneIndex) return;
    const image = new window.Image();
    image.src = sceneUrl(nextSceneIndex);
  }, [nextSceneIndex, sceneIndex]);

  return (
    <section
      className="mb-jelajah-world"
      data-compact={compact ? "true" : "false"}
      aria-label={`Dunia perjalanan Jelajah Kata, progres tertinggi ${Math.round(sceneProgress)} persen`}
    >
      <div className="mb-jelajah-scene" aria-hidden="true">
        <Image
          key={sceneIndex}
          src={sceneUrl(sceneIndex)}
          alt=""
          fill
          sizes={compact ? "(max-width: 720px) 100vw, 480px" : "(max-width: 720px) 100vw, 1200px"}
          className="mb-jelajah-scene-image"
          style={{ transform: `scale(1.06) translateX(${-sceneMotion}%)` }}
        />
        <div className="mb-jelajah-scene-vignette" />
      </div>

      <svg className="mb-jelajah-overlay" viewBox="0 0 100 120" preserveAspectRatio="none" aria-hidden="true">
        {markers.map(({ team, color, progress: teamProgress, x, y }) => (
          <g key={team.id}>
            <path d={`M 8 ${y} C 32 ${y - 6}, 61 ${y + 6}, 92 ${y}`} fill="none" stroke="rgba(255,255,255,.42)" strokeWidth="1.2" strokeLinecap="round" />
            <path d={`M 8 ${y} C ${8 + 24 * (teamProgress / 100)} ${y - 6 * (teamProgress / 100)}, ${8 + 53 * (teamProgress / 100)} ${y + 6 * (teamProgress / 100)}, ${x} ${y}`} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
            <circle cx={x} cy={y} r="2.4" fill={color} stroke="white" strokeWidth=".85" />
          </g>
        ))}
      </svg>

      <div className="mb-jelajah-markers" aria-label="Posisi regu">
        {markers.map(({ team, color, progress: teamProgress, x, y }) => {
          const pose = poses?.[team.id] ?? "ready";
          return (
            <div className={`mb-jelajah-marker mb-jelajah-marker-${pose}`} key={team.id} style={{ left: `${x}%`, top: `${(y / 120) * 100}%` }}>
              <span className="mb-jelajah-marker-mascot">
                <TeamMascot teamId={team.id} pose={pose} size={compact ? 42 : 54} name={team.name} eager={compact} />
              </span>
              <span className="mb-jelajah-marker-label">
                <i style={{ backgroundColor: color }} />
                <b>{team.name}</b>
                <strong>{Math.round(teamProgress)}%</strong>
              </span>
            </div>
          );
        })}
      </div>

      <div className="mb-jelajah-world-caption">
        <span>🌿 Dunia Jelajah Kata</span>
        <strong>Perjalanan dunia bergerak mengikuti kemajuan regu</strong>
      </div>

      <style jsx>{`
        .mb-jelajah-world { position:relative; isolation:isolate; overflow:hidden; border-radius:26px; min-height:${compact ? "230px" : "390px"}; background:#153a43; box-shadow:0 18px 50px rgba(23,53,75,.2); }
        .mb-jelajah-scene { position:absolute; inset:0 0 ${compact ? "34px" : "42px"}; overflow:hidden; background:#153a43; }
        .mb-jelajah-scene :global(.mb-jelajah-scene-image) { object-fit:cover; object-position:center; animation:mb-jelajah-scene-arrive 800ms cubic-bezier(.22,.9,.3,1) both; transition:transform 1200ms cubic-bezier(.22,.9,.3,1); will-change:transform; }
        .mb-jelajah-scene-vignette { position:absolute; inset:0; background:linear-gradient(180deg,rgba(7,24,32,.06),transparent 47%,rgba(7,24,32,.36)),linear-gradient(90deg,rgba(7,24,32,.14),transparent 28%,transparent 72%,rgba(7,24,32,.12)); pointer-events:none; }
        .mb-jelajah-overlay { position:absolute; inset:0 ${compact ? "0 34px" : "0 42px"}; width:100%; height:calc(100% - ${compact ? "34px" : "42px"}); overflow:visible; filter:drop-shadow(0 2px 3px rgba(7,24,32,.2)); }
        .mb-jelajah-markers { position:absolute; inset:0 ${compact ? "0 34px" : "0 42px"}; pointer-events:none; }
        .mb-jelajah-marker { position:absolute; display:grid; justify-items:center; gap:1px; width:max-content; max-width:120px; transform:translate(-50%,-78%); transition:left 900ms cubic-bezier(.22,.9,.3,1),top 900ms cubic-bezier(.22,.9,.3,1); }
        .mb-jelajah-marker-mascot { display:grid; place-items:center; filter:drop-shadow(0 7px 7px rgba(4,24,29,.34)); }
        .mb-jelajah-marker-label { display:flex; align-items:center; gap:4px; max-width:120px; padding:4px 7px; border:1px solid rgba(255,255,255,.75); border-radius:999px; background:rgba(255,255,255,.92); box-shadow:0 4px 14px rgba(4,24,29,.2); color:#183847; font-size:${compact ? ".57rem" : ".66rem"}; line-height:1; white-space:nowrap; }
        .mb-jelajah-marker-label i { width:6px; height:6px; flex:none; border-radius:50%; }
        .mb-jelajah-marker-label b { overflow:hidden; text-overflow:ellipsis; font-weight:900; }
        .mb-jelajah-marker-label strong { color:#0b6c64; font-variant-numeric:tabular-nums; }
        .mb-jelajah-marker-move { animation:mb-jelajah-marker-bob .48s ease-in-out infinite alternate; }
        .mb-jelajah-marker-celebrate::after { content:"✦"; position:absolute; top:-12px; right:3px; color:#ffe27b; font-size:1.05rem; text-shadow:0 2px 4px rgba(4,24,29,.35); animation:mb-jelajah-spark .72s ease-out both; }
        .mb-jelajah-world-caption { position:absolute; right:0; bottom:0; left:0; display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:${compact ? "34px" : "42px"}; padding:7px 14px; background:rgba(255,255,255,.96); color:#42616b; font-size:${compact ? ".58rem" : ".68rem"}; }
        .mb-jelajah-world-caption span { color:#08766d; font-weight:900; letter-spacing:.02em; }
        .mb-jelajah-world-caption strong { font-weight:750; text-align:right; }
        @keyframes mb-jelajah-scene-arrive { from { opacity:.3; transform:scale(1.03); } to { opacity:1; } }
        @keyframes mb-jelajah-marker-bob { from { margin-top:0; } to { margin-top:-5px; } }
        @keyframes mb-jelajah-spark { from { opacity:0; transform:scale(.5) rotate(-20deg); } to { opacity:1; transform:scale(1) rotate(0); } }
        @media (prefers-reduced-motion:reduce) { .mb-jelajah-scene :global(.mb-jelajah-scene-image),.mb-jelajah-marker,.mb-jelajah-marker-move,.mb-jelajah-marker-celebrate::after { animation:none !important; transition:none !important; } }
        @media (max-width:640px) { .mb-jelajah-world { min-height:${compact ? "206px" : "290px"}; border-radius:18px; } .mb-jelajah-world-caption strong { display:none; } }
      `}</style>
    </section>
  );
}
