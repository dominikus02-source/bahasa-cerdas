"use client";
// ─── Student Back Button (8A.5) ─────────────────────────────
// Navigasi keluar yang aman untuk surface siswa Main Bersama:
// - Authenticated student → `/murid/beranda` ("Kembali ke Dasbor").
// - Guest → `/main-bersama/join` ("Kembali" / "Kembali ke halaman masuk").
// - TIDAK memakai history.back (deep-link/PIN bisa datang dari mana saja).
// - TIDAK menghapus credential/reconnect state — hanya navigasi.
// - Fase aktif (soal/closed/discussion) → konfirmasi ringan dulu.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export type StudentExitPhase = 'idle' | 'active';

interface StudentBackButtonProps {
  /** 'idle' (lobby/summary/join) = langsung; 'active' = konfirmasi dulu. */
  phase?: StudentExitPhase;
  /** Dipakai saat belum tahu auth (mis. halaman join). */
  compact?: boolean;
}

export function StudentBackButton({ phase = 'idle', compact = false }: StudentBackButtonProps) {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [confirming, setConfirming] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Deteksi sesi lokal saja (tanpa network, tanpa sentuh DB).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (!cancelled) setIsAuthed(Boolean(data.session));
      } catch {
        if (!cancelled) setIsAuthed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const authed = isAuthed === true;
  // Guest di halaman join tidak butuh tombol kembali (itu entry point).
  const destination = authed ? '/murid/beranda' : '/main-bersama/join';
  const confirmLabel = authed ? 'Kembali ke Dasbor' : 'Kembali ke halaman masuk';
  const idleLabel = authed ? 'Kembali ke Dasbor' : 'Kembali';

  const go = useCallback(() => {
    router.push(destination);
  }, [router, destination]);

  const onBack = useCallback(() => {
    if (phase === 'active') setConfirming(true);
    else go();
  }, [phase, go]);

  // Fokus ke aksi aman + Esc untuk batal (dialog ringan aksesibel).
  useEffect(() => {
    if (!confirming) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirming(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirming]);

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className={`mb-sback ${compact ? 'mb-sback-compact' : ''}`}
        aria-label={phase === 'active' ? 'Keluar dari permainan' : idleLabel}
      >
        <ArrowLeft size={18} aria-hidden />
        {!compact ? <span>{idleLabel}</span> : null}
      </button>

      {confirming ? (
        <div className="mb-sexit-overlay" role="presentation" onClick={() => setConfirming(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="mb-sexit-t"
            aria-describedby="mb-sexit-d"
            className="mb-sexit-card mb-entrance"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="mb-sexit-t" className="mb-display">Keluar dari permainan?</h2>
            <p id="mb-sexit-d">Kamu dapat masuk kembali menggunakan PIN yang sama.</p>
            <div className="mb-sexit-actions">
              <button type="button" ref={cancelRef} className="mb-btn-ghost" onClick={() => setConfirming(false)}>
                Tetap Bermain
              </button>
              <button type="button" className="mb-btn-danger" onClick={go}>
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .mb-sback {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 44px;
          padding: 8px 16px 8px 12px;
          border-radius: var(--mb-radius-pill);
          border: 1.5px solid rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.08);
          color: var(--mb-text-primary);
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background var(--mb-motion-fast), border-color var(--mb-motion-fast);
        }
        .mb-sback:hover { background: rgba(255, 255, 255, 0.14); }
        .mb-sback:focus-visible { outline: 2px solid var(--mb-primary); outline-offset: 2px; }
        .mb-sback-compact { padding: 8px 12px; }
        .mb-sexit-overlay {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: grid;
          place-items: center;
          padding: var(--mb-space-4);
          background: rgba(4, 14, 26, 0.6);
        }
        .mb-sexit-card {
          width: min(100%, 380px);
          display: flex;
          flex-direction: column;
          gap: var(--mb-space-3);
          padding: var(--mb-space-5);
          border-radius: var(--mb-radius-lg);
          background: var(--mb-surface-elevated);
          color: var(--mb-text-primary);
          text-align: center;
          box-shadow: var(--mb-shadow-card);
        }
        .mb-sexit-card h2 { margin: 0; font-size: 1.25rem; }
        .mb-sexit-card p { margin: 0; color: var(--mb-text-secondary); line-height: 1.55; }
        .mb-sexit-actions { display: flex; gap: var(--mb-space-3); margin-top: var(--mb-space-2); }
        .mb-sexit-actions > button { flex: 1; min-height: 48px; }
        .mb-btn-ghost {
          padding: 10px var(--mb-space-4);
          border-radius: var(--mb-radius-pill);
          border: 2px solid var(--mb-primary-strong);
          background: transparent;
          color: var(--mb-text-primary);
          font-weight: 800;
          cursor: pointer;
        }
        .mb-btn-danger {
          padding: 10px var(--mb-space-4);
          border-radius: var(--mb-radius-pill);
          border: 2px solid var(--mb-danger);
          background: var(--mb-danger-soft);
          color: var(--mb-text-primary);
          font-weight: 800;
          cursor: pointer;
        }
        .mb-btn-ghost:focus-visible, .mb-btn-danger:focus-visible {
          outline: 2px solid var(--mb-primary);
          outline-offset: 2px;
        }
      `}</style>
    </>
  );
}
