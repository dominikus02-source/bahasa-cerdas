"use client";

import type { ButtonHTMLAttributes } from 'react';

interface PrimaryGameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Label aksi (mis. "Mulai Permainan", "Tutup Jawaban"). */
  children: React.ReactNode;
  /** Saat loading, label tetap tampil + spinner kecil (bukan ganti teks). */
  loading?: boolean;
  /** 'dark' (default) untuk surface gelap; 'light' untuk surface guru. */
  variant?: 'dark' | 'light';
}

/** Tombol aksi utama permainan — satu CTA dominan per layar (§18). */
export function PrimaryGameButton({
  children,
  loading = false,
  disabled,
  className = '',
  variant = 'dark',
  ...rest
}: PrimaryGameButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      {...rest}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`mb-primary-btn mb-primary-${variant} ${className}`}
    >
      {loading ? (
        <span className="mb-btn-spin" aria-hidden />
      ) : null}
      {children}
      <style jsx global>{`
        .mb-primary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--mb-space-2);
          min-height: 54px;
          padding: var(--mb-space-3) var(--mb-space-7);
          border: none;
          border-radius: var(--mb-radius-pill);
          font-family: var(--mb-font-ui);
          font-size: 1.08rem;
          font-weight: 800;
          letter-spacing: 0.01em;
          cursor: pointer;
          transition: transform var(--mb-motion-fast), filter var(--mb-motion-fast), box-shadow var(--mb-motion-fast);
        }
        .mb-primary-dark {
          background: linear-gradient(135deg, var(--mb-primary-strong), var(--mb-primary));
          color: #ffffff;
          box-shadow: var(--mb-shadow-glow);
        }
        .mb-primary-light {
          background: linear-gradient(135deg, var(--mb-primary-strong), var(--mb-primary));
          color: #ffffff;
          box-shadow: 0 8px 22px rgba(20, 184, 166, 0.3);
        }
        .mb-primary-btn:hover:not(:disabled) {
          filter: brightness(1.07);
          transform: translateY(-1px);
        }
        .mb-primary-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .mb-primary-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          box-shadow: none;
          filter: grayscale(0.4);
        }
        .mb-btn-spin {
          width: 18px;
          height: 18px;
          flex: none;
          border-radius: 50%;
          border: 3px solid rgba(255, 255, 255, 0.35);
          border-top-color: #ffffff;
        }
        @media (prefers-reduced-motion: no-preference) {
          .mb-btn-spin { animation: mb-spin 0.8s linear infinite; }
          @keyframes mb-spin { to { transform: rotate(360deg); } }
        }
        @media (prefers-reduced-motion: reduce) {
          .mb-btn-spin { animation: none; }
        }
      `}</style>
    </button>
  );
}
