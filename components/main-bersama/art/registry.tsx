"use client";
// ─── Art Registry 8B.2 — single source of truth for Main Bersama visuals.
// TeamBadge = compact identity + FALLBACK for every mascot slot: if a future
// full-mascot asset fails to load, render TeamBadge (never broken image).
// Full-mascot slots memakai batch art dedicated — see ART_BRIEF below.
// No stock, no emoji art.

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
 *
 * 2026-09-21 — READY batch LOCKED (4/4, commit 6d73c3c).
 * 2026-09-22 — MOVE batch LOCKED (4/4, commit da739ee).
 * 2026-09-22 — CELEBRATE batch LOCKED (4/4).
 * 2026-09-22 — PODIUM candidate batch integrated for owner review (4/4).
 * Semua runtime memakai WebP 1024px (alpha utuh, ~88% lebih kecil) hasil
 * turunan dari PNG master 1254px yang tetap lossless di docs/.
 * TeamBadge tetap menjadi fallback defensif bila source pose gagal dimuat.
 */
export const TEAM_MASCOTS: Record<TeamId, Record<MascotPose, { src: string | null; brief: string }>> = {
  elang: {
    ready: { src: '/main-bersama/jelajah/mascots/jelajah-elang-ready.webp', brief: 'jelajah-elang-ready: frontal stance, wings half-open upward, keen friendly eye' },
    move: { src: '/main-bersama/jelajah/mascots/jelajah-elang-move.webp', brief: 'jelajah-elang-move: swooping glide, motion lines, forward lean' },
    celebrate: { src: '/main-bersama/jelajah/mascots/jelajah-elang-celebrate.webp', brief: 'jelajah-elang-celebrate: wings up, chest out, confetti-free joy' },
    podium: { src: '/main-bersama/jelajah/mascots/jelajah-elang-podium.webp', brief: 'jelajah-elang-podium: proud upright stance, rank-neutral blue scarf' },
  },
  harimau: {
    ready: { src: '/main-bersama/jelajah/mascots/jelajah-harimau-ready.webp', brief: 'jelajah-harimau-ready: upright confident stance, tail curl' },
    move: { src: '/main-bersama/jelajah/mascots/jelajah-harimau-move.webp', brief: 'jelajah-harimau-move: mid-pounce, dust puffs geometric' },
    celebrate: { src: '/main-bersama/jelajah/mascots/jelajah-harimau-celebrate.webp', brief: 'jelajah-harimau-celebrate: roaring smile, paws up' },
    podium: { src: '/main-bersama/jelajah/mascots/jelajah-harimau-podium.webp', brief: 'jelajah-harimau-podium: confident champion stance, rank-neutral red scarf' },
  },
  rusa: {
    ready: { src: '/main-bersama/jelajah/mascots/jelajah-rusa-ready.webp', brief: 'jelajah-rusa-ready: alert graceful stance, antlers symmetric' },
    move: { src: '/main-bersama/jelajah/mascots/jelajah-rusa-move.webp', brief: 'jelajah-rusa-move: leaping stride, light trail dashes' },
    celebrate: { src: '/main-bersama/jelajah/mascots/jelajah-rusa-celebrate.webp', brief: 'jelajah-rusa-celebrate: joyful rear-up, spark accents' },
    podium: { src: '/main-bersama/jelajah/mascots/jelajah-rusa-podium.webp', brief: 'jelajah-rusa-podium: elegant proud stance, rank-neutral green scarf, no medal' },
  },
  badak: {
    ready: { src: '/main-bersama/jelajah/mascots/jelajah-badak-ready.webp', brief: 'jelajah-badak-ready: solid stance, horn forward' },
    move: { src: '/main-bersama/jelajah/mascots/jelajah-badak-move.webp', brief: 'jelajah-badak-move: steady charge, ground lines' },
    celebrate: { src: '/main-bersama/jelajah/mascots/jelajah-badak-celebrate.webp', brief: 'jelajah-badak-celebrate: head raised, warm smile' },
    podium: { src: '/main-bersama/jelajah/mascots/jelajah-badak-podium.webp', brief: 'jelajah-badak-podium: strong friendly stance, rank-neutral blue scarf' },
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
  'READY mascot poses (elang/harimau/rusa/badak): owner-provided art batch, 2026-09-21 — a dedicated BahasaCerdas mascot redesign (not stock, not prior quarantined art). Master lossless PNG 1254×1254 diarsipkan utuh di docs/main-bersama/art-source/mascots/ready/jelajah-<team>-ready.png. Runtime = turunan WebP 1024×1024 (q90, alpha_q100, -exact) di public/main-bersama/jelajah/mascots/ — semua kanal alpha & tepi dipertahankan (PSNR komposit 37–41 dB, tanpa halo). Satu sistem penamaan: drop lama bernama bc_*_mascot.png sudah di-quarantine di luar repo.',
  'Brand mark pada bandana/badge tiap maskot: monogram dua huruf berhimpit, kiri biru→ungu dan kanan ungu→pink — sama dengan monogram di public/brand/bc2026-logo-light.png. Audit 2026-09-21 (perbandingan tak-berlabel pada skala setara) menyimpulkan huruf kirinya IDENTIK dengan monogram resmi, jadi tidak ada paint-over yang dilakukan. Catatan jujur: monogram resmi itu sendiri terbaca ambigu (mirip "E") bila dilihat terpisah dari wordmark, dan pada ukuran render aplikasi (56–76px) tanda ini hanya ~4–6px sehingga memang tidak terbaca sebagai huruf — jadi ini properti brand asset, bukan cacat art maskot. Pemilik sudah meninjau dan mengunci batch ini (2026-09-21).',
  'Reference sheet "BahasaCerdas MAIN BERSAMA" disimpan sebagai docs/main-bersama/art-source/mascots/maskot-main-bersama-master.png (bukan runtime asset; tidak lagi di public/).',
  'MOVE mascot poses (elang/harimau/rusa/badak): MOVE batch reviewed and locked by owner (2026-09-22). Sumber: owner-provided PNG batch, arsip lossless di docs/main-bersama/art-source/mascots/move/jelajah-<team>-move.png (1254×1254, RGBA, latar transparan penuh). Runtime = turunan WebP 1024×1024 (q90, alpha_q100, -exact, ±88% lebih kecil, ≤220 KB) di public/main-bersama/jelajah/mascots/. Koreksi scarf 2026-09-22: Harimau merah & Rusa hijau (sebelumnya keduanya biru) — kini konsisten dengan READY. Elang & Badak tidak berubah (SHA sama). ZIP pengiriman awal (berisi Harimau/Rusa versi pra-koreksi) sudah di-quarantine di luar repo.',
  'CELEBRATE mascot poses (elang/harimau/rusa/badak): CELEBRATE batch reviewed and locked by owner (2026-09-22). Sumber: owner-provided PNG batch, arsip lossless di docs/main-bersama/art-source/mascots/celebrate/jelajah-<team>-celebrate.png (1254×1254, RGBA, latar transparan penuh, keempat corner alpha=0). Runtime = turunan WebP 1024×1024 (q90, alpha_q100, -exact, ±88% lebih kecil, ≤220 KB) di public/main-bersama/jelajah/mascots/. Pose terbaca menang/bersorak (sayap terangkat, tangan ke atas, lompatan gembira) dan berbeda jelas dari READY & MOVE; scarf konsisten per regu. Dipakai nyata di dua consumer produksi: ProjectorDiscussion → DiscussionLeader (52px) dan layar selesai murid (56px). Catatan terbuka: sebaran ukuran artwork CELEBRATE sedikit lebih lebar daripada READY (isi kanvas 80.4–95.4% vs 91.9–96.7%; Badak terkecil) — diterima owner. ZIP pengiriman awal sudah di-quarantine di luar repo.',
  'PODIUM mascot poses (elang/harimau/rusa/badak): PODIUM batch reviewed and locked by owner (2026-09-22). Source: owner-provided canonical lossless PNG di docs/main-bersama/art-source/mascots/podium/jelajah-<team>-podium.png (1254×1254, RGBA, transparent corners). Runtime = turunan WebP 1024×1024 (q90, alpha_q100, -exact) di public/main-bersama/jelajah/mascots/. Semua artwork rank-neutral; Rusa memakai versi final tanpa medali. TeamBadge fallback tetap tersedia bila gambar gagal dimuat.',
  'Fonts: existing repo setup only (Newscrash interim) — VERIFY license/provenance before public production release.',
] as const;
