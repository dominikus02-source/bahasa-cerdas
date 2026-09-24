"use client";
// ─── Setup Guru (Tahap 8A — visual polish) ───────────────────
// Flow 3 langkah dalam SATU halaman (§6): pilih paket → cara
// bermain → kelas → Buka Ruang. Kompatibilitas paket tetap via API
// (sumber Tahap 5); subset eksplisit hanya bila caller sadar ada
// soal tak didukung. Sesi dibuat via POST commands — logic backend
// TIDAK berubah (§34).

import { useEffect, useMemo, useState } from 'react';
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

/**
 * Tema Bank Soal yang dipilih guru lewat tombol "Gunakan untuk Main
 * Bersama" (Tahap 8A.3). Referensi sumber — BUKAN paket baru, jadi
 * tidak ada SoalSet/Soal duplikat yang dibuat.
 */
export interface SetupThemeSelection {
  topic: string;
  count: number;
  difficulty: string | null;
  seed?: string;
}

interface CompatibilityInfo {
  total: number;
  supported: number;
  /** Jumlah soal yang diminta guru (null untuk paket SoalSet). */
  requested?: number | null;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  MUDAH: 'Mudah',
  SEDANG: 'Sedang',
  SULIT: 'Sulit',
};

/** Kunci cache kompatibilitas untuk satu pilihan tema. */
function themeCacheKey(sel: SetupThemeSelection): string {
  return `theme:${sel.topic}|${sel.count}|${sel.difficulty ?? ''}|${sel.seed ?? ''}`;
}

export function SetupClient({
  packages,
  classes,
  preselectedTheme,
}: {
  teacherName?: string;
  packages: SetupPackage[];
  classes: SetupClass[];
  preselectedTheme?: SetupThemeSelection | null;
}) {
  const router = useRouter();
  const [packageId, setPackageId] = useState<string | null>(null);
  // Tema Bank Soal hasil handoff "Gunakan untuk Main Bersama" (boleh null).
  const [themeSel, setThemeSel] = useState<SetupThemeSelection | null>(
    preselectedTheme ?? null,
  );
  const [mode, setMode] = useState<GameMode | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [compat, setCompat] = useState<Record<string, CompatibilityInfo>>({});
  const [checking, setChecking] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const themeKey = themeSel ? themeCacheKey(themeSel) : null;
  const selectedKey = themeKey ?? packageId;
  const selectedCompat = selectedKey ? compat[selectedKey] ?? null : null;
  // `requested` = permintaan guru untuk tema Bank Soal; paket SoalSet
  // memakai total paket apa adanya (perilaku lama tidak berubah).
  const requestedCount = selectedCompat?.requested ?? selectedCompat?.total ?? null;
  const partial =
    selectedCompat !== null && requestedCount !== null && selectedCompat.supported < requestedCount;
  const zero = selectedCompat !== null && selectedCompat.supported === 0;

  const canOpen = useMemo(
    () => Boolean(selectedKey && mode && !checking && !opening && !zero),
    [selectedKey, mode, checking, opening, zero],
  );

  /** Alasan CTA mati — disabled harus menjelaskan (§12). */
  const disabledReason = useMemo(() => {
    if (!selectedKey) return 'Pilih soal dulu.';
    // Sumber tanpa soal yang bisa dimainkan disebut LEBIH DULU daripada
    // "pilih cara bermain": mengganti mode tidak akan menolongnya.
    if (zero) return 'Belum ada soal yang bisa dimainkan dari paket ini. Pilih tema atau paket lain.';
    if (!mode) return 'Pilih cara bermain.';
    return null;
  }, [selectedKey, mode, zero]);

  /**
   * Cek kompatibilitas sumber terpilih (read-only, sumber Tahap 5).
   * `ref` = packageRef BERTIPE — bentuk yang sama dipakai create-session,
   * sehingga angka di layar == yang benar-benar dimainkan.
   */
  async function checkCompatibility(cacheKey: string, ref: Record<string, unknown>) {
    setError(null);
    if (compat[cacheKey]) return; // sudah dicek — cache lokal sesi.
    setChecking(true);
    try {
      const res = await fetch('/api/main-bersama/teacher/package-compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageRef: ref }),
      });
      if (!res.ok) throw new Error('compat');
      const body = (await res.json()) as CompatibilityInfo;
      setCompat((prev) => ({ ...prev, [cacheKey]: body }));
    } catch {
      // Gagal cek → biarkan tanpa info; create-session tetap memvalidasi.
      setCompat((prev) => ({ ...prev, [cacheKey]: { total: 0, supported: 0 } }));
    } finally {
      setChecking(false);
    }
  }

  function selectPackage(id: string) {
    setThemeSel(null); // paket dan tema saling eksklusif
    setPackageId(id);
    void checkCompatibility(id, { kind: 'SOAL_SET', soalSetId: id });
  }

  /** Kompatibilitas tema yang baru masuk dari handoff dicek otomatis. */
  useEffect(() => {
    if (!preselectedTheme) return;
    void checkCompatibility(themeCacheKey(preselectedTheme), {
      kind: 'BANK_THEME',
      topic: preselectedTheme.topic,
      count: preselectedTheme.count,
      difficulty: preselectedTheme.difficulty,
      ...(preselectedTheme.seed ? { seed: preselectedTheme.seed } : {}),
    });
    // Cukup sekali per tema yang diteruskan — `compat` sengaja tidak jadi dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedTheme?.topic, preselectedTheme?.count, preselectedTheme?.difficulty, preselectedTheme?.seed]);

  async function openRoom() {
    if (!selectedKey || !mode) return;
    setOpening(true);
    setError(null);
    try {
      // Bentuk ref BERTIPE (union) — bukan objek longgar, supaya kesalahan
      // bentuk tertangkap di compile time, bukan di server.
      type CreateRef = NonNullable<Parameters<typeof postTeacherCommand>[0]['packageRef']>;
      const packageRef: CreateRef = themeSel
        ? {
            kind: 'BANK_THEME',
            topic: themeSel.topic,
            count: themeSel.count,
            difficulty: themeSel.difficulty,
            ...(themeSel.seed ? { seed: themeSel.seed } : {}),
          }
        : { kind: 'SOAL_SET', soalSetId: packageId ?? '' };
      // Subset eksplisit hanya bila caller sadar ada soal tak didukung (§5 Tahap 5).
      const result = await postTeacherCommand({
        action: 'create-session',
        gameMode: mode,
        packageRef,
        ...(classId ? { classId } : {}),
        ...(partial ? { useSupportedQuestions: true } : {}),
      });
      const created = result.session as { id?: unknown } | undefined;
      const sessionId = created && typeof created.id === 'string' ? created.id : '';
      if (!sessionId) throw new MbApiError('INTERNAL', 'Sesi gagal dibuat.', 500);

      // UX lobby satu langkah: setelah sesi durable dibuat, langsung buka
      // lobby sebelum guru tiba di halaman ruang. Tidak ada lagi klik
      // "Buka Ruang" kedua. TeacherRoomClient tetap punya auto-recovery
      // bila command ini gagal karena gangguan jaringan sesaat.
      try {
        await postTeacherCommand({ action: 'open-lobby', sessionId });
      } catch {
        // Session sudah berhasil dibuat; lanjut ke ruang. Halaman ruang akan
        // mengubah PREPARING → LOBBY secara otomatis sebagai recovery.
      }

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
        <div className="mb-setup-hero-copy">
          <span className="mb-eyebrow">Kuis kelas langsung</span>
          <h1 className="mb-display">
            <span>Main</span> <strong>Bersama</strong>
          </h1>
          <p className="mb-setup-sub">
            Mainkan kuis langsung bersama seluruh kelas. Pilih soal, tentukan cara
            bermain, lalu buka ruang.
          </p>
          <div className="mb-setup-hero-pills" aria-label="Keunggulan Main Bersama">
            <span><i aria-hidden />Seru &amp; Interaktif</span>
            <span><i aria-hidden />Seluruh Kelas</span>
            <span><i aria-hidden />Meningkatkan Literasi</span>
          </div>
        </div>
      </header>

      {/* ── Langkah 1: sumber soal (§7) ── */}
      <section aria-labelledby="mb-pkg-h" className="mb-setup-section">
        <div className="mb-guru-h">
          <span className="mb-step-badge mb-number" aria-hidden>1</span>
          <span className="mb-guru-h-text" id="mb-pkg-h">Pilih Paket Soal</span>
          <small>Pilih soal yang akan dimainkan.</small>
        </div>

        {/* Tema Bank Soal hasil "Gunakan untuk Main Bersama" — sudah terpilih,
            guru tidak memilih ulang; tombol Ganti kembali ke Bank Soal. */}
        {themeSel ? (
          <div className={`mb-pkg-item mb-pkg-selected mb-theme-pick`}>
            <span className="mb-pkg-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
            </span>
            <span className="mb-pkg-body">
              <span className="mb-pkg-title">{themeSel.topic}</span>
              <span className="mb-pkg-meta">
                Tema Bank Soal · <strong className="mb-number">{themeSel.count}</strong> soal ·{' '}
                {themeSel.difficulty ? DIFFICULTY_LABEL[themeSel.difficulty] ?? themeSel.difficulty : 'Semua tingkat'}
                {selectedCompat && selectedCompat.supported === 0 ? (
                  <> · <span className="mb-pkg-incompat">belum ada soal yang cocok dimainkan</span></>
                ) : selectedCompat && selectedCompat.supported < themeSel.count ? (
                  <> · <span className="mb-pkg-compat">{selectedCompat.supported} dari {themeSel.count} soal dapat dimainkan</span></>
                ) : null}
              </span>
            </span>
            <span className="mb-pkg-check" aria-hidden>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
          </div>
        ) : null}

        <div className="mb-setup-pick-row">
          <button
            type="button"
            className="mb-btn-ghost"
            onClick={() => router.push('/guru/bank-soal?untuk=main-bersama')}
          >
            {themeSel ? 'Ganti dari Bank Soal' : 'Pilih dari Bank Soal'}
          </button>
        </div>

        {packages.length === 0 ? (
          themeSel ? null : (
            <div className="mb-setup-empty">
              <div className="mb-setup-empty-art" aria-hidden />
              <div className="mb-setup-empty-copy">
                <p className="mb-setup-empty-title">Belum ada paket soal</p>
                <p className="mb-setup-empty-sub">Pilih tema untuk mulai bermain.</p>
              </div>
            </div>
          )
        ) : (
          <ul className="mb-pkg-list">
            <li className="mb-pkg-list-head">Paket soal milikmu</li>
            {packages.map((p) => {
              const info = compat[p.id];
              const isSel = !themeSel && packageId === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => selectPackage(p.id)}
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
        <div className={`mb-setup-cta-box ${canOpen ? 'mb-setup-cta-ready' : ''}`}>
          <div className="mb-setup-cta-content">
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
      </div>

      <style jsx global>{`
        .mb-setup {
          width: min(100%, 1120px);
          margin: 0 auto;
          padding: clamp(20px, 3vw, 34px) clamp(16px, 2.4vw, 28px) 56px;
        }

        /* Hero — classroom game-show stage, art asset tetap dekoratif. */
        .mb-setup-head {
          position: relative;
          min-height: 276px;
          display: flex;
          align-items: center;
          overflow: hidden;
          padding: clamp(28px, 4vw, 46px);
          border-radius: 30px;
          color: #ffffff;
          background:
            linear-gradient(90deg, rgba(4, 20, 51, .92) 0%, rgba(5, 38, 86, .68) 46%, rgba(5, 38, 86, .08) 72%),
            url('/images/main-bersama/hero-main-bersama.webp') center / cover no-repeat;
          border: 1px solid rgba(255, 255, 255, .16);
          box-shadow: 0 22px 56px rgba(21, 48, 74, .22);
          isolation: isolate;
        }
        .mb-setup-head::after {
          content: "";
          position: absolute;
          inset: auto 0 0;
          height: 40%;
          z-index: -1;
          background: linear-gradient(to top, rgba(3, 18, 42, .32), transparent);
          pointer-events: none;
        }
        .mb-setup-hero-copy {
          width: min(55%, 570px);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
          position: relative;
          z-index: 1;
        }
        .mb-setup-head .mb-eyebrow {
          color: #78eee0;
          text-shadow: 0 2px 12px rgba(0, 0, 0, .24);
        }
        .mb-setup-head h1 {
          margin: 0;
          color: #ffffff !important;
          font-size: clamp(2.55rem, 5vw, 4.25rem);
          line-height: .94;
          letter-spacing: .025em;
          text-transform: uppercase;
          text-shadow: 0 10px 28px rgba(0, 0, 0, .28);
        }
        .mb-setup-head h1 strong {
          color: #ffd651;
          font: inherit;
        }
        .mb-setup-sub {
          margin: 2px 0 0;
          max-width: 50ch;
          color: rgba(240, 248, 255, .9);
          line-height: 1.58;
          font-size: .97rem;
        }
        .mb-setup-hero-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }
        .mb-setup-hero-pills span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 34px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(3, 22, 50, .45);
          border: 1px solid rgba(255, 255, 255, .14);
          color: rgba(247, 251, 255, .92);
          font-size: .76rem;
          font-weight: 750;
          backdrop-filter: blur(7px);
        }
        .mb-setup-hero-pills i {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ffd651;
          box-shadow: 0 0 14px rgba(255, 214, 81, .75);
        }

        /* Steps — lebih rapat dan terasa sebagai guided flow. */
        .mb-setup-section {
          margin-top: 36px;
          padding: 0 4px;
        }
        .mb-guru-h {
          margin-bottom: 14px;
        }
        .mb-step-badge {
          border-radius: 12px;
          box-shadow: 0 8px 18px rgba(13, 148, 136, .22);
        }
        .mb-guru-h .mb-guru-h-text {
          font-size: 1.18rem;
        }

        /* Tema Bank Soal terpilih (handoff). */
        .mb-theme-pick {
          margin-bottom: var(--mb-space-3);
          cursor: default;
        }
        .mb-setup-pick-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 12px;
        }
        .mb-setup-pick-hint {
          color: var(--mb-text-guru-secondary);
          font-size: .88rem;
        }
        .mb-pkg-list-head {
          font-size: .78rem;
          font-weight: 850;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: var(--mb-text-guru-secondary);
          padding: 2px 4px 4px;
        }

        /* Package list. */
        .mb-pkg-list {
          list-style: none;
          margin: 0;
          padding: 2px;
          display: flex;
          flex-direction: column;
          gap: 9px;
          max-height: 320px;
          overflow-y: auto;
        }
        .mb-pkg-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          text-align: left;
          padding: 13px 15px;
          background: rgba(255, 255, 255, .92);
          border: 2px solid rgba(28, 43, 58, .1);
          border-radius: 17px;
          color: var(--mb-text-guru);
          cursor: pointer;
          box-shadow: 0 5px 18px rgba(28, 43, 58, .04);
          transition:
            border-color var(--mb-motion-fast),
            background var(--mb-motion-fast),
            transform var(--mb-motion-fast),
            box-shadow var(--mb-motion-fast);
        }
        .mb-pkg-item:hover {
          transform: translateY(-1px);
          border-color: rgba(20, 184, 166, .5);
          box-shadow: 0 10px 24px rgba(28, 43, 58, .08);
        }
        .mb-pkg-selected {
          border-color: var(--mb-primary-strong);
          background: linear-gradient(90deg, rgba(20, 184, 166, .13), rgba(255, 255, 255, .95));
          box-shadow: 0 10px 26px rgba(20, 184, 166, .1);
        }
        .mb-pkg-icon {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          flex: none;
          border-radius: 13px;
          background: var(--mb-primary-soft);
          color: var(--mb-primary-strong);
        }
        .mb-pkg-body {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }
        .mb-pkg-title { font-weight: 820; }
        .mb-pkg-meta {
          color: var(--mb-text-guru-secondary);
          font-size: .84rem;
        }
        .mb-pkg-compat {
          color: var(--mb-primary-strong);
          font-weight: 700;
        }
        .mb-pkg-incompat {
          color: var(--mb-danger);
          font-weight: 700;
        }
        .mb-pkg-check {
          display: grid;
          place-items: center;
          width: 27px;
          height: 27px;
          flex: none;
          margin-left: auto;
          border-radius: 50%;
          background: var(--mb-primary-strong);
          color: #ffffff;
          box-shadow: 0 5px 12px rgba(13, 148, 136, .25);
        }

        /* Empty state: illustration + copy, bukan kotak kosong. */
        .mb-setup-empty {
          min-height: 168px;
          display: grid;
          grid-template-columns: minmax(180px, 32%) 1fr;
          align-items: center;
          gap: clamp(12px, 3vw, 32px);
          padding: 12px clamp(20px, 4vw, 40px);
          border-radius: 24px;
          border: 2px dashed rgba(28, 43, 58, .13);
          background:
            radial-gradient(circle at 88% 18%, rgba(56, 189, 248, .08), transparent 30%),
            linear-gradient(135deg, #ffffff, #fbfcff);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .9);
        }
        .mb-setup-empty-art {
          width: 100%;
          height: 145px;
          background: url('/images/main-bersama/empty-bank-soal.webp') center / contain no-repeat;
          filter: drop-shadow(0 10px 14px rgba(75, 68, 160, .12));
        }
        .mb-setup-empty-copy {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .mb-setup-empty-title {
          margin: 0;
          font-weight: 850;
          font-size: 1.12rem;
          color: var(--mb-text-guru);
        }
        .mb-setup-empty-sub {
          margin: 0;
          color: var(--mb-text-guru-secondary);
          line-height: 1.5;
        }
        .mb-btn-ghost {
          min-height: 42px;
          padding: 9px 20px;
          border-radius: 999px;
          border: 2px solid var(--mb-primary-strong);
          background: rgba(255, 255, 255, .9);
          color: var(--mb-primary-strong);
          font-weight: 820;
          cursor: pointer;
          box-shadow: 0 6px 15px rgba(13, 148, 136, .06);
          transition:
            background var(--mb-motion-fast),
            color var(--mb-motion-fast),
            transform var(--mb-motion-fast),
            box-shadow var(--mb-motion-fast);
        }
        .mb-btn-ghost:hover {
          background: var(--mb-primary-strong);
          color: #ffffff;
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(13, 148, 136, .2);
        }

        /* Mode grid. */
        .mb-mode-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        /* Class chips. */
        .mb-cls-row {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }
        .mb-cls-chip {
          position: relative;
          min-height: 42px;
          padding: 9px 20px;
          border-radius: 999px;
          background: rgba(255, 255, 255, .94);
          border: 2px solid rgba(28, 43, 58, .11);
          color: var(--mb-text-guru);
          font-weight: 720;
          cursor: pointer;
          box-shadow: 0 4px 13px rgba(28, 43, 58, .04);
          transition:
            border-color var(--mb-motion-fast),
            background var(--mb-motion-fast),
            transform var(--mb-motion-fast);
        }
        .mb-cls-chip:hover {
          transform: translateY(-1px);
          border-color: rgba(20, 184, 166, .5);
        }
        .mb-cls-selected {
          border-color: var(--mb-primary-strong);
          background: linear-gradient(180deg, #e7faf6, #dff6f1);
          font-weight: 820;
        }
        .mb-cls-selected::after {
          content: "";
          position: absolute;
          top: 6px;
          right: 7px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--mb-primary-strong);
        }

        /* Final CTA — stage art memberi sense of occasion. */
        .mb-setup-cta {
          margin-top: 38px;
        }
        .mb-setup-cta-box {
          position: relative;
          min-height: 238px;
          display: grid;
          place-items: center;
          overflow: hidden;
          padding: 24px;
          border-radius: 30px;
          background:
            linear-gradient(90deg, rgba(3, 20, 45, .08), rgba(255, 255, 255, .02) 36%, rgba(255, 255, 255, .02) 64%, rgba(3, 20, 45, .08)),
            url('/images/main-bersama/cta-siap-bermain.webp') center / cover no-repeat;
          border: 1px solid rgba(28, 43, 58, .1);
          box-shadow: 0 20px 48px rgba(25, 49, 74, .14);
        }
        .mb-setup-cta-content {
          width: min(100%, 430px);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          padding: 19px 28px 17px;
          border-radius: 24px;
          background: rgba(255, 255, 255, .82);
          border: 1px solid rgba(255, 255, 255, .76);
          box-shadow: 0 14px 36px rgba(47, 59, 72, .12);
          backdrop-filter: blur(9px);
          text-align: center;
        }
        .mb-setup-cta-ready .mb-setup-cta-content {
          box-shadow:
            0 16px 40px rgba(47, 59, 72, .14),
            0 0 0 4px rgba(20, 184, 166, .08);
        }
        .mb-setup-cta-title {
          margin: 0;
          font-size: 1.28rem;
          font-weight: 860;
          color: var(--mb-text-guru);
        }
        .mb-setup-cta-sub {
          margin: 0 0 11px;
          color: var(--mb-text-guru-secondary);
        }
        .mb-setup-cta-box .mb-primary-game-btn {
          min-width: 210px;
          box-shadow: 0 10px 24px rgba(13, 148, 136, .22);
        }
        .mb-setup-cta-reason {
          margin: 10px 0 0;
          color: var(--mb-text-guru-secondary);
          font-size: .86rem;
          font-weight: 650;
        }
        .mb-setup-error {
          color: var(--mb-danger);
          font-weight: 600;
          text-align: center;
          margin-top: var(--mb-space-3);
        }

        @media (max-width: 820px) {
          .mb-setup-head {
            min-height: 300px;
            background:
              linear-gradient(90deg, rgba(4, 20, 51, .95) 0%, rgba(5, 38, 86, .82) 58%, rgba(5, 38, 86, .35) 100%),
              url('/images/main-bersama/hero-main-bersama.webp') 62% center / cover no-repeat;
          }
          .mb-setup-hero-copy { width: min(76%, 540px); }
          .mb-mode-list { grid-template-columns: 1fr; }
        }

        @media (max-width: 600px) {
          .mb-setup { padding-inline: 12px; }
          .mb-setup-head {
            min-height: 320px;
            border-radius: 24px;
            padding: 26px 22px;
          }
          .mb-setup-hero-copy { width: 100%; }
          .mb-setup-head h1 { font-size: clamp(2.35rem, 13vw, 3.4rem); }
          .mb-setup-hero-pills span:nth-child(3) { display: none; }
          .mb-guru-h {
            align-items: flex-start;
            flex-wrap: wrap;
          }
          .mb-guru-h small {
            width: calc(100% - 46px);
            margin-left: 46px;
            margin-top: -8px;
          }
          .mb-setup-empty {
            grid-template-columns: 1fr;
            text-align: center;
            padding: 14px 20px 22px;
          }
          .mb-setup-empty-art { height: 130px; }
          .mb-setup-pick-row { align-items: flex-start; }
          .mb-setup-cta-box {
            min-height: 250px;
            border-radius: 24px;
            padding: 18px;
            background-position: center;
          }
          .mb-setup-cta-content {
            padding: 18px 18px 16px;
          }
        }
      `}</style>
    </main>
  );
}

