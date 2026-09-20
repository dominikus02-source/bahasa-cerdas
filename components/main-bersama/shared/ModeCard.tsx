"use client";

import type { GameMode } from '@/src/main-bersama/domain/types/session';

interface ModeCardProps {
  mode: GameMode;
  selected: boolean;
  onSelect: () => void;
}

/** Warna chip regu (Jelajah) — dari token tim. */
const TEAM_CHIPS = [
  { name: 'Elang', varName: 'var(--mb-team-elang)' },
  { name: 'Harimau', varName: 'var(--mb-team-harimau)' },
  { name: 'Rusa', varName: 'var(--mb-team-rusa)' },
  { name: 'Badak', varName: 'var(--mb-team-badak)' },
] as const;

const MILESTONE_PREVIEW = ['Taman', 'Perpustakaan', 'Rumah', 'Pusat Kota'] as const;

/**
 * Kartu mode (§8/§9/§10) — radio group semantik; icon SVG + preview
 * visual (lane jalur / skyline milestone), bukan emoji. Selected
 * state = border + background + check indicator + elevation (bukan
 * warna saja — §31).
 */
export function ModeCard({ mode, selected, onSelect }: ModeCardProps) {
  const isJelajah = mode === 'jelajah-kata';
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`mb-mode-card ${isJelajah ? 'mb-mode-jelajah' : 'mb-mode-kota'} ${selected ? 'mb-mode-selected' : ''}`}
    >
      <span className="mb-mode-deco" aria-hidden>
        {isJelajah ? <JelajahGlyph /> : <KotaGlyph />}
      </span>
      <span className="mb-mode-check" aria-hidden>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <span className="mb-mode-body">
        <span className="mb-mode-name mb-display">
          {isJelajah ? 'Jelajah Kata' : 'Kota Cahaya'}
        </span>
        <span className="mb-mode-desc">
          {isJelajah
            ? 'Empat regu berlomba maju berdasarkan ketepatan jawaban.'
            : 'Seluruh kelas bekerja sama menyalakan kota dengan jawaban benar.'}
        </span>
        {isJelajah ? (
          <span className="mb-mode-chips" aria-hidden>
            {TEAM_CHIPS.map((t) => (
              <span key={t.name} className="mb-team-chip" style={{ '--mb-tc': t.varName } as React.CSSProperties}>
                {t.name}
              </span>
            ))}
          </span>
        ) : (
          <span className="mb-mode-milestones" aria-hidden>
            {MILESTONE_PREVIEW.map((m, i) => (
              <span key={m} className="mb-mode-milestone">
                <i style={{ animationDelay: `${i * 0.35}s` }} />
                {m}
              </span>
            ))}
          </span>
        )}
      </span>
      <style jsx>{`
        .mb-mode-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: var(--mb-space-4);
          width: 100%;
          padding: var(--mb-space-5);
          text-align: left;
          background: var(--mb-surface-guru-elevated);
          border: 2px solid rgba(28, 43, 58, 0.12);
          border-radius: var(--mb-radius-lg);
          box-shadow: var(--mb-shadow-light);
          cursor: pointer;
          overflow: hidden;
          transition: border-color var(--mb-motion-fast), transform var(--mb-motion-fast), box-shadow var(--mb-motion-fast);
        }
        .mb-mode-card:hover { transform: translateY(-2px); }
        /* Warna identitas mode pada deco + selected (§8/§9 arah visual). */
        .mb-mode-jelajah .mb-mode-deco { color: var(--mb-primary); }
        .mb-mode-kota .mb-mode-deco { color: var(--mb-violet); }
        .mb-mode-selected {
          border-color: var(--mb-primary-strong);
          box-shadow: 0 10px 30px rgba(20, 184, 166, 0.22);
          transform: translateY(-2px);
        }
        .mb-mode-selected .mb-mode-check { display: grid; }
        .mb-mode-deco {
          display: grid;
          place-items: center;
          width: 72px;
          height: 72px;
          flex: none;
          border-radius: var(--mb-radius-md);
          background: var(--mb-primary-soft);
        }
        .mb-mode-kota .mb-mode-deco { background: var(--mb-violet-soft); }
        /* Check indicator (bukan hanya warna). */
        .mb-mode-check {
          display: none;
          place-items: center;
          position: absolute;
          top: 10px;
          right: 10px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--mb-primary-strong);
          color: #ffffff;
        }
        .mb-mode-body { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .mb-mode-name { font-size: 1.3rem; color: var(--mb-text-guru); }
        .mb-mode-desc {
          color: var(--mb-text-guru-secondary);
          font-size: 0.95rem;
          line-height: 1.45;
        }
        .mb-mode-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        /* Milestone preview kecil dengan titik cahaya bergantian. */
        .mb-mode-milestones { display: flex; flex-wrap: wrap; gap: 6px; }
        .mb-mode-milestone {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: var(--mb-radius-pill);
          background: var(--mb-violet-soft);
          color: var(--mb-violet);
          font-size: 0.78rem;
          font-weight: 700;
        }
        .mb-mode-milestone i {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
          opacity: 0.55;
        }
        @media (prefers-reduced-motion: no-preference) {
          .mb-mode-milestone i { animation: mb-dot-breathe 2.8s ease-in-out infinite; }
          @keyframes mb-dot-breathe { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        }
      `}</style>
    </button>
  );
}

/** Glyph dekoratif Jelajah: jalur dengan titik-titik checkpoint. */
function JelajahGlyph() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
      <path
        d="M8 34c8 0 4-12 12-12s4 12 12 12"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="0.5 7.5"
      />
      <path
        d="M8 22c8 0 4-12 12-12s4 12 12 12"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.45"
      />
      <circle cx="8" cy="34" r="3.5" fill="currentColor" />
      <circle cx="36" cy="34" r="3.5" fill="var(--mb-accent)" />
      <path d="M31 34h10" stroke="var(--mb-accent)" strokeWidth="2" strokeLinecap="round" opacity="0" />
    </svg>
  );
}

/** Glyph dekoratif Kota: skyline sederhana + jendela menyala. */
function KotaGlyph() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
      <rect x="6" y="20" width="9" height="20" rx="1.5" fill="currentColor" opacity="0.45" />
      <rect x="17" y="12" width="11" height="28" rx="1.5" fill="currentColor" />
      <rect x="30" y="24" width="8" height="16" rx="1.5" fill="currentColor" opacity="0.45" />
      <rect x="20" y="17" width="2.6" height="2.6" rx="0.6" fill="var(--mb-accent)" />
      <rect x="20" y="23" width="2.6" height="2.6" rx="0.6" fill="var(--mb-accent)" opacity="0.7" />
      <rect x="9" y="25" width="2.4" height="2.4" rx="0.6" fill="var(--mb-accent)" opacity="0.5" />
      <rect x="32.5" y="28" width="2.4" height="2.4" rx="0.6" fill="var(--mb-accent)" opacity="0.5" />
    </svg>
  );
}
