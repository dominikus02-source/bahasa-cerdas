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
  saveTeacherResultsToKelasku,
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
import { JelajahTrail } from '@/components/main-bersama/art/jelajah/JelajahTrail';
import { useTrailMotion } from '@/components/main-bersama/art/jelajah-motion/useTrailMotion';
import { TeamMascot } from '@/components/main-bersama/art/registry';

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
  const [savingResults, setSavingResults] = useState(false);
  const [resultsSaved, setResultsSaved] = useState(false);
  const [jelajahPodiumView, setJelajahPodiumView] = useState<'regu' | 'siswa'>('regu');
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
        // Kendali dilakukan di panel guru, tetapi hasilnya harus langsung
        // kembali menjadi pengalaman proyektor. Tidak perlu navigasi rute.
        if (action === 'start' || action === 'close-round' || action === 'discuss' || action === 'next-round' || action === 'resume') {
          setActiveTab('layar');
        }
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

  useEffect(() => {
    if (view?.phase === 'summary') setJelajahPodiumView('regu');
  }, [view?.phase]);

  // Hook harus selalu dipanggil pada setiap render, termasuk saat data ruang
  // belum tersedia. Jangan letakkan hook setelah early return.
  const jelajahTeamProgress = view?.gameState?.gameMode === 'jelajah-kata'
    ? view.gameState.jelajahKata.teamProgress
    : {};
  const { getPose: getTrailPose } = useTrailMotion(
    jelajahTeamProgress,
    view?.gameMode === 'jelajah-kata' ? view.phase : 'preparing',
  );

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

  const classroomAction: { action: Command; label: string } | null =
    view.phase === 'lobby'
      ? { action: 'start', label: 'Mulai Permainan' }
      : view.phase === 'question'
        ? { action: 'close-round', label: 'Tutup Jawaban' }
        : view.phase === 'closed'
          ? { action: 'discuss', label: 'Buka Pembahasan' }
          : view.phase === 'discussion'
            ? { action: 'next-round', label: isLastRound ? 'Lihat Hasil' : 'Soal Berikutnya' }
            : view.phase === 'paused'
              ? { action: 'resume', label: 'Lanjutkan Permainan' }
              : null;

  const podiumStudents = [...view.participants]
    .sort((a, b) =>
      a.progressRank - b.progressRank ||
      b.correctAnswers - a.correctAnswers ||
      b.progressPercent - a.progressPercent ||
      a.displayName.localeCompare(b.displayName, 'id'),
    )
    .slice(0, 3);

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
          {view.gameMode === 'jelajah-kata' ? (
            <div className="mb-leaderboard-card">
              <div className="mb-leaderboard-head">
                <div>
                  <span className="mb-eyebrow">Peringkat Kelas</span>
                  <h3 className="mb-display">Kemajuan Jelajah Kata</h3>
                  <p>Urutan berdasarkan persentase jawaban benar. Tidak ada bonus kecepatan.</p>
                </div>
                <span className="mb-leaderboard-live">LANGSUNG</span>
              </div>
              <div className="mb-leaderboard-list">
                {[...view.participants]
                  .sort((a, b) => a.progressRank - b.progressRank || b.correctAnswers - a.correctAnswers)
                  .slice(0, 10)
                  .map((p) => (
                    <div className={`mb-leaderboard-row ${p.progressRank <= 3 ? 'is-top' : ''}`} key={p.playerId}>
                      <span className="mb-leaderboard-rank">
                        {p.progressRank <= 3 ? ['🥇', '🥈', '🥉'][p.progressRank - 1] : p.progressRank}
                      </span>
                      <span className="mb-leaderboard-avatar">
                        <img src={p.avatarUrl ?? '/avatar/2.webp'} alt="" />
                      </span>
                      <span className="mb-leaderboard-name">{p.displayName}</span>
                      <span className="mb-leaderboard-score">{p.correctAnswers}/{p.eligibleRounds}</span>
                      <strong>{p.progressPercent}%</strong>
                    </div>
                  ))}
                {view.participants.length === 0 ? <p className="mb-teacher-empty">Belum ada siswa.</p> : null}
              </div>
            </div>
          ) : (
            <div className="mb-leaderboard-card">
              <div className="mb-leaderboard-head">
                <div>
                  <span className="mb-eyebrow">Perkembangan Kota</span>
                  <h3 className="mb-display">Progres Kota Cahaya</h3>
                  <p>Lihat perkembangan kota berdasarkan kemajuan permainan kelas.</p>
                </div>
                <span className="mb-leaderboard-live">LANGSUNG</span>
              </div>
              <div className="mb-analysis-overview mb-kota-cahaya-overview">
                <div>
                  <strong>{view.gameState?.gameMode === 'kota-cahaya' ? Math.round(view.gameState.kotaCahaya.progressPercent) : 0}%</strong>
                  <span>Progres Kota</span>
                </div>
                <div>
                  <strong>{view.gameState?.gameMode === 'kota-cahaya' ? view.gameState.kotaCahaya.unlockedMilestones.length : 0}</strong>
                  <span>Tahap terbuka</span>
                </div>
                <div>
                  <strong>{view.roundAnalytics.filter((r) => r.submittedCount > 0).length}/{view.roundAnalytics.length}</strong>
                  <span>Soal dimainkan</span>
                </div>
              </div>
            </div>
          )}

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
      {classroomAction ? (
        <aside className="mb-classroom-quick-control" aria-label="Kontrol cepat guru">
          <span>Kontrol cepat guru</span>
          <PrimaryGameButton
            onClick={() => {
              if (classroomAction.action === 'start') void teacherSound.activate();
              void run(classroomAction.action);
            }}
            disabled={busy || (classroomAction.action === 'start' && view.participants.length === 0)}
            loading={busy}
            variant="light"
          >
            {classroomAction.label}
          </PrimaryGameButton>
        </aside>
      ) : null}
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
                    avatarUrl: p.avatarUrl ?? '/avatar/2.webp',
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
                <span className="mb-lobby-control-note">Gunakan tombol <strong>Mulai Permainan</strong> di atas saat kelas sudah siap.</span>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── JELAJAH KATA — layar guru = panggung perjalanan, soal tetap di perangkat murid ── */}
      {view.gameMode === 'jelajah-kata' && (
        <>
          {view.phase === 'question' || view.phase === 'closed' || view.phase === 'paused' || view.phase === 'discussion' ? (
            <section className="mb-jelajah-host-stage mb-fade-in" aria-label="Perjalanan Jelajah Kata">
              <div className="mb-jelajah-host-head">
                <div>
                  <span className="mb-eyebrow">Dunia Jelajah Kata</span>
                  <h2 className="mb-display mb-jelajah-host-title">Perjalanan Regu</h2>
                  <p>Jawaban siswa menggerakkan regunya maju. Layar ini khusus untuk menikmati perjalanan kelas.</p>
                </div>
                <div className="mb-jelajah-host-live">
                  <span className="mb-jelajah-host-live-dot" aria-hidden />
                  <strong>{answered}/{eligible}</strong>
                  <span>sudah menjawab</span>
                </div>
              </div>

              <div className="mb-jelajah-host-world">
                <JelajahTrail
                  teams={view.teams}
                  progress={jelajahTeamProgress}
                  poses={Object.fromEntries(view.teams.map((team) => [team.id, getTrailPose(team.id)]))}
                />
              </div>

              <div className="mb-jelajah-host-footer">
                <div className="mb-jelajah-host-team-status">
                  {view.teams.slice(0, 4).map((team) => {
                    const progress = Math.round(jelajahTeamProgress[team.id] ?? 0);
                    return (
                      <div className="mb-jelajah-host-team" key={team.id}>
                        <span className="mb-jelajah-host-team-name">{team.name}</span>
                        <span className="mb-jelajah-host-team-progress">{progress}%</span>
                      </div>
                    );
                  })}
                </div>
                <span className="mb-classroom-control-hint">
                  {view.phase === 'question'
                    ? 'Murid menjawab dari perangkat masing-masing · perjalanan regu bergerak otomatis.'
                    : view.phase === 'discussion'
                      ? 'Guru sedang membahas jawaban · perjalanan tetap menjadi panggung kelas.'
                      : view.phase === 'paused'
                        ? 'Permainan dijeda · posisi setiap regu tetap tersimpan.'
                        : 'Jawaban ditutup · bersiap melanjutkan perjalanan.'}
                </span>
              </div>
            </section>
          ) : null}
        </>
      )}

      {/* ── KOTA CAHAYA — tampilan guru tetap memakai panggung kota ── */}
      {view.gameMode === 'kota-cahaya' && view.phase === 'question' && view.currentQuestion ? (
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
            {view.gameState?.gameMode === 'kota-cahaya' ? (
              <CityCahayaStage
                progressPercent={view.gameState.kotaCahaya.progressPercent}
                unlockedMilestones={view.gameState.kotaCahaya.unlockedMilestones}
              />
            ) : null}
          </div>
          <p className="mb-classroom-control-hint">Buka <strong>Kontrol Guru</strong> untuk menutup jawaban dan mengatur langkah berikutnya.</p>
        </section>
      ) : null}

      {/* ── KOTA CAHAYA CLOSED ── */}
      {view.gameMode === 'kota-cahaya' && view.phase === 'closed' ? (
        <section className="mb-closed mb-fade-in">
          <h2 className="mb-display mb-guru-phase-title">Jawaban ditutup</h2>
          <p className="mb-closed-sub">{answered} dari {eligible} siswa sudah menjawab.</p>
          <p className="mb-classroom-control-hint">Jawaban sudah terkunci. Buka <strong>Kontrol Guru</strong> untuk memulai pembahasan.</p>
        </section>
      ) : null}

      {/* ── KOTA CAHAYA PAUSED ── */}
      {view.gameMode === 'kota-cahaya' && view.phase === 'paused' ? (
        <section className="mb-closed mb-fade-in">
          <h2 className="mb-display mb-guru-phase-title">Permainan dijeda</h2>
          <p className="mb-classroom-control-hint">Permainan dijeda. Buka <strong>Kontrol Guru</strong> untuk melanjutkan.</p>
        </section>
      ) : null}

      {/* ── KOTA CAHAYA DISCUSSION ── */}
      {view.gameMode === 'kota-cahaya' && view.phase === 'discussion' && view.currentQuestion ? (
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
          <div className="mb-final-hero">
            <span className="mb-eyebrow">{view.phase === 'ended' ? 'Sesi selesai' : view.gameMode === 'jelajah-kata' ? 'Perjalanan selesai' : 'Permainan selesai'}</span>
            <h2 className="mb-display mb-guru-phase-title">🎉 {view.gameMode === 'jelajah-kata' ? 'Hebat, kelas!' : 'Kota Cahaya selesai!'}</h2>
            <p className="mb-final-subtitle">
              {view.gameMode === 'jelajah-kata'
                ? 'Kalian berhasil menyelesaikan Jelajah Kata hari ini.'
                : 'Inilah perkembangan akhir Kota Cahaya hari ini.'}
            </p>
          </div>

          {view.gameMode === 'jelajah-kata' ? (
            <section className="mb-final-podium-card mb-final-jelajah-card">
              <div className="mb-final-section-head">
                <div>
                  <span className="mb-eyebrow">{jelajahPodiumView === 'regu' ? 'Podium Regu' : 'Podium Siswa'}</span>
                  <h3>{jelajahPodiumView === 'regu' ? 'Hasil Akhir Regu' : 'Hasil Akhir Siswa'}</h3>
                  <p className="mb-final-podium-caption">
                    {jelajahPodiumView === 'regu'
                      ? 'Lihat hasil perjalanan empat regu sebelum melihat pencapaian siswa.'
                      : 'Lihat tiga siswa dengan hasil akhir tertinggi pada permainan hari ini.'}
                  </p>
                </div>
                <span className="mb-final-total">
                  {jelajahPodiumView === 'regu' ? '4 regu' : `${view.participants.length} siswa`}
                </span>
              </div>

              {jelajahPodiumView === 'regu' ? (
                <div className="mb-final-team-podium">
                  {[2, 1, 3].flatMap((rank) => {
                    const rankedTeams = [...view.teams]
                      .slice(0, 4)
                      .sort((a, b) => {
                        const ap = view.gameState?.gameMode === 'jelajah-kata'
                          ? (view.gameState.jelajahKata.teamProgress[a.id] ?? 0)
                          : 0;
                        const bp = view.gameState?.gameMode === 'jelajah-kata'
                          ? (view.gameState.jelajahKata.teamProgress[b.id] ?? 0)
                          : 0;
                        return bp - ap || a.name.localeCompare(b.name, 'id');
                      });
                    const team = rankedTeams[rank - 1];
                    if (!team) return [];
                    const progress = view.gameState?.gameMode === 'jelajah-kata'
                      ? Math.round(view.gameState.jelajahKata.teamProgress[team.id] ?? 0)
                      : 0;
                    const members = view.participants.filter((p) => p.teamId === team.id);
                    const memberCorrect = members.reduce((sum, p) => sum + p.correctAnswers, 0);
                    const memberEligible = members.reduce((sum, p) => sum + p.eligibleRounds, 0);

                    return [(
                      <div className={`mb-team-podium-item mb-team-podium-rank-${rank}`} key={team.id}>
                        <div className="mb-team-podium-medal" aria-hidden>
                          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                        </div>
                        <div className="mb-team-podium-emblem">
                          <TeamMascot teamId={team.id} pose="podium" size={rank === 1 ? 92 : 74} eager />
                        </div>
                        <strong>{team.name}</strong>
                        <span>{members.length} siswa · {memberCorrect}/{memberEligible} benar</span>
                        <div className="mb-team-podium-step">
                          <b>{rank}</b>
                          <small>{progress}%</small>
                        </div>
                      </div>
                    )];
                  })}
                </div>
              ) : (
                <div className={`mb-final-podium mb-final-podium-${podiumStudents.length}`}>
                  {[2, 1, 3].flatMap((slotRank) => {
                    const studentIndex = slotRank === 1 ? 0 : slotRank === 2 ? 1 : 2;
                    const participant = podiumStudents[studentIndex];
                    if (!participant) return [];
                    return [(
                      <div className={`mb-podium-item mb-podium-rank-${slotRank}`} key={participant.playerId}>
                        <div className="mb-podium-medal" aria-hidden>
                          {slotRank === 1 ? '🥇' : slotRank === 2 ? '🥈' : '🥉'}
                        </div>
                        <span className="mb-podium-avatar">
                          <img src={participant.avatarUrl ?? '/avatar/2.webp'} alt="" />
                        </span>
                        <strong title={participant.displayName}>{participant.displayName}</strong>
                        <span>{participant.correctAnswers}/{participant.eligibleRounds} benar · {participant.progressPercent}%</span>
                        <div className="mb-podium-step">
                          <b>#{participant.progressRank}</b>
                          <small>{participant.progressPercent}%</small>
                        </div>
                      </div>
                    )];
                  })}
                  {view.participants.length === 0 ? <p className="mb-teacher-empty">Belum ada hasil peserta.</p> : null}
                </div>
              )}

              <div className="mb-jelajah-podium-switch">
                {jelajahPodiumView === 'regu' ? (
                  <button
                    type="button"
                    className="mb-jelajah-next-btn"
                    onClick={() => setJelajahPodiumView('siswa')}
                  >
                    Berikutnya: Podium Siswa <span aria-hidden>→</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="mb-jelajah-next-btn mb-jelajah-back-btn"
                    onClick={() => setJelajahPodiumView('regu')}
                  >
                    <span aria-hidden>←</span> Kembali ke Podium Regu
                  </button>
                )}
              </div>

              <p className="mb-final-jelajah-note">
                {jelajahPodiumView === 'regu'
                  ? 'Urutan regu ditentukan dari progres perjalanan akhir masing-masing regu.'
                  : 'Podium siswa menampilkan hasil akhir berdasarkan persentase jawaban benar.'}
              </p>
            </section>
          ) : (
            <div className="mb-final-grid">
              <div className="mb-final-city-card">
                <div className="mb-final-section-head">
                  <div>
                    <span className="mb-eyebrow">Perkembangan Kota</span>
                    <h3>🌆 Kota Cahaya</h3>
                  </div>
                  <span className="mb-final-city-progress">
                    {view.gameState?.gameMode === 'kota-cahaya'
                      ? Math.round(view.gameState.kotaCahaya.progressPercent)
                      : 0}%
                  </span>
                </div>
                <CityCahayaStage
                  progressPercent={
                    view.gameState?.gameMode === 'kota-cahaya'
                      ? view.gameState.kotaCahaya.progressPercent
                      : 0
                  }
                  unlockedMilestones={
                    view.gameState?.gameMode === 'kota-cahaya'
                      ? view.gameState.kotaCahaya.unlockedMilestones
                      : []
                  }
                />
                <p>Setiap jawaban benar ikut membantu kelas membuat Kota Cahaya semakin hidup.</p>
              </div>
            </div>
          )}
          <div className="mb-final-actions">
            <button type="button" className="mb-final-share-btn" disabled={savingResults || resultsSaved || !className} onClick={async () => { setSavingResults(true); try { await saveTeacherResultsToKelasku(sessionId); setResultsSaved(true); } catch (e) { setError(e instanceof MbApiError ? e.message : 'Hasil gagal disimpan.'); } finally { setSavingResults(false); } }}>{resultsSaved ? '✓ Tersimpan di Kelasku' : savingResults ? 'Menyimpan…' : 'Masukkan Nilai ke Kelasku'}</button>
            <button type="button" className="mb-final-share-btn mb-final-share-secondary" onClick={() => { const rows = [...view.participants].sort((a,b)=>a.displayName.localeCompare(b.displayName,'id')).map(p=>p.displayName + ': ' + p.progressPercent + '% (' + p.correctAnswers + '/' + p.eligibleRounds + ')').join('\n'); const subject=encodeURIComponent('Hasil Main Bersama — ' + view.contentTitle); const body=encodeURIComponent('Hasil Main Bersama\n\n' + rows); window.location.href='mailto:?subject=' + subject + '&body=' + body; }}>Kirim Hasil melalui Email</button>
          </div>

          <div className="mb-final-bottom">
            <div>
              <span className="mb-eyebrow">Kemajuan Kelas</span>
              <strong>{view.roundAnalytics.filter((r) => r.submittedCount > 0).length}/{view.roundAnalytics.length} soal dimainkan</strong>
            </div>
            <div>
              <span className="mb-eyebrow">Akurasi Kelas</span>
              <strong>
                {view.roundAnalytics.length
                  ? Math.round(
                      view.roundAnalytics.reduce((sum, r) => sum + r.accuracyPercent, 0) /
                        view.roundAnalytics.length,
                    )
                  : 0}%
              </strong>
            </div>
            <p>
              {view.phase === 'summary'
                ? <>Tinjau hasil di <strong>Analisis</strong>, lalu buka <strong>Kontrol Guru</strong> untuk menutup sesi.</>
                : view.gameMode === 'jelajah-kata'
                  ? <>Sesi selesai. Podium tetap menjadi penutup perjalanan.</>
                  : <>Sesi selesai. Kota Cahaya tetap menjadi penutup permainan.</>}
            </p>
          </div>
        </section>
      ) : null}
      </> : null}
      <style jsx>{`
        .mb-classroom-quick-control {
          position:sticky;
          top:8px;
          z-index:24;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:12px;
          width:fit-content;
          max-width:calc(100% - 32px);
          margin:10px auto 0;
          padding:7px 9px 7px 14px;
          border:1px solid rgba(15,118,110,.16);
          border-radius:999px;
          background:rgba(255,255,255,.94);
          box-shadow:0 8px 24px rgba(23,53,75,.12);
          backdrop-filter:blur(12px);
        }
        .mb-classroom-quick-control > span { color:#47636f; font-size:.72rem; font-weight:800; }
        .mb-classroom-quick-control :global(.mb-primary-game-btn) { min-height:38px; padding:0 15px; font-size:.72rem; }
        @media(max-width:640px) { .mb-classroom-quick-control { width:calc(100% - 24px); justify-content:space-between; border-radius:16px; } }
        .mb-jelajah-host-stage {
          margin: 10px auto 0;
          width: min(1240px, 100%);
          padding: clamp(16px, 2vw, 24px);
          border: 1px solid rgba(19, 37, 58, .09);
          border-radius: 28px;
          background: linear-gradient(180deg, #f8fcff 0%, #eef7f4 100%);
          box-shadow: 0 18px 50px rgba(19, 37, 58, .08);
        }
        .mb-jelajah-host-head {
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap:20px;
          margin-bottom:12px;
        }
        .mb-jelajah-host-title { margin:5px 0 4px; color:#17354b; }
        .mb-jelajah-host-head p { margin:0; color:#70828d; font-size:.8rem; font-weight:650; }
        .mb-jelajah-host-live {
          display:flex;
          align-items:center;
          gap:7px;
          flex:none;
          padding:10px 14px;
          border-radius:16px;
          background:#fff;
          border:1px solid #e1ebe8;
          color:#617582;
          font-size:.7rem;
        }
        .mb-jelajah-host-live strong { color:#0f766e; font-size:1rem; font-variant-numeric:tabular-nums; }
        .mb-jelajah-host-live-dot {
          width:8px; height:8px; border-radius:50%;
          background:#14b89f;
          box-shadow:0 0 0 5px rgba(20,184,159,.12);
        }
        .mb-jelajah-host-world {
          min-height: min(61vh, 650px);
          display:grid;
          place-items:center;
          overflow:hidden;
          border-radius:22px;
          background:#071325;
        }
        .mb-jelajah-host-world .mb-jelajah-stage {
          display:block;
          width:100%;
          height:auto;
          max-height: min(61vh, 650px);
        }
        .mb-jelajah-host-footer { margin-top:12px; }
        .mb-jelajah-host-team-status {
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:8px;
        }
        .mb-jelajah-host-team {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          min-width:0;
          padding:9px 11px;
          border:1px solid #e4ecea;
          border-radius:13px;
          background:rgba(255,255,255,.82);
        }
        .mb-jelajah-host-team-name {
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          color:#365062;
          font-size:.72rem;
          font-weight:800;
        }
        .mb-jelajah-host-team-progress { color:#0f766e; font-size:.72rem; font-weight:900; font-variant-numeric:tabular-nums; }
        .mb-jelajah-host-footer .mb-classroom-control-hint { margin-top:10px; }
        @media(max-width:760px){
          .mb-jelajah-host-head { align-items:flex-start; flex-direction:column; }
          .mb-jelajah-host-live { align-self:stretch; justify-content:center; }
          .mb-jelajah-host-team-status { grid-template-columns:1fr 1fr; }
          .mb-jelajah-host-world { min-height:340px; }
        }
        @media(min-width:900px) and (max-height:820px){
          .mb-jelajah-host-stage { padding:14px 18px 16px; }
          .mb-jelajah-host-head { margin-bottom:7px; }
          .mb-jelajah-host-world { min-height:430px; }
          .mb-jelajah-host-world .mb-jelajah-stage { max-height:430px; }
        }
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
        .mb-leaderboard-card,
        .mb-final-podium-card,
        .mb-final-city-card {
          margin-top: 18px;
          padding: 18px;
          border: 1px solid #e4ecea;
          border-radius: 20px;
          background: linear-gradient(180deg,#fbfffe 0%,#f5faf9 100%);
        }
        .mb-leaderboard-head,
        .mb-final-section-head {
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:16px;
          margin-bottom:12px;
        }
        .mb-leaderboard-head h3,
        .mb-final-section-head h3 { margin:4px 0 3px; font-size:1.15rem; color:#17354b; }
        .mb-leaderboard-head p { margin:0; color:#748691; font-size:.72rem; font-weight:650; }
        .mb-leaderboard-live {
          padding:5px 9px;
          border-radius:999px;
          background:#e8faf5;
          color:#087f70;
          font-size:.6rem;
          font-weight:900;
          letter-spacing:.1em;
        }
        .mb-leaderboard-list { display:grid; gap:7px; }
        .mb-leaderboard-row {
          display:grid;
          grid-template-columns:38px 34px minmax(0,1fr) 68px 54px;
          align-items:center;
          gap:9px;
          min-height:48px;
          padding:6px 10px;
          border:1px solid #edf1f1;
          border-radius:14px;
          background:#fff;
        }
        .mb-leaderboard-row.is-top { box-shadow:0 5px 18px rgba(15,118,110,.07); }
        .mb-leaderboard-rank { text-align:center; color:#71848f; font-size:.76rem; font-weight:900; }
        .mb-leaderboard-avatar,
        .mb-podium-avatar { overflow:hidden; background:#eef3f2; }
        .mb-leaderboard-avatar { width:34px; height:34px; border-radius:50%; }
        .mb-leaderboard-avatar img,
        .mb-podium-avatar img { width:100%; height:100%; object-fit:cover; display:block; }
        .mb-leaderboard-name { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#294456; font-size:.78rem; font-weight:800; }
        .mb-leaderboard-score { color:#71848f; font-size:.7rem; font-weight:800; text-align:right; }
        .mb-leaderboard-row > strong { color:#17354b; font-size:.82rem; text-align:right; font-variant-numeric:tabular-nums; }
        .mb-final-hero { position:relative; overflow:hidden; padding:10px 16px; text-align:center; }
        .mb-final-hero::before { content:"✦  ·  ✦  ·  ✦"; display:block; margin-bottom:7px; color:#d49a20; font-size:.9rem; letter-spacing:.38em; animation:mb-podium-arrive .7s ease-out both; }
        .mb-final-subtitle { margin:6px 0 0; color:#6f8290; font-size:.86rem; font-weight:650; }
        .mb-final-grid { display:grid; grid-template-columns:minmax(0,1.05fr) minmax(0,1fr); gap:16px; margin-top:8px; }
        .mb-final-total,
        .mb-final-city-progress { color:#0f766e; font-size:.72rem; font-weight:900; }
        .mb-final-jelajah-card {
          margin-top: 8px;
          padding: 22px 24px 18px;
          background:
            radial-gradient(circle at 50% 0%, rgba(20,184,159,.09), transparent 34%),
            linear-gradient(180deg,#ffffff 0%,#f4faf8 100%);
          border-radius:24px;
          box-shadow:0 16px 44px rgba(23,53,75,.07);
        }
        .mb-final-podium {
          display:grid;
          grid-template-columns:1fr 1.16fr 1fr;
          align-items:end;
          gap:18px;
          min-height:340px;
          max-width:980px;
          margin:10px auto 0;
        }
        .mb-final-podium-1 { grid-template-columns:minmax(220px,360px); justify-content:center; min-height:310px; }
        .mb-final-podium-1 .mb-podium-item { grid-column:1; min-height:300px; }
        .mb-final-podium-2 { grid-template-columns:repeat(2,minmax(210px,300px)); justify-content:center; min-height:310px; }
        .mb-podium-item {
          position:relative;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:flex-end;
          min-width:0;
          text-align:center;
          padding:16px 14px 0;
          border:1px solid #e3ece9;
          border-radius:22px 22px 14px 14px;
          background:rgba(255,255,255,.9);
          box-shadow:0 10px 28px rgba(23,53,75,.06);
          overflow:hidden;
          animation:mb-podium-arrive .55s cubic-bezier(.22,.9,.3,1) both;
        }
        .mb-podium-item:nth-child(2) { animation-delay:.12s; }
        .mb-podium-item:nth-child(3) { animation-delay:.2s; }
        .mb-podium-rank-1 {
          padding-top:22px;
          border-color:rgba(15,118,110,.22);
          box-shadow:0 18px 40px rgba(15,118,110,.13);
        }
        .mb-podium-rank-2 { min-height:270px; }
        .mb-podium-rank-1 { min-height:310px; }
        .mb-podium-rank-3 { min-height:245px; }
        .mb-podium-item { display:flex; flex-direction:column; align-items:center; justify-content:flex-end; min-width:0; text-align:center; }
        .mb-podium-medal {
          font-size:1.9rem;
          line-height:1;
          margin-bottom:7px;
          filter:drop-shadow(0 5px 8px rgba(23,53,75,.09));
        }
        .mb-podium-avatar {
          width:66px;
          height:66px;
          border-radius:50%;
          border:4px solid #fff;
          box-shadow:0 8px 22px rgba(23,53,75,.12);
        }
        .mb-podium-rank-1 .mb-podium-avatar {
          width:88px;
          height:88px;
          box-shadow:0 12px 30px rgba(15,118,110,.14);
        }
        .mb-podium-item strong {
          max-width:100%;
          margin-top:9px;
          color:#17354b;
          font-size:.86rem;
          font-weight:850;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .mb-podium-item > span:not(.mb-podium-avatar) {
          margin-top:4px;
          color:#71848f;
          font-size:.68rem;
          font-weight:750;
        }
        .mb-podium-step {
          display:flex;
          align-items:baseline;
          justify-content:center;
          gap:7px;
          width:100%;
          min-height:52px;
          margin-top:10px;
          padding:0 12px;
          border-radius:16px 16px 8px 8px;
          background:#eaf4f2;
          color:#0f766e;
        }
        .mb-podium-step b { font-size:1.35rem; line-height:1; }
        .mb-podium-step small { font-size:.68rem; font-weight:850; color:#6e858e; }
        .mb-podium-rank-1 .mb-podium-step {
          min-height:78px;
          background:linear-gradient(180deg,#d9f5ed 0%,#c9eee4 100%);
        }
        .mb-podium-rank-2 .mb-podium-step { min-height:62px; }
        .mb-podium-rank-3 .mb-podium-step { min-height:56px; }
        .mb-final-podium-caption {
          margin:4px 0 0;
          max-width:620px;
          color:#7a8b95;
          font-size:.72rem;
          line-height:1.45;
          font-weight:650;
        }
        .mb-final-team-podium {
          display:grid;
          grid-template-columns:1fr 1.16fr 1fr;
          align-items:end;
          gap:18px;
          min-height:340px;
          max-width:980px;
          margin:10px auto 0;
        }
        .mb-team-podium-item {
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:flex-end;
          min-width:0;
          text-align:center;
          padding:16px 14px 0;
          border:1px solid #e3ece9;
          border-radius:22px 22px 14px 14px;
          background:rgba(255,255,255,.9);
          box-shadow:0 10px 28px rgba(23,53,75,.06);
          overflow:hidden;
          animation:mb-podium-arrive .55s cubic-bezier(.22,.9,.3,1) both;
        }
        .mb-team-podium-item:nth-child(2) { animation-delay:.12s; }
        .mb-team-podium-item:nth-child(3) { animation-delay:.2s; }
        .mb-team-podium-rank-2 { min-height:250px; }
        .mb-team-podium-rank-1 {
          min-height:310px;
          padding-top:22px;
          border-color:rgba(15,118,110,.22);
          box-shadow:0 18px 40px rgba(15,118,110,.13);
        }
        .mb-team-podium-rank-3 { min-height:225px; }
        .mb-team-podium-medal {
          font-size:1.9rem;
          line-height:1;
          margin-bottom:7px;
          filter:drop-shadow(0 5px 8px rgba(23,53,75,.09));
        }
        .mb-team-podium-emblem {
          width:82px;
          height:82px;
          display:grid;
          place-items:center;
          margin-bottom:8px;
          border-radius:24px;
          border:1px solid #e0eae7;
          background:linear-gradient(180deg,#f9fffd 0%,#eaf6f2 100%);
          font-size:2.8rem;
          box-shadow:0 10px 24px rgba(23,53,75,.08);
        }
        .mb-team-podium-rank-1 .mb-team-podium-emblem {
          width:96px;
          height:96px;
          font-size:3.25rem;
          box-shadow:0 14px 30px rgba(15,118,110,.13);
        }
        .mb-team-podium-item strong {
          max-width:100%;
          margin-top:1px;
          color:#17354b;
          font-size:.92rem;
          font-weight:900;
        }
        .mb-team-podium-item > span {
          margin-top:4px;
          color:#71848f;
          font-size:.68rem;
          font-weight:750;
        }
        .mb-team-podium-step {
          display:flex;
          align-items:baseline;
          justify-content:center;
          gap:7px;
          width:100%;
          min-height:58px;
          margin-top:10px;
          padding:0 12px;
          border-radius:16px 16px 8px 8px;
          background:#eaf4f2;
          color:#0f766e;
        }
        .mb-team-podium-step b { font-size:1.38rem; line-height:1; }
        .mb-team-podium-step small { font-size:.72rem; font-weight:900; color:#6e858e; }
        .mb-team-podium-rank-1 .mb-team-podium-step {
          min-height:78px;
          background:linear-gradient(180deg,#d9f5ed 0%,#c9eee4 100%);
        }
        .mb-team-podium-rank-2 .mb-team-podium-step { min-height:66px; }
        .mb-team-podium-rank-3 .mb-team-podium-step { min-height:58px; }
        .mb-jelajah-podium-switch {
          display:flex;
          justify-content:center;
          margin-top:16px;
        }
        .mb-jelajah-next-btn {
          min-height:46px;
          padding:0 18px;
          border:0;
          border-radius:999px;
          background:#17354b;
          color:#fff;
          font-size:.76rem;
          font-weight:850;
          cursor:pointer;
          box-shadow:0 9px 24px rgba(23,53,75,.14);
        }
        .mb-jelajah-next-btn:focus-visible { outline:3px solid #69d2c6; outline-offset:3px; }
        .mb-jelajah-next-btn span { margin-left:5px; }
        .mb-jelajah-back-btn { background:#eef4f3; color:#17354b; border:1px solid #dfe9e7; box-shadow:none; }
        .mb-final-jelajah-note {
          max-width:760px;
          margin:16px auto 0;
          color:#71848f;
          font-size:.72rem;
          line-height:1.5;
          font-weight:650;
          text-align:center;
        }
        .mb-final-city-card { display:flex; flex-direction:column; }
        .mb-final-city-card .mb-city-cahaya-stage { flex:1; margin-top:0; }
        .mb-final-city-card > p { margin:8px 2px 0; color:#71848f; font-size:.72rem; font-weight:650; text-align:center; }
        .mb-final-actions { display:flex; flex-wrap:wrap; justify-content:center; gap:9px; margin:14px 0 4px; }
        .mb-final-share-btn { min-height:42px; padding:0 16px; border:0; border-radius:12px; background:#0f766e; color:#fff; font-size:.75rem; font-weight:850; cursor:pointer; }
        .mb-final-share-btn:disabled { opacity:.48; cursor:not-allowed; }
        .mb-final-share-secondary { background:#eef4f3; color:#17354b; border:1px solid #dfe9e7; }
        .mb-final-bottom { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)) minmax(0,2fr); gap:10px; align-items:center; margin-top:12px; }
        .mb-final-bottom > div { padding:12px 14px; border-radius:14px; background:#f5f8f8; border:1px solid #e8eeee; }
        .mb-final-bottom > div span,
        .mb-final-bottom > div strong { display:block; }
        .mb-final-bottom > div strong { margin-top:3px; color:#17354b; font-size:.9rem; }
        .mb-final-bottom p { margin:0; color:#71848f; font-size:.72rem; line-height:1.45; font-weight:650; }
        @keyframes mb-podium-arrive { from { opacity:0; transform:translateY(16px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @media(prefers-reduced-motion:reduce) { .mb-final-hero::before,.mb-podium-item,.mb-team-podium-item { animation:none; } }
        @media(max-width:760px){
          .mb-final-grid { grid-template-columns:1fr; }
          .mb-final-podium { grid-template-columns:1fr 1fr 1fr; min-height:250px; gap:8px; }
          .mb-final-podium-1 { grid-template-columns:minmax(200px,1fr); }
          .mb-final-podium-2 { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .mb-final-team-podium { grid-template-columns:1fr 1fr 1fr; min-height:230px; gap:8px; }
          .mb-team-podium-rank-2 { min-height:190px; }
          .mb-team-podium-rank-1 { min-height:220px; }
          .mb-team-podium-rank-3 { min-height:175px; }
          .mb-team-podium-emblem { width:60px; height:60px; font-size:2.1rem; }
          .mb-team-podium-rank-1 .mb-team-podium-emblem { width:70px; height:70px; font-size:2.5rem; }
          .mb-podium-item { padding-left:8px; padding-right:8px; }
          .mb-podium-rank-2 { min-height:210px; }
          .mb-podium-rank-1 { min-height:245px; }
          .mb-podium-rank-3 { min-height:190px; }
          .mb-final-bottom { grid-template-columns:1fr 1fr; }
          .mb-final-bottom p { grid-column:1/-1; }
          .mb-leaderboard-row { grid-template-columns:32px 32px minmax(0,1fr) 54px 48px; }
        }
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
