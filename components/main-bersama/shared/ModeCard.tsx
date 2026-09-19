"use client";

import type { GameMode } from '@/src/main-bersama/domain/types/session';

interface ModeCardProps {
  mode: GameMode;
  selected: boolean;
  onSelect: () => void;
}

/** Copy komunikatif per mode (§4) — tanpa formula teknis. */
const MODE_INFO: Record<
  GameMode,
  { name: string; desc: string; teams?: string; icon: string }
> = {
  'jelajah-kata': {
    name: 'Jelajah Kata',
    desc: 'Empat regu berlomba maju berdasarkan ketepatan jawaban.',
    teams: 'Elang · Harimau · Rusa · Badak',
    icon: '🏃',
  },
  'kota-cahaya': {
    name: 'Kota Cahaya',
    desc: 'Seluruh kelas bekerja sama menyalakan kota dengan jawaban benar.',
    icon: '🏙️',
  },
};

/** Kartu mode (§4) — radio group semantik, bukan tombol dekoratif. */
export function ModeCard({ mode, selected, onSelect }: ModeCardProps) {
  const info = MODE_INFO[mode];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`mb-mode-card ${selected ? 'mb-mode-selected' : ''}`}
    >
      <span className="mb-mode-icon" aria-hidden>{info.icon}</span>
      <span className="mb-mode-text">
        <span className="mb-mode-name mb-display">{info.name}</span>
        <span className="mb-mode-desc">{info.desc}</span>
        {info.teams ? <span className="mb-mode-teams">{info.teams}</span> : null}
      </span>
      <style jsx>{`
        .mb-mode-card {
          display: flex;
          align-items: center;
          gap: var(--mb-space-4);
          width: 100%;
          padding: var(--mb-space-4) var(--mb-space-5);
          text-align: left;
          background: var(--mb-surface);
          border: 2px solid transparent;
          border-radius: var(--mb-radius-lg);
          cursor: pointer;
          transition: border-color var(--mb-motion-fast), transform var(--mb-motion-fast);
        }
        .mb-mode-card:hover { transform: translateY(-2px); }
        .mb-mode-selected {
          border-color: var(--mb-primary);
          background: var(--mb-primary-soft);
        }
        .mb-mode-icon { font-size: 2.2rem; }
        .mb-mode-text { display: flex; flex-direction: column; gap: 4px; }
        .mb-mode-name {
          font-size: 1.3rem;
          color: var(--mb-text-primary);
        }
        .mb-mode-desc {
          color: var(--mb-text-secondary);
          font-size: 0.95rem;
          line-height: 1.45;
        }
        .mb-mode-teams {
          color: var(--mb-accent);
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.04em;
        }
      `}</style>
    </button>
  );
}
