"use client";
// ─── Student Join Client (Tahap 8A — visual polish) ──────────
// Flow: PIN → Nama → Gabung → Lobby (semua di satu client dengan
// step lokal). Reconnect: bila ada credential tersimpan, tawarkan
// "Lanjutkan bermain" — credential TIDAK pernah ditampilkan/dicatat
// di DOM/log. Guest cukup nama; authenticated student dipakai apa
// adanya oleh API (server membaca cookie Supabase). Logic Tahap 7
// TIDAK berubah — hanya presentation (§34).

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  MbApiError,
  fetchStudentState,
  joinSession,
} from '@/lib/main-bersama/api-client';
import {
  clearCredential,
  loadLastCredential,
  saveCredential,
  saveLastSessionId,
} from '@/lib/main-bersama/credential-store';
import { PrimaryGameButton } from '@/components/main-bersama/shared/PrimaryGameButton';
import { ConnectionBanner } from '@/components/main-bersama/shared/ConnectionBanner';
import { StudentBackButton } from '@/components/main-bersama/shared/StudentBackButton';
import { createClient } from '@/lib/supabase/client';

type Step = 'pin' | 'name' | 'joining';

function JoinFlow() {
  const router = useRouter();
  const search = useSearchParams();
  const [step, setStep] = useState<Step>('pin');
  const [pin, setPin] = useState(search.get('pin') ?? '');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);
  const [canResume, setCanResume] = useState<{ sessionId: string } | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);

  // Kandidat reconnect dari credential-store (sekali saat mount).
  useEffect(() => {
    const last = loadLastCredential();
    if (last) setCanResume({ sessionId: last.sessionId });
    // Header kembali hanya untuk murid login (guest: join adalah entry).
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (!cancelled) setIsAuthed(Boolean(data.session));
      } catch {
        /* guest */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enterRoom = useCallback(
    (sessionId: string) => {
      router.replace(`/main-bersama/siswa/${sessionId}`);
    },
    [router],
  );

  const tryResume = useCallback(async () => {
    if (!canResume) return;
    setResuming(true);
    setError(null);
    try {
      // GET authoritative dengan credential tersimpan (header).
      const resumed = await fetchStudentState(canResume.sessionId);
      if (resumed.phase === 'ended') {
        clearCredential(canResume.sessionId);
        setCanResume(null);
        setResuming(false);
        return;
      }
      enterRoom(canResume.sessionId);
    } catch {
      // Credential kedaluwarsa/salah → lanjut join normal.
      setCanResume(null);
      setResuming(false);
    }
  }, [canResume, enterRoom]);

  const joinNow = useCallback(async (displayName?: string) => {
    setStep('joining');
    setError(null);
    try {
      const result = await joinSession({
        pin,
        ...(displayName ? { displayName } : {}),
      });
      saveCredential(result.session.id, result.credential); // helper tunggal
      saveLastSessionId(result.session.id);
      enterRoom(result.session.id);
    } catch (e) {
      setError(e instanceof MbApiError ? e.message : 'Gagal gabung. Coba lagi.');
      setStep('pin');
    }
  }, [pin, enterRoom]);

  const submitPin = useCallback(() => {
    if (!/^\d{6}$/.test(pin)) {
      setError('PIN harus 6 angka. Periksa lagi, ya.');
      return;
    }
    setError(null);
    if (isAuthed) {
      // Nama user login ditentukan server dari profil BC, bukan input bebas.
      void joinNow();
      return;
    }
    setStep('name');
  }, [pin, isAuthed, joinNow]);

  const submitName = useCallback(async () => {
    await joinNow(name);
  }, [joinNow, name]);

  return (
    <main className="mb-join mb-fade-in">
      {/* Dekorasi latar — lingkaran lembut (placeholder §35, aria-hidden). */}
      <span className="mb-join-blob mb-join-blob-a" aria-hidden />
      <span className="mb-join-blob mb-join-blob-b" aria-hidden />

      {isAuthed ? (
        <div className="mb-join-back">
          <StudentBackButton phase="idle" />
        </div>
      ) : null}
      <span className="mb-eyebrow mb-join-eyebrow">Masuk arena kelas</span>
      <h1 className="mb-display mb-join-title">Main Bersama</h1>
      <p className="mb-join-tagline">
        Masukkan PIN dari Pak/Bu Guru dan siap bermain bareng sekelas.
      </p>

      {canResume ? (
        <button type="button" className="mb-resume" onClick={tryResume} disabled={resuming}>
          <strong>{resuming ? 'Menyambungkan…' : 'Lanjutkan bermain'}</strong>
          <small>kembali ke ruang yang sama sebelumnya</small>
        </button>
      ) : null}

      {step === 'pin' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitPin();
          }}
          className="mb-join-form"
        >
          <label htmlFor="mb-pin" className="mb-join-label">Masukkan PIN dari gurumu</label>
          <input
            id="mb-pin"
            className="mb-pin-input mb-number"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="······"
            aria-describedby={error ? 'mb-join-err' : undefined}
          />
          {error ? <p id="mb-join-err" role="alert" className="mb-join-err">{error}</p> : null}
          <PrimaryGameButton type="submit">
            {isAuthed ? 'Gabung sebagai akun saya' : 'Lanjut'}
          </PrimaryGameButton>
        </form>
      ) : null}

      {step === 'name' || step === 'joining' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 'name') void submitName();
          }}
          className="mb-join-form"
        >
          <p className="mb-join-label">
            PIN <strong className="mb-number mb-join-pinchip">{pin}</strong>
          </p>
          <label htmlFor="mb-name" className="mb-join-label">Siapa namamu?</label>
          <input
            id="mb-name"
            className="mb-name-input"
            maxLength={24}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama panggilan"
            autoFocus
            disabled={step === 'joining'}
          />
          {error ? <p role="alert" className="mb-join-err">{error}</p> : null}
          <PrimaryGameButton type="submit" disabled={name.trim().length < 2} loading={step === 'joining'}>
            Gabung
          </PrimaryGameButton>
          <button type="button" className="mb-linklike" onClick={() => setStep('pin')}>
            Ganti PIN
          </button>
        </form>
      ) : null}

      <style jsx global>{`
        .mb-join {
          position: relative;
          flex: 1;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          padding: 34px 18px;
          overflow: hidden;
          background:
            radial-gradient(500px 320px at 90% 4%, rgba(20,184,166,.2), transparent 70%),
            radial-gradient(440px 320px at 5% 94%, rgba(139,124,246,.17), transparent 72%),
            linear-gradient(160deg, #071a2d, #071522 58%, #091929);
        }
        .mb-join::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: .16;
          background-image:
            linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
          background-size: 34px 34px;
          mask-image: linear-gradient(to bottom, #000, transparent 85%);
        }
        .mb-join-back {
          position: absolute;
          top: 16px;
          left: 16px;
          z-index: 4;
        }
        .mb-join-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(70px);
          pointer-events: none;
        }
        .mb-join-blob-a {
          width: 320px;
          height: 320px;
          top: -150px;
          right: -100px;
          background: rgba(20,184,166,.2);
        }
        .mb-join-blob-b {
          width: 300px;
          height: 300px;
          bottom: -150px;
          left: -110px;
          background: rgba(139,124,246,.14);
        }
        .mb-join-eyebrow {
          position: relative;
          z-index: 1;
          color: #72e3d8;
        }
        .mb-join-title {
          position: relative;
          z-index: 1;
          margin: 0;
          color: #fff !important;
          font-size: clamp(2.65rem, 11vw, 4.3rem);
          line-height: .94;
          letter-spacing: .03em;
          text-align: center;
          text-transform: uppercase;
          text-shadow: 0 12px 30px rgba(0,0,0,.28);
        }
        .mb-join-tagline {
          position: relative;
          z-index: 1;
          max-width: 34ch;
          margin: 0 0 4px;
          color: #9eb4c5;
          line-height: 1.5;
          text-align: center;
        }
        .mb-join-form {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 14px;
          width: min(100%, 390px);
          padding: 22px;
          border-radius: 26px;
          border: 1px solid rgba(255,255,255,.1);
          background:
            linear-gradient(160deg, rgba(18,44,64,.9), rgba(9,28,43,.94));
          box-shadow: 0 26px 60px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.04);
          backdrop-filter: blur(12px);
        }
        .mb-join-label {
          margin: 0;
          color: #b4c6d4;
          font-weight: 760;
          text-align: center;
        }
        .mb-join-pinchip {
          display: inline-block;
          padding: 3px 12px;
          margin-left: 6px;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.1);
          letter-spacing: .18em;
          color: #fff;
        }
        .mb-pin-input {
          width: 100%;
          min-height: 76px;
          text-align: center;
          font-size: clamp(2rem, 10vw, 2.7rem);
          letter-spacing: .28em;
          padding: 10px 8px 10px 20px;
          border-radius: 19px;
          border: 2px solid rgba(255,255,255,.13);
          background: rgba(4,18,31,.7);
          color: #fff;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.035);
          transition: border-color var(--mb-motion-fast), box-shadow var(--mb-motion-fast), transform var(--mb-motion-fast);
        }
        .mb-pin-input:focus {
          border-color: #55dbcf;
          outline: none;
          box-shadow: 0 0 0 4px rgba(85,219,207,.1), 0 12px 28px rgba(0,0,0,.14);
          transform: translateY(-1px);
        }
        .mb-name-input {
          width: 100%;
          min-height: 58px;
          font-size: 1.1rem;
          padding: 12px 15px;
          border-radius: 17px;
          border: 2px solid rgba(255,255,255,.13);
          background: rgba(4,18,31,.7);
          color: #fff;
          transition: border-color var(--mb-motion-fast), box-shadow var(--mb-motion-fast);
        }
        .mb-name-input::placeholder,
        .mb-pin-input::placeholder { color: rgba(205,220,231,.34); }
        .mb-name-input:focus {
          border-color: #55dbcf;
          outline: none;
          box-shadow: 0 0 0 4px rgba(85,219,207,.09);
        }
        .mb-join-form :global(.mb-primary-game-btn) {
          width: 100%;
          min-height: 54px;
          margin-top: 2px;
          box-shadow: 0 12px 26px rgba(20,184,166,.18);
        }
        .mb-join-err {
          margin: -2px 0 0;
          color: #ffb8b8;
          font-weight: 650;
          text-align: center;
        }
        .mb-linklike {
          align-self: center;
          background: none;
          border: none;
          color: #91a9bb;
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
          font-size: .86rem;
          padding: 5px;
        }
        .mb-resume {
          position: relative;
          z-index: 2;
          width: min(100%, 390px);
          display: flex;
          flex-direction: column;
          gap: 3px;
          align-items: center;
          padding: 12px 18px;
          border-radius: 18px;
          background: rgba(112, 88, 31, .18);
          border: 1px solid rgba(255, 207, 84, .28);
          color: #ffe7a2;
          box-shadow: 0 10px 24px rgba(0,0,0,.12);
          cursor: pointer;
        }
        .mb-resume:hover:not(:disabled) {
          background: rgba(112,88,31,.26);
          border-color: rgba(255,207,84,.42);
        }
        .mb-resume:disabled { opacity: .6; cursor: wait; }
        .mb-resume small { color: #aebdca; }
        @media (max-width: 430px) {
          .mb-join {
            justify-content: flex-start;
            padding-top: 82px;
          }
          .mb-join-form { padding: 20px 16px; border-radius: 23px; }
        }
      `}</style>
    </main>
  );
}

export function StudentJoinClient() {
  return (
    <Suspense fallback={null}>
      <JoinFlow />
    </Suspense>
  );
}
