/**
 * Durasi permainan Main Bersama (tanpa DB): pilihan guru 10/15/25/30/45
 * menit, validasi server, batas waktu authoritative, jeda menggeser
 * batas, sesi berakhir otomatis saat waktu habis, jawaban terlambat
 * ditolak, dan sesi lama tanpa durasi tidak berubah.
 *
 * Jalankan: npx tsx scripts/test-main-bersama-game-duration.ts
 */
import assert from 'node:assert/strict';
import { SessionEngine } from '../src/main-bersama/application/services/session-engine';
import { FakeClock } from '../src/main-bersama/domain/types/clock';
import { createGameState, type GameEngineState } from '../src/main-bersama/games/game-router';
import {
  endSession,
  expireSessionIfTimeUp,
  pauseSession,
  resumeSession,
  startSession,
} from '../src/main-bersama/application/services/session-commands';
import { submitAnswer } from '../src/main-bersama/application/services/student-flows';
import { buildProjectorView, buildStudentView, buildTeacherView } from '../src/main-bersama/presentation/view-mappers';
import { resolveGameConfig } from '../src/main-bersama/application/use-cases/session-defaults';
import {
  ALLOWED_GAME_DURATION_MS,
  DEFAULT_GAME_DURATION_MS,
  GAME_DURATION_MINUTES,
  isAllowedGameDurationMs,
  isGameTimeUp,
} from '../src/main-bersama/domain/rules/game-duration';
import type { SessionOrchestratorDeps } from '../src/main-bersama/application/services/orchestrator-ports';
import type { VerifiedTeacherActor } from '../src/main-bersama/application/use-cases/create-main-session';
import type { MainSession } from '../src/main-bersama/domain/entities/session';
import type { GameMode } from '../src/main-bersama/domain/types/session';

const MIN = 60_000;
const actor = { role: 'GURU', userId: 'teacher' } as VerifiedTeacherActor;
let passed = 0;
function ok(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✅ ${name}`);
}

function makeEngine(clock: FakeClock, gameMode: GameMode, gameDurationMs?: number) {
  const sessionId = `dur-${gameMode}-${gameDurationMs ?? 'legacy'}`;
  const questions = [0, 1, 2].map((i) => ({
    id: 'q' + i, sourceQuestionId: 's' + i, type: 'single-choice' as const,
    prompt: 'Soal ' + (i + 1), options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
    correctOptionId: 'a',
  }));
  const session: MainSession = {
    id: sessionId, pin: '123456', teacherId: 'teacher', gameMode, phase: 'lobby',
    currentRoundIndex: null, totalRounds: 3, roundDurationMs: 60_000,
    ...(gameDurationMs ? { gameDurationMs } : {}), createdAt: clock.now(),
  };
  const engine = new SessionEngine({ session, questions: { sessionId, gameMode, snapshots: questions }, clock });
  engine.state.players.set('p1', {
    id: 'p1', displayName: 'Murid', teamId: gameMode === 'jelajah-kata' ? 'elang' : undefined,
    joinedAt: clock.now(), eligibleFromRoundIndex: 0, connected: true, participationStatus: 'active',
  });
  return { engine, sessionId, questions };
}

function makeDeps(clock: FakeClock, engine: SessionEngine, game: GameEngineState, events: string[]) {
  return {
    clock,
    resolver: { discard: () => {}, resolve: async () => ({ ok: true as const, engine }) },
    sessions: {
      findOwnedBy: async () => engine.state.session,
      findById: async () => engine.state.session,
      save: async () => { events.push('save'); },
      saveSessionProgress: async () => {},
      savePauseState: async () => {},
      saveGameEndsAt: async (_id: string, endsAt: Date | null) => { events.push('endsAt:' + (endsAt?.toISOString() ?? 'null')); },
    },
    rounds: {
      save: async () => {},
      startIndependentJelajah: async () => {
        engine.state.session.phase = 'question';
        engine.state.rounds = engine.state.rounds.length ? engine.state.rounds : [];
        events.push('jelajah-start');
        return { roundId: 'r0' };
      },
      finishIndependentJelajah: async () => { events.push('jelajah-finish'); return true; },
    },
    players: { setConnected: async () => {} },
    answers: { submitAnswer: async () => ({ ok: true as const, status: 'saved' as const }) },
    gameStates: {
      loadGameState: async () => ({ gameMode: game.gameMode, status: 'ACTIVE' as const, state: game }),
      saveGameState: async ({ final }: { final: boolean }) => { events.push('final:' + final); },
      saveGameRoundResult: async () => ({ ok: true as const, alreadyApplied: false }),
    },
    kotaTarget: { saveKotaTarget: async () => {} },
    credentials: {
      issue: () => 'cred',
      resolve: async () => ({ ok: true as const, playerId: 'p1', sessionId: engine.sessionId }),
    },
    realtimeSignal: { sendSessionUpdate: async () => { events.push('signal'); } },
  } as unknown as SessionOrchestratorDeps;
}

async function main() {
  console.log('\n=== MAIN BERSAMA — DURASI PERMAINAN ===\n');

  ok('pilihan durasi tepat 10/15/25/30/45 menit', () => {
    assert.deepEqual([...GAME_DURATION_MINUTES], [10, 15, 25, 30, 45]);
    assert.deepEqual(ALLOWED_GAME_DURATION_MS, [10, 15, 25, 30, 45].map((m) => m * MIN));
    assert.equal(DEFAULT_GAME_DURATION_MS, 10 * MIN);
  });

  ok('server menerima setiap pilihan resmi untuk kedua mode', () => {
    for (const mode of ['jelajah-kata', 'kota-cahaya'] as const) {
      for (const m of GAME_DURATION_MINUTES) {
        const r = resolveGameConfig(mode, 5, { gameDurationMs: m * MIN });
        assert(r.ok && r.config.gameDurationMs === m * MIN);
      }
    }
  });

  ok('server menolak durasi di luar pilihan (5, 20, 60 menit, pecahan, string)', () => {
    for (const bad of [5 * MIN, 20 * MIN, 60 * MIN, 10 * MIN + 1, 0, -10 * MIN, Number.NaN]) {
      const r = resolveGameConfig('kota-cahaya', 5, { gameDurationMs: bad });
      assert(!r.ok && r.code === 'INVALID_GAME_CONFIG', `harus ditolak: ${bad}`);
    }
    assert(!isAllowedGameDurationMs('600000'));
  });

  ok('tanpa pilihan → default 10 menit', () => {
    const r = resolveGameConfig('jelajah-kata', 5);
    assert(r.ok && r.config.gameDurationMs === 10 * MIN);
  });

  // ── Kota Cahaya: start → pause → resume → waktu habis ──
  {
    const clock = new FakeClock();
    const { engine, sessionId } = makeEngine(clock, 'kota-cahaya', 15 * MIN);
    const kota = createGameState({ gameMode: 'kota-cahaya', kota: { targetCorrectAnswers: 3 } });
    assert(kota.ok);
    const events: string[] = [];
    const deps = makeDeps(clock, engine, kota.value, events);
    const startAt = clock.now().getTime();

    const lobbyView = buildTeacherView(engine, clock.now(), kota.value);
    ok('lobby: durasi terlihat, jam belum berjalan', () => {
      assert.equal(lobbyView.gameClock?.durationMs, 15 * MIN);
      assert.equal(lobbyView.gameClock?.endsAt, null);
    });

    const started = await startSession(deps, actor, sessionId);
    ok('mulai: batas waktu = mulai + 15 menit, disimpan server', () => {
      assert(started.ok);
      assert.equal(engine.state.session.gameEndsAt?.getTime(), startAt + 15 * MIN);
      assert(events.includes('endsAt:' + new Date(startAt + 15 * MIN).toISOString()));
    });

    ok('guru, murid, dan layar menerima batas waktu yang sama', () => {
      const t = buildTeacherView(engine, clock.now(), kota.value).gameClock;
      const s = buildStudentView(engine, 'p1' as never, clock.now(), kota.value);
      const p = buildProjectorView(engine, clock.now(), kota.value).gameClock;
      assert(s.ok);
      assert.equal(t?.endsAt, new Date(startAt + 15 * MIN).toISOString());
      assert.equal(s.view.gameClock?.endsAt, t?.endsAt);
      assert.equal(p?.endsAt, t?.endsAt);
    });

    clock.advance(5 * MIN);
    const paused = await pauseSession(deps, actor, sessionId);
    ok('jeda: sisa waktu beku 10 menit', () => {
      assert(paused.ok);
      const t = buildTeacherView(engine, clock.now(), kota.value).gameClock;
      assert.equal(t?.paused, true);
      assert.equal(t?.pausedRemainingMs, 10 * MIN);
    });
    clock.advance(3 * MIN);
    ok('selama jeda waktu tidak habis', () => {
      assert(!isGameTimeUp({ phase: engine.state.session.phase, gameEndsAt: engine.state.session.gameEndsAt, now: new Date(startAt + 60 * MIN) }));
    });
    const resumed = await resumeSession(deps, actor, sessionId);
    ok('lanjut: batas waktu digeser sebesar lama jeda (3 menit)', () => {
      assert(resumed.ok);
      assert.equal(engine.state.session.gameEndsAt?.getTime(), startAt + 18 * MIN);
    });

    clock.advance(9 * MIN);
    const notYet = await expireSessionIfTimeUp(deps, sessionId as never, { engine, gameState: kota.value });
    ok('sebelum batas waktu sesi tetap berjalan', () => {
      assert.equal(notYet?.engine.state.session.phase, 'question');
    });

    clock.advance(1 * MIN + 1);
    const late = await submitAnswer(deps, {
      credential: 'cred', roundId: engine.state.rounds[0]!.id as never,
      submissionId: 'sub-late' as never, selectedOptionId: 'a',
    });
    ok('jawaban setelah waktu habis ditolak + sesi diakhiri server', () => {
      assert(!late.ok && late.code === 'DEADLINE_PASSED');
      assert.equal(engine.state.session.phase, 'ended');
      assert(events.includes('final:true'));
    });

    const endAgain = await endSession(deps, actor, sessionId);
    ok('tombol Akhiri setelah waktu habis tetap aman (idempotent)', () => {
      assert(endAgain.ok);
    });
  }

  // ── Jelajah Kata mandiri: waktu habis menutup semua regu ──
  {
    const clock = new FakeClock();
    const { engine, sessionId, questions } = makeEngine(clock, 'jelajah-kata', 10 * MIN);
    const game = createGameState({ gameMode: 'jelajah-kata', totalRounds: 3, teamCount: 2 });
    assert(game.ok);
    const events: string[] = [];
    const deps = makeDeps(clock, engine, game.value, events);
    const started = await startSession(deps, actor, sessionId);
    // Simulasikan round mandiri (closesAt null) seperti repository produksi.
    engine.state.rounds = questions.map((question, index) => ({
      id: 'r' + index, sessionId, index, question, eligiblePlayerIds: ['p1'],
      eligibleTeamIds: { p1: 'elang' }, phase: 'open' as const, openedAt: clock.now(),
    })) as never;
    engine.state.activeRoundIndex = 0;
    ok('Jelajah: batas waktu dikunci saat mulai', () => {
      assert(started.ok);
      assert(events.includes('jelajah-start'));
      assert.equal(engine.state.session.gameEndsAt?.getTime(), clock.now().getTime() + 10 * MIN);
    });
    clock.advance(10 * MIN);
    await expireSessionIfTimeUp(deps, sessionId as never, { engine, gameState: game.value });
    ok('Jelajah: tepat saat batas waktu, semua regu ditutup dan sesi berakhir', () => {
      assert(events.includes('jelajah-finish'));
      assert.equal(engine.state.session.phase, 'ended');
    });
  }

  // ── Sesi lama (tanpa durasi) tidak pernah diakhiri otomatis ──
  {
    const clock = new FakeClock();
    const { engine, sessionId } = makeEngine(clock, 'kota-cahaya');
    const kota = createGameState({ gameMode: 'kota-cahaya', kota: { targetCorrectAnswers: 3 } });
    assert(kota.ok);
    const events: string[] = [];
    const deps = makeDeps(clock, engine, kota.value, events);
    await startSession(deps, actor, sessionId);
    clock.advance(120 * MIN);
    await expireSessionIfTimeUp(deps, sessionId as never, { engine, gameState: kota.value });
    ok('sesi lama: tanpa jam permainan, tidak diakhiri otomatis', () => {
      assert.equal(buildTeacherView(engine, clock.now(), kota.value).gameClock, null);
      assert.notEqual(engine.state.session.phase, 'ended');
      assert(!events.some((e) => e.startsWith('endsAt:')));
    });
  }

  console.log(`\n${passed} cek lulus.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
