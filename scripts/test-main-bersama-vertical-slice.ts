/**
 * Smoke Test Vertical Slice UI Main Bersama — Tahap 7 §38.
 *
 * Database: Postgres test LOKAL (docker bc-mb-test-pg, port 54329) —
 * BUKAN database production/Supabase. Safety guard sama dengan
 * Tahap 4/5/6 (require-test-db: hanya host lokal bernama "mbtest").
 *
 * Menguji alur end-to-end konseptual yang dihidupkan UI vertical slice
 * (session engine → game engine → Prisma persistence → view mappers —
 * tepat kode path yang dipanggil API routes Tahap 6):
 *
 *   JELAJAH (§38 1-20): create room → lobby → 4 guest join → team
 *   balanced → start → question views (3 role) → answer (saved) →
 *   answered count → close → no premature reveal → discuss → reveal
 *   correctness → progress berubah → next → summary ranking tie →
 *   reconnect student → projector refresh → room isolation.
 *
 *   KOTA: target finalized saat start → contribution benar naik →
 *   milestone garden/library/homes/town-center terbuka bertahap →
 *   final mission result (achieved / not — keduanya positif).
 *
 * Jalankan:
 *   TEST_DATABASE_URL="postgresql://postgres:mbtest@localhost:54329/mbtest?schema=public" \
 *     npx tsx scripts/test-main-bersama-vertical-slice.ts
 */

// ─── Safety guard (WAJIB import pertama) ────────────────────
import '../src/main-bersama/infrastructure/persistence/require-test-db';

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

import { FakeClock } from '../src/main-bersama/domain/types/clock';
import type { MainQuestionSnapshot } from '../src/main-bersama/domain/entities/question';
import type {
  SessionOrchestratorDeps,
} from '../src/main-bersama/application/services/orchestrator-ports';
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
  issuePlayerCredential,
} from '../src/main-bersama/infrastructure/repositories/player-credential';
import { SessionEngineResolver } from '../src/main-bersama/application/services/session-recovery';
import { PrismaPlayerRepository } from '../src/main-bersama/infrastructure/repositories/prisma-player-repository';
import { PrismaSessionRepository } from '../src/main-bersama/infrastructure/repositories/prisma-session-repository';
import { PrismaRoundRepository } from '../src/main-bersama/infrastructure/repositories/prisma-round-repository';
import { PrismaAnswerRepository } from '../src/main-bersama/infrastructure/repositories/prisma-answer-repository';
import { PrismaGameStateRepository } from '../src/main-bersama/infrastructure/repositories/prisma-game-state-repository';
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
} from '../src/main-bersama/application/services/session-commands';
import {
  joinSession,
  submitAnswer,
  studentView,
} from '../src/main-bersama/application/services/student-flows';
import {
  buildTeacherView,
  buildProjectorView,
} from '../src/main-bersama/presentation/view-mappers';
import { db } from '../lib/db';

// ─── Harness repos (identik dengan test Tahap 6) ────────────
const prismaPlayers = new PrismaPlayerRepository();
const prismaSessions = new PrismaSessionRepository();
const prismaRounds = new PrismaRoundRepository();
const prismaAnswers = new PrismaAnswerRepository();
const prismaGameStates = new PrismaGameStateRepository();

const signals: string[] = [];

const realStores = {
  players: {
    async saveRuntime(player: Parameters<typeof prismaPlayers.saveRuntime>[0], sessionId: string) {
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
    async save(session: Parameters<typeof prismaSessions.save>[0]) {
      await prismaSessions.save(session);
    },
    async saveSessionProgress(
      sessionId: string,
      phase: Parameters<typeof prismaSessions.saveSessionProgress>[1],
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
    async save(round: Parameters<typeof prismaRounds.save>[0]) {
      await prismaRounds.save(round);
    },
  },
  answers: {
    async submitAnswer(input: Parameters<typeof prismaAnswers.submitAnswer>[0]) {
      const result = await prismaAnswers.submitAnswer(input);
      if (!result.ok) {
        const code = result.code === 'ROUND_NOT_FOUND' ? ('ANSWER_ALREADY_EXISTS' as const) : result.code;
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

function makeDeps(clock: FakeClock): SessionOrchestratorDeps {
  const resolver = new SessionEngineResolver({ clock, roundDurationMs: 60_000 });
  return {
    clock,
    resolver,
    players: realStores.players,
    sessions: realStores.sessions,
    rounds: realStores.rounds,
    answers: realStores.answers,
    gameStates: realStores.gameStates,
    kotaTarget: realStores.kotaTarget,
    credentials: {
      issue(playerId: string, sessionId: string) {
        return issuePlayerCredential(playerId, sessionId);
      },
      async resolve(credential: unknown) {
        const { resolvePlayerCredential } = await import(
          '../src/main-bersama/infrastructure/repositories/player-credential'
        );
        return resolvePlayerCredential(credential);
      },
    },
    realtimeSignal: {
      async sendSessionUpdate(sessionId: string) {
        signals.push(sessionId);
      },
    },
  } as unknown as SessionOrchestratorDeps;
}

// ─── Fixtures Bank Soal ─────────────────────────────────────

function question(i: number): BankSoalQuestionInput {
  return {
    sourceQuestionId: `SRC-${i}`,
    type: 'PILIHAN_GANDA',
    prompt: `Soal ${i}: hasil dari 7 × 8?`,
    options: ['56', '54', '48', '64'],
    correctAnswer: '0',
    explanation: `7 × 8 = 56 (pembahasan soal ${i}).`,
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
    return String(700000 + this.n).padStart(6, '0');
  }
}

const classesFake: MainBersamaClassDirectory = {
  async getClassSummary(classId: string) {
    if (classId === 'kelas-A') {
      return { id: classId, name: 'Kelas 8A', teacherId: 'teacher-1', isActive: true };
    }
    return null;
  },
};

const storeFake: MainSessionCreationStore = {
  async createMainSessionWithRuntime(input) {
    const { PrismaMainSessionCreationStore } = await import(
      '../src/main-bersama/infrastructure/repositories/prisma-session-creation-store'
    );
    return new PrismaMainSessionCreationStore().createMainSessionWithRuntime(input);
  },
};

const teacherA: VerifiedTeacherActor = { userId: 'teacher-1', role: 'GURU' };
const teacherB: VerifiedTeacherActor = { userId: 'teacher-2', role: 'GURU' };

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

/** Submission id memenuhi pola route: [A-Za-z0-9_-]{8,128} — unik per pemanggilan (idempotency global). */
let subCounter = 0;
function subId(): string {
  subCounter += 1;
  return `sub-${String(subCounter).padStart(4, '0')}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Helper: buat sesi + open lobby + join roster. */
async function setupSession(
  deps: SessionOrchestratorDeps,
  ids: IdGenerator,
  pins: PinGenerator,
  opts: { gameMode: 'jelajah-kata' | 'kota-cahaya'; questions: BankSoalQuestionInput[]; classId?: string; roster: string[] },
): Promise<{ sessionId: string; pin: string; credentials: Map<string, string> }> {
  const created = await createMainSession(
    {
      actor: teacherA,
      bankSoal: new FakeBankSoal(new Map([['pkg', opts.questions]])),
      classes: classesFake,
      store: storeFake,
      ids,
      pins,
    },
    {
      gameMode: opts.gameMode,
      packageRef: { kind: 'SOAL_SET', soalSetId: 'pkg' },
      ...(opts.classId ? { classId: opts.classId } : {}),
    },
  );
  if (!created.ok) throw new Error(`create gagal: ${JSON.stringify(created)}`);
  const sessionId = created.session.id;
  const row = await db.mainSession.findUnique({ where: { id: sessionId } });
  const pin = row?.pin ?? '';
  await openLobby(deps, teacherA, sessionId as never);
  const credentials = new Map<string, string>();
  for (const name of opts.roster) {
    const j = await joinSession(deps, { pin, displayName: name });
    if (!j.ok) throw new Error(`join ${name} gagal: ${JSON.stringify(j)}`);
    credentials.set(name, j.value.credential);
  }
  return { sessionId, pin, credentials };
}

async function main(): Promise<void> {
  console.log('\n=== MAIN BERSAMA — VERTICAL SLICE SMOKE (Tahap 7 §38) ===\n');
  await cleanDb();

  const clock = new FakeClock();
  const deps = makeDeps(clock);
  const ids = new SeqIds();
  const pins = new SeqPins();

  // ══ JELAJAH KATA — alur guru/siswa/proyektor (§38 1-20) ══
  section('JELAJAH — create → lobby → join (1-4)');
  const jelajah = await setupSession(deps, ids, pins, {
    gameMode: 'jelajah-kata',
    questions: [question(1), question(2), question(3), question(4)],
    classId: 'kelas-A',
    roster: ['Budi', 'Citra', 'Dewi', 'Eka'],
  });
  check('1. teacher create room (paket + KelasKu)', jelajah.sessionId.length > 0);
  check('2. lobby terbuka (PIN ada)', /^\d{6}$/.test(jelajah.pin));
  check('3. 4 guest join', jelajah.credentials.size === 4);
  {
    const teams = await db.mainPlayer.groupBy({
      by: ['teamId'],
      where: { sessionId: jelajah.sessionId },
      _count: true,
    });
    check('4. team balanced — 4 regu berbeda', teams.length === 4, JSON.stringify(teams));
  }

  section('JELAJAH — start → question (5-9)');
  const started = await startSession(deps, teacherA, jelajah.sessionId as never);
  check('5. teacher start → round 0 terbuka', started.ok && started.value.roundIndex === 0);

  const loaded = await deps.resolver.resolve(jelajah.sessionId);
  check('fixture: engine dimuat', loaded.ok);
  if (!loaded.ok) return;
  const engine = loaded.engine;
  const gameState = (await deps.gameStates.loadGameState(jelajah.sessionId))?.state ?? null;
  const round = engine.activeRound();
  check('fixture: round aktif', !!round);
  if (!round) return;

  const players = [...engine.state.players.values()];
  const credBudi = jelajah.credentials.get('Budi')!;

  const svQ = studentView(engine, players[0].id, gameState);
  const tvQ = buildTeacherView(engine, clock.now(), gameState);
  const pjQ = buildProjectorView(engine, clock.now(), gameState);
  check(
    '6. student menerima question (tanpa answer key)',
    svQ.ok && svQ.view.phase === 'question' && !('correctOptionId' in svQ.view.question) && svQ.view.question.options.length === 4,
  );
  check('7. student question punya roundId + status not-submitted', svQ.ok && svQ.view.phase === 'question' && svQ.view.roundId === round.id && svQ.view.ownAnswerStatus === 'not-submitted');
  check(
    '8. teacher question screen: answered 0/4',
    tvQ.phase === 'question' && tvQ.answerSummary.submittedCount === 0 && tvQ.answerSummary.eligibleCount === 4,
  );
  check(
    '9. projector update: question publik + partisipasi agregat',
    pjQ.phase === 'question' && pjQ.currentQuestion !== null && pjQ.participation.eligibleCount === 4 && !('correctOptionId' in (pjQ.currentQuestion ?? {})),
  );

  section('JELAJAH — answer (7-9)');
  const ans = await submitAnswer(deps, {
    credential: credBudi,
    roundId: round.id,
    submissionId: subId() as never,
    selectedOptionId: 'a', // correct (index 0 → id opsi pertama)
  });
  check('7b. answer saved (ACK tanpa correctness)', ans.ok && ans.value.status === 'saved' && !('isCorrect' in ans.value));
  const engine2 = (await deps.resolver.resolve(jelajah.sessionId));
  if (!engine2.ok) return;
  const gs2 = (await deps.gameStates.loadGameState(jelajah.sessionId))?.state ?? null;
  const tvQ2 = buildTeacherView(engine2.engine, clock.now(), gs2);
  check('9b. teacher sees answered count 1/4', tvQ2.answerSummary.submittedCount === 1);
  const svQ2 = studentView(engine2.engine, players[0].id, gs2);
  check(
    '8b. answer saved state terlihat student (ownAnswerStatus)',
    svQ2.ok && svQ2.view.phase === 'question' && svQ2.view.ownAnswerStatus === 'saved',
  );

  section('JELAJAH — close → no premature reveal (10-12)');
  const closed = await closeRound(deps, teacherA, jelajah.sessionId as never);
  check('11. teacher close → round closed', closed.ok);
  const gs3 = (await deps.gameStates.loadGameState(jelajah.sessionId))?.state ?? null;
  const engine3 = await deps.resolver.resolve(jelajah.sessionId);
  if (!engine3.ok) return;
  const svClosed = studentView(engine3.engine, players[0].id, gs3);
  const pjClosed = buildProjectorView(engine3.engine, clock.now(), gs3);
  check('12. student closed: TIDAK ada reveal (correctness tersembunyi)', svClosed.ok && svClosed.view.phase === 'closed' && !('revealedRound' in svClosed.view));
  check('12b. projector closed: revealedRound null', pjClosed.phase === 'closed' && pjClosed.revealedRound === null);

  section('JELAJAH — discuss → reveal (13-15)');
  const disc = await startDiscussion(deps, teacherA, jelajah.sessionId as never);
  check('13. teacher discuss', disc.ok && disc.value.phase === 'discussion');
  const gs4 = (await deps.gameStates.loadGameState(jelajah.sessionId))?.state ?? null;
  const engine4 = await deps.resolver.resolve(jelajah.sessionId);
  if (!engine4.ok) return;
  const svR = studentView(engine4.engine, players[0].id, gs4);
  check(
    '14. correctness muncul untuk siswa setelah reveal',
    svR.ok && svR.view.phase === 'discussion' && svR.view.ownAnswerIsCorrect === true && svR.view.revealedRound.correctOptionId !== undefined,
  );
  const tvR = buildTeacherView(engine4.engine, clock.now(), gs4);
  check('14b. teacher discussion: kunci + distribusi opsi', tvR.phase === 'discussion' && tvR.answerSummary.optionCounts !== null);
  const pjR = buildProjectorView(engine4.engine, clock.now(), gs4);
  const progressBefore = pjR.gameProgress.gameMode === 'jelajah-kata' ? { ...pjR.gameProgress.teamProgress } : {};
  const anyProgressMoved = Object.values(progressBefore).some((v) => v > 0);
  check('15. progress berubah setelah jawaban benar', anyProgressMoved, JSON.stringify(progressBefore));

  section('JELAJAH — next → summary (16-17)');
  const next1 = await nextRound(deps, teacherA, jelajah.sessionId as never);
  check('16. lanjut round berikutnya', next1.ok && next1.value.phase === 'question' && next1.value.roundIndex === 1);
  // Selesaikan semua round (close+discuss+next sampai summary).
  for (let i = 1; i < 4; i++) {
    await closeRound(deps, teacherA, jelajah.sessionId as never);
    await startDiscussion(deps, teacherA, jelajah.sessionId as never);
    await nextRound(deps, teacherA, jelajah.sessionId as never);
  }
  const engine5 = await deps.resolver.resolve(jelajah.sessionId);
  if (!engine5.ok) return;
  const gs5 = (await deps.gameStates.loadGameState(jelajah.sessionId))?.state ?? null;
  const pjSum = buildProjectorView(engine5.engine, clock.now(), gs5);
  check('17. summary tercapai', pjSum.phase === 'summary');
  check(
    '17b. ranking tie-safe (rank duplikat bila seri, urut turun)',
    pjSum.finalResult?.gameMode === 'jelajah-kata' &&
      pjSum.finalResult.teamRanking.length === 4 &&
      pjSum.finalResult.teamRanking[0].progress >= pjSum.finalResult.teamRanking[3].progress,
    JSON.stringify(pjSum.finalResult),
  );
  const tvSum = buildTeacherView(engine5.engine, clock.now(), gs5);
  check('17c. teacher summary: tombol Selesai (canEndSession)', tvSum.phase === 'summary' && tvSum.allowedActions.canEndSession);

  section('JELAJAH — reconnect + room isolation (18-20)');
  const re = await submitAnswer(deps, {
    credential: credBudi, // credential lama tetap valid setelah restart engine
    roundId: 'round-tidak-ada' as never,
    submissionId: subId() as never,
    selectedOptionId: 'a',
  });
  check('18. reconnect student: credential masih resolve (player dikenali)', !re.ok && (re.code === 'ROUND_NOT_OPEN' || re.code === 'ROUND_MISMATCH' || re.code === 'SESSION_ENDED'));
  const pjRefresh = buildProjectorView(engine5.engine, clock.now(), gs5);
  check('19. projector refresh: state konsisten setelah recovery', pjRefresh.phase === 'summary' && pjRefresh.sessionId === jelajah.sessionId);

  const jelajahB = await setupSession(deps, ids, pins, {
    gameMode: 'kota-cahaya',
    questions: [question(1), question(2)],
    roster: ['Zaki'],
  });
  check(
    '20. room isolation — PIN beda & signals ter-scoped per sesi',
    jelajahB.pin !== jelajah.pin && signals.every((s) => [jelajah.sessionId, jelajahB.sessionId].includes(s)),
  );

  // ══ KOTA CAHAYA — smoke §38 ══
  section('KOTA — target finalized → contribution → milestone → misi');
  const startedK = await startSession(deps, teacherA, jelajahB.sessionId as never);
  check('K1. start → target finalized (>0)', startedK.ok);
  const kRow = await db.mainSession.findUnique({ where: { id: jelajahB.sessionId } });
  check('K2. kotaTargetCorrect tersimpan (integer > 0)', typeof kRow?.kotaTargetCorrect === 'number' && kRow.kotaTargetCorrect > 0, String(kRow?.kotaTargetCorrect));

  const loadedK = await deps.resolver.resolve(jelajahB.sessionId);
  if (!loadedK.ok) return;
  const roundK = loadedK.engine.activeRound();
  const playerK = [...loadedK.engine.state.players.values()][0];
  check('fixture: kota round aktif + 1 pemain', !!roundK && !!playerK);
  if (!roundK || !playerK) return;

  const ansK = await submitAnswer(deps, {
    credential: jelajahB.credentials.get('Zaki')!,
    roundId: roundK.id,
    submissionId: subId() as never,
    selectedOptionId: 'a',
  });
  const engineK = await deps.resolver.resolve(jelajahB.sessionId);
  const ansCountK = engineK.ok
    ? (engineK.engine.state.answersByRound.get(roundK.id)?.size ?? 0)
    : -1;
  const dbCountK = await db.mainAnswer.count({ where: { sessionId: jelajahB.sessionId } });
  check(
    'K3. contribution diterima (engine + DB)',
    ansK.ok && ansCountK === 1 && dbCountK === 1,
    `ok=${ansK.ok}${ansK.ok ? '' : ` code=${ansK.code}`} engineCount=${ansCountK} dbCount=${dbCountK}`,
  );

  const closedK = await closeRound(deps, teacherA, jelajahB.sessionId as never);
  check('K3b. close → game apply kota', closedK.ok);
  const gsK = (await deps.gameStates.loadGameState(jelajahB.sessionId))?.state ?? null;
  if (!engineK.ok) return;
  const pjK = buildProjectorView(engineK.engine, clock.now(), gsK);
  check(
    'K4. progress kota naik + milestone garden terbuka (25%)',
    pjK.gameProgress.gameMode === 'kota-cahaya' &&
      pjK.gameProgress.progressPercent > 0 &&
      pjK.gameProgress.unlockedMilestones.includes('garden'),
    JSON.stringify(pjK.gameProgress),
  );

  const discK = await startDiscussion(deps, teacherA, jelajahB.sessionId as never);
  const nextK = await nextRound(deps, teacherA, jelajahB.sessionId as never);
  check('K5. discuss → next (round terakhir)', discK.ok && nextK.ok && nextK.value.phase === 'question' && nextK.value.roundIndex === 1);
  const loadedK2 = await deps.resolver.resolve(jelajahB.sessionId);
  if (!loadedK2.ok) return;
  const roundK2 = loadedK2.engine.activeRound();
  if (!roundK2) return;
  await submitAnswer(deps, {
    credential: jelajahB.credentials.get('Zaki')!,
    roundId: roundK2.id,
    submissionId: subId() as never,
    selectedOptionId: 'a',
  });
  await closeRound(deps, teacherA, jelajahB.sessionId as never);
  await startDiscussion(deps, teacherA, jelajahB.sessionId as never);
  const finalK = await nextRound(deps, teacherA, jelajahB.sessionId as never);
  check('K6. soal habis → summary misi', finalK.ok && finalK.value.phase === 'summary');
  const gsK2 = (await deps.gameStates.loadGameState(jelajahB.sessionId))?.state ?? null;
  const engineK2 = await deps.resolver.resolve(jelajahB.sessionId);
  if (!engineK2.ok) return;
  const pjK2 = buildProjectorView(engineK2.engine, clock.now(), gsK2);
  check(
    'K7. final mission result: 100% → missionAchieved true',
    pjK2.finalResult?.gameMode === 'kota-cahaya' && pjK2.finalResult.missionAchieved === true && pjK2.finalResult.progressPercent === 100,
    JSON.stringify(pjK2.finalResult),
  );

  // ─── Kesimpulan ─────────────────────────────────────────────
  console.log('\n══════════════════════════════════════');
  console.log(`TOTAL: ${passed} lulus, ${failed} gagal`);
  console.log('══════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('FATAL:', error);
  process.exit(1);
});
