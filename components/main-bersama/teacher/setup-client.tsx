"use client";
// ─── Setup Guru (Tahap 8A — visual polish) ───────────────────
// Flow 3 langkah dalam SATU halaman (§6): pilih paket → cara
// bermain → kelas → Buka Ruang. Kompatibilitas paket tetap via API
// (sumber Tahap 5); subset eksplisit hanya bila caller sadar ada
// soal tak didukung. Sesi dibuat via POST commands — logic backend
// TIDAK berubah (§34).

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

  /** Alasan CTA mati — disabled harus menjelaskan (§12). */
  const disabledReason = useMemo(() => {
    if (!packageId) return 'Pilih paket soal terlebih dahulu.';
    if (!mode) return 'Pilih cara bermain terlebih dahulu.';
    if (zero) return 'Belum ada soal yang bisa dimainkan dari paket ini.';
    return null;
  }, [packageId, mode, zero]);

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
      // Subset eksplisit hanya bila caller sadar ada soal tak didukung (§5 Tahap 5).
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
      {/* ── Header hero (§5) ── */}
      <header className="mb-setup-head">
        <div className="mb-setup-head-deco" aria-hidden>
          <SetupGlyph />
        </div>
        <span className="mb-eyebrow">Kuis kelas langsung</span>
        <h1 className="mb-display">Main Bersama</h1>
        <p className="mb-setup-sub">
          Mainkan kuis langsung bersama seluruh kelas. Pilih soal, tentukan cara
          bermain, lalu buka ruang.
        </p>
      </header>

      {/* ── Langkah 1: paket soal (§7) ── */}
      <section aria-labelledby="mb-pkg-h" className="mb-setup-section">
        <div className="mb-guru-h">
          <span className="mb-step-badge mb-number" aria-hidden>1</span>
          <span className="mb-guru-h-text" id="mb-pkg-h">Pilih Paket Soal</span>
          <small>Paket soal dari Bank Soal milikmu.</small>
        </div>
        {packages.length === 0 ? (
          <div className="mb-setup-empty">
            <p className="mb-setup-empty-title">Belum ada paket soal</p>
            <p className="mb-setup-empty-sub">
              Pilih paket soal yang ingin dimainkan bersama kelas.
            </p>
            <button
              type="button"
              className="mb-btn-ghost"
              onClick={() => router.push('/guru/bank-soal')}
            >
              Pilih dari Bank Soal
            </button>
          </div>
        ) : (
          <ul className="mb-pkg-list">
            {packages.map((p) => {
              const info = compat[p.id];
              const isSel = packageId === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => void checkCompatibility(p.id)}
                    aria-pressed={isSel}
                    className={`mb-pkg-item ${isSel ? 'mb-pkg-selected' : ''}`}
                  >
                    <span className="mb-pkg-icon" aria-hidden>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                      </svg>
                    </span>
                    <span className="mb-pkg-body">
                      <span className="mb-pkg-title">{p.title}</span>
                      <span className="mb-pkg-meta">
                        Kelas {p.kelas} · <strong className="mb-number">{p.questionCount}</strong> soal
                        {isSel && info && info.total > 0 && info.supported < info.total
                          ? <> · <span className="mb-pkg-compat">{info.supported} dari {info.total} soal dapat dimainkan</span></>
                          : null}
                      </span>
                    </span>
                    {isSel ? (
                      <span className="mb-pkg-check" aria-hidden>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Langkah 2: cara bermain (§8-§10) ── */}
      <section className="mb-setup-section" role="radiogroup" aria-labelledby="mb-mode-h">
        <div className="mb-guru-h">
          <span className="mb-step-badge mb-number" aria-hidden>2</span>
          <span className="mb-guru-h-text" id="mb-mode-h">Pilih Cara Bermain</span>
          <small>Dua cara bermain, sama-sama seru.</small>
        </div>
        <div className="mb-mode-list">
          <ModeCard mode="jelajah-kata" selected={mode === 'jelajah-kata'} onSelect={() => setMode('jelajah-kata')} />
          <ModeCard mode="kota-cahaya" selected={mode === 'kota-cahaya'} onSelect={() => setMode('kota-cahaya')} />
        </div>
      </section>

      {/* ── Langkah 3: kelas (§11) ── */}
      {classes.length > 0 ? (
        <section aria-labelledby="mb-cls-h" className="mb-setup-section">
          <div className="mb-guru-h">
            <span className="mb-step-badge mb-number" aria-hidden>3</span>
            <span className="mb-guru-h-text" id="mb-cls-h">Pilih Kelas</span>
            <small>Opsional — untuk pencatatan kelas.</small>
          </div>
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

      {/* ── Aksi final (§12) ── */}
      <div className="mb-setup-cta">
        <div className="mb-setup-cta-box">
          <p className="mb-setup-cta-title">Siap bermain?</p>
          <p className="mb-setup-cta-sub">Buka ruang dan bagikan PIN kepada siswa.</p>
          <PrimaryGameButton
            onClick={openRoom}
            disabled={!canOpen}
            loading={opening || checking}
            variant="light"
          >
            {partial && selectedCompat && !zero ? `Gunakan ${selectedCompat.supported} soal` : 'Buka Ruang'}
          </PrimaryGameButton>
          {!canOpen && !opening && !checking && disabledReason ? (
            <p role="status" className="mb-setup-cta-reason">
              {packageId && checking
                ? 'Memeriksa paket soal…'
                : disabledReason}
            </p>
          ) : null}
        </div>
      </div>

      <style jsx global>{`
        .mb-setup { max-width: 780px; margin: 0 auto; padding: var(--mb-space-6) var(--mb-space-4) var(--mb-space-7); }
        /* ── Header hero ── */
        .mb-setup-head {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: var(--mb-space-2);
          padding: var(--mb-space-5) var(--mb-space-5) var(--mb-space-6);
          border-radius: var(--mb-radius-lg);
          background: var(--mb-surface-guru-elevated);
          border: 1px solid rgba(28, 43, 58, 0.08);
          box-shadow: var(--mb-shadow-light);
          overflow: hidden;
        }
        .mb-setup-head h1 { margin: 0; font-size: 2.3rem; line-height: 1.15; }
        .mb-setup-sub { margin: 0; max-width: 46ch; color: var(--mb-text-guru-secondary); line-height: 1.55; }
        .mb-setup-head-deco {
          position: absolute;
          right: -14px;
          top: -14px;
          opacity: 0.14;
          pointer-events: none;
        }
        /* ── Steps ── */
        .mb-setup-section { margin-top: var(--mb-space-7); }
        /* ── Package list (§7) ── */
        .mb-pkg-list {
          list-style: none;
          margin: 0;
          padding: 2px;
          display: flex;
          flex-direction: column;
          gap: var(--mb-space-2);
          max-height: 320px;
          overflow-y: auto;
        }
        .mb-pkg-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: var(--mb-space-3);
          width: 100%;
          text-align: left;
          padding: var(--mb-space-3) var(--mb-space-4);
          background: var(--mb-surface-guru-elevated);
          border: 2px solid rgba(28, 43, 58, 0.1);
          border-radius: var(--mb-radius-md);
          color: var(--mb-text-guru);
          cursor: pointer;
          transition: border-color var(--mb-motion-fast), background var(--mb-motion-fast);
        }
        .mb-pkg-item:hover { border-color: rgba(20, 184, 166, 0.5); }
        .mb-pkg-selected { border-color: var(--mb-primary-strong); background: var(--mb-primary-soft); }
        .mb-pkg-icon {
          display: grid;
          place-items: center;
          width: 40px;
          height: 40px;
          flex: none;
          border-radius: var(--mb-radius-sm);
          background: var(--mb-primary-soft);
          color: var(--mb-primary-strong);
        }
        .mb-pkg-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .mb-pkg-title { font-weight: 800; }
        .mb-pkg-meta { color: var(--mb-text-guru-secondary); font-size: 0.85rem; }
        .mb-pkg-compat { color: var(--mb-primary-strong); font-weight: 700; }
        .mb-pkg-check {
          display: grid;
          place-items: center;
          width: 26px;
          height: 26px;
          flex: none;
          margin-left: auto;
          border-radius: 50%;
          background: var(--mb-primary-strong);
          color: #ffffff;
        }
        /* ── Empty state (§7) ── */
        .mb-setup-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: var(--mb-space-6) var(--mb-space-4);
          border-radius: var(--mb-radius-lg);
          border: 2px dashed rgba(28, 43, 58, 0.16);
          background: var(--mb-surface-guru-elevated);
          text-align: center;
        }
        .mb-setup-empty-title { margin: 0; font-weight: 800; font-size: 1.05rem; color: var(--mb-text-guru); }
        .mb-setup-empty-sub { margin: 0 0 var(--mb-space-3); color: var(--mb-text-guru-secondary); }
        .mb-btn-ghost {
          padding: 10px var(--mb-space-5);
          border-radius: var(--mb-radius-pill);
          border: 2px solid var(--mb-primary-strong);
          background: transparent;
          color: var(--mb-primary-strong);
          font-weight: 800;
          cursor: pointer;
          transition: background var(--mb-motion-fast), color var(--mb-motion-fast);
        }
        .mb-btn-ghost:hover { background: var(--mb-primary-strong); color: #ffffff; }
        /* ── Mode grid (§10) ── */
        .mb-mode-list { display: grid; gap: var(--mb-space-4); }
        @media (min-width: 768px) {
          .mb-mode-list { grid-template-columns: 1fr 1fr; }
        }
        /* ── Class chips (§11) ── */
        .mb-cls-row { display: flex; flex-wrap: wrap; gap: var(--mb-space-2); }
        .mb-cls-chip {
          position: relative;
          padding: 10px 20px;
          border-radius: var(--mb-radius-pill);
          background: var(--mb-surface-guru-elevated);
          border: 2px solid rgba(28, 43, 58, 0.12);
          color: var(--mb-text-guru);
          font-weight: 700;
          cursor: pointer;
          transition: border-color var(--mb-motion-fast), background var(--mb-motion-fast);
        }
        .mb-cls-chip:hover { border-color: rgba(20, 184, 166, 0.5); }
        .mb-cls-selected {
          border-color: var(--mb-primary-strong);
          background: var(--mb-primary-soft);
          font-weight: 800;
        }
        .mb-cls-selected::after {
          content: "";
          position: absolute;
          top: 6px;
          right: 6px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--mb-primary-strong);
        }
        /* ── Final action area (§12) ── */
        .mb-setup-cta { margin-top: var(--mb-space-7); }
        .mb-setup-cta-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: var(--mb-space-6) var(--mb-space-5);
          border-radius: var(--mb-radius-lg);
          background: var(--mb-surface-guru-elevated);
          border: 1px solid rgba(28, 43, 58, 0.08);
          box-shadow: var(--mb-shadow-light);
          text-align: center;
        }
        .mb-setup-cta-title { margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--mb-text-guru); }
        .mb-setup-cta-sub { margin: 0 0 var(--mb-space-4); color: var(--mb-text-guru-secondary); }
        .mb-setup-cta-reason {
          margin: var(--mb-space-3) 0 0;
          color: var(--mb-text-guru-secondary);
          font-size: 0.9rem;
          font-weight: 600;
        }
        .mb-setup-error { color: var(--mb-danger); font-weight: 600; text-align: center; margin-top: var(--mb-space-3); }
      `}</style>
    </main>
  );
}

/** Glyph dekoratif header — kartu + PIN abstrak (placeholder §35). */
function SetupGlyph() {
  return (
    <svg width="150" height="120" viewBox="0 0 150 120" fill="none" aria-hidden>
      <rect x="30" y="14" width="104" height="72" rx="12" fill="var(--mb-primary)" opacity="0.55" />
      <rect x="18" y="30" width="104" height="72" rx="12" fill="var(--mb-primary-strong)" opacity="0.8" />
      <rect x="34" y="52" width="22" height="28" rx="6" fill="#ffffff" opacity="0.9" />
      <rect x="62" y="52" width="22" height="28" rx="6" fill="#ffffff" opacity="0.75" />
      <rect x="90" y="52" width="22" height="28" rx="6" fill="var(--mb-accent)" opacity="0.95" />
      <circle cx="118" cy="24" r="10" fill="var(--mb-accent)" opacity="0.9" />
    </svg>
  );
}
