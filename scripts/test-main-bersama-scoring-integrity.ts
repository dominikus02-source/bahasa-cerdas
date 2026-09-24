/**
 * MAIN BERSAMA — SCORING INTEGRITY (rejected submission ≠ game state)
 *
 * Database: Postgres test LOKAL (docker bc-mb-test-pg, port 54329) —
 * BUKAN database production/Supabase. Safety guard sama dengan Tahap
 * 4/5/6 (require-test-db: hanya host lokal bernama "mbtest").
 *
 * INVARIANT YANG DIUJI
 *   "Hanya jawaban yang DITERIMA (persisted) boleh mengubah game state."
 *   Sebuah submission yang ditolak route/hasil aplikasi (4xx validation,
 *   SUBMISSION_ID_CONFLICT, credential invalid, phase tertutup, …) TIDAK
 *   boleh: menambah MainAnswer, mengubah correctContribution/progress,
 *   membuka milestone, atau memancarkan sinyal state-changing.
 *
 * Bug yang direproduksi (kelas A/D dari spec §5):
 *   engine.submitAnswer() memutasi state SEBELUM persistence; saat DB
 *   menolak (ledger submissionId global UNIQUE vs attempt engine
 *   per-round), mutasi "hantu" tetap tinggal di cache engine
 *   in-process (SessionEngineResolver) dan ikut terhitung saat
 *   close-round.
 *
 * Jalankan:
 *   TEST_DATABASE_URL="postgresql://postgres:mbtest@localhost:54329/mbtest?schema=public" \
 *     npx tsx scripts/test-main-bersama-scoring-integrity.ts
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
import type { SessionEngine } from '../src/main-bersama/application/services/session-engine';
import type { SessionOrchestratorDeps } from '../src/main-bersama/application/services/orchestrator-ports';
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
  resolvePlayerCredential,
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
} from '../src/main-bersama/application/services/student-flows';
import { buildProjectorView } from '../src/main-bersama/presentation/view-mappers';
import { db } from '../lib/db';

// ─── Harness repos (pola sama dengan vertical slice Tahap 7) ──
const prismaPlayers = new PrismaPlayerRepository();
const prismaSessions = new PrismaSessionRepository();
const prismaRounds = new PrismaRoundRepository();
const prismaAnswers = new PrismaAnswerRepository();
const prismaGameStates = new PrismaGameStateRepository();

const realStores = {
  players: {
    async saveRuntime(
      player: Parameters<typeof prismaPlayers.saveRuntime>[0],
      sessionId: string,
    ) {
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
        const code =
          result.code === 'ROUND_NOT_FOUND'
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

/** Sinyal realtime dicatat — untuk menguji "broadcast hantu" (§L). */
let signals: string[] = [];

function makeDeps(
  clock: FakeClock,
  resolver: SessionEngineResolver,
): SessionOrchestratorDeps {
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

// ─── Fixtures Bank Soal (fake — tidak menyentuh modul Bank Soal) ──

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
    return { ok: true, contentTitle: 'Antonim', questions: qs.map((q) => ({ ...q })) };
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
    return String(810000 + this.n).padStart(6, '0');
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

let subCounter = 0;
function subId(): string {
  subCounter += 1;
  return `sub-${String(subCounter).padStart(4, '0')}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

// ─── Evidence / invariant helpers ───────────────────────────

/** Jumlah baris MainAnswer (accepted) untuk sesi / round. */
async function dbAnswerCount(sessionId: string, roundId?: string): Promise<number> {
  return db.mainAnswer.count({
    where: roundId ? { sessionId, roundId } : { sessionId },
  });
}

/** Fingerprint state jawaban engine (deteksi mutasi hantu). */
function engineAnswerFingerprint(engine: SessionEngine): string {
  const parts: string[] = [];
  for (const [roundId, map] of engine.state.answersByRound.entries()) {
    const entries = [...map.values()]
      .map((a) => `${a.playerId}:${a.isCorrect ? 'C' : 'W'}:${a.submissionId}`)
      .sort();
    parts.push(`${roundId}[${entries.join(',')}]`);
  }
  return parts.sort().join('|');
}

/**
 * INVARIANT §7 — set jawaban accepted di ENGINE harus setara dengan
 * set baris MAIN ANSWER persisted (identitas pemain + kebenaran).
 * Menangkap "hantu" (engine punya jawaban yang tidak ada di DB) maupun
 * kehilangan (DB punya jawaban yang engine tidak lihat).
 */
async function consistencyMismatch(
  sessionId: string,
  engine: SessionEngine,
): Promise<string | null> {
  const rows = await db.mainAnswer.findMany({
    where: { sessionId },
    orderBy: { submittedAt: 'asc' },
  });
  const normalize = (list: { playerId: string; isCorrect: boolean }[]) =>
    list
      .map((a) => `${a.playerId}:${a.isCorrect ? 'C' : 'W'}`)
      .sort()
      .join(',');

  const dbByRound = new Map<string, { playerId: string; isCorrect: boolean }[]>();
  for (const row of rows) {
    const list = dbByRound.get(row.roundId) ?? [];
    list.push({ playerId: row.playerId, isCorrect: row.isCorrect });
    dbByRound.set(row.roundId, list);
  }

  const engineByRound = new Map<string, { playerId: string; isCorrect: boolean }[]>();
  for (const [roundId, map] of engine.state.answersByRound.entries()) {
    engineByRound.set(
      roundId,
      [...map.values()].map((a) => ({ playerId: a.playerId, isCorrect: a.isCorrect })),
    );
  }

  const roundIds = new Set([...dbByRound.keys(), ...engineByRound.keys()]);
  for (const roundId of roundIds) {
    const dbSide = normalize(dbByRound.get(roundId) ?? []);
    const engineSide = normalize(engineByRound.get(roundId) ?? []);
    if (dbSide !== engineSide) {
      return `round ${roundId}: engine=[${engineSide}] db=[${dbSide}]`;
    }
  }
  return null;
}

interface SetupResult {
  sessionId: string;
  pin: string;
  credentials: Map<string, string>;
}

async function setupSession(
  deps: SessionOrchestratorDeps,
  ids: IdGenerator,
  pins: PinGenerator,
  opts: {
    gameMode: 'jelajah-kata' | 'kota-cahaya';
    questions: BankSoalQuestionInput[];
    roster: string[];
  },
): Promise<SetupResult> {
  const created = await createMainSession(
    {
      actor: teacherA,
      bankSoal: new FakeBankSoal(new Map([['pkg', opts.questions]])),
      classes: classesFake,
      store: storeFake,
      ids,
      pins,
    },
    { gameMode: opts.gameMode, packageRef: { kind: 'SOAL_SET', soalSetId: 'pkg' } },
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

async function kotaState(sessionId: string) {
  const gs = await realStores.gameStates.loadGameState(sessionId);
  if (!gs || gs.gameMode !== 'kota-cahaya') return null;
  const state = gs.state as {
    kota: { correctContribution: number; target: number; progressPercent: number; unlockedMilestones: string[] };
  };
  return state.kota;
}

async function main(): Promise<void> {
  console.log('\n=== MAIN BERSAMA — SCORING INTEGRITY ===\n');
  await cleanDb();

  const clock = new FakeClock();
  const resolver = new SessionEngineResolver({ clock, roundDurationMs: 60_000 });
  const deps = makeDeps(clock, resolver);
  const ids = new SeqIds();
  const pins = new SeqPins();

  // ══════════════════════════════════════════════════════════
  // S1 — KOTA CAHAYA: reproduksi utama + matrix A/B/C/E/F/G/H/I/J/K/L/M/N
  // ══════════════════════════════════════════════════════════
  section('S1 KOTA — setup (2 pemain, 6 round → target 8)');
  const s1 = await setupSession(deps, ids, pins, {
    gameMode: 'kota-cahaya',
    questions: Array.from({ length: 6 }, (_, i) => question(i + 1)),
    roster: ['Adi', 'Bila'],
  });
  const started = await startSession(deps, teacherA, s1.sessionId as never);
  check('§0 start sesi kota', started.ok);
  const s1Row = await db.mainSession.findUnique({ where: { id: s1.sessionId } });
  check(
    '§0 target kota difinalisasi = 8 (2 pemain × 6 round × 0.6)',
    s1Row?.kotaTargetCorrect === 8,
    String(s1Row?.kotaTargetCorrect),
  );

  const credAdi = s1.credentials.get('Adi')!;
  const credBila = s1.credentials.get('Bila')!;
  let engine = (await deps.resolver.resolve(s1.sessionId as never));
  if (!engine.ok) return;
  const r0 = engine.engine.activeRound();
  if (!r0) return;
  const adi = [...engine.engine.state.players.values()].find((p) => p.displayName === 'Adi')!;
  const bila = [...engine.engine.state.players.values()].find((p) => p.displayName === 'Bila')!;

  section('S1 rejections sebelum jawaban valid — H / I / J');
  {
    const fpBefore = engineAnswerFingerprint(engine.engine);
    const sigBefore = signals.length;
    const invalid = await submitAnswer(deps, {
      credential: credAdi,
      roundId: r0.id,
      submissionId: subId() as never,
      selectedOptionId: 'zzz',
    });
    check(
      'H. opsi invalid ditolak + engine snapshot tidak berubah',
      !invalid.ok &&
        invalid.code === 'INVALID_OPTION' &&
        engineAnswerFingerprint(engine.engine) === fpBefore &&
        signals.length === sigBefore &&
        (await dbAnswerCount(s1.sessionId)) === 0,
      invalid.ok ? 'unexpected ok' : `code=${invalid.code}`,
    );

    const badCred = await submitAnswer(deps, {
      credential: 'not-a-credential',
      roundId: r0.id,
      submissionId: subId() as never,
      selectedOptionId: 'a',
    });
    check(
      'J. credential invalid ditolak tanpa efek samping game state',
      !badCred.ok &&
        badCred.code === 'CREDENTIAL_INVALID' &&
        engineAnswerFingerprint(engine.engine) === fpBefore &&
        (await dbAnswerCount(s1.sessionId)) === 0,
      badCred.ok ? 'unexpected ok' : `code=${badCred.code}`,
    );

    // Reject karena phase tertutup (round 0 belum ditutup → pakai round
    // yang tidak ada? Tidak: uji phase tertutup dilakukan setelah close).
  }

  section('S1 A/B — jawaban valid + konflik submissionId (round yang sama)');
  const S_A = subId();
  const answerA = await submitAnswer(deps, {
    credential: credAdi,
    roundId: r0.id,
    submissionId: S_A as never,
    selectedOptionId: 'a', // benar
  });
  check(
    'A. satu jawaban benar → persisted sekali (engine + DB)',
    answerA.ok &&
      answerA.value.status === 'saved' &&
      (await dbAnswerCount(s1.sessionId, r0.id)) === 1 &&
      engine.engine.getRoundFacts(r0.id)?.correctCount === 1,
    answerA.ok ? `status=${answerA.value.status}` : `code=${answerA.code}`,
  );

  {
    const fpBefore = engineAnswerFingerprint(engine.engine);
    const dbBefore = await dbAnswerCount(s1.sessionId);
    const sigBefore = signals.length;
    const conflictSameRound = await submitAnswer(deps, {
      credential: credBila,
      roundId: r0.id,
      submissionId: S_A as never,
      selectedOptionId: 'a',
    });
    check(
      'B. SUBMISSION_ID_CONFLICT (engine-level) → no MainAnswer, no kontribusi',
      !conflictSameRound.ok &&
        conflictSameRound.code === 'SUBMISSION_ID_CONFLICT' &&
        (await dbAnswerCount(s1.sessionId)) === dbBefore &&
        engineAnswerFingerprint(engine.engine) === fpBefore &&
        signals.length === sigBefore,
      conflictSameRound.ok ? 'unexpected ok' : `code=${conflictSameRound.code}`,
    );
    const factsR0 = engine.engine.getRoundFacts(r0.id);
    const ksBeforeClose = await kotaState(s1.sessionId);
    check(
      'D. ditolak saat kontribusi round masih 0 → 0 jawaban utk penolak, kontribusi tetap 0',
      factsR0?.submittedCount === 1 &&
        factsR0.correctCount === 1 &&
        !engine.engine
          .getRoundAnswers(r0.id)
          .some((a) => a.playerId === bila.id) &&
        ksBeforeClose?.correctContribution === 0,
      `facts=${JSON.stringify(factsR0)} kota=${JSON.stringify(ksBeforeClose)}`,
    );

    // E — retry identik SELAGI round masih aktif (idempotency in-round).
    const dbBeforeRetry = await dbAnswerCount(s1.sessionId);
    const fpBeforeRetry = engineAnswerFingerprint(engine.engine);
    const retrySameRound = await submitAnswer(deps, {
      credential: credAdi,
      roundId: r0.id,
      submissionId: S_A as never,
      selectedOptionId: 'a',
    });
    check(
      'E. retry identik (round aktif) → ok/already-saved, tidak double-contribute',
      retrySameRound.ok &&
        retrySameRound.value.status === 'already-saved' &&
        (await dbAnswerCount(s1.sessionId)) === dbBeforeRetry &&
        engineAnswerFingerprint(engine.engine) === fpBeforeRetry,
      retrySameRound.ok ? `status=${retrySameRound.value.status}` : `code=${retrySameRound.code}`,
    );
  }

  section('S1 close round 0 → kontribusi 1, milestone belum terbuka');
  await closeRound(deps, teacherA, s1.sessionId as never);
  {
    const ks = await kotaState(s1.sessionId);
    check(
      '§N. kontribusi = 1 jawaban benar accepted (progress 12.5%)',
      ks !== null && ks.correctContribution === 1 && ks.progressPercent === 12.5,
      JSON.stringify(ks),
    );
    check(
      'K. milestone belum terbuka di 12.5% (garden = 25%)',
      ks !== null && !ks.unlockedMilestones.includes('garden'),
      JSON.stringify(ks?.unlockedMilestones),
    );
  }

  section('S1 I — submission saat phase tertutup ditolak tanpa efek');
  {
    const fpBefore = engineAnswerFingerprint(engine.engine);
    const sigBefore = signals.length;
    const closedPhase = await submitAnswer(deps, {
      credential: credAdi,
      roundId: r0.id,
      submissionId: subId() as never,
      selectedOptionId: 'a',
    });
    check(
      'I. phase tertutup → ROUND_NOT_OPEN, snapshot engine tidak berubah',
      !closedPhase.ok &&
        closedPhase.code === 'ROUND_NOT_OPEN' &&
        engineAnswerFingerprint(engine.engine) === fpBefore &&
        signals.length === sigBefore,
      closedPhase.ok ? 'unexpected ok' : `code=${closedPhase.code}`,
    );
  }

  await startDiscussion(deps, teacherA, s1.sessionId as never);
  await nextRound(deps, teacherA, s1.sessionId as never);
  engine = (await deps.resolver.resolve(s1.sessionId as never));
  if (!engine.ok) return;
  const r1 = engine.engine.activeRound();
  if (!r1) return;

  section('S1 C/N — REPRODUKSI BUG: submissionId dipakai ulang di round lain');
  {
    const dbBefore = await dbAnswerCount(s1.sessionId);
    const sigBefore = signals.length;
    const conflictCrossRound = await submitAnswer(deps, {
      credential: credBila,
      roundId: r1.id,
      submissionId: S_A as never, // ID sudah dipakai Adi di round 0
      selectedOptionId: 'a', // benar → phantom = +1 kontribusi
    });
    check(
      'C1. route menolak dengan 409 SUBMISSION_ID_CONFLICT (kontrak tidak diubah)',
      !conflictCrossRound.ok && conflictCrossRound.code === 'SUBMISSION_ID_CONFLICT',
      conflictCrossRound.ok ? 'unexpected ok' : `code=${conflictCrossRound.code}`,
    );
    check(
      'C2. submission ditolak → TIDAK menambah MainAnswer',
      (await dbAnswerCount(s1.sessionId)) === dbBefore,
      `before=${dbBefore} after=${await dbAnswerCount(s1.sessionId)}`,
    );
    check(
      'L. submission ditolak → TIDAK ada sinyal state-changing',
      signals.length === sigBefore,
      `signals ${sigBefore} → ${signals.length}`,
    );
    const mismatch = await consistencyMismatch(s1.sessionId, engine.engine);
    check(
      'C3. engine TIDAK menyimpan jawaban hantu (engine ≡ DB)',
      mismatch === null,
      mismatch ?? '',
    );
  }

  section('S1 C/N — close round 1 → kontribusi HARUS tetap 1');
  await closeRound(deps, teacherA, s1.sessionId as never);
  {
    const ks = await kotaState(s1.sessionId);
    check(
      'C4. kontribusi tetap 1 (bukan 2) — progress 12.5% (bukan 25%)',
      ks !== null && ks.correctContribution === 1 && ks.progressPercent === 12.5,
      JSON.stringify(ks),
    );
    const engineAfter = await deps.resolver.resolve(s1.sessionId as never);
    if (engineAfter.ok) {
      const mismatch = await consistencyMismatch(s1.sessionId, engineAfter.engine);
      check('N. setelah close: engine ≡ DB (accepted answer set)', mismatch === null, mismatch ?? '');
    }
    const pj = buildProjectorView(
      engine.engine,
      clock.now(),
      (await realStores.gameStates.loadGameState(s1.sessionId))?.state as never,
    );
    check(
      'K2. projector: progress 12.5% + milestone tetap kosong',
      pj.gameProgress.gameMode === 'kota-cahaya' &&
        pj.gameProgress.progressPercent === 12.5 &&
        pj.gameProgress.unlockedMilestones.length === 0,
      JSON.stringify(pj.gameProgress),
    );
  }

  section('S1 E2 — retry round yang sudah non-aktif (kontrak ROUND_MISMATCH)');
  {
    const dbBefore = await dbAnswerCount(s1.sessionId);
    const retryOldRound = await submitAnswer(deps, {
      credential: credAdi,
      roundId: r0.id,
      submissionId: S_A as never,
      selectedOptionId: 'a',
    });
    check(
      'E2. retry round lama → ditolak (ROUND_MISMATCH), tidak double-contribute',
      !retryOldRound.ok &&
        (retryOldRound.code === 'ROUND_MISMATCH' || retryOldRound.code === 'ROUND_NOT_OPEN') &&
        (await dbAnswerCount(s1.sessionId)) === dbBefore,
      retryOldRound.ok ? 'unexpected ok' : `code=${retryOldRound.code}`,
    );
  }

  await startDiscussion(deps, teacherA, s1.sessionId as never);
  await nextRound(deps, teacherA, s1.sessionId as never);
  engine = (await deps.resolver.resolve(s1.sessionId as never));
  if (!engine.ok) return;
  const r2 = engine.engine.activeRound();
  if (!r2) return;

  section('S1 F — jawaban salah tetap persisted, kontribusi tidak naik');
  {
    const wrong = await submitAnswer(deps, {
      credential: credAdi,
      roundId: r2.id,
      submissionId: subId() as never,
      selectedOptionId: 'b', // salah
    });
    check(
      'F1. jawaban salah → saved (kontrak existing)',
      wrong.ok && wrong.value.status === 'saved',
      wrong.ok ? `status=${wrong.value.status}` : `code=${wrong.code}`,
    );
    check('F2. baris MainAnswer bertambah (tersimpan)', (await dbAnswerCount(s1.sessionId, r2.id)) === 1);
    await closeRound(deps, teacherA, s1.sessionId as never);
    const ks = await kotaState(s1.sessionId);
    check(
      'F3. correctContribution tidak berubah oleh jawaban salah',
      ks !== null && ks.correctContribution === 1,
      JSON.stringify(ks),
    );
  }

  await startDiscussion(deps, teacherA, s1.sessionId as never);
  await nextRound(deps, teacherA, s1.sessionId as never);
  engine = (await deps.resolver.resolve(s1.sessionId as never));
  if (!engine.ok) return;
  const r3 = engine.engine.activeRound();
  if (!r3) return;

  section('S1 G — dua jawaban benar distinct → kontribusi 2');
  {
    const gAdi = await submitAnswer(deps, {
      credential: credAdi,
      roundId: r3.id,
      submissionId: subId() as never,
      selectedOptionId: 'a',
    });
    const gBila = await submitAnswer(deps, {
      credential: credBila,
      roundId: r3.id,
      submissionId: subId() as never,
      selectedOptionId: 'a',
    });
    check(
      'G1. dua jawaban benar distinct tersimpan (DB 2)',
      gAdi.ok && gBila.ok && (await dbAnswerCount(s1.sessionId, r3.id)) === 2,
    );
    await closeRound(deps, teacherA, s1.sessionId as never);
    const ks = await kotaState(s1.sessionId);
    check(
      'G2. kontribusi 1 + 2 = 3 (skor sah TIDAK ditekan)',
      ks !== null && ks.correctContribution === 3,
      JSON.stringify(ks),
    );
  }

  await startDiscussion(deps, teacherA, s1.sessionId as never);
  await nextRound(deps, teacherA, s1.sessionId as never);
  engine = (await deps.resolver.resolve(s1.sessionId as never));
  if (!engine.ok) return;
  const r4 = engine.engine.activeRound();
  if (!r4) return;

  section('S1 M — retry/race submissionId sama: paling banyak satu mutasi');
  {
    const S_M = subId();
    const [m1, m2] = await Promise.all([
      submitAnswer(deps, {
        credential: credAdi,
        roundId: r4.id,
        submissionId: S_M as never,
        selectedOptionId: 'a',
      }),
      submitAnswer(deps, {
        credential: credAdi,
        roundId: r4.id,
        submissionId: S_M as never,
        selectedOptionId: 'a',
      }),
    ]);
    const accepted = (m1.ok ? 1 : 0) + (m2.ok ? 1 : 0);
    check(
      'M1. dua submit identik bersamaan → keduanya diterima secara kontrak',
      accepted === 2,
      `m1=${m1.ok ? m1.value.status : m1.code} m2=${m2.ok ? m2.value.status : m2.code}`,
    );
    check(
      'M2. hanya SATU baris MainAnswer dibuat',
      (await dbAnswerCount(s1.sessionId, r4.id)) === 1,
      `rows=${await dbAnswerCount(s1.sessionId, r4.id)}`,
    );
    const resolved = await deps.resolver.resolve(s1.sessionId as never);
    const mismatch = resolved.ok ? await consistencyMismatch(s1.sessionId, resolved.engine) : 'resolve gagal';
    check('M3. engine ≡ DB setelah race', mismatch === null, mismatch ?? '');
    await closeRound(deps, teacherA, s1.sessionId as never);
    const ks = await kotaState(s1.sessionId);
    check(
      'M4. race tidak double-contribute (kontribusi 3 + 1 = 4)',
      ks !== null && ks.correctContribution === 4,
      JSON.stringify(ks),
    );
  }

  section('S1 N — konsistensi final engine ≡ DB');
  {
    const resolved = await deps.resolver.resolve(s1.sessionId as never);
    const mismatch = resolved.ok ? await consistencyMismatch(s1.sessionId, resolved.engine) : 'resolve gagal';
    check('N1. set accepted answer engine ≡ DB (5 baris, 4 berkontribusi)', mismatch === null, mismatch ?? '');
    check(
      'N2. total MainAnswer = 5 (1 benar r0 + 1 salah r2 + 2 benar r3 + 1 benar r4)',
      (await dbAnswerCount(s1.sessionId)) === 5,
      String(await dbAnswerCount(s1.sessionId)),
    );
  }

  // ══════════════════════════════════════════════════════════
  // S2 — KOTA dengan CACHE ENGINE BASI (simulasi multi-instance)
  //      membuktikan penolakan tidak meninggalkan hantu + konsisten
  // ══════════════════════════════════════════════════════════
  section('S2 KOTA — cache engine basi (instance lain menulis ke DB)');
  {
    signals = [];
    const resolverX = new SessionEngineResolver({ clock, roundDurationMs: 60_000 });
    const resolverY = new SessionEngineResolver({ clock, roundDurationMs: 60_000 });
    const depsX = makeDeps(clock, resolverX);
    const depsY = makeDeps(clock, resolverY);

    const s2 = await setupSession(depsX, ids, pins, {
      gameMode: 'kota-cahaya',
      questions: [question(1), question(2)],
      roster: ['Citra', 'Dewi'],
    });
    await startSession(depsX, teacherA, s2.sessionId as never);

    // X memuat engine SEBELUM ada jawaban (cache basi).
    const primeX = await depsX.resolver.resolve(s2.sessionId as never);
    if (!primeX.ok) return;
    const roundX = primeX.engine.activeRound();
    if (!roundX) return;
    // Citra menjawab lewat instance Y → DB terisi, cache X tetap basi.
    const S2_ID = subId();
    const viaY = await submitAnswer(depsY, {
      credential: s2.credentials.get('Citra')!,
      roundId: roundX.id,
      submissionId: S2_ID as never,
      selectedOptionId: 'a',
    });
    check('S2-1. instance Y menyimpan jawaban benar Citra', viaY.ok, viaY.ok ? '' : `code=${viaY.code}`);
    check('S2-2. DB punya 1 baris', (await dbAnswerCount(s2.sessionId)) === 1);

    // Dewi mengirim submissionId YANG SAMA via instance X (cache basi).
    const viaX = await submitAnswer(depsX, {
      credential: s2.credentials.get('Dewi')!,
      roundId: roundX.id,
      submissionId: S2_ID as never,
      selectedOptionId: 'a',
    });
    check(
      'S2-3. instance X menolak 409 SUBMISSION_ID_CONFLICT',
      !viaX.ok && viaX.code === 'SUBMISSION_ID_CONFLICT',
      viaX.ok ? 'unexpected ok' : `code=${viaX.code}`,
    );
    check(
      'S2-4. penolakan tidak menambah baris MainAnswer',
      (await dbAnswerCount(s2.sessionId)) === 1,
      String(await dbAnswerCount(s2.sessionId)),
    );

    // Close lewat instance X — hantu (bila ada) akan ikut terhitung.
    await closeRound(depsX, teacherA, s2.sessionId as never);
    const resolvedX = await depsX.resolver.resolve(s2.sessionId as never);
    const mismatch = resolvedX.ok ? await consistencyMismatch(s2.sessionId, resolvedX.engine) : 'resolve gagal';
    check(
      'S2-5. engine (instance X) ≡ DB: hanya jawaban PERSISTED yang terlihat',
      mismatch === null,
      mismatch ?? '',
    );
    const ks2 = await kotaState(s2.sessionId);
    check(
      'S2-6. kontribusi = 1 (jawaban benar Citra yang accepted)',
      ks2 !== null && ks2.correctContribution === 1,
      JSON.stringify(ks2),
    );
  }

  // ══════════════════════════════════════════════════════════
  // S3 — JELAJAH (§10): jawaban ditolak tidak boleh memajukan regu
  // ══════════════════════════════════════════════════════════
  section('S3 JELAJAH — submission ditolak tidak memajukan regu');
  {
    signals = [];
    const resolver3 = new SessionEngineResolver({ clock, roundDurationMs: 60_000 });
    const deps3 = makeDeps(clock, resolver3);

    const s3 = await setupSession(deps3, ids, pins, {
      gameMode: 'jelajah-kata',
      questions: [question(1), question(2), question(3)],
      roster: ['Eka', 'Fajar'],
    });
    await startSession(deps3, teacherA, s3.sessionId as never);

    const loaded3 = await deps3.resolver.resolve(s3.sessionId as never);
    if (!loaded3.ok) return;
    const jr0 = loaded3.engine.activeRound();
    if (!jr0) return;

    const S_J = subId();
    const jelajahOK = await submitAnswer(deps3, {
      credential: s3.credentials.get('Eka')!,
      roundId: jr0.id,
      submissionId: S_J as never,
      selectedOptionId: 'a',
    });
    check('S3-1. jawaban benar Eka tersimpan', jelajahOK.ok, jelajahOK.ok ? '' : `code=${jelajahOK.code}`);

    await closeRound(deps3, teacherA, s3.sessionId as never);
    await startDiscussion(deps3, teacherA, s3.sessionId as never);
    await nextRound(deps3, teacherA, s3.sessionId as never);

    const loaded3b = await deps3.resolver.resolve(s3.sessionId as never);
    if (!loaded3b.ok) return;
    const jr1 = loaded3b.engine.activeRound();
    if (!jr1) return;

    const progressBefore = await teamProgressSnapshot(deps3, s3.sessionId);

    const jelajahReject = await submitAnswer(deps3, {
      credential: s3.credentials.get('Fajar')!,
      roundId: jr1.id,
      submissionId: S_J as never, // ID dipakai ulang dari round 0
      selectedOptionId: 'a',
    });
    check(
      'S3-2. submission ditolak 409 SUBMISSION_ID_CONFLICT',
      !jelajahReject.ok && jelajahReject.code === 'SUBMISSION_ID_CONFLICT',
      jelajahReject.ok ? 'unexpected ok' : `code=${jelajahReject.code}`,
    );
    const mismatchJ = await consistencyMismatch(s3.sessionId, loaded3b.engine);
    check('S3-3. tidak ada jawaban hantu di engine Jelajah', mismatchJ === null, mismatchJ ?? '');

    await closeRound(deps3, teacherA, s3.sessionId as never);
    const progressAfter = await teamProgressSnapshot(deps3, s3.sessionId);
    check(
      'S3-4. progress regu TIDAK berubah oleh submission ditolak',
      JSON.stringify(progressBefore) === JSON.stringify(progressAfter),
      `${JSON.stringify(progressBefore)} → ${JSON.stringify(progressAfter)}`,
    );
  }

  console.log('\n══════════════════════════════════════');
  console.log(`TOTAL: ${passed} lulus, ${failed} gagal`);
  console.log('══════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

async function teamProgressSnapshot(
  deps: SessionOrchestratorDeps,
  sessionId: string,
): Promise<Record<string, number>> {
  const gs = await deps.gameStates.loadGameState(sessionId);
  const engine = await deps.resolver.resolve(sessionId as never);
  if (!engine.ok) return {};
  const view = buildProjectorView(engine.engine, new Date(), gs?.state as never);
  if (view.gameProgress.gameMode !== 'jelajah-kata') return {};
  return { ...view.gameProgress.teamProgress };
}

main().catch((error) => {
  console.error('FATAL:', error);
  process.exit(1);
});
