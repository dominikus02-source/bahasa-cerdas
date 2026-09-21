"use client";
// ─── Student Game Client (Tahap 8A — visual polish) ──────────
// Flow siswa sangat fokus: lobby tunggu → soal → jawab tersimpan →
// closed → pembahasan → hasil. TANPA skor/leaderboard/answer key
// sebelum reveal (view server tidak membawanya — bukan disensor UI).
// State SELALU dari GET authoritative (useSessionView); payload
// realtime hanya sinyal. Logic submit/view Tahap 7 TIDAK berubah.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  StudentSessionView,
} from '@/src/main-bersama/contracts/views/student';
import {
  MbApiError,
  fetchStudentState,
  submitAnswer,
} from '@/lib/main-bersama/api-client';
import { useSessionView } from '@/lib/main-bersama/use-session-view';
import { clearCredential } from '@/lib/main-bersama/credential-store';
import { SessionHeader } from '@/components/main-bersama/shared/SessionHeader';
import { StudentBackButton } from '@/components/main-bersama/shared/StudentBackButton';
import { QuestionCard } from '@/components/main-bersama/shared/QuestionCard';
import { AnswerOption } from '@/components/main-bersama/shared/AnswerOption';
import { ConnectionBanner } from '@/components/main-bersama/shared/ConnectionBanner';
import { ParticipantCount } from '@/components/main-bersama/shared/ParticipantCount';
import { PrimaryGameButton } from '@/components/main-bersama/shared/PrimaryGameButton';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

/** Warna chip regu (token §14). */
const TEAM_COLOR_VAR: Record<string, string> = {
  elang: 'var(--mb-team-elang)',
  harimau: 'var(--mb-team-harimau)',
  rusa: 'var(--mb-team-rusa)',
  badak: 'var(--mb-team-badak)',
};

// ── Type predicates: fase union PreRound tidak bisa di-narrow
// langsung (phase-nya union 4 nilai) — predicate eksplisit aman &
// tanpa mengubah kontrak.
type StudentPreRoundView = StudentSessionView & { phase: 'preparing' | 'lobby' };
type StudentRevealViewT = StudentSessionView & {
  phase: 'discussion' | 'summary' | 'ended';
};
function isPreRound(v: StudentSessionView): v is StudentPreRoundView {
  return v.phase === 'preparing' || v.phase === 'lobby';
}
function isReveal(v: StudentSessionView): v is StudentRevealViewT {
  return v.phase === 'discussion' || v.phase === 'summary' || v.phase === 'ended';
}

/** Submission id client-generated — pattern server: [A-Za-z0-9_-]{8,128}. */
function newSubmissionId(): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now()}${Math.random().toString(36).slice(2)}`;
  return `sub-${rnd}`;
}

export function StudentGameClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [exitError, setExitError] = useState<string | null>(null);

  const fetchView = useCallback(
    () => fetchStudentState(sessionId),
    [sessionId],
  );

  // Error domain (credential invalid, sesi berakhir) → keluar ke join
  // dengan pesan; jaringan putus → banner (ditangani hook).
  const onError = useCallback(
    (error: unknown) => {
      if (error instanceof MbApiError) {
        clearCredential(sessionId);
        setExitError(error.message);
      }
    },
    [sessionId],
  );

  const { view, connection } = useSessionView<StudentSessionView>(
    sessionId,
    fetchView,
    { onError },
  );

  if (exitError) {
    return (
      <main className="mb-sexit mb-fade-in">
        <h2 className="mb-display">Sesi berakhir</h2>
        <p>{exitError}</p>
        <PrimaryGameButton onClick={() => router.push('/main-bersama/join')}>
          Gabung dengan PIN lain
        </PrimaryGameButton>
        <style jsx>{`
          .mb-sexit {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: var(--mb-space-4);
            padding: var(--mb-space-5);
            text-align: center;
          }
        `}</style>
      </main>
    );
  }

  if (!view) {
    return (
      <main className="mb-sloading">
        <ConnectionBanner visible={connection === 'offline'} />
        <p role="status">Menyambung ke ruang…</p>
        <style jsx>{`
          .mb-sloading {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: var(--mb-space-3);
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="mb-sgame">
      <ConnectionBanner visible={connection === 'offline'} />
      <div className="mb-sgame-head">
        <StudentBackButton
          phase={
            view.phase === 'question' ||
            view.phase === 'closed' ||
            view.phase === 'paused' ||
            view.phase === 'discussion'
              ? 'active'
              : 'idle'
          }
        />
        <SessionHeader
          mode={view.gameMode}
          packageName={view.contentTitle}
          roundLabel={
            view.phase === 'question' || isReveal(view)
              ? `${view.roundIndex + 1} dari ${view.totalRounds}`
              : null
          }
        />
      </div>
      {isPreRound(view) ? (
        <StudentLobby view={view} />
      ) : view.phase === 'question' ? (
        <StudentQuestion key={view.roundId} view={view} sessionId={sessionId} />
      ) : view.phase === 'closed' || view.phase === 'paused' ? (
        <StudentWaiting
          title={view.phase === 'closed' ? 'Jawaban ditutup' : 'Permainan dijeda'}
          sub="Tunggu Pak/Bu Guru melanjutkan…"
        />
      ) : isReveal(view) ? (
        <StudentReveal view={view} />
      ) : null}
      <style jsx>{`
        .mb-sgame-head {
          display: flex;
          align-items: center;
          gap: var(--mb-space-3);
          width: 100%;
          max-width: 640px;
          margin: 0 auto;
          padding: var(--mb-space-3) var(--mb-space-4) 0;
        }
        .mb-sgame-head :global(.mb-session-header) { flex: 1; min-width: 0; }
      `}</style>
    </main>
  );
}

// ─── Lobby (§20) — nama + regu + tujuan + anticipation ──────

function StudentLobby({
  view,
}: {
  view: StudentPreRoundView;
}) {
  const isJelajah = view.gameMode === 'jelajah-kata';
  return (
    <section className="mb-slobby mb-fade-in">
      <span className="mb-wait-orb" aria-hidden />
      <h1 className="mb-display mb-slobby-title">Halo, {view.displayName}!</h1>
      <p className="mb-slobby-content">
        <strong>{view.contentTitle}</strong> · {view.totalRounds} soal
      </p>
      <p className="mb-slobby-mode">
        Kamu ikut <strong>{isJelajah ? 'Jelajah Kata' : 'Kota Cahaya'}</strong>
      </p>
      {view.team ? (
        <p className="mb-slobby-team">
          Kamu berada di{' '}
          <span
            className="mb-team-chip mb-slobby-teamchip"
            style={{ '--mb-tc': TEAM_COLOR_VAR[view.team.id] ?? 'var(--mb-primary)' } as React.CSSProperties}
          >
            Regu {view.team.name}
          </span>
        </p>
      ) : null}
      <p className="mb-slobby-objective">
        {isJelajah
          ? view.team
            ? `Jawab dengan tepat untuk membantu Regu ${view.team.name} maju.`
            : 'Jawab dengan tepat untuk membantu regumu maju.'
          : 'Kita akan menyalakan Kota Cahaya bersama.'}
      </p>
      <ParticipantCount count={view.participantCount} />
      <p className="mb-slobby-wait" role="status">
        Menunggu Pak/Bu Guru memulai permainan…
      </p>
      <style jsx>{`
        .mb-slobby {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--mb-space-3);
          padding: var(--mb-space-6) var(--mb-space-5);
          text-align: center;
        }
        .mb-slobby-title { margin: 0; font-size: 1.8rem; }
        /* Identitas konten (mis. "Antonim · 10 soal") — konteks ringan,
           bukan pengaturan: siswa tahu sedang bermain apa. */
        .mb-slobby-content {
          margin: 0;
          color: var(--mb-text-secondary);
          font-size: 0.95rem;
        }
        .mb-slobby-content strong { color: var(--mb-text-primary); }
        .mb-slobby-mode { margin: 0; color: var(--mb-text-secondary); }
        .mb-slobby-mode strong { color: var(--mb-text-primary); }
        .mb-slobby-team { margin: 0; color: var(--mb-text-secondary); }
        .mb-slobby-teamchip { transform: scale(1.15); }
        .mb-slobby-objective {
          margin: 0;
          max-width: 34ch;
          color: var(--mb-text-secondary);
          line-height: 1.55;
        }
        .mb-slobby-wait { margin: var(--mb-space-2) 0 0; color: var(--mb-text-secondary); font-style: italic; }
      `}</style>
    </section>
  );
}

// ─── Waiting card (closed/paused — wait hero) ───────────────

function StudentWaiting({ title, sub }: { title: string; sub: string }) {
  return (
    <section className="mb-wait mb-fade-in" role="status">
      <span className="mb-wait-orb" aria-hidden />
      <h2 className="mb-display">{title}</h2>
      <p>{sub}</p>
    </section>
  );
}

// ─── Question (§21) — keterbacaan prioritas absolut ─────────

function StudentQuestion({
  view,
  sessionId,
}: {
  view: StudentSessionView & { phase: 'question' };
  sessionId: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittedRef = useRef(false);

  // View server adalah sumber kebenaran: kalau ownAnswerStatus sudah
  // "saved" (mis. submit sukses lalu refetch), tandai tersimpan.
  useEffect(() => {
    if (view.ownAnswerStatus === 'saved') setSaved(true);
  }, [view.ownAnswerStatus]);

  async function submit(optionId: string) {
    if (submittedRef.current || busy) return;
    submittedRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await submitAnswer(sessionId, {
        roundId: view.roundId,
        selectedOptionId: optionId,
        submissionId: newSubmissionId(),
      });
      setSelected(optionId);
      setSaved(true);
    } catch (e) {
      submittedRef.current = false;
      if (e instanceof MbApiError && e.code === 'ANSWER_ALREADY_EXISTS') {
        setSaved(true);
      } else {
        setError(e instanceof MbApiError ? e.message : 'Gagal mengirim jawaban. Coba lagi.');
      }
    } finally {
      setBusy(false);
    }
  }

  const letters = useMemo(
    () => view.question.options.map((_, i) => LETTERS[i] ?? '?'),
    [view.question.options],
  );

  return (
    <section className="mb-sq mb-fade-in">
      <div className="mb-sq-progress">
        <span className="mb-number">
          Soal {view.roundIndex + 1} dari {view.totalRounds}
        </span>
        <div
          className="mb-sq-bar"
          role="progressbar"
          aria-valuenow={view.roundIndex + 1}
          aria-valuemin={1}
          aria-valuemax={view.totalRounds}
        >
          <div
            className="mb-sq-bar-fill mb-progress-transition"
            style={{ width: `${((view.roundIndex + 1) / view.totalRounds) * 100}%` }}
          />
        </div>
      </div>

      <QuestionCard question={view.question} />

      {saved ? (
        <div className="mb-saved mb-entrance" role="status">
          <strong>Jawaban tersimpan</strong>
          <span>Tunggu putaran selesai.</span>
        </div>
      ) : (
        <div className="mb-sq-answers">
          {view.question.options.map((o, i) => (
            <AnswerOption
              key={o.id}
              letter={letters[i]}
              text={o.text}
              selected={selected === o.id}
              disabled={busy}
              onSelect={() => void submit(o.id)}
            />
          ))}
        </div>
      )}

      {error ? (
        <p role="alert" className="mb-sq-error">{error}</p>
      ) : null}

      <style jsx>{`
        .mb-sq {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--mb-space-4);
          padding: var(--mb-space-4);
          width: 100%;
          max-width: 640px;
          margin: 0 auto;
        }
        .mb-sq-progress {
          display: flex;
          align-items: center;
          gap: var(--mb-space-3);
          color: var(--mb-text-secondary);
          font-weight: 700;
          font-size: 0.9rem;
        }
        .mb-sq-bar {
          flex: 1;
          height: 8px;
          background: rgba(255, 255, 255, 0.12);
          border-radius: var(--mb-radius-pill);
          overflow: hidden;
        }
        .mb-sq-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--mb-primary-strong), var(--mb-primary));
          border-radius: var(--mb-radius-pill);
        }
        .mb-sq-answers {
          display: flex;
          flex-direction: column;
          gap: var(--mb-space-3);
          width: 100%;
        }
        .mb-sq-error {
          color: var(--mb-danger);
          font-weight: 600;
          text-align: center;
          margin: 0;
        }
      `}</style>
    </section>
  );
}

// ─── Reveal / discussion / summary (§27/§28) ────────────────

function StudentReveal({
  view,
}: {
  view: StudentRevealViewT;
}) {
  const isSummary = view.phase !== 'discussion';
  const r = view.revealedRound;
  const myCorrect = view.ownAnswerIsCorrect;
  return (
    <section className="mb-sreveal mb-fade-in">
      <header className="mb-sreveal-head">
        <span className="mb-number">
          Soal {view.roundIndex + 1} dari {view.totalRounds}
        </span>
        <span className={`mb-sreveal-verdict ${myCorrect ? 'mb-v-ok' : 'mb-v-no'}`}>
          {myCorrect ? 'Jawabanmu benar' : 'Belum tepat'}
        </span>
      </header>

      <QuestionCard question={r.question} />

      <div className="mb-sreveal-card mb-reading mb-entrance">
        <p className="mb-sreveal-correct">
          Jawaban benar:{' '}
          <strong>
            {r.question.options.find((o) => o.id === r.correctOptionId)?.text ?? '—'}
          </strong>
        </p>
        {r.explanation ? <p className="mb-sreveal-explain">{r.explanation}</p> : null}
        <div className="mb-sreveal-dist">
          {r.question.options.map((o) => (
            <span key={o.id} className={`mb-dist-chip ${o.id === r.correctOptionId ? 'mb-dist-correct' : ''}`}>
              {o.text}: <strong className="mb-number">{r.optionCounts[o.id] ?? 0}</strong>
            </span>
          ))}
        </div>
      </div>

      {!isSummary ? (
        <p className="mb-sreveal-next" role="status">
          Tunggu Pak/Bu Guru melanjutkan ke soal berikutnya…
        </p>
      ) : (
        <div className="mb-sreveal-endbox mb-entrance">
          <span className="mb-endflag" aria-hidden>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 22V4" />
              <path d="M4 4c3-2 6 2 9 0s5-1 7 0v9c-2-1-4-2-7 0s-6 2-9 0" />
            </svg>
          </span>
          <h3 className="mb-display">Permainan selesai</h3>
          {view.team && view.gameProgress.teamProgress[view.team.id] !== undefined ? (
            <p>
              Regu <strong>{view.team.name}</strong> mencapai{' '}
              <strong className="mb-number">
                {Math.round(Math.max(0, Math.min(100, view.gameProgress.teamProgress[view.team.id])))}%
              </strong>{' '}
              perjalanan!
            </p>
          ) : (
            <p>Kerja bagus, kelas sudah berjuang bersama!</p>
          )}
          <p className="mb-sreveal-feel">Terima kasih sudah bermain bersama!</p>
          <StudentBackButton phase="idle" />
        </div>
      )}

      <style jsx>{`
        .mb-sreveal {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--mb-space-4);
          padding: var(--mb-space-4);
          width: 100%;
          max-width: 640px;
          margin: 0 auto;
        }
        .mb-sreveal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: var(--mb-text-secondary);
          font-weight: 700;
        }
        .mb-sreveal-verdict { padding: 5px 14px; border-radius: var(--mb-radius-pill); font-weight: 800; }
        .mb-v-ok { background: var(--mb-success-soft); color: var(--mb-success); border: 1.5px solid var(--mb-success); }
        .mb-v-no { background: var(--mb-danger-soft); color: var(--mb-danger); border: 1.5px solid var(--mb-danger); }
        .mb-sreveal-card { padding: var(--mb-space-4) var(--mb-space-5); }
        .mb-sreveal-correct { margin: 0 0 var(--mb-space-2); color: var(--mb-text-light-secondary); }
        .mb-sreveal-correct strong { color: var(--mb-success); font-size: 1.1rem; }
        .mb-sreveal-explain { margin: 0 0 var(--mb-space-3); line-height: 1.6; }
        .mb-sreveal-dist { display: flex; flex-wrap: wrap; gap: var(--mb-space-2); }
        .mb-sreveal-next {
          text-align: center;
          color: var(--mb-text-secondary);
          font-style: italic;
          margin: 0;
        }
        .mb-sreveal-endbox {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--mb-space-2);
          padding: var(--mb-space-6) var(--mb-space-5);
          border-radius: var(--mb-radius-lg);
          background: var(--mb-accent-soft);
          border: 2px solid var(--mb-accent);
          text-align: center;
        }
        .mb-endflag { color: var(--mb-accent); }
        .mb-sreveal-endbox h3 { margin: 0; font-size: 1.35rem; }
        .mb-sreveal-endbox p { margin: 0; }
        .mb-sreveal-feel { color: var(--mb-text-secondary); font-style: italic; }
      `}</style>
    </section>
  );
}
