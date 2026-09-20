"use client";
// ─── Teacher Room Client (Tahap 8A — visual polish) ──────────
// SATU CTA dominan per fase (§18):
//   lobby → "Mulai Permainan"
//   question → "Tutup Jawaban"
//   closed → "Bahas Jawaban"
//   discussion → "Lanjut" / last → "Lihat Hasil"
//   summary → "Selesai"
// Pause/Akhiri = kontrol sekunder di header. State selalu dari
// GET authoritative (useSessionView); command POST lalu refresh.
// Logic/Tahap 6 TIDAK berubah — hanya presentation.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TeacherSessionView } from '@/src/main-bersama/contracts/views/teacher';
import type { TeacherParticipantInfo } from '@/src/main-bersama/contracts/views/teacher';
import {
  MbApiError,
  fetchTeacherState,
  postTeacherCommand,
} from '@/lib/main-bersama/api-client';
import { useSessionView } from '@/lib/main-bersama/use-session-view';
import { SessionHeader } from '@/components/main-bersama/shared/SessionHeader';
import { PrimaryGameButton } from '@/components/main-bersama/shared/PrimaryGameButton';
import { PinDisplay } from '@/components/main-bersama/shared/PinDisplay';
import { ParticipantCount } from '@/components/main-bersama/shared/ParticipantCount';
import { QuestionCard } from '@/components/main-bersama/shared/QuestionCard';
import { TeamProgress } from '@/components/main-bersama/shared/TeamProgress';
import { CityProgress } from '@/components/main-bersama/shared/CityProgress';
import { ConnectionBanner } from '@/components/main-bersama/shared/ConnectionBanner';

type Command =
  | 'start'
  | 'close-round'
  | 'discuss'
  | 'next-round'
  | 'end'
  | 'pause'
  | 'resume';

export function TeacherRoomClient({
  sessionId,
  pin,
  className,
}: {
  sessionId: string;
  pin: string;
  /** Nama kelas dibaca server dari DB (view tidak membawanya). */
  className?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchView = useCallback(
    () => fetchTeacherState(sessionId).then((r) => r.view),
    [sessionId],
  );
  const { view, connection } = useSessionView<TeacherSessionView>(sessionId, fetchView);

  const run = useCallback(
    async (action: Command) => {
      setBusy(true);
      setError(null);
      try {
        await postTeacherCommand({ action, sessionId });
        // POST sukses → GET authoritative (bukan memutasi state lokal).
      } catch (e) {
        setError(e instanceof MbApiError ? e.message : 'Aksi gagal. Coba lagi.');
      } finally {
        setBusy(false);
      }
    },
    [sessionId],
  );

  if (!view) {
    return (
      <main className="mb-room-loading">
        {connection === 'offline' ? <ConnectionBanner visible /> : null}
        <p role="status">Memuat ruang…</p>
      </main>
    );
  }

  const a = view.allowedActions;
  const answered = view.answerSummary.submittedCount;
  const eligible = view.answerSummary.eligibleCount;
  const isLastRound =
    (view.currentRoundIndex ?? -1) + 1 >= view.totalRounds;
  // ── CTA utama per fase (§18 — hanya aksi yang relevan) ──
  let primary: { label: string; action: Command; disabled?: boolean } | null = null;
  if (a.canStartSession) {
    primary = {
      label: 'Mulai Permainan',
      action: 'start',
      disabled: view.participants.length === 0,
    };
  } else if (a.canCloseRound) {
    primary = { label: 'Tutup Jawaban', action: 'close-round' };
  } else if (a.canStartDiscussion) {
    primary = { label: 'Bahas Jawaban', action: 'discuss' };
  } else if (a.canGoToNextRound) {
    primary = isLastRound
      ? { label: 'Lihat Hasil', action: 'next-round' }
      : { label: 'Lanjut', action: 'next-round' };
  } else if (view.phase === 'summary') {
    primary = { label: 'Selesai', action: 'end' };
  }

  const roundLabel =
    view.currentRoundIndex !== null
      ? `${view.currentRoundIndex + 1} / ${view.totalRounds}`
      : null;

  return (
    <main className="mb-room">
      <ConnectionBanner visible={connection === 'offline'} />
      <SessionHeader
        mode={view.gameMode}
        className={className ?? undefined}
        roundLabel={roundLabel}
        actions={
          <>
            {a.canPause ? (
              <button type="button" className="mb-secondary-btn" onClick={() => run('pause')} disabled={busy}>
                Jeda
              </button>
            ) : null}
            {a.canResume ? (
              <button type="button" className="mb-secondary-btn" onClick={() => run('resume')} disabled={busy}>
                Lanjutkan
              </button>
            ) : null}
            {a.canEndSession ? (
              <button type="button" className="mb-secondary-btn mb-danger-btn" onClick={() => run('end')} disabled={busy}>
                Akhiri
              </button>
            ) : null}
          </>
        }
      />

      {error ? (
        <p role="alert" className="mb-room-error">{error}</p>
      ) : null}

      {/* ── LOBBY (§17) — PIN sebagai anchor utama ── */}
      {view.phase === 'lobby' || view.phase === 'preparing' ? (
        <section className="mb-lobby mb-fade-in">
          <div className="mb-lobby-head">
            <span className="mb-eyebrow mb-lobby-eyebrow">PIN Ruang</span>
            <PinDisplay pin={pin} />
            <p className="mb-lobby-wait">
              Siswa bergabung lewat <strong>ayo.bahasacerdas.com</strong> dengan PIN di atas.
            </p>
          </div>
          <div className="mb-lobby-meta">
            <span className="mb-chip mb-lobby-chip">
              <UsersMini />
              <strong className="mb-number">{view.participants.length}</strong> peserta
            </span>
            {className ? <span className="mb-chip mb-lobby-chip">Kelas {className}</span> : null}
            <span className="mb-chip mb-lobby-chip">
              {view.gameMode === 'jelajah-kata' ? 'Jelajah Kata' : 'Kota Cahaya'}
            </span>
            <span className="mb-chip mb-lobby-chip mb-number">{view.totalRounds} soal</span>
          </div>
          <div className="mb-lobby-qr" aria-hidden>
            <span className="mb-lobby-qr-box">QR</span>
            <small>Kode QR (segera hadir)</small>
          </div>
          <ParticipantList participants={view.participants} />
          {view.participants.length === 0 ? (
            <p className="mb-lobby-hint" role="status">
              Belum ada siswa yang bergabung. Bagikan PIN di atas kepada kelas.
            </p>
          ) : null}
          <div className="mb-room-cta">
            <PrimaryGameButton
              onClick={() => run('start')}
              disabled={busy || view.participants.length === 0}
              loading={busy}
              variant="light"
            >
              Mulai Permainan
            </PrimaryGameButton>
          </div>
        </section>
      ) : null}

      {/* ── QUESTION (§18) — soal → jumlah menjawab + waktu → progres → CTA ── */}
      {view.phase === 'question' && view.currentQuestion ? (
        <section className="mb-tquestion mb-fade-in">
          <div className="mb-tquestion-status">
            <span className="mb-count mb-count-guru">
              <strong className="mb-number">{answered}</strong>
              <small>/ {eligible} menjawab</small>
            </span>
            <RoundTimer closesAt={view.currentRoundClosesAt} serverTime={view.serverTime} />
          </div>
          <QuestionCard
            question={view.currentQuestion}
            roundLabel={`Soal ${roundLabel ?? ''}`}
          />
          <div className="mb-progress-inline">
            {view.gameState?.gameMode === 'jelajah-kata' ? (
              <TeamProgress teams={view.teams} progress={view.gameState.jelajahKata.teamProgress} />
            ) : view.gameState?.gameMode === 'kota-cahaya' ? (
              <CityProgress
                progressPercent={view.gameState.kotaCahaya.progressPercent}
                unlockedMilestones={view.gameState.kotaCahaya.unlockedMilestones}
              />
            ) : null}
          </div>
          <div className="mb-room-cta">
            <PrimaryGameButton onClick={() => run('close-round')} disabled={busy} loading={busy} variant="light">
              Tutup Jawaban
            </PrimaryGameButton>
          </div>
          <ParticipantList participants={view.participants} showAnswered />
        </section>
      ) : null}

      {/* ── CLOSED (§18) — jangan reveal sebelum Bahas ── */}
      {view.phase === 'closed' ? (
        <section className="mb-closed mb-fade-in">
          <h2 className="mb-display mb-guru-phase-title">Jawaban ditutup</h2>
          <p className="mb-closed-sub">
            {answered} dari {eligible} siswa sudah menjawab.
          </p>
          <div className="mb-room-cta">
            <PrimaryGameButton onClick={() => run('discuss')} disabled={busy} loading={busy} variant="light">
              Bahas Jawaban
            </PrimaryGameButton>
          </div>
        </section>
      ) : null}

      {/* ── PAUSED (secondary) ── */}
      {view.phase === 'paused' ? (
        <section className="mb-closed mb-fade-in">
          <h2 className="mb-display mb-guru-phase-title">Permainan dijeda</h2>
          <div className="mb-room-cta">
            <PrimaryGameButton onClick={() => run('resume')} disabled={busy} loading={busy} variant="light">
              Lanjutkan Permainan
            </PrimaryGameButton>
          </div>
        </section>
      ) : null}

      {/* ── DISCUSSION (§18) — guru melihat kunci + agregat ── */}
      {view.phase === 'discussion' && view.currentQuestion ? (
        <section className="mb-discuss mb-fade-in">
          <QuestionCard
            question={view.currentQuestion}
            roundLabel={`Soal ${roundLabel ?? ''}`}
          />
          <div className="mb-reveal-card mb-reading">
            <p className="mb-reveal-correct">
              Jawaban benar:{' '}
              <strong>
                {view.currentQuestion.options.find(
                  (o) => o.id === view.currentQuestion?.correctOptionId,
                )?.text ?? '—'}
              </strong>
            </p>
            {view.currentQuestion.explanation ? (
              <p className="mb-reveal-explain">{view.currentQuestion.explanation}</p>
            ) : null}
            <div className="mb-reveal-dist">
              {view.currentQuestion.options.map((o) => {
                const count = view.answerSummary.optionCounts?.[o.id] ?? 0;
                const isCorrect = o.id === view.currentQuestion?.correctOptionId;
                return (
                  <span
                    key={o.id}
                    className={`mb-dist-chip ${isCorrect ? 'mb-dist-correct' : ''}`}
                  >
                    {o.text}: <strong className="mb-number">{count}</strong>
                  </span>
                );
              })}
            </div>
          </div>
          <div className="mb-room-cta">
            <PrimaryGameButton
              onClick={() => run('next-round')}
              disabled={busy}
              loading={busy}
              variant="light"
            >
              {isLastRound ? 'Lihat Hasil' : 'Lanjut'}
            </PrimaryGameButton>
          </div>
        </section>
      ) : null}

      {/* ── SUMMARY (§28 teacher) ── */}
      {view.phase === 'summary' || view.phase === 'ended' ? (
        <section className="mb-tsummary mb-fade-in">
          <h2 className="mb-display mb-guru-phase-title">Hasil Permainan</h2>
          {view.gameState?.gameMode === 'jelajah-kata' ? (
            <TeamProgress teams={view.teams} progress={view.gameState.jelajahKata.teamProgress} />
          ) : view.gameState?.gameMode === 'kota-cahaya' ? (
            <CityProgress
              progressPercent={view.gameState.kotaCahaya.progressPercent}
              unlockedMilestones={view.gameState.kotaCahaya.unlockedMilestones}
            />
          ) : null}
          <ParticipantList participants={view.participants} />
          <div className="mb-room-cta">
            <PrimaryGameButton onClick={() => router.push('/guru/game/main-bersama')} disabled={busy} variant="light">
              Selesai
            </PrimaryGameButton>
          </div>
        </section>
      ) : null}
    </main>
  );
}

/** Status peserta — identitas tampil untuk guru (bukan secret). */
function ParticipantList({
  participants,
  showAnswered = false,
}: {
  participants: TeacherParticipantInfo[];
  showAnswered?: boolean;
}) {
  if (participants.length === 0) return null;
  return (
    <ul className="mb-plist" aria-label="Daftar peserta">
      {participants.map((p) => (
        <li key={p.playerId} className="mb-plist-item">
          <span className="mb-plist-name">{p.displayName}</span>
          {p.teamId ? <span className="mb-plist-team">{p.teamId}</span> : null}
          {showAnswered ? (
            <span className={`mb-plist-state ${p.hasAnsweredCurrentRound ? 'mb-ok' : 'mb-wait'}`}>
              {p.hasAnsweredCurrentRound ? 'sudah menjawab' : 'sedang mengerjakan'}
            </span>
          ) : (
            <span
              className={`mb-plist-state ${p.connectionStatus === 'connected' ? 'mb-ok' : 'mb-off'}`}
            >
              {p.connectionStatus === 'connected' ? 'tersambung' : 'terputus'}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Timer sisa waktu round — drift ke server time, bukan jam client. */
function RoundTimer({ closesAt, serverTime }: { closesAt: string | null; serverTime: string }) {
  if (!closesAt) return null;
  return <_RoundTimer closesAt={closesAt} serverTime={serverTime} />;
}

function _RoundTimer({ closesAt, serverTime }: { closesAt: string; serverTime: string }) {
  // Offset = serverTime − clientNow saat mount; sisa waktu dihitung
  // dari deadline + offset (jam client TIDAK jadi sumber kebenaran).
  const [offsetMs] = useState(() => Date.parse(serverTime) - Date.now());
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Date.parse(closesAt) - (Date.now() + offsetMs)),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, Date.parse(closesAt) - (Date.now() + offsetMs)));
    }, 1000);
    return () => clearInterval(id);
  }, [closesAt, offsetMs]);

  const totalSec = Math.floor(remaining / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  const urgent = totalSec <= 30;
  return (
    <span
      className={`mb-timer mb-number ${urgent ? 'mb-timer-urgent' : ''}`}
      role="timer"
      aria-label={`Sisa waktu ${mm}:${ss}`}
    >
      {mm}:{ss}
      <style jsx>{`
        .mb-timer {
          padding: 6px 16px;
          border-radius: var(--mb-radius-pill);
          background: rgba(28, 43, 58, 0.08);
          font-weight: 800;
          font-size: 1.05rem;
          color: var(--mb-text-guru);
        }
        .mb-timer-urgent {
          background: var(--mb-danger);
          color: #ffffff;
        }
      `}</style>
    </span>
  );
}

function UsersMini() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
