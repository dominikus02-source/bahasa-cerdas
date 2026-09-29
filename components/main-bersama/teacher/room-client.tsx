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
import type { TeacherSessionView } from '@/src/main-bersama/contracts/views/teacher';
import {
  MbApiError,
  fetchTeacherState,
  postTeacherCommand,
} from '@/lib/main-bersama/api-client';
import { useSessionView } from '@/lib/main-bersama/use-session-view';
import { SessionHeader } from '@/components/main-bersama/shared/SessionHeader';
import { PrimaryGameButton } from '@/components/main-bersama/shared/PrimaryGameButton';
import { PinDisplay } from '@/components/main-bersama/shared/PinDisplay';
import { QuestionCard } from '@/components/main-bersama/shared/QuestionCard';
import { TeamProgress } from '@/components/main-bersama/shared/TeamProgress';
import { ConnectionBanner } from '@/components/main-bersama/shared/ConnectionBanner';
import { RoundCountdown } from '@/components/main-bersama/shared/RoundCountdown';
import { RoomQRCode } from '@/components/main-bersama/shared/RoomQRCode';
import { LobbyRoster } from '@/components/main-bersama/shared/LobbyRoster';
import { useMainBersamaSound } from '@/components/main-bersama/sound/useMainBersamaSound';
import { SoundToggle } from '@/components/main-bersama/sound/SoundToggle';
import { useFullscreenControl } from '@/components/main-bersama/shared/useFullscreenControl';
import { FullscreenExitControl } from '@/components/main-bersama/shared/FullscreenExitControl';
import { CityCahayaStage } from '@/components/main-bersama/shared/CityCahayaStage';

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'layar' | 'kontrol' | 'analisis'>('layar');
  const autoLobbyRef = useRef(false);
  const fullscreen = useFullscreenControl({
    onError: (message) => setError(message),
    keyboard: true,
  });

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

  if (!view) {
    return (
      <main className="mb-room-loading">
        {connection === 'offline' ? <ConnectionBanner visible /> : null}
        <p role="status">Memuat ruang…</p>
      </main>
    );
  }

  const answered = view.answerSummary.submittedCount;
  const eligible = view.answerSummary.eligibleCount;
  // ── CTA utama per fase (§18 — hanya aksi yang relevan) ──
  // Lobby section me-render CTA fase preparing/lobby (lihat di bawah);
  // fase lain me-render CTA statis per section.

  const isLastRound =
    (view.currentRoundIndex ?? -1) + 1 >= view.totalRounds;

  const roundLabel =
    view.currentRoundIndex !== null
      ? `${view.currentRoundIndex + 1} / ${view.totalRounds}`
      : null;

  return (
    <main className={`mb-room game-fullscreen${fullscreen.isFullscreen ? " mb-room-fullscreen-active" : ""}`}>
      <ConnectionBanner visible={connection === 'offline'} />
      <SessionHeader
        mode={view.gameMode}
        packageName={view.contentTitle}
        className={className ?? undefined}
        roundLabel={roundLabel}
        actions={
          <>
            <div className="mb-room-pin-live" role="status" aria-label={`PIN Main Bersama ${pin}`}>
              <span>PIN</span>
              <strong>{pin}</strong>
            </div>
            {!fullscreen.isFullscreen ? (
              <button
                type="button"
                className="mb-room-fullscreen-control"
                onClick={() => void fullscreen.enter()}
                aria-label="Masuk layar penuh"
                title="Tampilkan Main Bersama layar penuh"
              >
                <span aria-hidden>⛶</span>
                <span>Layar Penuh</span>
                <kbd>F</kbd>
              </button>
            ) : null}
            <FullscreenExitControl active={fullscreen.isFullscreen} onExit={fullscreen.exit} />
          <SoundToggle
            enabled={teacherSound.enabled}
            unlocked={teacherSound.unlocked}
            onToggle={() => void teacherSound.toggle()}
            compact={teacherSound.unlocked}
          />
          </>
        }
      />

      <div className="mb-host-mode-note" role="status">Mode Guru · layar ini dapat langsung diproyeksikan ke kelas</div>
      <nav className="mb-host-tabs" aria-label="Panel Main Bersama">
        <button type="button" className={`mb-host-tab ${activeTab === 'layar' ? 'mb-host-tab-active' : ''}`} onClick={() => setActiveTab('layar')}>Tampilan Kelas</button>
        <button type="button" className={`mb-host-tab ${activeTab === 'kontrol' ? 'mb-host-tab-active' : ''}`} onClick={() => setActiveTab('kontrol')}>Kontrol Guru</button>
        <button type="button" className={`mb-host-tab ${activeTab === 'analisis' ? 'mb-host-tab-active' : ''}`} onClick={() => setActiveTab('analisis')}>Analisis</button>
      </nav>

      {error ? (
        <p role="alert" className="mb-room-error">{error}</p>
      ) : null}

      {activeTab === 'kontrol' ? (
        <section className="mb-host-panel mb-fade-in">
          <div className="mb-host-panel-head">
            <div>
              <span className="mb-eyebrow">Panel Guru</span>
              <h2 className="mb-display">Kontrol Permainan</h2>
              <p>Semua kendali permainan ada di sini. Tampilan Kelas tetap bersih untuk proyektor.</p>
            </div>
            <strong className="mb-host-phase">{view.phase === 'lobby' ? 'Lobi' : view.phase === 'question' ? 'Soal berlangsung' : view.phase === 'closed' ? 'Jawaban ditutup' : view.phase === 'discussion' ? 'Pembahasan' : view.phase === 'paused' ? 'Dijeda' : view.phase === 'summary' ? 'Hasil' : 'Selesai'}</strong>
          </div>
          <div className="mb-host-stats">
            <div><strong>{view.participants.length}</strong><span>Peserta</span></div>
            <div><strong>{view.totalRounds}</strong><span>Total soal</span></div>
            <div><strong>{view.currentRoundIndex === null ? '—' : view.currentRoundIndex + 1}</strong><span>Soal aktif</span></div>
            <div><strong>{answered}/{eligible}</strong><span>Sudah menjawab</span></div>
          </div>
          <div className="mb-host-actions">
            {view.phase === 'lobby' ? <PrimaryGameButton onClick={() => { void teacherSound.activate(); void run('start'); }} disabled={busy || view.participants.length === 0} loading={busy} variant="light">Mulai Permainan</PrimaryGameButton> : null}
            {view.phase === 'question' ? <PrimaryGameButton onClick={() => run('close-round')} disabled={busy} loading={busy} variant="light">Tutup Jawaban</PrimaryGameButton> : null}
            {view.phase === 'closed' ? <PrimaryGameButton onClick={() => run('discuss')} disabled={busy} loading={busy} variant="light">Bahas Jawaban</PrimaryGameButton> : null}
            {view.phase === 'discussion' ? <PrimaryGameButton onClick={() => run('next-round')} disabled={busy} loading={busy} variant="light">{isLastRound ? 'Lihat Hasil' : 'Lanjut'}</PrimaryGameButton> : null}
            {view.phase === 'paused' ? <PrimaryGameButton onClick={() => run('resume')} disabled={busy} loading={busy} variant="light">Lanjutkan Permainan</PrimaryGameButton> : null}
            {view.phase === 'summary' ? <PrimaryGameButton onClick={() => run('end')} disabled={busy} loading={busy} variant="light">Tutup Sesi</PrimaryGameButton> : null}
            {view.allowedActions.canPause ? <button type="button" className="mb-secondary-btn" onClick={() => run('pause')} disabled={busy}>Jeda</button> : null}
            {view.allowedActions.canEndSession && view.phase !== 'summary' ? <button type="button" className="mb-secondary-btn mb-danger-btn" onClick={() => run('end')} disabled={busy}>Akhiri</button> : null}
          </div>
          <p className="mb-host-tip">Gunakan <strong>Tampilan Kelas</strong> untuk proyektor. Semua kendali dan pemantauan siswa ada di panel ini.</p>

          <div className="mb-teacher-monitor">
            <div className="mb-teacher-monitor-head">
              <div>
                <span className="mb-eyebrow">Status Siswa</span>
                <h3 className="mb-display">Siapa yang sudah dan belum menjawab?</h3>
              </div>
              <div className="mb-teacher-monitor-total">
                <strong className="mb-number">{answered}</strong><span>/ {eligible}</span>
              </div>
            </div>
            <div className="mb-teacher-monitor-grid">
              <div className="mb-teacher-status-card mb-teacher-status-wait">
                <div className="mb-teacher-status-title"><span>Belum menjawab</span><strong>{Math.max(eligible - answered, 0)}</strong></div>
                <div className="mb-teacher-student-list">
                  {view.participants.filter((p) => !p.hasAnsweredCurrentRound).map((p) => (
                    <div className="mb-teacher-student" key={p.playerId}>
                      <span className="mb-teacher-student-avatar"><img src={p.avatarUrl ?? '/avatar/2.webp'} alt="" /></span>
                      <span>{p.displayName}</span>
                    </div>
                  ))}
                  {view.participants.filter((p) => !p.hasAnsweredCurrentRound).length === 0 ? <p className="mb-teacher-empty">Semua peserta sudah menjawab.</p> : null}
                </div>
              </div>
              <div className="mb-teacher-status-card mb-teacher-status-done">
                <div className="mb-teacher-status-title"><span>Sudah menjawab</span><strong>{answered}</strong></div>
                <div className="mb-teacher-student-list">
                  {view.participants.filter((p) => p.hasAnsweredCurrentRound).map((p) => (
                    <div className="mb-teacher-student" key={p.playerId}>
                      <span className="mb-teacher-student-avatar"><img src={p.avatarUrl ?? '/avatar/2.webp'} alt="" /></span>
                      <span>{p.displayName}</span>
                      <b>✓</b>
                    </div>
                  ))}
                  {view.participants.filter((p) => p.hasAnsweredCurrentRound).length === 0 ? <p className="mb-teacher-empty">Belum ada jawaban masuk.</p> : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : activeTab === 'analisis' ? (
        <section className="mb-host-panel mb-fade-in">
          <div className="mb-host-panel-head">
            <div>
              <span className="mb-eyebrow">Wawasan Guru</span>
              <h2 className="mb-display">Analisis Permainan</h2>
              <p>Lihat pemahaman kelas dari soal ke soal tanpa mengganggu tampilan yang diproyeksikan.</p>
            </div>
            <strong className="mb-host-count">{view.roundAnalytics.length}</strong>
          </div>
          <div className="mb-cahaya-card">
            <div className="mb-cahaya-head">
              <div>
                <span className="mb-eyebrow">Papan Kontribusi</span>
                <h3 className="mb-display">✨ Cahaya Kata</h3>
                <p>Nama siswa naik berdasarkan jawaban benar dan kecepatan menjawab.</p>
              </div>
              <span className="mb-cahaya-live">LIVE</span>
            </div>
            <div className="mb-cahaya-list">
              {[...view.participants]
                .sort((a, b) => a.cahayaRank - b.cahayaRank)
                .slice(0, 10)
                .map((p) => (
                  <div className={`mb-cahaya-row ${p.cahayaRank <= 3 ? 'is-top' : ''}`} key={p.playerId}>
                    <span className={`mb-cahaya-rank rank-${Math.min(p.cahayaRank, 3)}`}>{p.cahayaRank <= 3 ? ['🥇','🥈','🥉'][p.cahayaRank - 1] : p.cahayaRank}</span>
                    <span className="mb-cahaya-avatar"><img src={p.avatarUrl ?? '/avatar/2.webp'} alt="" /></span>
                    <span className="mb-cahaya-name">{p.displayName}</span>
                    <span className="mb-cahaya-round">{p.currentRoundPoints > 0 ? `+${p.currentRoundPoints}` : ''}</span>
                    <strong className="mb-cahaya-score">{p.cahayaPoints.toLocaleString('id-ID')} <small>poin</small></strong>
                  </div>
                ))}
              {view.participants.length === 0 ? <p className="mb-teacher-empty">Belum ada siswa.</p> : null}
            </div>
          </div>

          <div className="mb-analysis-overview">
            <div><strong>{answered}/{eligible}</strong><span>Respons soal aktif</span></div>
            <div><strong>{view.gameState?.gameMode === 'kota-cahaya' ? Math.round(view.gameState.kotaCahaya.progressPercent) : '—'}{view.gameState?.gameMode === 'kota-cahaya' ? '%' : ''}</strong><span>Energi Kota</span></div>
            <div><strong>{view.roundAnalytics.filter((r) => r.submittedCount > 0).length}/{view.roundAnalytics.length}</strong><span>Soal sudah dimainkan</span></div>
          </div>

          {view.currentQuestion && (view.phase === 'closed' || view.phase === 'discussion' || view.phase === 'summary' || view.phase === 'ended') ? (
            <div className="mb-analysis-current">
              <span className="mb-eyebrow">Soal terakhir</span>
              <h3>{view.currentQuestion.prompt}</h3>
              <div className="mb-analysis-options">
                {view.currentQuestion.options.map((o) => {
                  const count = view.answerSummary.optionCounts?.[o.id] ?? 0;
                  const correct = o.id === view.currentQuestion?.correctOptionId;
                  const total = Math.max(view.answerSummary.submittedCount, 1);
                  return (
                    <div className={`mb-analysis-option ${correct ? 'is-correct' : ''}`} key={o.id}>
                      <div><span>{o.text}</span><strong>{count}</strong></div>
                      <div className="mb-analysis-bar"><i style={{ width: `${Math.round((count / total) * 100)}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mb-analysis-rounds">
            {view.roundAnalytics.map((r) => (
              <div className="mb-analysis-round" key={r.roundIndex}>
                <span className="mb-analysis-round-no">Soal {r.roundIndex + 1}</span>
                <div className="mb-analysis-round-copy"><strong>{r.accuracyPercent}% benar</strong><span>{r.submittedCount}/{r.eligibleCount} menjawab</span></div>
                <div className="mb-analysis-mini-bar"><i style={{ width: `${r.accuracyPercent}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === 'layar' ? <>
      {/* ── LOBBY — game-show command center ── */}
      {view.phase === 'lobby' || view.phase === 'preparing' ? (
        <section className="mb-lobby mb-lobby-command-center mb-fade-in">
          <div className="mb-lobby-stage-card">
            <div className="mb-lobby-stage-top">
              <div className="mb-lobby-stage-copy">
                <span className="mb-eyebrow mb-lobby-stage-eyebrow">Lobi Kelas</span>
                <h2 className="mb-display mb-lobby-stage-title">SIAP MASUK ARENA?</h2>
                <p>
                  Bagikan PIN, tunggu nama siswa muncul, lalu mulai saat kelas sudah lengkap.
                </p>
              </div>
              <div className="mb-lobby-live-pill" aria-label="Lobi aktif">
                <i aria-hidden />
                LOBI AKTIF
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
                    <p className="mb-lobby-hint mb-lobby-hint-dark" role="note">
                      <strong>2 layar saja:</strong> layar Guru untuk mengatur permainan, perangkat Murid untuk menjawab.
                    </p>
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
                <strong>{view.phase === 'preparing' ? 'Menyiapkan lobi…' : 'Kelas siap?'}</strong>
                <span>Guru mengendalikan seluruh permainan dari layar ini.</span>
              </div>
              <div className="mb-lobby-action-buttons">
                <span className="mb-lobby-control-note">Buka <strong>Kontrol Guru</strong> untuk memulai permainan.</span>
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
          <div className="mb-classroom-hint">Jawab di perangkatmu · Guru melihat progres kelas secara langsung</div>
          <div className="mb-progress-inline">
            {view.gameState?.gameMode === 'jelajah-kata' ? (
              <TeamProgress teams={view.teams} progress={view.gameState.jelajahKata.teamProgress} />
            ) : view.gameState?.gameMode === 'kota-cahaya' ? (
              <CityCahayaStage
                progressPercent={view.gameState.kotaCahaya.progressPercent}
                unlockedMilestones={view.gameState.kotaCahaya.unlockedMilestones}
              />
            ) : null}
          </div>
          <p className="mb-classroom-control-hint">Buka <strong>Kontrol Guru</strong> untuk menutup jawaban dan mengatur langkah berikutnya.</p>
        </section>
      ) : null}

      {/* ── CLOSED (§18) — jangan reveal sebelum Bahas ── */}
      {view.phase === 'closed' ? (
        <section className="mb-closed mb-fade-in">
          <h2 className="mb-display mb-guru-phase-title">Jawaban ditutup</h2>
          <p className="mb-closed-sub">
            {answered} dari {eligible} siswa sudah menjawab.
          </p>
          <p className="mb-classroom-control-hint">Jawaban sudah terkunci. Buka <strong>Kontrol Guru</strong> untuk memulai pembahasan.</p>
        </section>
      ) : null}

      {/* ── PAUSED (secondary) ── */}
      {view.phase === 'paused' ? (
        <section className="mb-closed mb-fade-in">
          <h2 className="mb-display mb-guru-phase-title">Permainan dijeda</h2>
          <p className="mb-classroom-control-hint">Permainan dijeda. Buka <strong>Kontrol Guru</strong> untuk melanjutkan.</p>
        </section>
      ) : null}

      {/* ── DISCUSSION (§18) — guru melihat kunci + agregat ── */}
      {view.phase === 'discussion' && view.currentQuestion ? (
        <section className="mb-discuss mb-fade-in">
          <QuestionCard
            question={view.currentQuestion}
            roundLabel={`Soal ${roundLabel ?? ''}`}
          />
          {view.gameState?.gameMode === 'kota-cahaya' ? (
            <CityCahayaStage
                progressPercent={view.gameState.kotaCahaya.progressPercent}
                unlockedMilestones={view.gameState.kotaCahaya.unlockedMilestones}
              />
          ) : null}
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
          <p className="mb-classroom-control-hint">Pembahasan tampil di layar kelas. Buka <strong>Kontrol Guru</strong> untuk lanjut ke soal berikutnya.</p>
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
            <CityCahayaStage
                progressPercent={view.gameState.kotaCahaya.progressPercent}
                unlockedMilestones={view.gameState.kotaCahaya.unlockedMilestones}
              />
          ) : null}
          <p className="mb-classroom-control-hint">
            {view.phase === 'summary'
              ? <>Tinjau hasil di layar kelas. Buka <strong>Kontrol Guru</strong> untuk menutup sesi.</>
              : <>Sesi sudah ditutup. Guru dapat kembali dari panel kontrol.</>}
          </p>
        </section>
      ) : null}
      </> : null}
      <style jsx>{`
        .mb-room-pin-live {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 38px;
          padding: 0 13px;
          border-radius: 12px;
          border: 1px solid rgba(15,118,110,.16);
          background: rgba(255,255,255,.92);
          box-shadow: 0 5px 16px rgba(23,53,75,.07);
          color: #617582;
          white-space: nowrap;
        }
        .mb-room-pin-live span {
          font-size: .62rem;
          font-weight: 850;
          letter-spacing: .1em;
          color: #0f766e;
        }
        .mb-room-pin-live strong {
          font-size: 1rem;
          line-height: 1;
          letter-spacing: .12em;
          color: #17354b;
          font-variant-numeric: tabular-nums;
        }
        .mb-classroom-hint,
        .mb-classroom-control-hint {
          text-align: center;
          color: #6f8290;
          font-size: .78rem;
          font-weight: 650;
          margin: 14px auto 0;
        }
        .mb-classroom-control-hint strong,
        .mb-lobby-control-note strong { color: #0f766e; }
        .mb-lobby-control-note {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0 22px;
          border-radius: 999px;
          background: rgba(255,255,255,.72);
          border: 1px solid rgba(15,118,110,.14);
          color: #637886;
          font-size: .8rem;
          font-weight: 700;
        }
        .mb-teacher-monitor {
          margin-top: 22px;
          padding-top: 20px;
          border-top: 1px solid #e9eef0;
        }
        .mb-teacher-monitor-head {
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap:16px;
          margin-bottom:14px;
        }
        .mb-teacher-monitor-head h3 { margin:4px 0 0; font-size:1.08rem; color:#1e3346; }
        .mb-teacher-monitor-total {
          display:flex;
          align-items:baseline;
          gap:3px;
          padding:9px 14px;
          border-radius:14px;
          background:#effaf7;
          color:#0f766e;
        }
        .mb-teacher-monitor-total strong { font-size:1.25rem; }
        .mb-teacher-status-card {
          border:1px solid #e7ecef;
          border-radius:18px;
          overflow:hidden;
          background:#fbfcfc;
        }
        .mb-teacher-monitor-grid {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:14px;
        }
        .mb-teacher-status-title {
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:13px 15px;
          font-size:.8rem;
          font-weight:800;
          border-bottom:1px solid #edf0f2;
        }
        .mb-teacher-status-wait .mb-teacher-status-title { color:#9a6500; background:#fffaf0; }
        .mb-teacher-status-done .mb-teacher-status-title { color:#087f70; background:#f1fbf8; }
        .mb-teacher-student-list {
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:7px;
          padding:11px;
          max-height:210px;
          overflow:auto;
        }
        .mb-teacher-student {
          min-width:0;
          display:flex;
          align-items:center;
          gap:8px;
          padding:7px 8px;
          border-radius:11px;
          background:#fff;
          border:1px solid #edf0f2;
          font-size:.72rem;
          color:#344b5c;
        }
        .mb-teacher-student > span:nth-child(2) { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .mb-teacher-student b { margin-left:auto; color:#0aa88f; }
        .mb-teacher-student-avatar {
          flex:0 0 25px;
          width:25px;
          height:25px;
          border-radius:50%;
          overflow:hidden;
          background:#eef2f4;
        }
        .mb-teacher-student-avatar img { width:100%; height:100%; object-fit:cover; }
        .mb-teacher-empty { grid-column:1/-1; margin:0; padding:18px 8px; text-align:center; color:#8a9aa4; font-size:.74rem; }
        .mb-cahaya-card {
          margin-top:18px;
          padding:18px;
          border:1px solid #e4ecea;
          border-radius:20px;
          background:linear-gradient(180deg,#fbfffe 0%,#f5faf9 100%);
        }
        .mb-cahaya-head {
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:16px;
          margin-bottom:12px;
        }
        .mb-cahaya-head h3 { margin:4px 0 3px; font-size:1.15rem; color:#17354b; }
        .mb-cahaya-head p { margin:0; color:#748691; font-size:.72rem; font-weight:650; }
        .mb-cahaya-live {
          padding:5px 9px;
          border-radius:999px;
          background:#e8faf5;
          color:#087f70;
          font-size:.6rem;
          font-weight:900;
          letter-spacing:.1em;
        }
        .mb-cahaya-list { display:grid; gap:7px; }
        .mb-cahaya-row {
          display:grid;
          grid-template-columns:38px 30px minmax(0,1fr) 62px auto;
          align-items:center;
          gap:9px;
          min-height:48px;
          padding:6px 10px;
          border:1px solid #edf1f1;
          border-radius:14px;
          background:#fff;
          transition:transform .25s ease, box-shadow .25s ease;
        }
        .mb-cahaya-row.is-top { box-shadow:0 5px 18px rgba(15,118,110,.07); }
        .mb-cahaya-rank { text-align:center; color:#71848f; font-size:.76rem; font-weight:900; }
        .mb-cahaya-avatar { width:30px; height:30px; border-radius:50%; overflow:hidden; background:#eef3f2; }
        .mb-cahaya-avatar img { width:100%; height:100%; object-fit:cover; }
        .mb-cahaya-name { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#294456; font-size:.78rem; font-weight:800; }
        .mb-cahaya-round { color:#0f9d8b; font-size:.7rem; font-weight:900; text-align:right; }
        .mb-cahaya-score { color:#17354b; font-size:.82rem; text-align:right; font-variant-numeric:tabular-nums; }
        .mb-cahaya-score small { color:#84949d; font-size:.6rem; font-weight:700; }
        .mb-analysis-overview {
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:12px;
          margin-top:18px;
        }
        .mb-analysis-overview > div {
          padding:17px;
          border:1px solid #e6ecef;
          border-radius:16px;
          background:#fafcfc;
        }
        .mb-analysis-overview strong { display:block; font-size:1.35rem; color:#17354b; }
        .mb-analysis-overview span { display:block; margin-top:4px; color:#7b8d98; font-size:.72rem; font-weight:700; }
        .mb-analysis-current {
          margin-top:18px;
          padding:18px;
          border-radius:18px;
          background:#f7faf9;
          border:1px solid #e4eeeb;
        }
        .mb-analysis-current h3 { margin:6px 0 14px; color:#203747; font-size:1rem; line-height:1.45; }
        .mb-analysis-options { display:grid; gap:9px; }
        .mb-analysis-option > div:first-child { display:flex; justify-content:space-between; gap:12px; font-size:.75rem; color:#536976; }
        .mb-analysis-option.is-correct > div:first-child { color:#087f70; font-weight:800; }
        .mb-analysis-bar,.mb-analysis-mini-bar { height:7px; margin-top:5px; border-radius:99px; overflow:hidden; background:#e9eff0; }
        .mb-analysis-bar i,.mb-analysis-mini-bar i { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,#22b8a7,#7adfcf); transition:width .45s ease; }
        .mb-analysis-option.is-correct .mb-analysis-bar i { background:linear-gradient(90deg,#0ea88f,#f3c95b); }
        .mb-analysis-rounds { display:grid; gap:8px; margin-top:18px; }
        .mb-analysis-round {
          display:grid;
          grid-template-columns:70px 145px minmax(90px,1fr);
          align-items:center;
          gap:12px;
          padding:11px 13px;
          border:1px solid #edf0f2;
          border-radius:14px;
          background:#fff;
        }
        .mb-analysis-round-no { color:#71848f; font-size:.7rem; font-weight:800; }
        .mb-analysis-round-copy strong { display:block; color:#1d3547; font-size:.78rem; }
        .mb-analysis-round-copy span { display:block; color:#94a2aa; font-size:.65rem; margin-top:2px; }
        @media(max-width:760px){
          .mb-teacher-monitor-grid,.mb-analysis-overview{grid-template-columns:1fr}
          .mb-analysis-round{grid-template-columns:60px 120px 1fr}
        }
        @media(max-width:520px){
          .mb-teacher-student-list{grid-template-columns:1fr}
          .mb-analysis-round{grid-template-columns:1fr}
        }
      `}</style>
    </main>
  );
}



/** Status peserta — identitas tampil untuk guru (bukan secret). */
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
