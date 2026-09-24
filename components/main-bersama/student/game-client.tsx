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
import { TeamBadge } from '@/components/main-bersama/art/shared/TeamBadge';
import { TeamMascot } from '@/components/main-bersama/art/registry';
import { KotaScene } from '@/components/main-bersama/art/kota/KotaScene';
import { QuestionCard } from '@/components/main-bersama/shared/QuestionCard';
import { AnswerOption } from '@/components/main-bersama/shared/AnswerOption';
import { ConnectionBanner } from '@/components/main-bersama/shared/ConnectionBanner';
import { ParticipantCount } from '@/components/main-bersama/shared/ParticipantCount';
import { PrimaryGameButton } from '@/components/main-bersama/shared/PrimaryGameButton';
import { RoundCountdown } from '@/components/main-bersama/shared/RoundCountdown';
import { StudentLandscapeControl } from '@/components/main-bersama/student/StudentLandscapeControl';

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
type StudentDiscussionViewT = StudentSessionView & { phase: 'discussion' };
type StudentFinishViewT = StudentSessionView & { phase: 'summary' | 'ended' };
function isPreRound(v: StudentSessionView): v is StudentPreRoundView {
  return v.phase === 'preparing' || v.phase === 'lobby';
}
function isDiscussion(v: StudentSessionView): v is StudentDiscussionViewT {
  return v.phase === 'discussion';
}
function isFinish(v: StudentSessionView): v is StudentFinishViewT {
  return v.phase === 'summary' || v.phase === 'ended';
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
    { onError, pollIntervalMs: 1_500, debounceMs: 40 },
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
      {!isFinish(view) ? (
        <div className="mb-sgame-head">
          <StudentBackButton
            compact
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
              view.phase === 'question' || isDiscussion(view)
                ? `${view.roundIndex + 1} dari ${view.totalRounds}`
                : null
            }
          />
          <StudentLandscapeControl />
        </div>
      ) : null}
      {isPreRound(view) ? (
        <StudentLobby view={view} />
      ) : view.phase === 'question' ? (
        <StudentQuestion key={view.roundId} view={view} sessionId={sessionId} />
      ) : view.phase === 'closed' || view.phase === 'paused' ? (
        <StudentWaiting
          title={view.phase === 'closed' ? 'Jawaban ditutup' : 'Permainan dijeda'}
          sub="Tunggu Pak/Bu Guru melanjutkan…"
        />
      ) : isDiscussion(view) ? (
        <StudentReveal view={view} />
      ) : isFinish(view) ? (
        <StudentFinish view={view} />
      ) : null}
      <style jsx>{`
        .mb-sgame {
          position: relative;
          flex: 1;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
          background:
            radial-gradient(520px 260px at 92% -40px, rgba(20, 184, 166, .18), transparent 72%),
            radial-gradient(420px 300px at -80px 92%, rgba(139, 124, 246, .15), transparent 72%),
            linear-gradient(180deg, #071829 0%, #081421 100%);
        }
        .mb-sgame::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: .14;
          background-image:
            linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
          background-size: 32px 32px;
          mask-image: linear-gradient(to bottom, #000, transparent 82%);
        }
        .mb-sgame-head {
          position: relative;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 10px;
          width: min(100%, 820px);
          margin: 0 auto;
          padding: 12px 14px 0;
        }
        .mb-sgame-head :global(.mb-session-header) {
          flex: 1;
          min-width: 0;
          border: 1px solid rgba(255,255,255,.1);
          background: rgba(11, 32, 49, .72);
          box-shadow: 0 12px 28px rgba(0,0,0,.14);
          backdrop-filter: blur(12px);
        }
        @media (min-width: 700px) {
          .mb-sgame-head { padding-top: 18px; }
        }
        @media (orientation: landscape) and (max-height: 760px) and (min-width: 640px) {
          .mb-sgame-head {
            width: min(100%, 1120px);
            padding: 8px 18px 0;
          }
        }
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
      <div className="mb-slobby-card">
        <div className="mb-slobby-live" role="status">
          <i aria-hidden />
          KAMU SUDAH MASUK
        </div>

        <div className="mb-slobby-art" aria-hidden>
          {isJelajah && view.team ? (
            <TeamMascot teamId={view.team.id} pose="ready" size={112} eager />
          ) : (
            <KotaScene unlocked={[]} mini />
          )}
        </div>

        <p className="mb-slobby-hello">Halo,</p>
        <h1 className="mb-display mb-slobby-title">{view.displayName}!</h1>
        <p className="mb-slobby-content">
          <strong>{view.contentTitle}</strong>
          <span aria-hidden> · </span>
          <span>{view.totalRounds} soal</span>
        </p>

        <div className="mb-slobby-modecard">
          <span className="mb-slobby-mode-label">MODE PERMAINAN</span>
          <strong>{isJelajah ? 'Jelajah Kata' : 'Kota Cahaya'}</strong>
          {view.team ? (
            <span
              className="mb-team-chip mb-slobby-teamchip"
              style={{ '--mb-tc': TEAM_COLOR_VAR[view.team.id] ?? 'var(--mb-primary)' } as React.CSSProperties}
            >
              <TeamBadge teamId={view.team.id} size={20} />
              Regu {view.team.name}
            </span>
          ) : null}
        </div>

        <p className="mb-slobby-objective">
          {isJelajah
            ? view.team
              ? `Jawab tepat dan bantu Regu ${view.team.name} melaju sampai garis akhir.`
              : 'Jawab tepat dan bantu regumu melaju sampai garis akhir.'
            : 'Jawab bersama teman sekelas untuk menyalakan Kota Cahaya.'}
        </p>

        <div className="mb-slobby-bottom">
          <ParticipantCount count={view.participantCount} />
          <div className="mb-slobby-wait" role="status">
            <span className="mb-slobby-dots" aria-hidden><i /><i /><i /></span>
            Menunggu Pak/Bu Guru memulai permainan
          </div>
        </div>
      </div>

      <style jsx>{`
        .mb-slobby {
          position: relative;
          z-index: 1;
          flex: 1;
          width: min(100%, 720px);
          margin: 0 auto;
          display: grid;
          place-items: center;
          padding: 18px 14px 28px;
        }
        .mb-slobby-card {
          position: relative;
          width: 100%;
          min-height: min(640px, calc(100dvh - 112px));
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          overflow: hidden;
          padding: 32px 20px 26px;
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,.11);
          background:
            radial-gradient(300px 180px at 50% 10%, rgba(45, 212, 191, .16), transparent 72%),
            linear-gradient(160deg, rgba(17, 45, 65, .92), rgba(8, 24, 38, .94));
          box-shadow: 0 28px 64px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.05);
          text-align: center;
        }
        .mb-slobby-card::after {
          content: "";
          position: absolute;
          width: 280px;
          height: 280px;
          right: -160px;
          bottom: -170px;
          border-radius: 50%;
          border: 44px solid rgba(255,201,77,.055);
          pointer-events: none;
        }
        .mb-slobby-live {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 32px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(18, 78, 78, .38);
          border: 1px solid rgba(102, 229, 215, .2);
          color: #aef4eb;
          font-size: .7rem;
          font-weight: 900;
          letter-spacing: .12em;
        }
        .mb-slobby-live i {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #4adea8;
          box-shadow: 0 0 0 5px rgba(74,222,168,.09), 0 0 14px rgba(74,222,168,.55);
        }
        .mb-slobby-art {
          width: min(100%, 310px);
          height: 150px;
          display: grid;
          place-items: center;
          margin: 2px 0 0;
        }
        .mb-slobby-art :global(.mb-kota-scene) {
          width: 100%;
          max-height: 145px;
          filter: drop-shadow(0 14px 24px rgba(0,0,0,.25));
        }
        .mb-slobby-hello {
          margin: 2px 0 -5px;
          color: #9fb5c8;
          font-weight: 750;
        }
        .mb-slobby-title {
          margin: 0;
          color: #fff;
          font-size: clamp(2rem, 8vw, 3rem);
          line-height: 1;
          text-shadow: 0 8px 24px rgba(0,0,0,.28);
        }
        .mb-slobby-content {
          margin: 0;
          color: #9fb5c8;
          font-size: .92rem;
        }
        .mb-slobby-content strong { color: #eef8ff; }
        .mb-slobby-modecard {
          width: min(100%, 390px);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 8px 10px;
          margin-top: 6px;
          padding: 12px 14px;
          border-radius: 18px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.09);
        }
        .mb-slobby-modecard strong {
          color: #fff;
          font-size: 1.03rem;
        }
        .mb-slobby-mode-label {
          width: 100%;
          color: #6fe1d6;
          font-size: .63rem;
          font-weight: 900;
          letter-spacing: .14em;
        }
        .mb-slobby-teamchip { transform: none; }
        .mb-slobby-objective {
          margin: 2px 0 0;
          max-width: 36ch;
          color: #b4c5d3;
          line-height: 1.55;
          font-size: .92rem;
        }
        .mb-slobby-bottom {
          width: min(100%, 430px);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 11px;
          margin-top: 8px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,.075);
        }
        .mb-slobby-wait {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #91a7b9;
          font-size: .84rem;
          font-weight: 650;
        }
        .mb-slobby-dots {
          display: inline-flex;
          gap: 3px;
        }
        .mb-slobby-dots i {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #62d8ce;
        }
        @media (prefers-reduced-motion: no-preference) {
          .mb-slobby-dots i { animation: mb-student-dot 1.2s ease-in-out infinite; }
          .mb-slobby-dots i:nth-child(2) { animation-delay: .16s; }
          .mb-slobby-dots i:nth-child(3) { animation-delay: .32s; }
          @keyframes mb-student-dot {
            0%, 100% { opacity: .35; transform: translateY(0); }
            50% { opacity: 1; transform: translateY(-3px); }
          }
        }
        @media (max-height: 720px) {
          .mb-slobby-card { min-height: 0; padding-block: 22px; }
          .mb-slobby-art { height: 116px; }
          .mb-slobby-art :global(.mb-kota-scene) { max-height: 112px; }
        }
      `}</style>
    </section>
  );
}

// ─── Waiting card (closed/paused — wait hero) ───────────────

function StudentWaiting({ title, sub }: { title: string; sub: string }) {
  return (
    <section className="mb-swait mb-fade-in" role="status">
      <div className="mb-swait-card">
        <div className="mb-swait-ring" aria-hidden><span /></div>
        <span className="mb-swait-kicker">PUTARAN DIKUNCI</span>
        <h2 className="mb-display">{title}</h2>
        <p>{sub}</p>
        <div className="mb-swait-line" aria-hidden><i /></div>
      </div>
      <style jsx>{`
        .mb-swait {
          position: relative;
          z-index: 1;
          flex: 1;
          width: min(100%, 720px);
          margin: 0 auto;
          display: grid;
          place-items: center;
          padding: 20px 14px 32px;
        }
        .mb-swait-card {
          width: min(100%, 470px);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 34px 24px;
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,.1);
          background: linear-gradient(160deg, rgba(18, 45, 64, .92), rgba(9, 27, 41, .94));
          box-shadow: 0 24px 54px rgba(0,0,0,.22);
          text-align: center;
        }
        .mb-swait-ring {
          width: 86px;
          height: 86px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          border: 1px solid rgba(98, 216, 206, .24);
          background: radial-gradient(circle, rgba(20,184,166,.22), rgba(20,184,166,.04) 62%, transparent 64%);
          box-shadow: 0 0 38px rgba(20,184,166,.12);
        }
        .mb-swait-ring span {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 4px solid rgba(255,255,255,.12);
          border-top-color: #61ddd2;
        }
        .mb-swait-kicker {
          color: #6fe1d6;
          font-size: .67rem;
          font-weight: 900;
          letter-spacing: .16em;
        }
        .mb-swait h2 {
          margin: 0;
          color: #fff;
          font-size: 1.85rem;
        }
        .mb-swait p {
          margin: 0;
          color: #9eb2c3;
          line-height: 1.5;
        }
        .mb-swait-line {
          width: 120px;
          height: 4px;
          overflow: hidden;
          margin-top: 8px;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
        }
        .mb-swait-line i {
          display: block;
          width: 44px;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #33c7b9, #77e8dd);
        }
        @media (prefers-reduced-motion: no-preference) {
          .mb-swait-ring span { animation: mb-student-spin 1s linear infinite; }
          .mb-swait-line i { animation: mb-student-wait 1.5s ease-in-out infinite alternate; }
          @keyframes mb-student-spin { to { transform: rotate(360deg); } }
          @keyframes mb-student-wait { from { transform: translateX(0); } to { transform: translateX(76px); } }
        }
      `}</style>
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
    setSelected(optionId);
    try {
      await submitAnswer(sessionId, {
        roundId: view.roundId,
        selectedOptionId: optionId,
        submissionId: newSubmissionId(),
      });
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
        {view.team ? (
          <span className="mb-sq-team" title={`Regu ${view.team.name}`}>
            <TeamBadge teamId={view.team.id} size={24} />
          </span>
        ) : null}
        <span className="mb-number">
          Soal {view.roundIndex + 1} dari {view.totalRounds}
        </span>
        <RoundCountdown
          closesAt={view.closesAt}
          serverTime={view.serverTime}
          compact
          complete={saved || view.ownAnswerStatus === 'saved'}
        />
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

      <div className="mb-sq-cardwrap">
        <QuestionCard question={view.question} />
      </div>

      {saved ? (
        <div className="mb-saved mb-saved-student mb-entrance" role="status">
          <span className="mb-saved-check" aria-hidden>✓</span>
          <strong>Jawaban terkunci!</strong>
          <span>Jawabanmu sudah tersimpan. Tunggu putaran selesai.</span>
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
          position: relative;
          z-index: 1;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 14px 14px 30px;
          width: min(100%, 720px);
          margin: 0 auto;
        }
        .mb-sq-progress {
          display: grid;
          grid-template-columns: auto auto 1fr;
          align-items: center;
          gap: 9px 10px;
          padding: 12px 14px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.09);
          background: rgba(12, 33, 49, .72);
          box-shadow: 0 10px 26px rgba(0,0,0,.12);
          color: #abc0cf;
          font-weight: 760;
          font-size: .82rem;
          backdrop-filter: blur(9px);
        }
        .mb-sq-progress :global(.mb-round-countdown) {
          justify-self: end;
        }
        .mb-sq-team {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border-radius: 11px;
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(255,255,255,.08);
        }
        .mb-sq-bar {
          grid-column: 1 / -1;
          height: 7px;
          background: rgba(255,255,255,.09);
          border-radius: 999px;
          overflow: hidden;
        }
        .mb-sq-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #1fb9a8, #69e0d4);
          border-radius: 999px;
          box-shadow: 0 0 16px rgba(54, 211, 194, .34);
        }
        .mb-sq-cardwrap {
          border-radius: 25px;
          box-shadow: 0 18px 42px rgba(0,0,0,.16);
        }
        .mb-sq-cardwrap :global(.mb-qcard) {
          border-radius: 25px;
        }
        .mb-sq-answers {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        }
        .mb-sq-answers :global(.mb-answer) {
          min-height: 66px;
          border-radius: 18px;
          box-shadow: 0 8px 18px rgba(0,0,0,.09);
        }
        .mb-saved-student {
          min-height: 142px;
          justify-content: center;
          border-radius: 24px;
          border-color: rgba(58, 220, 160, .7);
          background:
            radial-gradient(circle at 50% 0%, rgba(72, 225, 171, .18), transparent 62%),
            rgba(10, 47, 43, .76);
          box-shadow: 0 16px 38px rgba(0,0,0,.15);
        }
        .mb-saved-student strong {
          color: #8ff0c7;
          font-size: 1.1rem;
        }
        .mb-saved-student span:last-child {
          color: #a8c6bc;
          font-size: .88rem;
        }
        .mb-saved-check {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          margin-bottom: 2px;
          border-radius: 50%;
          background: #44d49b;
          color: #06261d !important;
          font-weight: 950;
          font-size: 1.3rem !important;
          box-shadow: 0 10px 24px rgba(68,212,155,.22);
        }
        .mb-sq-error {
          color: #ffb9b9;
          font-weight: 650;
          text-align: center;
          margin: 0;
        }
        @media (orientation: landscape) and (max-height: 760px) and (min-width: 640px) {
          .mb-sq {
            width: min(100%, 1120px);
            display: grid;
            grid-template-columns: minmax(0, 1.08fr) minmax(320px, .92fr);
            grid-template-rows: auto minmax(0, 1fr);
            gap: 10px 16px;
            padding: 10px 18px 18px;
          }
          .mb-sq-progress {
            grid-column: 1 / -1;
          }
          .mb-sq-cardwrap {
            grid-column: 1;
            grid-row: 2;
            align-self: start;
            max-height: calc(100dvh - 116px);
            overflow-y: auto;
            overscroll-behavior: contain;
            scrollbar-gutter: stable;
          }
          .mb-sq-answers {
            grid-column: 2;
            grid-row: 2;
            align-self: start;
            max-height: calc(100dvh - 116px);
            overflow-y: auto;
            overscroll-behavior: contain;
            padding-right: 2px;
          }
          .mb-saved-student {
            grid-column: 2;
            grid-row: 2;
            align-self: start;
          }
          .mb-sq-error {
            grid-column: 2;
          }
          .mb-sq-answers :global(.mb-answer) {
            min-height: 58px;
          }
        }
        @media (min-width: 700px) {
          .mb-sq { padding-top: 18px; }
          .mb-sq-answers { gap: 12px; }
        }
      `}</style>
    </section>
  );
}

// ─── Reveal / discussion / summary (§27/§28) ────────────────

function StudentReveal({
  view,
}: {
  view: StudentDiscussionViewT;
}) {
  const r = view.revealedRound;
  const myCorrect = view.ownAnswerIsCorrect;
  const isLastRound = view.roundIndex + 1 >= view.totalRounds;

  return (
    <section className="mb-sreveal mb-fade-in">
      <div className={`mb-sreveal-verdict-card ${myCorrect ? 'mb-v-ok' : 'mb-v-no'}`}>
        <span className="mb-sreveal-verdict-icon" aria-hidden>
          {myCorrect ? '✓' : '•'}
        </span>
        <div>
          <span className="mb-sreveal-kicker">HASIL JAWABANMU</span>
          <h2 className="mb-display">{myCorrect ? 'Mantap, benar!' : 'Belum tepat'}</h2>
        </div>
        <span className="mb-number mb-sreveal-round">
          {view.roundIndex + 1}/{view.totalRounds}
        </span>
      </div>

      <QuestionCard question={r.question} />

      <div className="mb-sreveal-card mb-reading mb-entrance">
        <span className="mb-sreveal-answer-label">JAWABAN BENAR</span>
        <p className="mb-sreveal-correct">
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

      <div className="mb-sreveal-next" role="status">
        <span className="mb-sreveal-next-dot" aria-hidden />
        {isLastRound
          ? 'Soal terakhir selesai. Tunggu hasil akhir dari Pak/Bu Guru…'
          : 'Tunggu Pak/Bu Guru melanjutkan ke soal berikutnya…'}
      </div>

      <style jsx>{`
        .mb-sreveal {
          position: relative;
          z-index: 1;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 14px 14px 30px;
          width: min(100%, 720px);
          margin: 0 auto;
        }
        .mb-sreveal-verdict-card {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,.1);
          box-shadow: 0 12px 28px rgba(0,0,0,.12);
        }
        .mb-v-ok {
          background: linear-gradient(135deg, rgba(21, 92, 69, .72), rgba(12, 45, 43, .72));
        }
        .mb-v-no {
          background: linear-gradient(135deg, rgba(98, 54, 61, .67), rgba(53, 34, 44, .72));
        }
        .mb-sreveal-verdict-icon {
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: rgba(255,255,255,.1);
          color: #fff;
          font-size: 1.3rem;
          font-weight: 950;
        }
        .mb-sreveal-kicker {
          display: block;
          margin-bottom: 3px;
          color: rgba(255,255,255,.62);
          font-size: .62rem;
          font-weight: 900;
          letter-spacing: .14em;
        }
        .mb-sreveal-verdict-card h2 {
          margin: 0;
          color: #fff;
          font-size: 1.32rem;
        }
        .mb-sreveal-round {
          color: rgba(255,255,255,.68);
          font-weight: 800;
        }
        .mb-sreveal-card {
          padding: 18px;
          border-radius: 24px;
          box-shadow: 0 16px 36px rgba(0,0,0,.12);
        }
        .mb-sreveal-answer-label {
          display: block;
          margin-bottom: 5px;
          color: #26866e;
          font-size: .66rem;
          font-weight: 900;
          letter-spacing: .12em;
        }
        .mb-sreveal-correct {
          margin: 0 0 10px;
        }
        .mb-sreveal-correct strong {
          color: #067a5b;
          font-size: 1.15rem;
        }
        .mb-sreveal-explain {
          margin: 0 0 12px;
          line-height: 1.58;
          color: var(--mb-text-light-secondary);
        }
        .mb-sreveal-dist {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }
        .mb-sreveal-next {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 48px;
          padding: 10px 14px;
          border-radius: 16px;
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(255,255,255,.07);
          color: #9fb4c5;
          font-size: .84rem;
          font-weight: 650;
          text-align: center;
        }
        .mb-sreveal-next-dot {
          width: 7px;
          height: 7px;
          flex: none;
          border-radius: 50%;
          background: #5ed9cd;
          box-shadow: 0 0 12px rgba(94,217,205,.55);
        }
      `}</style>
    </section>
  );
}

function StudentFinish({ view }: { view: StudentFinishViewT }) {
  const isEnded = view.phase === 'ended';
  const isJelajah = view.gameMode === 'jelajah-kata';
  const teamProgress =
    view.team && view.gameProgress.teamProgress[view.team.id] !== undefined
      ? Math.round(Math.max(0, Math.min(100, view.gameProgress.teamProgress[view.team.id])))
      : null;
  const kotaProgress = Math.round(
    Math.max(0, Math.min(100, view.gameProgress.kotaProgressPercent ?? 0)),
  );
  const kotaUnlocked = view.gameProgress.kotaUnlockedMilestones ?? [];

  return (
    <section className="mb-sfinish mb-fade-in">
      <div className={`mb-sfinish-stage ${isJelajah ? 'mb-sfinish-jelajah' : 'mb-sfinish-kota'}`}>
        <div className="mb-sfinish-confetti" aria-hidden>
          <i /><i /><i /><i /><i /><i /><i />
        </div>

        <span className={`mb-sfinish-status ${isEnded ? 'mb-sfinish-status-closed' : ''}`} role="status">
          <i aria-hidden />
          {isEnded ? 'SESI DITUTUP' : 'PERMAINAN SELESAI'}
        </span>

        <div className="mb-sfinish-art" aria-hidden>
          {isJelajah && view.team ? (
            <TeamMascot teamId={view.team.id} pose="celebrate" size={138} eager />
          ) : (
            <KotaScene unlocked={kotaUnlocked} mini />
          )}
        </div>

        <p className="mb-sfinish-overline">
          {isEnded ? 'Sampai jumpa di permainan berikutnya' : 'Keren! Kamu sudah sampai di akhir'}
        </p>
        <h1 className="mb-display">
          {isEnded ? 'Sesi selesai!' : 'Hebat, selesai!'}
        </h1>
        <p className="mb-sfinish-name">{view.displayName}</p>

        <div className="mb-sfinish-result">
          {isJelajah ? (
            <>
              <span>PERJALANAN REGUMU</span>
              <strong className="mb-number">{teamProgress ?? 0}%</strong>
              <small>
                {view.team ? `Regu ${view.team.name}` : 'Regumu'} sudah berjuang sampai akhir.
              </small>
            </>
          ) : (
            <>
              <span>KOTA CAHAYA</span>
              <strong className="mb-number">{kotaProgress}%</strong>
              <small>
                Kelasmu menyalakan {kotaUnlocked.length} dari 4 bagian kota bersama-sama.
              </small>
            </>
          )}
        </div>

        <p className="mb-sfinish-copy">
          {isEnded
            ? 'Ruang ini sudah ditutup oleh Pak/Bu Guru. Kamu boleh kembali ke beranda.'
            : 'Hasil akhir sudah tampil. Pak/Bu Guru sedang menutup ruang permainan.'}
        </p>

        <div className="mb-sfinish-actions">
          <StudentBackButton phase="idle" />
        </div>
      </div>

      <style jsx>{`
        .mb-sfinish {
          position: relative;
          z-index: 1;
          flex: 1;
          width: min(100%, 720px);
          margin: 0 auto;
          display: grid;
          place-items: center;
          padding: 18px 14px 30px;
        }
        .mb-sfinish-stage {
          position: relative;
          width: 100%;
          min-height: min(650px, calc(100dvh - 112px));
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 9px;
          overflow: hidden;
          padding: 30px 20px 28px;
          border-radius: 30px;
          border: 1px solid rgba(255,255,255,.12);
          box-shadow: 0 30px 72px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.06);
          text-align: center;
          isolation: isolate;
        }
        .mb-sfinish-jelajah {
          background:
            radial-gradient(360px 210px at 50% 13%, rgba(52, 211, 153, .22), transparent 70%),
            radial-gradient(260px 180px at 5% 92%, rgba(255, 201, 77, .12), transparent 70%),
            linear-gradient(155deg, #0e332f, #081e27 58%, #091725);
        }
        .mb-sfinish-kota {
          background:
            radial-gradient(360px 220px at 50% 12%, rgba(139, 124, 246, .24), transparent 70%),
            radial-gradient(280px 190px at 95% 86%, rgba(255, 201, 77, .12), transparent 70%),
            linear-gradient(155deg, #171a45, #0c1733 58%, #081522);
        }
        .mb-sfinish-status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 33px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(255,255,255,.12);
          color: #d7f8f3;
          font-size: .68rem;
          font-weight: 900;
          letter-spacing: .14em;
        }
        .mb-sfinish-status i {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #55e2ae;
          box-shadow: 0 0 12px rgba(85,226,174,.58);
        }
        .mb-sfinish-status-closed {
          color: #ffe7a3;
          border-color: rgba(255,207,83,.2);
          background: rgba(102,75,20,.18);
        }
        .mb-sfinish-status-closed i {
          background: #ffd25f;
          box-shadow: 0 0 12px rgba(255,210,95,.5);
        }
        .mb-sfinish-art {
          width: min(100%, 350px);
          height: 165px;
          display: grid;
          place-items: center;
          margin: 2px 0 0;
        }
        .mb-sfinish-art :global(.mb-kota-scene) {
          width: 100%;
          max-height: 160px;
          filter: drop-shadow(0 14px 24px rgba(0,0,0,.25));
        }
        .mb-sfinish-overline {
          margin: 0;
          color: #9db4c8;
          font-size: .82rem;
          font-weight: 650;
        }
        .mb-sfinish h1 {
          margin: 0;
          color: #fff;
          font-size: clamp(2.3rem, 10vw, 3.7rem);
          line-height: .96;
          text-shadow: 0 10px 26px rgba(0,0,0,.26);
        }
        .mb-sfinish-name {
          margin: 0;
          color: #f8d86f;
          font-weight: 850;
          font-size: 1.05rem;
        }
        .mb-sfinish-result {
          width: min(100%, 360px);
          display: grid;
          justify-items: center;
          gap: 3px;
          margin-top: 6px;
          padding: 14px 18px;
          border-radius: 20px;
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(255,255,255,.1);
        }
        .mb-sfinish-result > span {
          color: #85e5dc;
          font-size: .64rem;
          font-weight: 900;
          letter-spacing: .14em;
        }
        .mb-sfinish-result strong {
          color: #fff;
          font-size: 2rem;
          line-height: 1.1;
        }
        .mb-sfinish-result small {
          color: #a8bbca;
          line-height: 1.45;
        }
        .mb-sfinish-copy {
          max-width: 38ch;
          margin: 5px 0 0;
          color: #9db1c1;
          font-size: .88rem;
          line-height: 1.5;
        }
        .mb-sfinish-actions {
          margin-top: 8px;
        }
        .mb-sfinish-confetti {
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
        }
        .mb-sfinish-confetti i {
          position: absolute;
          width: 8px;
          height: 18px;
          border-radius: 3px;
          background: #ffd35c;
          opacity: .45;
          transform: rotate(24deg);
        }
        .mb-sfinish-confetti i:nth-child(1) { top: 10%; left: 12%; transform: rotate(-28deg); }
        .mb-sfinish-confetti i:nth-child(2) { top: 20%; right: 13%; background: #5ee0d3; transform: rotate(35deg); }
        .mb-sfinish-confetti i:nth-child(3) { top: 38%; left: 7%; background: #a996ff; transform: rotate(62deg); }
        .mb-sfinish-confetti i:nth-child(4) { top: 53%; right: 8%; transform: rotate(-52deg); }
        .mb-sfinish-confetti i:nth-child(5) { bottom: 20%; left: 15%; background: #55d9a7; }
        .mb-sfinish-confetti i:nth-child(6) { bottom: 12%; right: 18%; background: #a996ff; transform: rotate(68deg); }
        .mb-sfinish-confetti i:nth-child(7) { top: 9%; left: 53%; width: 6px; height: 6px; border-radius: 50%; background: #fff; }
        @media (max-height: 720px) {
          .mb-sfinish-stage { min-height: 0; padding-block: 22px; }
          .mb-sfinish-art { height: 128px; }
          .mb-sfinish-art :global(.mb-kota-scene) { max-height: 124px; }
        }
      `}</style>
    </section>
  );
}
