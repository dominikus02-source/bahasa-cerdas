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

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { RoundCountdown } from '@/components/main-bersama/shared/RoundCountdown';
import { RoomQRCode } from '@/components/main-bersama/shared/RoomQRCode';
import { LobbyRoster } from '@/components/main-bersama/shared/LobbyRoster';
import { useMainBersamaSound } from '@/components/main-bersama/sound/useMainBersamaSound';
import { SoundToggle } from '@/components/main-bersama/sound/SoundToggle';

type Command =
  | 'open-lobby'
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
  const autoLobbyRef = useRef(false);

  const fetchView = useCallback(
    () => fetchTeacherState(sessionId).then((r) => r.view),
    [sessionId],
  );
  const { view, connection, refresh } = useSessionView<TeacherSessionView>(
    sessionId,
    fetchView,
    { pollIntervalMs: 700, debounceMs: 40 },
  );

  const teacherSound = useMainBersamaSound({
    participantCount: view?.participants.length ?? 0,
    phase: view?.phase ?? 'preparing',
    gameMode: view?.gameMode ?? 'jelajah-kata',
    kotaUnlockedCount:
      view?.gameState?.gameMode === 'kota-cahaya'
        ? view.gameState.kotaCahaya.unlockedMilestones.length
        : 0,
    teamProgress:
      view?.gameState?.gameMode === 'jelajah-kata'
        ? view.gameState.jelajahKata.teamProgress
        : undefined,
  });

  const run = useCallback(
    async (action: Command) => {
      setBusy(true);
      setError(null);
      try {
        await postTeacherCommand({ action, sessionId });
        // Command sukses harus langsung terlihat di layar pengendali.
        // Jangan menunggu Broadcast/poll untuk mengubah CTA/fase.
        await refresh();
      } catch (e) {
        setError(e instanceof MbApiError ? e.message : 'Aksi gagal. Coba lagi.');
      } finally {
        setBusy(false);
      }
    },
    [sessionId, refresh],
  );

  // Prepared adalah fase internal. Secara produk guru tidak perlu melihat
  // atau mengkliknya; sesi yang masuk ke halaman ruang langsung menjadi lobby.
  useEffect(() => {
    if (!view || view.phase !== 'preparing' || autoLobbyRef.current || busy) return;
    autoLobbyRef.current = true;
    void run('open-lobby');
  }, [view, busy, run]);

  const enterClassroom = useCallback(async () => {
    // Panggil audio activation dalam gesture klik yang sama; context shared
    // bertahan saat client navigation ke Layar Kelas.
    void teacherSound.activate();
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen API bisa ditolak browser; navigasi tetap jalan.
    }
    router.push(`/guru/game/main-bersama/kelas/${sessionId}`);
  }, [router, sessionId, teacherSound.activate]);

  const openProjector = useCallback(() => {
    window.open(
      `/main-bersama/layar?sessionId=${sessionId}`,
      '_blank',
      'noopener',
    );
  }, [sessionId]);

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
  // Lobby section me-render CTA fase preparing/lobby (lihat di bawah);
  // fase lain me-render CTA statis per section.

  const roundLabel =
    view.currentRoundIndex !== null
      ? `${view.currentRoundIndex + 1} / ${view.totalRounds}`
      : null;

  return (
    <main className="mb-room game-fullscreen">
      <ConnectionBanner visible={connection === 'offline'} />
      <SessionHeader
        mode={view.gameMode}
        packageName={view.contentTitle}
        className={className ?? undefined}
        roundLabel={roundLabel}
        actions={
          <>
            <SoundToggle
              enabled={teacherSound.enabled}
              unlocked={teacherSound.unlocked}
              onToggle={() => void teacherSound.toggle()}
              compact={teacherSound.unlocked}
            />
            <button
              type="button"
              className="mb-secondary-btn"
              onClick={openProjector}
              disabled={busy}
              title="Buka tampilan proyektor di tab/jendela kedua"
            >
              Layar Kedua
            </button>
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
            {a.canEndSession && view.phase !== 'summary' ? (
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

      {/* ── LOBBY — game-show command center ── */}
      {view.phase === 'lobby' || view.phase === 'preparing' ? (
        <section className="mb-lobby mb-lobby-command-center mb-fade-in">
          <div className="mb-lobby-stage-card">
            <div className="mb-lobby-stage-top">
              <div className="mb-lobby-stage-copy">
                <span className="mb-eyebrow mb-lobby-stage-eyebrow">Lobby Kelas</span>
                <h2 className="mb-display mb-lobby-stage-title">SIAP MASUK ARENA?</h2>
                <p>
                  Bagikan PIN, tunggu nama siswa muncul, lalu mulai saat kelas sudah lengkap.
                </p>
              </div>
              <div className="mb-lobby-live-pill" aria-label="Lobby aktif">
                <i aria-hidden />
                LIVE LOBBY
              </div>
            </div>

            <div className="mb-lobby-main-grid">
              <div className="mb-lobby-pin-panel">
                <div className="mb-lobby-panel-kicker">PIN MASUK</div>
                <PinDisplay pin={pin} />
                <div className="mb-lobby-meta mb-lobby-meta-strong">
                  <span className="mb-chip mb-lobby-chip">
                    <UsersMini />
                    <strong className="mb-number">{view.participants.length}</strong> pemain
                  </span>
                  <span className="mb-chip mb-lobby-chip mb-lobby-content">{view.contentTitle}</span>
                  <span className="mb-chip mb-lobby-chip mb-number">{view.totalRounds} soal</span>
                  <span className="mb-chip mb-lobby-chip">
                    {view.gameMode === 'jelajah-kata' ? 'Jelajah Kata' : 'Kota Cahaya'}
                  </span>
                  {className ? <span className="mb-chip mb-lobby-chip">Kelas {className}</span> : null}
                </div>
                <div className="mb-lobby-join-tools">
                  <div className="mb-lobby-qr mb-lobby-qr-card">
                    <RoomQRCode pin={pin} />
                    <small>Scan untuk gabung</small>
                  </div>
                  <div className="mb-lobby-join-copy">
                    <strong>Gabung Main Bersama</strong>
                    <span>Masukkan PIN di atas atau scan QR.</span>
                    <button
                      type="button"
                      className="mb-lobby-projector-link"
                      onClick={openProjector}
                    >
                      Buka Layar Kedua ↗
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-lobby-roster-card">
                <div className="mb-lobby-roster-title-row">
                  <div>
                    <span className="mb-lobby-panel-kicker">PEMAIN SIAP</span>
                    <h3>Siapa yang sudah masuk?</h3>
                  </div>
                  <strong className="mb-lobby-count-orb mb-number">
                    {view.participants.length}
                  </strong>
                </div>
                <LobbyRoster
                  participants={view.participants.map((p) => ({
                    displayName: p.displayName,
                    ...(p.teamId ? { teamId: p.teamId } : {}),
                  }))}
                  maxVisible={18}
                  tone="dark"
                />
                {view.participants.length === 0 ? (
                  <p className="mb-lobby-hint mb-lobby-hint-dark" role="status">
                    Avatar dan nama siswa akan muncul di sini begitu mereka bergabung.
                  </p>
                ) : (
                  <p className="mb-lobby-ready-note" role="status">
                    <span aria-hidden>✓</span>
                    {view.participants.length} pemain sudah siap di lobby.
                  </p>
                )}
              </div>
            </div>

            <div className="mb-lobby-action-deck">
              <div className="mb-lobby-action-note">
                <strong>{view.phase === 'preparing' ? 'Menyiapkan lobby…' : 'Kelas siap?'}</strong>
                <span>Guru tetap menentukan kapan permainan dimulai.</span>
              </div>
              <div className="mb-lobby-action-buttons">
                <button
                  type="button"
                  className="mb-lobby-display-btn"
                  onClick={() => void enterClassroom()}
                  disabled={busy}
                >
                  <span aria-hidden>▣</span>
                  Tampilkan ke Kelas
                </button>
                {view.phase === 'preparing' ? (
                  <PrimaryGameButton disabled loading variant="light">
                    Menyiapkan Lobby…
                  </PrimaryGameButton>
                ) : (
                  <PrimaryGameButton
                    onClick={() => {
                      void teacherSound.activate();
                      void run('start');
                    }}
                    disabled={busy || view.participants.length === 0}
                    loading={busy}
                    variant="light"
                  >
                    Mulai Permainan
                  </PrimaryGameButton>
                )}
              </div>
            </div>
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
            <RoundCountdown
              closesAt={view.currentRoundClosesAt}
              serverTime={view.serverTime}
              complete={eligible > 0 && answered >= eligible}
            />
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

      {/* ── SUMMARY / CLOSED SESSION (§28 teacher) ── */}
      {view.phase === 'summary' || view.phase === 'ended' ? (
        <section className="mb-tsummary mb-fade-in">
          <span className="mb-eyebrow">
            {view.phase === 'ended' ? 'Sesi sudah ditutup' : 'Permainan selesai'}
          </span>
          <h2 className="mb-display mb-guru-phase-title">
            {view.phase === 'ended' ? 'Sesi ditutup' : 'Hasil Permainan'}
          </h2>
          <p className="mb-closed-sub">
            {view.phase === 'ended'
              ? 'Semua perangkat siswa sudah menerima status penutup.'
              : 'Tinjau hasil akhir, lalu tutup sesi agar perangkat siswa mendapat penutup yang jelas.'}
          </p>
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
            {view.phase === 'summary' ? (
              <PrimaryGameButton onClick={() => run('end')} disabled={busy} loading={busy} variant="light">
                Tutup Sesi
              </PrimaryGameButton>
            ) : (
              <PrimaryGameButton onClick={() => router.push('/guru/game/main-bersama')} disabled={busy} variant="light">
                Kembali ke Main Bersama
              </PrimaryGameButton>
            )}
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
