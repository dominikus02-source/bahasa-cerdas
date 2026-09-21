"use client";
// ─── Art Registry 8B.2 — single source of truth for Main Bersama visuals.
// TeamBadge = compact identity + FALLBACK for every mascot slot: if a future
// full-mascot asset fails to load, render TeamBadge (never broken image).
// Full-mascot slots (ready/move/celebrate/podium) await dedicated art
// generation — see ART_BRIEF below. No raster, no stock, no emoji art.

import { useState } from 'react';
import { TeamBadge } from './shared/TeamBadge';

export type TeamId = 'elang' | 'harimau' | 'rusa' | 'badak';

export const TEAM_IDS: TeamId[] = ['elang', 'harimau', 'rusa', 'badak'];

export const TEAM_META: Record<TeamId, { name: string; colorVar: string; trait: string }> = {
  elang: { name: 'Elang', colorVar: 'var(--mb-team-elang)', trait: 'cepat, observatif, optimistis' },
  harimau: { name: 'Harimau', colorVar: 'var(--mb-team-harimau)', trait: 'percaya diri, energetic, berani' },
  rusa: { name: 'Rusa', colorVar: 'var(--mb-team-rusa)', trait: 'cerdas, lincah, tenang' },
  badak: { name: 'Badak', colorVar: 'var(--mb-team-badak)', trait: 'kuat, steady, persistent' },
};

export type MascotPose = 'ready' | 'move' | 'celebrate' | 'podium';

/**
 * Full-mascot art slots. `src: null` = not yet produced → callers MUST
 * render <TeamBadge> fallback. Do NOT invent raster paths here.
 */
export const TEAM_MASCOTS: Record<TeamId, Record<MascotPose, { src: null; brief: string }>> = {
  elang: {
    ready: { src: null, brief: 'jelajah-elang-ready: frontal stance, wings half-open upward, keen friendly eye' },
    move: { src: null, brief: 'jelajah-elang-move: swooping glide, motion lines, forward lean' },
    celebrate: { src: null, brief: 'jelajah-elang-celebrate: wings up, chest out, confetti-free joy' },
    podium: { src: null, brief: 'jelajah-elang-podium: perched calm, gold-accent ring' },
  },
  harimau: {
    ready: { src: null, brief: 'jelajah-harimau-ready: upright confident stance, tail curl' },
    move: { src: null, brief: 'jelajah-harimau-move: mid-pounce, dust puffs geometric' },
    celebrate: { src: null, brief: 'jelajah-harimau-celebrate: roaring smile, paws up' },
    podium: { src: null, brief: 'jelajah-harimau-podium: seated proud, gold-accent ring' },
  },
  rusa: {
    ready: { src: null, brief: 'jelajah-rusa-ready: alert graceful stance, antlers symmetric' },
    move: { src: null, brief: 'jelajah-rusa-move: leaping stride, light trail dashes' },
    celebrate: { src: null, brief: 'jelajah-rusa-celebrate: joyful rear-up, spark accents' },
    podium: { src: null, brief: 'jelajah-rusa-podium: poised calm, gold-accent ring' },
  },
  badak: {
    ready: { src: null, brief: 'jelajah-badak-ready: solid stance, horn forward' },
    move: { src: null, brief: 'jelajah-badak-move: steady charge, ground lines' },
    celebrate: { src: null, brief: 'jelajah-badak-celebrate: head raised, warm smile' },
    podium: { src: null, brief: 'jelajah-badak-podium: grounded calm, gold-accent ring' },
  },
};

/**
 * Mascot renderer with guaranteed fallback. Style brief (8B §3–§4):
 * stylized 2D editorial, rounded-not-babyish, expressive friendly eye,
 * clean silhouette, limited palette, equal visual weight per team.
 */
/**
 * Mascot renderer with guaranteed fallback (8B.3 integration architecture).
 * - Full art present (TEAM_MASCOTS[team][pose].src) → render it (lazy for
 *   non-critical poses, fixed dimensions = no layout jump).
 * - Missing/failed → TeamBadge interim (game never breaks on artwork).
 * Pose selects art; badge is pose-agnostic.
 */
export function TeamMascot({
  teamId,
  pose = 'ready',
  size = 44,
  name,
  eager = false,
}: {
  teamId: string;
  pose?: MascotPose;
  size?: number;
  name?: string;
  /** true for above-the-fold hero moments; celebrate/podium lazy by default. */
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const slot = (TEAM_MASCOTS as Record<string, Record<string, { src: string | null }>>)[teamId]?.[pose];
  const src = !failed ? slot?.src ?? null : null;
  if (!src) return <TeamBadge teamId={teamId} size={size} name={name} />;
  return (
    <span className="mb-mascot" data-team={teamId} data-pose={pose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name ? `Maskot Regu ${name}` : `Maskot regu ${teamId}`}
        width={size}
        height={size}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setFailed(true)}
      />
      {name ? <span className="mb-team-badge-name">{name}</span> : null}
      <style jsx>{`
        .mb-mascot {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex: none;
        }
        .mb-mascot img {
          width: ${size}px;
          height: ${size}px;
          object-fit: contain;
        }
        .mb-team-badge-name { font-weight: 800; }
      `}</style>
    </span>
  );
}

export { TeamBadge };

/** Exact art-production brief for dedicated image generation (8B §32). */
export const ART_BRIEF = [
  'STYLE: stylized 2D editorial vector, rounded but not babyish, subtle depth, expressive friendly eye, clean silhouette, limited palette (team color + navy #13253a + white), strong shape language, equal visual weight, no text in artwork.',
  'AVOID: realistic fur, anime, Pixar/Disney imitation, extreme chibi, esports aggro logos, NFT style, corporate icons, emoji animals, AI artifacts, odd anatomy, inconsistent eyes.',
  'READABILITY: recognizable at 24px, charming at 200px projector size, minimal small details.',
  'SLOTS: per team ready/move/celebrate/podium (+optional waiting) → max 20 files, SVG preferred, transparent WebP/PNG only if vector insufficient, no JPEG, no base64, no multi-MB files.',
  'NAMING: jelajah-<team>-<pose>.svg under public/main-bersama/jelajah/mascots/; wire src into TEAM_MASCOTS above.',
] as const;

/** Provenance ledger (8B.3 §23) — every shipped visual asset, no exceptions. */
export const ART_PROVENANCE = [
  'TeamBadge geometric system: code-authored original vector (this repo), project-owned, 2026-09. Interim compact identity — NOT final mascot art.',
  'JelajahTrail / KotaScene / Podium / MilestoneIcon: code-authored original vector scenes (this repo), project-owned, 2026-09.',
  'Full mascot set (4 teams × ready/move/celebrate/podium): NOT YET PRODUCED — slots reserved in TEAM_MASCOTS, fallback TeamBadge active. Requires dedicated art generation with brief above.',
  'Fonts: existing repo setup only (Newscrash interim) — VERIFY license/provenance before public production release.',
] as const;
