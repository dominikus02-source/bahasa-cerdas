"use client";
// ─── Student Game Client (Tahap 7 §9/§11/§15/§16/§20/§22) ────
// Flow siswa sangat fokus: lobby tunggu → soal → jawab tersimpan →
// closed → pembahasan → hasil. TANPA skor/leaderboard/answer key
// sebelum reveal (view server tidak membawanya — bukan disensor UI).
// State SELALU dari GET authoritative (useSessionView); payload
// realtime hanya sinyal (§21). Credential dari credential-store —
// tidak pernah tampil di DOM/URL/log (§8).

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
import { QuestionCard } from '@/components/main-bersama/shared/QuestionCard';
import { AnswerOption } from '@/components/main-bersama/shared/AnswerOption';
import { CityProgress } from '@/components/main-bersama/shared/CityProgress';
import { ConnectionBanner } from '@/components/main-bersama/shared/ConnectionBanner';
import { ParticipantCount } from '@/components/main-bersama/shared/ParticipantCount';
import { PrimaryGameButton } from '@/components/main-bersama/shared/PrimaryGameButton';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

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
      <SessionHeader mode={view.gameMode} />
      {isPreRound(view) ? (
        <StudentLobby view={view} />
      ) : view.phase === 'question' ? (
        <StudentQuestion key={view.roundId} view={view} sessionId={sessionId} />
      ) : view.phase === 'closed' || view.phase === 'paused' ? (
        <StudentWaiting
          title={view.phase === 'closed' ? 'Jawaban ditutup.' : 'Permainan dijeda.'}
          sub="Tunggu Pak/Bu Guru melanjutkan…"
        />
      ) : isReveal(view) ? (
        <StudentReveal view={view} />
      ) : null}
    </main>
  );
}

// ─── Lobby (§9) ─────────────────────────────────────────────

function StudentLobby({
  view,
}: {
  view: StudentPreRoundView;
}) {
  return (
    <section className="mb-slobby mb-fade-in">
      <h1 className="mb-display mb-slobby-title">Halo, {view.displayName}!</h1>
      <p className="mb-slobby-mode">
        Mode: <strong>{view.gameMode === 'jelajah-kata' ? 'Jelajah Kata' : 'Kota Cahaya'}</strong>
      </p>
      {view.team ? (
        <p className="mb-slobby-team">
          Kamu di <strong>Regu {view.team.name}</strong> {view.team.symbol}
        </p>
      ) : null}
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
          gap: var(--mb-space-4);
          padding: var(--mb-space-5);
          text-align: center;
        }
        .mb-slobby-title { margin: 0; font-size: 1.7rem; }
        .mb-slobby-mode, .mb-slobby-team { margin: 0; color: var(--mb-text-secondary); }
        .mb-slobby-team strong { color: var(--mb-accent); }
        .mb-slobby-wait { color: var(--mb-text-secondary); font-style: italic; }
      `}</style>
    </section>
  );
}

// ─── Waiting card (closed/paused §15) ───────────────────────

function StudentWaiting({ title, sub }: { title: string; sub: string }) {
  return (
    <section className="mb-swait mb-fade-in" role="status">
      <h2 className="mb-display">{title}</h2>
      <p>{sub}</p>
      <style jsx>{`
        .mb-swait {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--mb-space-2);
          padding: var(--mb-space-5);
          text-align: center;
        }
        .mb-swait p { color: var(--mb-text-secondary); }
      `}</style>
    </section>
  );
}

// ─── Question (§11/§12/§28) ─────────────────────────────────

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
        <div className="mb-sq-saved mb-entrance" role="status">
          <strong>Jawaban tersimpan.</strong>
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
          background: var(--mb-primary);
          border-radius: var(--mb-radius-pill);
        }
        .mb-sq-answers {
          display: flex;
          flex-direction: column;
          gap: var(--mb-space-3);
          width: 100%;
        }
        .mb-sq-saved {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: var(--mb-space-5);
          border-radius: var(--mb-radius-lg);
          background: var(--mb-success-soft);
          border: 2px solid var(--mb-success);
          color: var(--mb-text-primary);
          text-align: center;
        }
        .mb-sq-saved span { color: var(--mb-text-secondary); }
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

// ─── Reveal / discussion / summary (§16/§19/§20) ────────────

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
          {myCorrect ? '✓ Jawabanmu benar!' : '✗ Belum tepat'}
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
          <h3 className="mb-display">Permainan selesai 🎉</h3>
          {view.team && view.gameProgress.teamProgress[view.team.id] !== undefined ? (
            <p>
              Regu <strong>{view.team.name}</strong> {view.team.symbol} mencapai{' '}
              <strong className="mb-number">
                {Math.round(Math.max(0, Math.min(100, view.gameProgress.teamProgress[view.team.id])))}%
              </strong>{' '}
              perjalanan!
            </p>
          ) : (
            <p>Kerja bagus, kelas sudah berjuang bersama!</p>
          )}
          <p className="mb-sreveal-feel">Terima kasih sudah bermain bersama!</p>
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
        .mb-sreveal-verdict { padding: 4px 12px; border-radius: var(--mb-radius-pill); }
        .mb-v-ok { background: var(--mb-success-soft); color: var(--mb-success); }
        .mb-v-no { background: var(--mb-danger-soft); color: var(--mb-danger); }
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
          padding: var(--mb-space-5);
          border-radius: var(--mb-radius-lg);
          background: var(--mb-accent-soft);
          border: 2px solid var(--mb-accent);
          text-align: center;
        }
        .mb-sreveal-endbox h3 { margin: 0; font-size: 1.3rem; }
        .mb-sreveal-endbox p { margin: 0; }
        .mb-sreveal-feel { color: var(--mb-text-secondary); font-style: italic; }
      `}</style>
    </section>
  );
}
