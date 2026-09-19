"use client";

import type { ButtonHTMLAttributes } from 'react';

interface PrimaryGameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Label aksi (mis. "Mulai Permainan", "Tutup Jawaban"). */
  children: React.ReactNode;
  loading?: boolean;
}

/** Tombol aksi utama permainan — satu CTA dominan per layar (§2). */
export function PrimaryGameButton({
  children,
  loading = false,
  disabled,
  className = '',
  ...rest
}: PrimaryGameButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      {...rest}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`mb-primary-btn ${className}`}
    >
      {loading ? 'Sebentar…' : children}
      <style jsx>{`
        .mb-primary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--mb-space-2);
          min-height: 52px;
          padding: var(--mb-space-3) var(--mb-space-6);
          border: none;
          border-radius: var(--mb-radius-pill);
          background: var(--mb-primary);
          color: var(--mb-primary-contrast);
          font-family: var(--mb-font-ui);
          font-size: 1.05rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: var(--mb-shadow-card);
          transition: transform var(--mb-motion-fast), filter var(--mb-motion-fast);
        }
        .mb-primary-btn:hover:not(:disabled) {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }
        .mb-primary-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .mb-primary-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }
      `}</style>
    </button>
  );
}
