"use client";
// ─── Classroom Client 8B.1 — Layar Kelas (mode presentasi satu layar).
// VISUAL bersumber penuh dari projector/public-safe view (MbApi state
// publik): PIN, partisipasi agregat, world 8B, soal publik, reveal,
// summary. TIDAK PERNAH membaca teacher-private view — keamanan peran
// dijamin arsitektur, bukan CSS.
// KONTROL hanya command dock (start/close/discuss/next + overflow
// pause/resume/end) via postTeacherCommand yang sama dengan ruang guru.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectorSessionView } from '@/src/main-bersama/contracts/views/projector';
import {
  MbApiError,
  fetchProjectorState,
  postTeacherCommand,
} from '@/lib/main-bersama/api-client';
import { useSessionView } from '@/lib/main-bersama/use-session-view';
import { PinDisplay } from '@/components/main-bersama/shared/PinDisplay';
import { ParticipantCount } from '@/components/main-bersama/shared/ParticipantCount';
import { TeamProgress } from '@/components/main-bersama/shared/TeamProgress';
import { CityProgress } from '@/components/main-bersama/shared/CityProgress';
import { QuestionCard } from '@/components/main-bersama/shared/QuestionCard';
import { ConnectionBanner } from '@/components/main-bersama/shared/ConnectionBanner';
import { RoundCountdown } from '@/components/main-bersama/shared/RoundCountdown';
import { JelajahTrail } from '@/components/main-bersama/art/jelajah/JelajahTrail';
import { KotaScene } from '@/components/main-bersama/art/kota/KotaScene';
import { TeamBadge } from '@/components/main-bersama/art/shared/TeamBadge';
import { Podium } from '@/components/main-bersama/art/jelajah/Podium';

const MODE_LABEL = {
  'jelajah-kata': 'Jelajah Kata',
  'kota-cahaya': 'Kota Cahaya',
} as const;

const TEAM_LABEL: Record<string, string> = {
  elang: 'Elang',
  harimau: 'Harimau',
  rusa: 'Rusa',
  badak: 'Badak',
};

const TEAM_COLOR_VAR: Record<string, string> = {
  elang: 'var(--mb-team-elang)',
  harimau: 'var(--mb-team-harimau)',
  rusa: 'var(--mb-team-rusa)',
  badak: 'var(--mb-team-badak)',
};

type DockCommand = 'start' | 'close-round' | 'discuss' | 'next-round' | 'pause' | 'resume' | 'end';

export function ClassroomClient({ sessionId, roomHref }: { sessionId: string; roomHref: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fetchView = useCallback(() => fetchProjectorState({ sessionId }), [sessionId]);
  const { view, connection, refresh } = useSessionView<ProjectorSessionView>(
    sessionId,
    fetchView,
    { pollIntervalMs: 700, debounceMs: 40 },
  );

  const run = useCallback(
    async (action: DockCommand) => {
      setBusy(true);
      setError(null);
      try {
        await postTeacherCommand({ action, sessionId });
        // Satu layar adalah surface kontrol utama; setelah command sukses,
        // tarik state authoritative segera agar dock tidak terasa tertinggal.
        await refresh();
      } catch (e) {
        setError(e instanceof MbApiError ? e.message : 'Aksi gagal. Coba lagi.');
      } finally {
        setBusy(false);
      }
    },
    [sessionId, refresh],
  );

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      setError('Mode layar penuh tidak didukung browser ini.');
    }
  }, []);

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'f' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const target = event.target as HTMLElement | null;
        if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
        event.preventDefault();
        void toggleFullscreen();
      }
    };
    sync();
    document.addEventListener('fullscreenchange', sync);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      window.removeEventListener('keydown', onKey);
    };
  }, [toggleFullscreen]);

  if (!view) {
    return (
      <main className="mb-pj">
        <ConnectionBanner visible={connection === 'offline'} />
        <p role="status" className="mb-pj-idle-msg">Menyiapkan Layar Kelas…</p>
      </main>
    );
  }

  const phase = view.phase;
  const primary: { label: string; action: DockCommand } | null =
    phase === 'lobby' || phase === 'preparing'
      ? { label: 'Mulai', action: 'start' }
      : phase === 'question'
        ? { label: 'Tutup Jawaban', action: 'close-round' }
        : phase === 'closed'
          ? { label: 'Bahas Jawaban', action: 'discuss' }
          : phase === 'discussion'
            ? { label: 'Lanjut', action: 'next-round' }
            : null;

  return (
    <main className="mb-pj">
      <ConnectionBanner visible={connection === 'offline'} />
      <header className="mb-pj-head">
        <div className="mb-pj-brand">
          <h1 className="mb-display mb-pj-title">MAIN BERSAMA</h1>
          <p className="mb-pj-sub">Kuis kelas <strong>langsung</strong> bersama BahasaCerdas</p>
        </div>
        <div className="mb-pj-head-meta">
          <span className="mb-pj-pkg">{view.contentTitle}</span>
          <span className="mb-pj-mode">{MODE_LABEL[view.gameMode]}</span>
          {view.className ? <span className="mb-pj-class">Kelas {view.className}</span> : null}
        </div>
      </header>

      {(phase === 'lobby' || phase === 'preparing') && (
        <section className="mb-pj-phase mb-fade-in">
          <PinDisplay pin={view.joinInfo?.pin ?? '------'} scale="projector" />
          <p className="mb-pj-wait" role="status">
            Buka halaman <strong>Gabung Main Bersama</strong> lalu masukkan PIN di atas
          </p>
          <ParticipantCount count={view.participation.playerCount} label="siswa bergabung" />
          {view.gameProgress.gameMode === 'jelajah-kata' ? (
            <div className="mb-pj-world" aria-hidden>
              <JelajahTrail
                teams={view.teams.map((t) => ({ id: t.id, name: t.name }))}
                progress={{}}
              />
            </div>
          ) : (
            <div className="mb-pj-world" aria-hidden>
              <KotaScene unlocked={view.gameProgress.unlockedMilestones} />
            </div>
          )}
        </section>
      )}

      {phase === 'question' && (
        <section className="mb-pj-phase mb-pj-phase-question mb-fade-in">
          {view.currentQuestion ? (
            <div className="mb-pj-q">
              <QuestionCard question={view.currentQuestion} roundLabel={`Soal ${(view.currentRoundIndex ?? 0) + 1} / ${view.totalRounds}`} />
            </div>
          ) : null}
          <div className="mb-pj-participation">
            <RoundCountdown
              closesAt={view.currentRoundClosesAt}
              serverTime={view.serverTime}
              compact
              light
              complete={
                view.participation.eligibleCount > 0 &&
                view.participation.submittedCount >= view.participation.eligibleCount
              }
            />
            <span className="mb-count mb-number">
              {view.participation.submittedCount}
              <small> / {view.participation.eligibleCount} menjawab</small>
            </span>
            <ParticipantCount count={view.participation.playerCount} />
          </div>
          <div className="mb-pj-progress">
            {view.gameProgress.gameMode === 'jelajah-kata' ? (
              <TeamProgress teams={view.teams} progress={view.gameProgress.teamProgress} />
            ) : (
              <CityProgress
                progressPercent={view.gameProgress.progressPercent}
                unlockedMilestones={view.gameProgress.unlockedMilestones}
              />
            )}
          </div>
        </section>
      )}

      {(phase === 'closed' || phase === 'paused') && (
        <section className="mb-pj-phase mb-fade-in" role="status">
          <h2 className="mb-display mb-pj-closed">
            {view.phase === 'closed' ? 'Waktu menjawab selesai!' : 'Permainan dijeda'}
          </h2>
          <ParticipantCount count={view.participation.playerCount} />
        </section>
      )}

      {phase === 'discussion' && view.revealedRound && (
        <section className="mb-pj-phase mb-fade-in">
          <div className="mb-pj-q">
            <QuestionCard question={view.revealedRound.question} roundLabel={`Soal ${(view.currentRoundIndex ?? 0) + 1} / ${view.totalRounds}`} />
          </div>
          <div className="mb-pj-reveal mb-entrance">
            <p className="mb-pj-reveal-label">Jawaban benar:</p>
            <p className="mb-pj-reveal-answer mb-display">
              {view.revealedRound.question.options.find((o) => o.id === view.revealedRound!.correctOptionId)?.text ?? '—'}
            </p>
            {view.revealedRound.explanation ? <p className="mb-pj-reveal-explain">{view.revealedRound.explanation}</p> : null}
          </div>
        </section>
      )}

      {(phase === 'summary' || phase === 'ended') && (
        <ClassroomSummary view={view} />
      )}

      {error ? (
        <p role="alert" className="mb-pj-dock-error">{error}</p>
      ) : null}

      {/* ── Teacher control dock (8B.1): kecil, di bawah, public-safe ── */}
      <nav className="mb-dock" aria-label="Kontrol Layar Kelas">
        {primary ? (
          <button type="button" className="mb-dock-primary" onClick={() => void run(primary.action)} disabled={busy}>
            {busy ? 'Memproses…' : primary.label}
          </button>
        ) : (
          <button type="button" className="mb-dock-primary" onClick={() => router.push(roomHref)} disabled={busy}>
            Selesai
          </button>
        )}
        <button
          type="button"
          className="mb-dock-fullscreen"
          onClick={() => void toggleFullscreen()}
          aria-pressed={isFullscreen}
          title={isFullscreen ? 'Keluar layar penuh (F)' : 'Layar penuh (F)'}
        >
          {isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh'}
        </button>
        <details className="mb-dock-more">
          <summary aria-label="Kontrol lain">•••</summary>
          <div className="mb-dock-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => void run('pause')} disabled={busy}>Jeda</button>
            <button type="button" role="menuitem" onClick={() => void run('resume')} disabled={busy}>Lanjutkan</button>
            <button type="button" role="menuitem" onClick={() => void run('end')} disabled={busy}>Akhiri</button>
            <button type="button" role="menuitem" onClick={() => router.push(roomHref)}>Keluar dari Layar Kelas</button>
          </div>
        </details>
      </nav>

      <style jsx>{`
        .mb-dock {
          position: fixed;
          left: 50%;
          bottom: max(12px, env(safe-area-inset-bottom));
          transform: translateX(-50%);
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--mb-space-2);
          width: max-content;
          max-width: calc(100vw - 24px);
          padding: 8px 10px;
          background: rgba(8, 24, 38, 0.88);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: var(--mb-radius-pill);
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.28);
        }
        .mb-dock-primary {
          min-height: 46px;
          padding: 9px 28px;
          border-radius: var(--mb-radius-pill);
          border: none;
          background: var(--mb-primary-strong);
          color: #ffffff;
          font-weight: 800;
          font-size: 1.05rem;
          cursor: pointer;
          transition: transform var(--mb-motion-fast), background var(--mb-motion-fast);
        }
        .mb-dock-primary:active:not(:disabled) { transform: scale(0.98); }
        .mb-dock-primary:disabled { opacity: 0.55; cursor: wait; }
        .mb-dock-primary:focus-visible { outline: 2px solid var(--mb-accent); outline-offset: 2px; }
        .mb-dock-fullscreen {
          min-height: 46px;
          padding: 9px 18px;
          border-radius: var(--mb-radius-pill);
          border: 1.5px solid rgba(255, 255, 255, 0.25);
          background: rgba(255, 255, 255, 0.08);
          color: var(--mb-text-primary);
          font-weight: 800;
          cursor: pointer;
          transition: transform var(--mb-motion-fast), background var(--mb-motion-fast);
        }
        .mb-dock-fullscreen:hover { background: rgba(255, 255, 255, 0.14); }
        .mb-dock-fullscreen:active { transform: scale(0.98); }
        .mb-dock-fullscreen:focus-visible { outline: 2px solid var(--mb-accent); outline-offset: 2px; }
        .mb-dock-more { position: relative; }
        .mb-dock-more summary {
          list-style: none;
          display: grid;
          place-items: center;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: 1.5px solid rgba(255, 255, 255, 0.25);
          color: var(--mb-text-primary);
          font-weight: 900;
          letter-spacing: 1px;
          cursor: pointer;
        }
        .mb-dock-more summary::-webkit-details-marker { display: none; }
        .mb-dock-more summary:focus-visible { outline: 2px solid var(--mb-accent); outline-offset: 2px; }
        .mb-dock-menu {
          position: absolute;
          bottom: 54px;
          right: 0;
          display: flex;
          flex-direction: column;
          min-width: 220px;
          padding: 6px;
          border-radius: var(--mb-radius-md);
          background: var(--mb-surface-elevated);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: var(--mb-shadow-card);
        }
        .mb-dock-menu button {
          padding: 12px 14px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--mb-text-primary);
          font-weight: 700;
          text-align: left;
          cursor: pointer;
          transition: transform var(--mb-motion-fast), background var(--mb-motion-fast);
        }
        .mb-dock-menu button:active:not(:disabled) { transform: scale(0.98); }
        .mb-dock-menu button:hover { background: rgba(255, 255, 255, 0.08); }
        .mb-dock-menu button:disabled { opacity: 0.5; }
        .mb-pj-dock-error {
          text-align: center;
          color: var(--mb-danger);
          font-weight: 700;
          margin: var(--mb-space-2) 0 0;
        }
      `}</style>
    </main>
  );
}

function ClassroomSummary({ view }: { view: ProjectorSessionView }) {
  const final = view.finalResult;
  if (!final) return null;
  if (final.gameMode === 'jelajah-kata') {
    const winners = final.teamRanking.filter((t) => t.progress === final.teamRanking[0].progress);
    const finalProgress: Record<string, number> = {};
    for (const t of final.teamRanking) finalProgress[t.teamId] = t.progress;
    const trailTeams = (view.teams.length > 0 ? view.teams : final.teamRanking.map((t) => ({ id: t.teamId, name: t.teamId }))).map(
      (t) => ({ id: t.id, name: t.name }),
    );
    return (
      <section className="mb-pj-phase mb-fade-in">
        <h2 className="mb-display mb-pj-final-title">
          {winners.length > 1 ? 'Juara Bersama!' : 'Papan Peringkat'}
        </h2>
        <div className="mb-pj-world" aria-hidden>
          <JelajahTrail teams={trailTeams} progress={finalProgress} />
        </div>
        <Podium
          ranking={final.teamRanking.map((t) => ({
            teamId: t.teamId,
            name: trailTeams.find((x) => x.id === t.teamId)?.name ?? t.teamId,
            progress: t.progress,
            rank: final.teamRanking.findIndex((o) => o.progress === t.progress) + 1,
          }))}
        />
        <ol className="mb-pj-ranking">
          {final.teamRanking.map((t) => {
            const rank = final.teamRanking.findIndex((o) => o.progress === t.progress) + 1;
            const isWinner = rank === 1;
            return (
              <li key={t.teamId} className={`mb-pj-rank-row ${isWinner ? 'mb-pj-winner' : ''}`}>
                <span className="mb-pj-rank mb-number">{rank}</span>
                <span className="mb-pj-rank-team">
                  {isWinner ? <TeamBadge teamId={t.teamId} size={26} /> : null}
                  {t.teamId}
                </span>
                <span className="mb-pj-rank-pct mb-number">{Math.round(t.progress)}%</span>
              </li>
            );
          })}
        </ol>
      </section>
    );
  }
  const pct = Math.round(final.progressPercent);
  const finalUnlocked = ['garden', 'library', 'homes', 'town-center'].filter((_, i) => pct >= [25, 50, 75, 100][i]);
  return (
    <section className="mb-pj-phase mb-fade-in">
      <h2 className="mb-display mb-pj-final-title">
        {final.missionAchieved ? 'Kota Cahaya berhasil dinyalakan!' : `Kota Cahaya menyala ${pct}%!`}
      </h2>
      <div className="mb-pj-world" aria-hidden>
        <KotaScene unlocked={finalUnlocked} />
      </div>
      <p className="mb-pj-mission" role="status">
        {final.missionAchieved
          ? 'Seluruh kelas berhasil mencapai misi — hebat!'
          : 'Kerja bagus, kelas sudah berjuang keras bersama-sama!'}
      </p>
    </section>
  );
}
