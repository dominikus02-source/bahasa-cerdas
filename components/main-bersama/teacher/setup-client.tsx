"use client";
// ─── Setup Guru (Tahap 7 §3/§4/§5) ───────────────────────────
// Pilih paket → mode → KelasKu optional → Buka Ruang.
// Kompatibilitas paket dievaluasi via API kompatibilitas (sumber
// sama dengan use-case Tahap 5 — tanpa duplikasi logika): bila ada
// soal tidak didukung tampil "27 dari 30 soal dapat dimainkan" +
// aksi "Gunakan 27 soal" (§3). Sesi dibuat via POST commands.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { GameMode } from '@/src/main-bersama/domain/types/session';
import { ModeCard } from '@/components/main-bersama/shared/ModeCard';
import { PrimaryGameButton } from '@/components/main-bersama/shared/PrimaryGameButton';
import { MbApiError, postTeacherCommand } from '@/lib/main-bersama/api-client';

export interface SetupPackage {
  id: string;
  title: string;
  kelas: string;
  questionCount: number;
}
export interface SetupClass {
  id: string;
  name: string;
}

interface CompatibilityInfo {
  total: number;
  supported: number;
}

export function SetupClient({
  packages,
  classes,
}: {
  teacherName?: string;
  packages: SetupPackage[];
  classes: SetupClass[];
}) {
  const router = useRouter();
  const [packageId, setPackageId] = useState<string | null>(null);
  const [mode, setMode] = useState<GameMode | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [compat, setCompat] = useState<Record<string, CompatibilityInfo>>({});
  const [checking, setChecking] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCompat = packageId ? compat[packageId] ?? null : null;
  const partial = selectedCompat !== null && selectedCompat.supported < selectedCompat.total;
  const zero = selectedCompat !== null && selectedCompat.supported === 0;

  const canOpen = useMemo(
    () => Boolean(packageId && mode && !checking && !opening && !zero),
    [packageId, mode, checking, opening, zero],
  );

  /** Cek kompatibilitas paket saat dipilih (read-only, sumber Tahap 5). */
  async function checkCompatibility(id: string) {
    setPackageId(id);
    setError(null);
    if (compat[id]) return; // sudah dicek — cache lokal sesi.
    setChecking(true);
    try {
      const res = await fetch('/api/main-bersama/teacher/package-compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageRef: { kind: 'SOAL_SET', soalSetId: id } }),
      });
      if (!res.ok) throw new Error('compat');
      const body = (await res.json()) as CompatibilityInfo;
      setCompat((prev) => ({ ...prev, [id]: body }));
    } catch {
      // Gagal cek → biarkan tanpa info; create-session tetap memvalidasi.
      setCompat((prev) => ({ ...prev, [id]: { total: 0, supported: 0 } }));
    } finally {
      setChecking(false);
    }
  }

  async function openRoom() {
    if (!packageId || !mode) return;
    setOpening(true);
    setError(null);
    try {
      // Subset eksplisit hanya bila caller sadar ada soal tak didukung (§3).
      const result = await postTeacherCommand({
        action: 'create-session',
        gameMode: mode,
        packageRef: { kind: 'SOAL_SET', soalSetId: packageId },
        ...(classId ? { classId } : {}),
        ...(partial ? { useSupportedQuestions: true } : {}),
      });
      const created = result.session as { id?: unknown } | undefined;
      const sessionId = created && typeof created.id === 'string' ? created.id : '';
      if (!sessionId) throw new MbApiError('INTERNAL', 'Sesi gagal dibuat.', 500);
      router.push(`/guru/game/main-bersama/ruang/${sessionId}`);
    } catch (e) {
      setError(e instanceof MbApiError ? e.message : 'Gagal membuka ruang. Coba lagi.');
      setOpening(false);
    }
  }

  return (
    <main className="mb-setup mb-fade-in">
      <header className="mb-setup-head">
        <h1 className="mb-display">Main Bersama</h1>
        <p>Kuis kelas seru — buka ruang, siswa gabung lewat PIN.</p>
      </header>

      <section aria-labelledby="mb-pkg-h" className="mb-setup-section">
        <h2 id="mb-pkg-h">1. Pilih paket soal</h2>
        {packages.length === 0 ? (
          <p className="mb-setup-empty">
            Belum ada paket soal. Buat dulu di Bank Soal, lalu kembali ke sini.
          </p>
        ) : (
          <ul className="mb-pkg-list">
            {packages.map((p) => {
              const info = compat[p.id];
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => checkCompatibility(p.id)}
                    aria-pressed={packageId === p.id}
                    className={`mb-pkg-item ${packageId === p.id ? 'mb-pkg-selected' : ''}`}
                  >
                    <span className="mb-pkg-title">{p.title}</span>
                    <span className="mb-pkg-meta">Kelas {p.kelas} · {p.questionCount} soal</span>
                    {packageId === p.id && info && info.total > 0 && info.supported < info.total ? (
                      <span className="mb-pkg-compat">
                        {info.supported} dari {info.total} soal dapat dimainkan.
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mb-setup-section" role="radiogroup" aria-labelledby="mb-mode-h">
        <h2 id="mb-mode-h">2. Pilih cara bermain</h2>
        <div className="mb-mode-list">
          <ModeCard mode="jelajah-kata" selected={mode === 'jelajah-kata'} onSelect={() => setMode('jelajah-kata')} />
          <ModeCard mode="kota-cahaya" selected={mode === 'kota-cahaya'} onSelect={() => setMode('kota-cahaya')} />
        </div>
      </section>

      {classes.length > 0 ? (
        <section aria-labelledby="mb-cls-h" className="mb-setup-section">
          <h2 id="mb-cls-h">3. Pilih kelas (opsional)</h2>
          <div className="mb-cls-row">
            <button
              type="button"
              aria-pressed={classId === null}
              onClick={() => setClassId(null)}
              className={`mb-cls-chip ${classId === null ? 'mb-cls-selected' : ''}`}
            >
              Tanpa kelas
            </button>
            {classes.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={classId === c.id}
                onClick={() => setClassId(c.id)}
                className={`mb-cls-chip ${classId === c.id ? 'mb-cls-selected' : ''}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {error ? (
        <p role="alert" className="mb-setup-error">{error}</p>
      ) : null}

      <div className="mb-setup-cta">
        <PrimaryGameButton onClick={openRoom} disabled={!canOpen} loading={opening || checking}>
          {partial && selectedCompat ? `Gunakan ${selectedCompat.supported} soal` : 'Buka Ruang'}
        </PrimaryGameButton>
        {packageId && zero ? (
          <p role="status" className="mb-setup-error">
            Belum ada soal yang bisa dimainkan dari paket ini.
          </p>
        ) : null}
      </div>

      <style jsx global>{`
        .mb-setup { max-width: 720px; margin: 0 auto; padding: var(--mb-space-6) var(--mb-space-4); }
        .mb-setup-head h1 { margin: 0; font-size: 2rem; color: var(--mb-text-primary); }
        .mb-setup-head p { margin: 4px 0 0; color: var(--mb-text-secondary); }
        .mb-setup-section { margin-top: var(--mb-space-6); }
        .mb-setup-section h2 { font-size: 1.05rem; color: var(--mb-text-secondary); font-weight: 700; margin: 0 0 var(--mb-space-3); }
        .mb-setup-empty { color: var(--mb-text-secondary); }
        .mb-pkg-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--mb-space-2); max-height: 300px; overflow-y: auto; }
        .mb-pkg-item { display: flex; flex-direction: column; gap: 2px; width: 100%; text-align: left; padding: var(--mb-space-3) var(--mb-space-4); background: var(--mb-surface); border: 2px solid transparent; border-radius: var(--mb-radius-md); color: var(--mb-text-primary); cursor: pointer; }
        .mb-pkg-selected { border-color: var(--mb-primary); background: var(--mb-primary-soft); }
        .mb-pkg-title { font-weight: 700; }
        .mb-pkg-meta { color: var(--mb-text-secondary); font-size: 0.85rem; }
        .mb-pkg-compat { color: var(--mb-accent); font-size: 0.85rem; font-weight: 700; }
        .mb-mode-list { display: grid; gap: var(--mb-space-3); }
        .mb-cls-row { display: flex; flex-wrap: wrap; gap: var(--mb-space-2); }
        .mb-cls-chip { padding: 8px 16px; border-radius: var(--mb-radius-pill); background: var(--mb-surface); border: 2px solid transparent; color: var(--mb-text-primary); font-weight: 600; cursor: pointer; }
        .mb-cls-selected { border-color: var(--mb-primary); background: var(--mb-primary-soft); }
        .mb-setup-cta { display: flex; flex-direction: column; align-items: center; gap: var(--mb-space-3); margin-top: var(--mb-space-7); }
        .mb-setup-error { color: var(--mb-danger); font-weight: 600; }
      `}</style>
    </main>
  );
}
