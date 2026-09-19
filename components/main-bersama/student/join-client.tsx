"use client";
// ─── Student Join Client (Tahap 7 §7/§8) ─────────────────────
// Flow: PIN → Nama → Gabung → Lobby (semua di satu client dengan
// step lokal). Reconnect: bila ada credential tersimpan, tawarkan
// "Lanjutkan bermain" — credential TIDAK pernah ditampilkan/dicatat
// di DOM/log (§8). Guest cukup nama; authenticated student dipakai
// apa adanya oleh API (server membaca cookie Supabase).

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  MbApiError,
  fetchStudentState,
  joinSession,
} from '@/lib/main-bersama/api-client';
import { loadLastCredential, saveCredential, saveLastSessionId } from '@/lib/main-bersama/credential-store';
import { PrimaryGameButton } from '@/components/main-bersama/shared/PrimaryGameButton';
import { ConnectionBanner } from '@/components/main-bersama/shared/ConnectionBanner';

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

  // Kandidat reconnect dari credential-store (sekali saat mount).
  useEffect(() => {
    const last = loadLastCredential();
    if (last) setCanResume({ sessionId: last.sessionId });
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
      await fetchStudentState(canResume.sessionId);
      enterRoom(canResume.sessionId);
    } catch {
      // Credential kedaluwarsa/salah → lanjut join normal.
      setCanResume(null);
      setResuming(false);
    }
  }, [canResume, enterRoom]);

  const submitPin = useCallback(() => {
    if (!/^\d{6}$/.test(pin)) {
      setError('PIN harus 6 angka. Periksa lagi, ya.');
      return;
    }
    setError(null);
    setStep('name');
  }, [pin]);

  const submitName = useCallback(async () => {
    setStep('joining');
    setError(null);
    try {
      const result = await joinSession({ pin, displayName: name });
      saveCredential(result.session.id, result.credential); // helper tunggal (§8)
      saveLastSessionId(result.session.id);
      enterRoom(result.session.id);
    } catch (e) {
      setError(e instanceof MbApiError ? e.message : 'Gagal gabung. Coba lagi.');
      setStep('pin');
    }
  }, [pin, name, enterRoom]);

  return (
    <main className="mb-join mb-fade-in">
      <ConnectionBanner visible={false} />
      <h1 className="mb-display mb-join-title">Main Bersama</h1>

      {canResume ? (
        <button type="button" className="mb-resume" onClick={tryResume} disabled={resuming}>
          <strong>Lanjutkan bermain</strong>
          <small>lanjut ke ruang yang sama sebelumnya</small>
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
          <label htmlFor="mb-pin" className="mb-join-label">Masukkan PIN dari guru</label>
          <input
            id="mb-pin"
            className="mb-pin-input mb-number"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••••"
            aria-describedby={error ? 'mb-join-err' : undefined}
          />
          {error ? <p id="mb-join-err" role="alert" className="mb-join-err">{error}</p> : null}
          <PrimaryGameButton type="submit">Lanjut</PrimaryGameButton>
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
            PIN <strong className="mb-number">{pin}</strong> ✓
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
        .mb-join { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--mb-space-5); padding: var(--mb-space-5); }
        .mb-join-title { font-size: 2.2rem; margin: 0; }
        .mb-join-form { display: flex; flex-direction: column; align-items: center; gap: var(--mb-space-4); width: min(100%, 360px); }
        .mb-join-label { color: var(--mb-text-secondary); font-weight: 600; }
        .mb-pin-input { width: 100%; text-align: center; font-size: 2.4rem; letter-spacing: 0.35em; padding: var(--mb-space-3); border-radius: var(--mb-radius-md); border: 2px solid transparent; background: var(--mb-surface); color: var(--mb-text-primary); }
        .mb-pin-input:focus { border-color: var(--mb-primary); outline: none; }
        .mb-name-input { width: 100%; font-size: 1.2rem; padding: var(--mb-space-3) var(--mb-space-4); border-radius: var(--mb-radius-md); border: 2px solid transparent; background: var(--mb-surface); color: var(--mb-text-primary); }
        .mb-name-input:focus { border-color: var(--mb-primary); outline: none; }
        .mb-join-err { color: var(--mb-danger); font-weight: 600; margin: 0; }
        .mb-linklike { background: none; border: none; color: var(--mb-text-secondary); text-decoration: underline; cursor: pointer; font-size: 0.9rem; }
        .mb-resume { display: flex; flex-direction: column; gap: 2px; align-items: center; padding: var(--mb-space-3) var(--mb-space-5); border-radius: var(--mb-radius-lg); background: var(--mb-accent-soft); border: 2px solid var(--mb-accent); color: var(--mb-text-primary); cursor: pointer; }
        .mb-resume small { color: var(--mb-text-secondary); }
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
