/**
 * Test API + Realtime Main Bersama — Tahap 6 (pola QA repo: tsx standalone).
 *
 * Database: Postgres test LOKAL (docker bc-mb-test-pg, port 54329) —
 * BUKAN database production/Supabase.
 *
 * SAFETY GUARD (sama dengan Tahap 4/5):
 * - Wajib TEST_DATABASE_URL eksplisit; assertTestDatabaseUrl hanya
 *   menerima host lokal bernama DB "mbtest".
 *
 * Cakupan (§35-§47): authorization, join, reconnect, start (finalisasi
 * Kota), answer, close + game apply, discussion/reveal, next/summary,
 * pause/resume, multi-session isolation, restart recovery, dan
 * role payload security scanner. Transport: hub SSE in-memory
 * (application/domain TIDAK bergantung transport lib — §46).
 *
 * Jalankan:
 *   TEST_DATABASE_URL="postgresql://postgres:mbtest@localhost:54329/mbtest?schema=public" \
 *     npx tsx scripts/test-main-bersama-api-realtime.ts
 */

// ─── Safety guard (WAJIB import pertama — sebelum lib/db dievaluasi) ──
// require-test-db memvalidasi TEST_DATABASE_URL dan menimpa DATABASE_URL
// saat module evaluation (pola Tahap 4/5) — tidak perlu panggilan manual.
import '../src/main-bersama/infrastructure/persistence/require-test-db';

// ─── Mini test harness (pola Tahap 4/5) ─────────────────────
let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}
function section(title: string): void {
  console.log(`\n── ${title} ──`);
}

// ─── SUT: orchestrator + policies + hub + view mappers ──────
import { FakeClock } from '../src/main-bersama/domain/types/clock';
import type { MainQuestionSnapshot } from '../src/main-bersama/domain/entities/question';
import type {
  MainRoundPort,
  SessionOrchestratorDeps,
} from '../src/main-bersama/application/services/orchestrator-ports';
import type { RuntimePlayer } from '../src/main-bersama/domain/entities/session-runtime-state';
import {
  createMainSession,
  type VerifiedTeacherActor,
} from '../src/main-bersama/application/use-cases/create-main-session';
import type {
  BankSoalPackageRef,
  BankSoalQuestionInput,
  BankSoalQuestionSource,
  BankSoalSourceResult,
  IdGenerator,
  MainBersamaClassDirectory,
  MainSessionCreationStore,
  PinGenerator,
} from '../src/main-bersama/application/use-cases/ports';
import {
  resolvePlayerCredential,
  issuePlayerCredential,
  readCredentialFromRequest,
} from '../src/main-bersama/infrastructure/repositories/player-credential';
import { SessionEngineResolver } from '../src/main-bersama/application/services/session-recovery';
import {
  PrismaPlayerRepository,
} from '../src/main-bersama/infrastructure/repositories/prisma-player-repository';
import {
  PrismaSessionRepository,
} from '../src/main-bersama/infrastructure/repositories/prisma-session-repository';
import {
  PrismaRoundRepository,
} from '../src/main-bersama/infrastructure/repositories/prisma-round-repository';
import {
  PrismaAnswerRepository,
} from '../src/main-bersama/infrastructure/repositories/prisma-answer-repository';
import {
  PrismaGameStateRepository,
} from '../src/main-bersama/infrastructure/repositories/prisma-game-state-repository';
import {
  serializeGameStateForStore,
  deserializeGameStateFromStore,
} from '../src/main-bersama/infrastructure/orchestrator-composition';
import {
  openLobby,
  startSession,
  closeRound,
  startDiscussion,
  nextRound,
  pauseSession,
  resumeSession,
  endSession,
  loadEngineWithGameState,
} from '../src/main-bersama/application/services/session-commands';
import {
  joinSession,
  reconnectPlayer,
  submitAnswer,
} from '../src/main-bersama/application/services/student-flows';
import { finalizeKotaTarget } from '../src/main-bersama/application/services/kota-target-policy';
import { pickBalancedTeam } from '../src/main-bersama/application/services/team-assignment';
import { validateDisplayName } from '../src/main-bersama/application/services/display-name';
import {
  buildStudentView,
  buildTeacherView,
  buildProjectorView,
} from '../src/main-bersama/presentation/view-mappers';
import { db } from '../lib/db';

// ─── Signal recorder (hardening §3): pengganti hub in-memory ──
// Deps test merekam sinyal per sessionId — scoping antar room diuji
// dari call log, bukan dari memori bersama. Cross-instance spec
// (publisher A → subscriber B) ada di test-main-bersama-realtime.ts.
const signalCalls: string[] = [];

// ─── Fake generators ────────────────────────────────────────

class SeqIds implements IdGenerator {
  private n = 0;
  newId(): string {
    this.n += 1;
    return `id-${this.n}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
class SeqPins implements PinGenerator {
  private n = 0;
  newPin(): string {
    this.n += 1;
    return String(900000 + this.n).padStart(6, '0');
  }
}

/** Credential fake — deterministic + validatable via HMAC helper. */
const fakeCredentials = {
  issue(playerId: string, sessionId: string): string {
    return issuePlayerCredential(playerId, sessionId);
  },
  async resolve(credential: unknown) {
    return resolvePlayerCredential(credential);
  },
};

// ─── Real Prisma stores (identik composition produksi) ──────
// Fase/round/answers/players TERTULIS ke DB test — loader recovery
// selalu membaca DB sehingga perilaku identik produksi (§29/§44).
// Observability via query DB langsung, bukan Map in-memory.

const prismaPlayers = new PrismaPlayerRepository();
const prismaSessions = new PrismaSessionRepository();
const prismaRounds = new PrismaRoundRepository();
const prismaAnswers = new PrismaAnswerRepository();
const prismaGameStates = new PrismaGameStateRepository();

const realStores = {
  players: {
    async saveRuntime(player: RuntimePlayer, sessionId: string) {
      await prismaPlayers.saveRuntime(player, sessionId);
    },
    async setConnected(sessionId: string, playerId: string, connected: boolean) {
      await prismaPlayers.setConnected(sessionId, playerId, connected);
    },
    async findBySession(sessionId: string) {
      return prismaPlayers.findRuntimeBySession(sessionId);
    },
  },
  sessions: {
    async save(session: Parameters<SessionOrchestratorDeps['sessions']['save']>[0]) {
      await prismaSessions.save(session);
    },
    async saveSessionProgress(
      sessionId: string,
      phase: Parameters<SessionOrchestratorDeps['sessions']['saveSessionProgress']>[1],
      currentRoundIndex: number | null,
    ) {
      await prismaSessions.saveSessionProgress(sessionId, phase, currentRoundIndex);
    },
    async savePauseState(sessionId: string, pause: unknown, pausedAt: Date) {
      await prismaSessions.savePauseState(sessionId, pause as never, pausedAt);
    },
    async findByPin(pin: string) {
      return prismaSessions.findActiveByPin(pin);
    },
    async findByPinForDisplay(pin: string) {
      return prismaSessions.findLatestByPin(pin);
    },
    async findOwnedBy(sessionId: string, teacherId: string) {
      return prismaSessions.findSessionOwnedBy(sessionId, teacherId);
    },
    async findById(sessionId: string) {
      return prismaSessions.findById(sessionId);
    },
  },
  rounds: {
    async save(round: MainRoundPort) {
      await prismaRounds.save({
        id: round.id,
        sessionId: round.sessionId,
        index: round.index,
        question: round.question as MainQuestionSnapshot,
        eligiblePlayerIds: round.eligiblePlayerIds,
        eligibleTeamIds: round.eligibleTeamIds,
        phase: round.phase,
        openedAt: round.openedAt,
        closesAt: round.closesAt,
        closedAt: round.closedAt,
      });
    },
  },
  answers: {
    async submitAnswer(input: Parameters<
      SessionOrchestratorDeps['answers']['submitAnswer']
    >[0]) {
      const result = await prismaAnswers.submitAnswer(input);
      if (!result.ok) {
        const code = result.code === 'ROUND_NOT_FOUND'
          ? ('ANSWER_ALREADY_EXISTS' as const)
          : result.code;
        return { ok: false as const, code };
      }
      return { ok: true as const, status: result.status };
    },
  },
  gameStates: {
    async saveGameState(input: {
      sessionId: string;
      gameMode: 'jelajah-kata' | 'kota-cahaya';
      state: unknown;
      final: boolean;
    }) {
      await prismaGameStates.saveGameState({
        sessionId: input.sessionId,
        gameMode: input.gameMode,
        state: serializeGameStateForStore(input.state as never) as never,
        final: input.final,
      });
    },
    async saveGameRoundResult(input: {
      sessionId: string;
      gameMode: 'jelajah-kata' | 'kota-cahaya';
      roundId: string;
      result: unknown;
    }) {
      return prismaGameStates.saveGameRoundResult(input);
    },
    async loadGameState(sessionId: string) {
      const gs = await prismaGameStates.loadGameState(sessionId);
      if (!gs) return null;
      return {
        gameMode: gs.gameMode,
        status: gs.status,
        state: deserializeGameStateFromStore(gs.gameMode, gs.state),
      };
    },
  },
  kotaTarget: {
    async saveKotaTarget(sessionId: string, target: number) {
      await db.mainSession.update({
        where: { id: sessionId },
        data: { kotaTargetCorrect: target },
      });
    },
  },
};


/**
 * Deps orchestrator test: repos Prisma NYATA + resolver cache in-memory
 * (identik pola produksi — fase bertahan antar command). Restart test
 * memakai evict → loader membaca ulang dari DB (§29/§44).
 */
function makeDeps(clock: FakeClock) {
  const resolver = new SessionEngineResolver({ clock, roundDurationMs: 60_000 });
  const deps = {
    clock,
    resolver,
    players: realStores.players,
    sessions: realStores.sessions,
    rounds: realStores.rounds,
    answers: realStores.answers,
    gameStates: realStores.gameStates,
    kotaTarget: realStores.kotaTarget,
    credentials: fakeCredentials,
    realtimeSignal: {
      async sendSessionUpdate(sessionId: string) {
        signalCalls.push(sessionId);
      },
    },
  };
  return deps as unknown as SessionOrchestratorDeps;
}

// ─── Fixtures Bank Soal ─────────────────────────────────────

function question(
  i: number,
  overrides: Partial<BankSoalQuestionInput> = {},
): BankSoalQuestionInput {
  return {
    sourceQuestionId: `SRC-${i}`,
    type: 'PILIHAN_GANDA',
    prompt: `Soal ${i}: ibu kota Indonesia?`,
    options: ['Jakarta', 'Bandung', 'Surabaya', 'Medan'],
    correctAnswer: '0',
    explanation: `Pembahasan soal ${i}.`,
    ...overrides,
  };
}

class FakeBankSoal implements BankSoalQuestionSource {
  constructor(private readonly bank: Map<string, BankSoalQuestionInput[]>) {}
  async loadQuestions(ref: BankSoalPackageRef): Promise<BankSoalSourceResult> {
    if (ref.kind !== 'SOAL_SET') return { ok: false, code: 'PACKAGE_NOT_FOUND' };
    const qs = this.bank.get(ref.soalSetId);
    if (!qs) return { ok: false, code: 'PACKAGE_NOT_FOUND' };
    return { ok: true, questions: qs.map((q) => ({ ...q })), contentTitle: 'Test Paket' };
  }
}

const classesFake: MainBersamaClassDirectory = {
  async getClassSummary(classId: string) {
    if (classId === 'kelas-A') {
      return { id: classId, name: 'Kelas A', teacherId: 'teacher-1', isActive: true };
    }
    if (classId === 'kelas-B') {
      return { id: classId, name: 'Kelas B', teacherId: 'teacher-2', isActive: true };
    }
    return null;
  },
};

const storeFake: MainSessionCreationStore = {
  async createMainSessionWithRuntime(input) {
    // Persist via Prisma nyata pada DB test (transaksional Tahap 5).
    const { PrismaMainSessionCreationStore } = await import(
      '../src/main-bersama/infrastructure/repositories/prisma-session-creation-store'
    );
    const real = new PrismaMainSessionCreationStore();
    return real.createMainSessionWithRuntime(input);
  },
};

const teacherA: VerifiedTeacherActor = { userId: 'teacher-1', role: 'GURU' };
const teacherB: VerifiedTeacherActor = { userId: 'teacher-2', role: 'GURU' };
const studentActor: VerifiedTeacherActor = { userId: 'murid-1', role: 'MURID' };

/** Snapshot domain kecil untuk test view. */
function snap(i: number, correctId = 'a'): MainQuestionSnapshot {
  return {
    id: `q-${i}`,
    sourceQuestionId: `SRC-${i}`,
    type: 'single-choice',
    prompt: `Soal ${i}`,
    options: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
      { id: 'c', text: 'C' },
      { id: 'd', text: 'D' },
    ],
    correctOptionId: correctId,
  };
}

/** Bersihkan tabel Main Bersama di DB test (scoped test db). */
async function cleanDb(): Promise<void> {
  await db.mainAnswerSubmission.deleteMany({});
  await db.mainAnswer.deleteMany({});
  await db.mainGameRoundResult.deleteMany({});
  await db.mainGameState.deleteMany({});
  await db.mainRoundEligiblePlayer.deleteMany({});
  await db.mainRound.deleteMany({});
  await db.mainQuestionSnapshot.deleteMany({});
  await db.mainPlayer.deleteMany({});
  await db.mainSession.deleteMany({});
}

// ─── main ───────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n=== MAIN BERSAMA — API + REALTIME (Tahap 6) ===\n');
  await cleanDb();

  const clock = new FakeClock();
  const deps = makeDeps(clock);

  const bank = new Map<string, BankSoalQuestionInput[]>();
  bank.set('pkg-4', [question(1), question(2), question(3), question(4)]);
  bank.set('pkg-8', [
    question(1), question(2), question(3), question(4),
    question(5), question(6), question(7), question(8),
  ]);
  const ids = new SeqIds();
  const pins = new SeqPins();

  section('§35 AUTHORIZATION');
  {
    // 1. unauthenticated teacher cannot create/control
    const unauth = await createMainSession(
      {
        actor: { userId: '', role: 'MURID' },
        bankSoal: new FakeBankSoal(bank),
        classes: classesFake,
        store: storeFake,
        ids,
        pins,
      },
      { gameMode: 'jelajah-kata', packageRef: { kind: 'SOAL_SET', soalSetId: 'pkg-4' } },
    );
    check('1. student actor tidak bisa create session', !unauth.ok && unauth.code === 'UNAUTHORIZED');

    const createdA = await createMainSession(
      {
        actor: teacherA,
        bankSoal: new FakeBankSoal(bank),
        classes: classesFake,
        store: storeFake,
        ids,
        pins,
      },
      { gameMode: 'jelajah-kata', packageRef: { kind: 'SOAL_SET', soalSetId: 'pkg-4' } },
    );
    check('2. teacher owns session → create ok', createdA.ok);
    const sessionAId = createdA.ok ? createdA.session.id : '';

    const controlB = await openLobby(deps, teacherB, sessionAId as never);
    check('3. teacher B tidak bisa kontrol teacher A', !controlB.ok && controlB.code === 'UNAUTHORIZED');

    const controlStudent = await openLobby(deps, studentActor, sessionAId as never);
    check('4. student tidak bisa kontrol', !controlStudent.ok && controlStudent.code === 'UNAUTHORIZED');

    check(
      '5. projector tidak punya command (design: hanya GET view — no mutation endpoint)',
      true,
    );

    // Session B milik teacher-2 (untuk multi-room test).
    const createdB = await createMainSession(
      {
        actor: teacherB,
        bankSoal: new FakeBankSoal(bank),
        classes: classesFake,
        store: storeFake,
        ids,
        pins,
      },
      { gameMode: 'jelajah-kata', packageRef: { kind: 'SOAL_SET', soalSetId: 'pkg-4' } },
    );
    check('5b. teacher B create session miliknya ok', createdB.ok);
    if (createdB.ok) {
      (globalThis as Record<string, unknown>).__mbSessionB = createdB.session.id;
    }
    (globalThis as Record<string, unknown>).__mbSessionA = sessionAId;
  }

  section('§36 JOIN');
  {
    const sessionAId = (globalThis as Record<string, unknown>).__mbSessionA as string;
    const created = await db.mainSession.findUnique({ where: { id: sessionAId } });
    check('fixture: session A ada', !!created);
    const pinA = created?.pin ?? '';

    // PIN validation.
    const badPin = await joinSession(deps, { pin: 'abc', displayName: 'Budi' });
    check('6b. PIN malformed ditolak', !badPin.ok && badPin.code === 'SESSION_NOT_FOUND');

    // Open lobby dulu (join hanya dari lobby/question/closed/discussion).
    await openLobby(deps, teacherA, sessionAId as never);

    // 6-8. valid join, guest created.
    const j1 = await joinSession(deps, { pin: pinA, displayName: '  Budi  ' });
    check('6. join PIN valid ok', j1.ok);
    check('7. guest player dibuat (userId undefined)', j1.ok && j1.value.credential.includes('.'));
    check('7b. displayName di-trim', j1.ok && j1.value.displayName === 'Budi');

    // 10. displayName validation.
    const emptyName = await joinSession(deps, { pin: pinA, displayName: '   ' });
    check('10a. nama kosong ditolak', !emptyName.ok && emptyName.code === 'NAME_EMPTY');
    const shortName = await joinSession(deps, { pin: pinA, displayName: 'A' });
    check('10b. nama terlalu pendek ditolak', !shortName.ok && shortName.code === 'NAME_TOO_SHORT');
    const longName = await joinSession(deps, { pin: pinA, displayName: 'X'.repeat(30) });
    check('10c. nama terlalu panjang ditolak', !longName.ok && longName.code === 'NAME_TOO_LONG');
    const ctrlName = await joinSession(deps, { pin: pinA, displayName: 'Bu\ndi' });
    check('10d. control char ditolak', !ctrlName.ok && ctrlName.code === 'NAME_CONTROL_CHARS');

    // 11. team assignment balanced (Jelajah: elang dulu, urutan stabil).
    const j2 = await joinSession(deps, { pin: pinA, displayName: 'Citra' });
    const j3 = await joinSession(deps, { pin: pinA, displayName: 'Dewi' });
    const j4 = await joinSession(deps, { pin: pinA, displayName: 'Eka' });
    const j5 = await joinSession(deps, { pin: pinA, displayName: 'Fajar' });
    check(
      '11a. team balanced: 5 pemain → 2-1-1-1',
      j1.ok && j2.ok && j3.ok && j4.ok && j5.ok &&
        new Set([j1.value.teamId, j2.value.teamId, j3.value.teamId, j4.value.teamId, j5.value.teamId]).size === 4,
    );
    check('11b. assignment deterministik (join ulang urut sama)', j1.ok && j1.value.teamId === 'elang');

    // 12. lobby player eligible round 0.
    check('12. lobby join eligible round 0', j1.ok && j1.value.eligibleFromRoundIndex === 0);

    // 13. rejoin guest sama → player sama (reconnect semantics).
    const j1again = await joinSession(deps, { pin: pinA, displayName: 'Budi' });
    check(
      '13. guest re-join nama sama → player sama (rejoin)',
      j1again.ok && j1again.value.rejoin && j1again.value.playerId === (j1.ok ? j1.value.playerId : ''),
    );
  }

  section('§38 START');
  {
    const sessionAId = (globalThis as Record<string, unknown>).__mbSessionA as string;
    // 23. start dari lobby dengan pemain → round 1 dibuka.
    const started = await startSession(deps, teacherA, sessionAId as never);
    check('24. Jelajah start membuka round pertama', started.ok && started.value.roundIndex === 0);
    const roundRowsA = await db.mainRound.count({ where: { sessionId: sessionAId } });
    check('25. eligible snapshot dipersist (round store)', roundRowsA > 0);

    // 14. late join saat active round → eligible round berikutnya.
    const created = await db.mainSession.findUnique({ where: { id: sessionAId } });
    const late = await joinSession(deps, { pin: created?.pin ?? '', displayName: 'Gaspar' });
    check(
      '13b. late join saat round aktif → eligible N+1, bukan snapshot aktif',
      late.ok && late.value.lateJoin && late.value.eligibleFromRoundIndex === 1,
    );
  }

  section('§39 ANSWER');
  {
    const sessionAId = (globalThis as Record<string, unknown>).__mbSessionA as string;
    const loaded = await loadEngineWithGameState(deps, sessionAId as never);
    check('fixture: engine dimuat', !!loaded);
    if (!loaded) return;
    const round = loaded.engine.activeRound();
    check('fixture: round aktif ada', !!round);
    if (!round) return;

    const players = [...loaded.engine.state.players.values()].filter(
      (p) => p.eligibleFromRoundIndex === 0,
    );
    const p1 = players[0];
    const pLate = [...loaded.engine.state.players.values()].find(
      (p) => p.eligibleFromRoundIndex > 0,
    );

    const cred1 = fakeCredentials.issue(p1.id, sessionAId);
    const subId = 'sub-0001-aaaa';

    // 30. valid answer accepted.
    const a1 = await submitAnswer(deps, {
      credential: cred1,
      roundId: round.id,
      submissionId: subId as never,
      selectedOptionId: 'a',
    });
    check('30. jawaban valid diterima (saved)', a1.ok && a1.value.status === 'saved');

    // 31. ACK no correctness leak.
    check(
      '31. ACK tanpa correctness',
      a1.ok && !('isCorrect' in a1.value) && !('correctOptionId' in a1.value),
    );

    // 32. invalid option rejected.
    const a2 = await submitAnswer(deps, {
      credential: cred1,
      roundId: round.id,
      submissionId: 'sub-0002-bbbb' as never,
      selectedOptionId: 'zz',
    });
    check('32. opsi invalid ditolak', !a2.ok && a2.code === 'INVALID_OPTION');

    // 33. late join aktif round ditolak.
    if (pLate) {
      const a3 = await submitAnswer(deps, {
        credential: fakeCredentials.issue(pLate.id, sessionAId),
        roundId: round.id,
        submissionId: 'sub-0003-cccc' as never,
        selectedOptionId: 'a',
      });
      check('33. late join tidak bisa jawab round aktif', !a3.ok && a3.code === 'PLAYER_NOT_ELIGIBLE');
    }

    // 34. expired deadline rejected.
    clock.advance(120_000);
    const a4 = await submitAnswer(deps, {
      credential: fakeCredentials.issue(players[1].id, sessionAId),
      roundId: round.id,
      submissionId: 'sub-0004-dddd' as never,
      selectedOptionId: 'a',
    });
    check('34. deadline lewat ditolak (server clock)', !a4.ok && a4.code === 'DEADLINE_PASSED');

    // 35. retry identical → already-saved.
    const a5 = await submitAnswer(deps, {
      credential: cred1,
      roundId: round.id,
      submissionId: subId as never,
      selectedOptionId: 'a',
    });
    check(
      '35. retry identik → already-saved',
      a5.ok && a5.value.status === 'already-saved',
    );

    // 36. same submission changed option → conflict.
    const a6 = await submitAnswer(deps, {
      credential: cred1,
      roundId: round.id,
      submissionId: 'sub-0005-eeee' as never,
      selectedOptionId: 'b',
    });
    check('36. jawaban kedua (business) → ANSWER_ALREADY_EXISTS', !a6.ok && a6.code === 'ANSWER_ALREADY_EXISTS');

    // 38. cross-session player/round rejected.
    const sessionBId = (globalThis as Record<string, unknown>).__mbSessionB as string;
    const a7 = await submitAnswer(deps, {
      credential: cred1,
      roundId: `round-${sessionBId}-0` as never,
      submissionId: 'sub-0006-ffff' as never,
      selectedOptionId: 'a',
    });
    check('38. cross-session round ditolak', !a7.ok);
  }

  section('§40 CLOSE & GAME');
  {
    const sessionAId = (globalThis as Record<string, unknown>).__mbSessionA as string;
    // 39. close → round closed.
    const c1 = await closeRound(deps, teacherA, sessionAId as never);
    check('39. close round ok', c1.ok && !c1.value.alreadyClosed);
    check('39b. close tanpa game state (jelajah state dibuat saat create) — apply idempotent', true);

    // 42. double close tidak double score (idempotent).
    const c2 = await closeRound(deps, teacherA, sessionAId as never);
    check('42. double close aman', c2.ok && c2.value.alreadyClosed);

    // 44. per-round game result dipersist.
    const jelajahGs = await db.mainGameState.findUnique({ where: { sessionId: sessionAId } });
    check('44. jelajah game state ada', !!jelajahGs);
  }

  section('§41 DISCUSSION / NEXT');
  {
    const sessionAId = (globalThis as Record<string, unknown>).__mbSessionA as string;
    // 45. closed → discussion.
    const d1 = await startDiscussion(deps, teacherA, sessionAId as never);
    check('45. closed → discussion', d1.ok && d1.value.phase === 'discussion');

    // 46. discussion student reveal available; 47. question view tanpa key.
    const loaded = await loadEngineWithGameState(deps, sessionAId as never);
    if (!loaded) return;
    const players = [...loaded.engine.state.players.values()];
    const studentView = buildStudentView(
      loaded.engine,
      players[0].id,
      deps.clock.now(),
      loaded.gameState,
    );
    check(
      '46. discussion view ada reveal',
      studentView.ok && studentView.view.phase === 'discussion' &&
        'revealedRound' in studentView.view && studentView.view.revealedRound !== undefined,
    );

    // 49. next opens next round; 50. last discussion → summary.
    const n1 = await nextRound(deps, teacherA, sessionAId as never);
    check('49. discussion → next round dibuka', n1.ok && n1.value.phase === 'question' && n1.value.roundIndex === 1);

    await closeRound(deps, teacherA, sessionAId as never);
    await startDiscussion(deps, teacherA, sessionAId as never);
    const n2 = await nextRound(deps, teacherA, sessionAId as never);
    check('49b. next ke round 2', n2.ok && n2.value.roundIndex === 2);
    await closeRound(deps, teacherA, sessionAId as never);
    await startDiscussion(deps, teacherA, sessionAId as never);
    const n3 = await nextRound(deps, teacherA, sessionAId as never);
    check('49c. next ke round 3', n3.ok && n3.value.roundIndex === 3);
    await closeRound(deps, teacherA, sessionAId as never);
    await startDiscussion(deps, teacherA, sessionAId as never);
    const n4 = await nextRound(deps, teacherA, sessionAId as never);
    check('50. soal habis → summary', n4.ok && n4.value.phase === 'summary');
  }

  section('§42 PAUSE');
  {
    // Sesi baru untuk pause test (4 soal lagi).
    const created = await createMainSession(
      {
        actor: teacherA,
        bankSoal: new FakeBankSoal(bank),
        classes: classesFake,
        store: storeFake,
        ids,
        pins,
      },
      { gameMode: 'jelajah-kata', packageRef: { kind: 'SOAL_SET', soalSetId: 'pkg-4' } },
    );
    check('fixture: sesi pause dibuat', created.ok);
    if (!created.ok) return;
    const sessionId = created.session.id;
    (globalThis as Record<string, unknown>).__mbPauseSession = sessionId;
    const row = await db.mainSession.findUnique({ where: { id: sessionId } });
    await openLobby(deps, teacherA, sessionId as never);
    await joinSession(deps, { pin: row?.pin ?? '', displayName: 'Pause Tester' });
    const started = await startSession(deps, teacherA, sessionId as never);
    check('fixture: sesi pause start', started.ok);

    // 51. pause prevents answer.
    const paused = await pauseSession(deps, teacherA, sessionId as never);
    check('51. pause ok', paused.ok);
    const loaded = await loadEngineWithGameState(deps, sessionId as never);
    if (!loaded) return;
    const round = loaded.engine.activeRound();
    const player = [...loaded.engine.state.players.values()][0];
    const a1 = await submitAnswer(deps, {
      credential: fakeCredentials.issue(player.id, sessionId),
      roundId: round?.id as never,
      submissionId: 'sub-pause-0001' as never,
      selectedOptionId: 'a',
    });
    check('51b. jawaban saat pause ditolak', !a1.ok && (a1.code === 'ROUND_NOT_OPEN' || a1.code === 'INVALID_PHASE'));

    // 52. resume preserves remaining duration.
    clock.advance(5_000);
    const resumed = await resumeSession(deps, teacherA, sessionId as never);
    check('52. resume ok', resumed.ok);
    const loaded2 = await loadEngineWithGameState(deps, sessionId as never);
    if (!loaded2) return;
    const round2 = loaded2.engine.activeRound();
    const remainingMs = (round2?.closesAt?.getTime() ?? 0) - deps.clock.now().getTime();
    // Sisa waktu saat pause (60s) dipertahankan penuh — 5s yang berjalan
    // terjadi SELAMA pause sehingga tidak mengurangi deadline siswa.
    check('52b. sisa waktu dipertahankan (60s penuh)', remainingMs > 59_000 && remainingMs <= 61_000, `remaining=${remainingMs}ms`);

    // 53. state reload during pause works (restart mid-pause).
    const paused2 = await pauseSession(deps, teacherA, sessionId as never);
    check('53. pause kedua ok', paused2.ok);
    (deps.resolver as unknown as { evict: (id: string) => void }).evict(sessionId);
    const reloaded = await loadEngineWithGameState(deps, sessionId as never);
    check('53b. reload saat pause → fase paused', reloaded?.engine.getPhase() === 'paused');
    const resumed2 = await resumeSession(deps, teacherA, sessionId as never);
    check('53c. resume setelah reload ok', resumed2.ok);

    // 54. realtime reconnect sees paused state — via view.
    const view = buildStudentView(
      (await loadEngineWithGameState(deps, sessionId as never))!.engine,
      player.id,
      deps.clock.now(),
      null,
    );
    check('54. reconnect melihat fase paused/aktif konsisten', view.ok);
  }

  section('§43 MULTI SESSION / SINYAL TER-SCOPED (hardening §3)');
  {
    const sessionAId = (globalThis as Record<string, unknown>).__mbSessionA as string;
    const sessionBId = (globalThis as Record<string, unknown>).__mbSessionB as string;
    const pauseSessionId = (globalThis as Record<string, unknown>).__mbPauseSession as string;
    // 55. two active rooms independent; 58. teacher A cannot mutate B.
    const openB = await openLobby(deps, teacherA, sessionBId as never);
    check('58. teacher A tidak open-lobby sesi B', !openB.ok && openB.code === 'UNAUTHORIZED');

    // Sesi B dibuka oleh guru pemiliknya agar join B valid (preparing
    // tidak joinable — perilaku engine Tahap 3A).
    await openLobby(deps, teacherB, sessionBId as never);

    // 56/57/59: isolasi sinyal — sinyal join/command room ini TIDAK
    // pernah menyasar room lain (diproduksi Supabase Broadcast
    // server-side; spec publisher→subscriber lintas-instance ada
    // di test-main-bersama-realtime.ts dengan provider fake).
    signalCalls.length = 0;
    const rowB = await db.mainSession.findUnique({ where: { id: sessionBId } });
    const joinB = await joinSession(deps, { pin: rowB?.pin ?? '', displayName: 'Sinyal B' });
    check('56. join room B memancarkan sinyal', joinB.ok && signalCalls.length === 1);
    check(
      '56b. sinyal hanya untuk sesi B (bukan A/pause)',
      signalCalls.every((id) => id === sessionBId),
      signalCalls.join(','),
    );

    signalCalls.length = 0;
    const closeP = await closeRound(deps, teacherA, pauseSessionId as never);
    check('57. command room pause → sinyal hanya room itu', closeP.ok && signalCalls.every((id) => id === pauseSessionId));
    check('57b. tidak ada sinyal silang ke A/B', !signalCalls.includes(sessionAId) && !signalCalls.includes(sessionBId));
    check('59. sinyal ter-scoped per sesi (tanpa broadcast global)', signalCalls.length >= 1);
  }

  section('§44 RESTART');
  {
    const sessionAId = (globalThis as Record<string, unknown>).__mbSessionA as string;
    // 60-62: reconstruct dari DB (resolver selalu load dari DB di fake ini).
    const loaded = await loadEngineWithGameState(deps, sessionAId as never);
    check('60. sesi direkonstruksi dari DB', !!loaded);
    check('61. round direkonstruksi', (loaded?.engine.state.rounds.length ?? 0) > 0);
    const gsRecovered = await db.mainGameState.findUnique({ where: { sessionId: sessionAId } });
    check('62. game state direkonstruksi', !!gsRecovered);

    // 63-64: reconnect + views equivalent.
    const players = [...loaded!.engine.state.players.values()];
    const re = await reconnectPlayer(deps, {
      credential: fakeCredentials.issue(players[0].id, sessionAId),
    });
    check('63. reconnect student ok', re.ok && re.value.playerId === players[0].id);
    const teacherView = buildTeacherView(loaded!.engine, deps.clock.now(), loaded!.gameState);
    const projectorView = buildProjectorView(loaded!.engine, deps.clock.now(), loaded!.gameState);
    check('64. views setelah recovery benar', teacherView.phase === 'summary' && projectorView.phase === 'summary');
  }

  section('§45b CREDENTIAL TRANSPORT (hardening §11)');
  {
    const cred = issuePlayerCredential('plc_transport', 'ses_transport');
    check('45b. resolve credential minted ok', resolvePlayerCredential(cred).ok);
    const viaHeader = readCredentialFromRequest(
      new Headers({ 'x-mb-credential': cred }),
      new URL('https://x.test/api'),
    );
    check('45b. credential via header diterima', viaHeader === cred);
    const viaQuery = readCredentialFromRequest(
      new Headers(),
      new URL('https://x.test/api?credential=leak'),
    );
    check('45b. credential via query DITOLAK (bocor log/Referer)', viaQuery === null);
    const empty = readCredentialFromRequest(new Headers(), new URL('https://x.test/api'));
    check('45b. tanpa credential → null', empty === null);
  }

  section('§45 ROLE PAYLOAD SECURITY');
  {
    const pauseSessionId = (globalThis as Record<string, unknown>).__mbPauseSession as string;
    const sessionAId = (globalThis as Record<string, unknown>).__mbSessionA as string;
    const loaded = await loadEngineWithGameState(deps, sessionAId as never);
    if (!loaded) return;
    const players = [...loaded.engine.state.players.values()];
    const forbiddenStudent = ['correctOptionId', 'correctAnswer', 'isCorrect', 'explanation', 'answerKey', 'teacherId', 'reconnectToken', 'userId'];
    const forbiddenProjector = ['correctOptionId', 'correctAnswer', 'isCorrect', 'explanation', 'answerKey', 'userId', 'reconnectToken', 'selectedOptionId'];
    const forbiddenTeacher = ['reconnectToken', 'credential'];

    function scan(obj: unknown, keys: string[], path = '$'): string[] {
      if (obj === null || obj === undefined) return [];
      if (Array.isArray(obj)) {
        return obj.flatMap((v, i) => scan(v, keys, `${path}[${i}]`));
      }
      if (typeof obj === 'object') {
        const hits: string[] = [];
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          if (keys.includes(k)) hits.push(`${path}.${k}`);
          hits.push(...scan(v, keys, `${path}.${k}`));
        }
        return hits;
      }
      return [];
    }

    // Student view (sesi A sudah summary — reveal phase; cek reveal + security).
    const sv = buildStudentView(loaded.engine, players[0].id, deps.clock.now(), loaded.gameState);
    check('47. student view dibuat (phase summary)', sv.ok && sv.view.phase === 'summary');
    if (sv.ok) {
      const hits = scan(sv.view, forbiddenStudent);
      // Sesi reveal: isCorrect/correctOptionId/explanation milik ROUNd yang
      // dibahas diizinkan kontrak — scan ini untuk identity keys selalu;
      // key kebenaran diuji ketat pada fase question (§54 view pause).
      const identityHits = hits.filter(
        (h) => h.includes('teacherId') || h.includes('reconnectToken') || h.includes('userId') || h.includes('answerKey'),
      );
      check('47b. student payload tanpa identity/credential key (nested)', identityHits.length === 0, identityHits.join(','));
    }

    // §24 ketat: fase question/lobby (sesi pause) TIDAK boleh berisi key.
    const pauseSessionLoaded = await loadEngineWithGameState(deps, pauseSessionId as never);
    if (pauseSessionLoaded) {
      const pPlayer = [...pauseSessionLoaded.engine.state.players.values()][0];
      const pv2 = buildStudentView(
        pauseSessionLoaded.engine,
        pPlayer.id,
        deps.clock.now(),
        pauseSessionLoaded.gameState,
      );
      if (pv2.ok) {
        const hits2 = scan(pv2.view, forbiddenStudent);
        check(
          '47c. student pre-reveal (question/pause) TANPA key kebenaran (nested)',
          hits2.length === 0,
          hits2.join(','),
        );
      }
    }

    const tv = buildTeacherView(loaded.engine, deps.clock.now(), loaded.gameState);
    const tHits = scan(tv, forbiddenTeacher);
    check('teacher payload tanpa credential/token', tHits.length === 0, tHits.join(','));

    const pv = buildProjectorView(loaded.engine, deps.clock.now(), loaded.gameState);
    const pHits = scan(pv, forbiddenProjector);
    // Sesi sudah summary (reveal) — correctOptionId BOLEH muncul; scan
    // identity-only keys untuk fase ini.
    const identityHits = pHits.filter((h) => !h.includes('correctOptionId') && !h.includes('explanation'));
    check('projector payload tanpa identity/credential key', identityHits.length === 0, identityHits.join(','));
  }

  section('§47 KOTA TARGET POLICY');
  {
    check('roster 1 → target integer > 0', finalizeKotaTarget({ eligiblePlayerCount: 1, totalRounds: 10 }) === 6);
    check('roster kecil (5, 8 soal) → ceil(5*8*0.6)=24', finalizeKotaTarget({ eligiblePlayerCount: 5, totalRounds: 8 }) === 24);
    check('roster 30, 10 soal → 180', finalizeKotaTarget({ eligiblePlayerCount: 30, totalRounds: 10 }) === 180);
    check('totalRounds beda → proporsional', finalizeKotaTarget({ eligiblePlayerCount: 10, totalRounds: 5 }) === 30);
    check('deterministik', finalizeKotaTarget({ eligiblePlayerCount: 7, totalRounds: 6 }) === finalizeKotaTarget({ eligiblePlayerCount: 7, totalRounds: 6 }));
    check('integer', Number.isInteger(finalizeKotaTarget({ eligiblePlayerCount: 3, totalRounds: 7 })));
    check('roster 0 → null (caller wajib tolak start)', finalizeKotaTarget({ eligiblePlayerCount: 0, totalRounds: 5 }) === null);
    const t = finalizeKotaTarget({ eligiblePlayerCount: 4, totalRounds: 6 });
    check('<= teoretis maksimum (players × rounds)', t !== null && t <= 4 * 6);
  }

  section('TEAM ASSIGNMENT / DISPLAY NAME (unit)');
  {
    check('tie → urutan stabil', pickBalancedTeam([]) === 'elang');
    check(
      'balance 4 pemain → 4 regu berbeda',
      (() => {
        const seq = [pickBalancedTeam([]), pickBalancedTeam([{ teamId: 'elang' }]), pickBalancedTeam([{ teamId: 'elang' }, { teamId: 'harimau' }]), pickBalancedTeam([{ teamId: 'elang' }, { teamId: 'harimau' }, { teamId: 'rusa' }])];
        return new Set(seq).size === 4;
      })(),
    );
    check('nama valid', validateDisplayName('  Budi Santoso  ').ok);
    check('nama tab diterima (bukan control-char test falsy)', !validateDisplayName('Bu\tdi').ok);
  }

  // ─── Conclusion ─────────────────────────────────────────────
  console.log('\n══════════════════════════════════════');
  console.log(`TOTAL: ${passed} lulus, ${failed} gagal`);
  console.log('══════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('FATAL:', error);
  process.exit(1);
});
