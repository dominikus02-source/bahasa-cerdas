"use client";

import type { GameMode } from '@/src/main-bersama/domain/types/session';

interface ModeCardProps {
  mode: GameMode;
  selected: boolean;
  onSelect: () => void;
}

const TEAM_CHIPS = [
  { name: 'Elang', varName: 'var(--mb-team-elang)' },
  { name: 'Harimau', varName: 'var(--mb-team-harimau)' },
  { name: 'Rusa', varName: 'var(--mb-team-rusa)' },
  { name: 'Badak', varName: 'var(--mb-team-badak)' },
] as const;

const MILESTONE_PREVIEW = ['Taman', 'Perpustakaan', 'Rumah', 'Pusat Kota'] as const;

/**
 * Kartu pemilihan mode dengan art produksi sebagai panggung.
 * Teks/chip tetap HTML agar tajam, responsif, dan aksesibel.
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
      <span className="mb-mode-art" aria-hidden />
      <span className="mb-mode-shade" aria-hidden />
      <span className="mb-mode-check" aria-hidden>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>

      <span className="mb-mode-body">
        <span className="mb-mode-kicker">
          {isJelajah ? '4 REGU · BERLOMBA' : 'SATU KELAS · KOOPERATIF'}
        </span>
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
              <span
                key={t.name}
                className="mb-team-chip"
                style={{ '--mb-tc': t.varName } as React.CSSProperties}
              >
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
          --mb-mode-accent: var(--mb-primary);
          position: relative;
          min-height: 232px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          width: 100%;
          padding: 22px;
          text-align: left;
          color: #ffffff;
          border: 2px solid rgba(23, 38, 58, .12);
          border-radius: 24px;
          background: #102c39;
          box-shadow: 0 13px 30px rgba(26, 46, 65, .12);
          cursor: pointer;
          overflow: hidden;
          isolation: isolate;
          transition:
            border-color var(--mb-motion-fast),
            transform var(--mb-motion-fast),
            box-shadow var(--mb-motion-fast);
        }
        .mb-mode-jelajah { --mb-mode-accent: #35d399; }
        .mb-mode-kota { --mb-mode-accent: #a78bfa; }

        .mb-mode-art,
        .mb-mode-shade {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .mb-mode-art {
          z-index: -3;
          background-size: cover;
          background-repeat: no-repeat;
          transition: transform 360ms ease-out, filter 360ms ease-out;
        }
        .mb-mode-jelajah .mb-mode-art {
          background-image: url('/images/main-bersama/mode-jelajah-kata.webp');
          background-position: center;
        }
        .mb-mode-kota .mb-mode-art {
          background-image: url('/images/main-bersama/mode-kota-cahaya.webp');
          background-position: 42% center;
        }
        .mb-mode-shade {
          z-index: -2;
          background:
            linear-gradient(90deg, rgba(4, 20, 28, .04) 0%, rgba(4, 25, 31, .14) 34%, rgba(4, 23, 31, .8) 59%, rgba(4, 20, 28, .94) 100%),
            linear-gradient(0deg, rgba(1, 12, 22, .18), transparent 42%);
        }
        .mb-mode-kota .mb-mode-shade {
          background:
            linear-gradient(90deg, rgba(20, 15, 65, .05) 0%, rgba(22, 18, 70, .18) 35%, rgba(21, 18, 66, .8) 60%, rgba(15, 14, 52, .95) 100%),
            linear-gradient(0deg, rgba(10, 8, 38, .2), transparent 45%);
        }

        .mb-mode-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 38px rgba(26, 46, 65, .18);
        }
        .mb-mode-card:hover .mb-mode-art {
          transform: scale(1.035);
          filter: saturate(1.06);
        }
        .mb-mode-selected {
          border-color: var(--mb-mode-accent);
          box-shadow:
            0 17px 38px rgba(20, 40, 60, .18),
            0 0 0 4px color-mix(in srgb, var(--mb-mode-accent) 16%, transparent);
          transform: translateY(-3px);
        }
        .mb-mode-selected .mb-mode-check {
          display: grid;
        }

        .mb-mode-check {
          display: none;
          place-items: center;
          position: absolute;
          top: 13px;
          right: 13px;
          z-index: 3;
          width: 31px;
          height: 31px;
          border-radius: 50%;
          background: var(--mb-mode-accent);
          color: #072326;
          box-shadow: 0 8px 20px rgba(0, 0, 0, .24);
        }
        .mb-mode-kota .mb-mode-check {
          color: #21144a;
        }

        .mb-mode-body {
          position: relative;
          z-index: 2;
          width: min(61%, 300px);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 7px;
          min-width: 0;
        }
        .mb-mode-kicker {
          color: color-mix(in srgb, var(--mb-mode-accent) 78%, white);
          font-size: .66rem;
          line-height: 1;
          letter-spacing: .12em;
          font-weight: 900;
        }
        .mb-mode-name {
          color: #ffffff !important;
          font-size: clamp(1.42rem, 2.35vw, 1.85rem);
          line-height: 1.02;
          letter-spacing: .025em;
          text-shadow: 0 5px 18px rgba(0, 0, 0, .42);
        }
        .mb-mode-desc {
          color: rgba(244, 249, 253, .88);
          font-size: .88rem;
          line-height: 1.42;
          text-shadow: 0 2px 12px rgba(0, 0, 0, .42);
        }
        .mb-mode-chips,
        .mb-mode-milestones {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 2px;
        }
        .mb-mode-card .mb-team-chip {
          padding: 3px 9px;
          background: color-mix(in srgb, var(--mb-tc) 22%, rgba(5, 18, 25, .8));
          border-color: color-mix(in srgb, var(--mb-tc) 88%, white);
          color: color-mix(in srgb, var(--mb-tc) 76%, white);
          box-shadow: 0 3px 10px rgba(0, 0, 0, .12);
          font-size: .72rem;
        }
        .mb-mode-milestone {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 9px;
          border-radius: 999px;
          background: rgba(139, 124, 246, .23);
          border: 1px solid rgba(202, 193, 255, .24);
          color: #e8e2ff;
          font-size: .7rem;
          font-weight: 760;
          box-shadow: 0 3px 10px rgba(0, 0, 0, .12);
        }
        .mb-mode-milestone i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #c9bfff;
          opacity: .65;
          box-shadow: 0 0 10px rgba(201, 191, 255, .7);
        }

        @media (prefers-reduced-motion: no-preference) {
          .mb-mode-milestone i {
            animation: mb-dot-breathe 2.8s ease-in-out infinite;
          }
          @keyframes mb-dot-breathe {
            0%, 100% { opacity: .45; }
            50% { opacity: 1; }
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .mb-mode-art { transition: none; }
        }

        @media (max-width: 520px) {
          .mb-mode-card {
            min-height: 250px;
            padding: 18px;
          }
          .mb-mode-body {
            width: 66%;
          }
          .mb-mode-kicker { font-size: .6rem; }
          .mb-mode-desc { font-size: .82rem; }
        }
      `}</style>
    </button>
  );
}
