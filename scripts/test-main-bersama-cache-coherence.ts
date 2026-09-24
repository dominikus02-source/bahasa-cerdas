/**
 * MAIN BERSAMA — ENGINE CACHE COHERENCE (cross-instance)
 *
 * Database: Postgres test LOKAL (docker bc-mb-test-pg, port 54329) —
 * BUKAN database production/Supabase. Safety guard sama dengan Tahap
 * 4/5/6 (require-test-db: hanya host lokal bernama "mbtest").
 *
 * RISIKO YANG DIUJI (residual B):
 *   Instance A mem-persist jawaban accepted ke DB (MainAnswer), tetapi
 *   instance B masih memegang SessionEngine BASI (cache in-process).
 *   Bila B menutup round memakai cache basi, buildRoundFacts /
 *   getRoundAnswers UNDER-COUNT jawaban yang sah.
 *
 * INVARIANT TERKUNCI:
 *   "Pada close-round, setiap jawaban accepted yang relevan dengan
 *    round tsb berkontribusi TEPAT SEKALI, tanpa peduli instance mana
 *    yang menerima submit-answer dan mana yang menerima close-round."
 *
 * Matrix §11 (A–N) memakai function PRODUKSI nyata (createMainSession,
 * openLobby, joinSession, startSession, submitAnswer, closeRound,
 * startDiscussion, nextRound) + resolver terpisah untuk mensimulasikan
 * dua proses.
 *
 * Jalankan:
 *   TEST_DATABASE_URL="postgresql://postgres:mbtest@localhost:54329/mbtest?schema=public" \
 *     npx tsx scripts/test-main-bersama-cache-coherence.ts
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
import { joinSession, submitAnswer } from '../src/main-bersama/application/services/student-flows';
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
      async sendSessionUpdate() {
        /* no-op pada test */
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
    return String(830000 + this.n).padStart(6, '0');
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
  return `cc-${String(subCounter).padStart(4, '0')}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

interface SetupResult {
  sessionId: string;
  credentials: Map<string, string>;
  players: Map<string, string>; // displayName → playerId
  teams: Map<string, string | undefined>; // playerId → teamId
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
  await openLobby(deps, teacherA, sessionId as never);
  const credentials = new Map<string, string>();
  for (const name of opts.roster) {
    const j = await joinSession(deps, { pin: row?.pin ?? '', displayName: name });
    if (!j.ok) throw new Error(`join ${name} gagal: ${JSON.stringify(j)}`);
    credentials.set(name, j.value.credential);
  }
  const playerRows = await db.mainPlayer.findMany({ where: { sessionId } });
  const players = new Map<string, string>();
  const teams = new Map<string, string | undefined>();
  for (const p of playerRows) {
    players.set(p.displayName, p.id);
    teams.set(p.id, p.teamId ?? undefined);
  }
  return { sessionId, credentials, players, teams };
}

async function kotaState(sessionId: string) {
  const gs = await realStores.gameStates.loadGameState(sessionId);
  if (!gs || gs.gameMode !== 'kota-cahaya') return null;
  const state = gs.state as {
    kota: { correctContribution: number; progressPercent: number; unlockedMilestones: string[] };
  };
  return state.kota;
}

async function teamProgress(
  sessionId: string,
  engine: SessionEngine,
): Promise<Record<string, number>> {
  const gs = await realStores.gameStates.loadGameState(sessionId);
  const view = buildProjectorView(engine, new Date(), gs?.state as never);
  if (view.gameProgress.gameMode !== 'jelajah-kata') return {};
  return { ...view.gameProgress.teamProgress };
}

async function dbAnswerCount(sessionId: string): Promise<number> {
  return db.mainAnswer.count({ where: { sessionId } });
}

/** Set accepted answer DB vs set jawaban engine (konsistensi §N). */
async function mismatch(sessionId: string, engine: SessionEngine): Promise<string | null> {
  const rows = await db.mainAnswer.findMany({ where: { sessionId } });
  const normalize = (list: { playerId: string; isCorrect: boolean }[]) =>
    list
      .map((a) => `${a.playerId}:${a.isCorrect ? 'C' : 'W'}`)
      .sort()
      .join(',');
  const dbByRound = new Map<string, { playerId: string; isCorrect: boolean }[]>();
  for (const r of rows) {
    const list = dbByRound.get(r.roundId) ?? [];
    list.push({ playerId: r.playerId, isCorrect: r.isCorrect });
    dbByRound.set(r.roundId, list);
  }
  const engineByRound = new Map<string, { playerId: string; isCorrect: boolean }[]>();
  for (const [roundId, map] of engine.state.answersByRound.entries()) {
    engineByRound.set(
      roundId,
      [...map.values()].map((a) => ({ playerId: a.playerId, isCorrect: a.isCorrect })),
    );
  }
  for (const roundId of new Set([...dbByRound.keys(), ...engineByRound.keys()])) {
    const dbSide = normalize(dbByRound.get(roundId) ?? []);
    const engineSide = normalize(engineByRound.get(roundId) ?? []);
    if (dbSide !== engineSide) return `round ${roundId}: engine=[${engineSide}] db=[${dbSide}]`;
  }
  return null;
}

interface Instance {
  resolver: SessionEngineResolver;
  deps: SessionOrchestratorDeps;
}

async function main(): Promise<void> {
  console.log('\n=== MAIN BERSAMA — ENGINE CACHE COHERENCE ===\n');
  await cleanDb();

  const clock = new FakeClock();
  const ids = new SeqIds();
  const pins = new SeqPins();

  const newInstance = (): Instance => {
    const resolver = new SessionEngineResolver({ clock, roundDurationMs: 60_000 });
    return { resolver, deps: makeDeps(clock, resolver) };
  };

  /** Muat ulang round terbaru ke cache instance (seperti GET saat round dibuka). */
  const sync = async (sessionId: string, ...insts: Instance[]) => {
    for (const i of insts) {
      i.resolver.evict(sessionId as never);
      const r = await i.resolver.resolve(sessionId as never);
      if (!r.ok) throw new Error('sync resolve gagal');
    }
  };

  // ══════════════════════════════════════════════════════════
  // S1 — KOTA: matrix A, B, C, D, E, F, G, N
  // ══════════════════════════════════════════════════════════
  section('S1 KOTA — setup (2 pemain, 6 round → target 8)');
  {
    const A = newInstance();
    const B = newInstance();
    const T = newInstance(); // guru: hanya untuk transisi round
    const s = await setupSession(A.deps, ids, pins, {
      gameMode: 'kota-cahaya',
      questions: Array.from({ length: 6 }, (_, i) => question(i + 1)),
      roster: ['Adi', 'Bila'],
    });
    await startSession(A.deps, teacherA, s.sessionId as never);

    const credAdi = s.credentials.get('Adi')!;
    const credBila = s.credentials.get('Bila')!;

    // Kedua instance memuat round terbaru (0 jawaban) — inilah baseline.
    await sync(s.sessionId, A, B);
    const roundId = B.resolver.peek(s.sessionId as never)?.activeRound()?.id ?? '';
    check('§setup round aktif terlihat oleh instance B (cache basi)', roundId.length > 0);

    section('S1 A — B cache kosong, A persist 1 correct, B close → kontribusi 1');
    const sA = subId();
    const viaA = await submitAnswer(A.deps, {
      credential: credAdi,
      roundId: roundId as never,
      submissionId: sA as never,
      selectedOptionId: 'a',
    });
    check('A1. instance A menyimpan jawaban benar', viaA.ok, viaA.ok ? '' : `code=${viaA.code}`);
    check('A2. DB punya 1 baris MainAnswer', (await dbAnswerCount(s.sessionId)) === 1);

    const staleFacts = B.resolver.peek(s.sessionId as never)?.getRoundFacts(roundId as never);
    check(
      'A3. (bukti risiko) engine basi B belum melihat jawaban A',
      staleFacts?.correctCount === 0,
      JSON.stringify(staleFacts),
    );

    const closedViaB = await closeRound(B.deps, teacherA, s.sessionId as never);
    check('A4. close via instance B sukses', closedViaB.ok);
    const ks1 = await kotaState(s.sessionId);
    check(
      'A5. kontribusi = 1 (jawaban A yang sah TIDAK hilang) — matrix A',
      ks1 !== null && ks1.correctContribution === 1,
      JSON.stringify(ks1),
    );

    const reloadB = await B.deps.resolver.resolve(s.sessionId as never);
    const mmB = reloadB.ok ? await mismatch(s.sessionId, reloadB.engine) : 'resolve gagal';
    check('N1. set accepted answer engine(B) ≡ DB — matrix N', mmB === null, mmB ?? '');

    // ── transisi round & matrix B ──
    const advance = async () => {
      // Guru (instance T) memuat state authoritative sebelum transisi —
      // close tadi dilakukan instance B, jadi cache T harus di-refresh.
      T.resolver.evict(s.sessionId as never);
      await startDiscussion(T.deps, teacherA, s.sessionId as never);
      await nextRound(T.deps, teacherA, s.sessionId as never);
      await sync(s.sessionId, A, B);
    };
    const activeRoundId = () => B.resolver.peek(s.sessionId as never)?.activeRound()?.id ?? '';

    section('S1 B — B cache kosong, A persist 2 correct, B close → kontribusi 2');
    await advance();
    {
      const rid = activeRoundId();
      const b1 = await submitAnswer(A.deps, {
        credential: credAdi,
        roundId: rid as never,
        submissionId: subId() as never,
        selectedOptionId: 'a',
      });
      const b2 = await submitAnswer(A.deps, {
        credential: credBila,
        roundId: rid as never,
        submissionId: subId() as never,
        selectedOptionId: 'a',
      });
      check('B1. A menyimpan 2 jawaban benar distinct', b1.ok && b2.ok);
      await closeRound(B.deps, teacherA, s.sessionId as never);
      const ks = await kotaState(s.sessionId);
      check(
        'B2. kontribusi kumulatif = 1 + 2 = 3 — matrix B',
        ks !== null && ks.correctContribution === 3,
        JSON.stringify(ks),
      );
      check('B3. total MainAnswer DB = 3', (await dbAnswerCount(s.sessionId)) === 3);
    }

    section('S1 C — cache basi berisi 1, DB berisi 2 → kontribusi 2 (bukan 1/3)');
    await advance();
    {
      const rid = activeRoundId();
      const c1 = await submitAnswer(A.deps, {
        credential: credAdi,
        roundId: rid as never,
        submissionId: subId() as never,
        selectedOptionId: 'a',
      });
      const c2 = await submitAnswer(B.deps, {
        credential: credBila,
        roundId: rid as never,
        submissionId: subId() as never,
        selectedOptionId: 'a',
      });
      check('C1. jawaban #1 (A) + #2 (B) tersimpan', c1.ok && c2.ok);
      check('C2. DB total = 5 baris', (await dbAnswerCount(s.sessionId)) === 5);
      const factsB = B.resolver.peek(s.sessionId as never)?.getRoundFacts(rid as never);
      check(
        'C3. (bukti risiko) cache B hanya melihat 1 jawaban',
        factsB?.correctCount === 1,
        JSON.stringify(factsB),
      );
      await closeRound(B.deps, teacherA, s.sessionId as never);
      const ks = await kotaState(s.sessionId);
      check(
        'C4. kontribusi kumulatif = 3 + 2 = 5 — matrix C',
        ks !== null && ks.correctContribution === 5,
        JSON.stringify(ks),
      );
    }

    section('S1 D — satu benar + satu salah persisted → hanya benar berkontribusi');
    await advance();
    {
      const rid = activeRoundId();
      await submitAnswer(A.deps, {
        credential: credAdi,
        roundId: rid as never,
        submissionId: subId() as never,
        selectedOptionId: 'a',
      });
      await submitAnswer(A.deps, {
        credential: credBila,
        roundId: rid as never,
        submissionId: subId() as never,
        selectedOptionId: 'b',
      });
      await closeRound(B.deps, teacherA, s.sessionId as never);
      const ks = await kotaState(s.sessionId);
      check(
        'D1. kontribusi = 5 + 1 = 6 (jawaban salah diabaikan) — matrix D',
        ks !== null && ks.correctContribution === 6,
        JSON.stringify(ks),
      );
    }

    section('S1 E — retry idempotent persisted → berkontribusi sekali');
    await advance();
    {
      const rid = activeRoundId();
      const S_E = subId();
      const e1 = await submitAnswer(A.deps, {
        credential: credAdi,
        roundId: rid as never,
        submissionId: S_E as never,
        selectedOptionId: 'a',
      });
      const e2 = await submitAnswer(A.deps, {
        credential: credAdi,
        roundId: rid as never,
        submissionId: S_E as never,
        selectedOptionId: 'a',
      });
      check(
        'E1. retry identik → already-saved (kontrak idempotent)',
        e1.ok && e2.ok && e2.value.status === 'already-saved',
        e2.ok ? e2.value.status : `code=${e2.code}`,
      );
      await closeRound(B.deps, teacherA, s.sessionId as never);
      const ks = await kotaState(s.sessionId);
      check(
        'E2. kontribusi = 6 + 1 = 7 (tidak dobel) — matrix E',
        ks !== null && ks.correctContribution === 7,
        JSON.stringify(ks),
      );
    }

    section('S1 F/G — submission ditolak tanpa kontribusi; milestone dari set lengkap');
    await advance();
    {
      const rid = activeRoundId();
      const S_F = subId();
      const f1 = await submitAnswer(A.deps, {
        credential: credAdi,
        roundId: rid as never,
        submissionId: S_F as never,
        selectedOptionId: 'a',
      });
      const f2 = await submitAnswer(A.deps, {
        credential: credBila,
        roundId: rid as never,
        submissionId: S_F as never,
        selectedOptionId: 'a',
      });
      check(
        'F1. submission kedua ditolak 409 SUBMISSION_ID_CONFLICT',
        f1.ok && !f2.ok && f2.code === 'SUBMISSION_ID_CONFLICT',
        f2.ok ? 'unexpected ok' : `code=${f2.code}`,
      );
      await closeRound(B.deps, teacherA, s.sessionId as never);
      const ks = await kotaState(s.sessionId);
      check(
        'F2. kontribusi = 7 + 1 = 8 (yang ditolak tidak dihitung) — matrix F',
        ks !== null && ks.correctContribution === 8,
        JSON.stringify(ks),
      );
      check(
        'G1. milestone terbuka dari set persisted lengkap (target 8) — matrix G',
        ks !== null && ks.unlockedMilestones.length > 0,
        JSON.stringify(ks?.unlockedMilestones),
      );
    }

    section('S1 M — submit setelah close ditolak (boundary deterministik)');
    {
      const rid = activeRoundId();
      const dbBefore = await dbAnswerCount(s.sessionId);
      const tooLate = await submitAnswer(B.deps, {
        credential: credAdi,
        roundId: rid as never,
        submissionId: subId() as never,
        selectedOptionId: 'a',
      });
      check(
        'M1. submit setelah close (instance penutup) → ROUND_NOT_OPEN',
        !tooLate.ok && tooLate.code === 'ROUND_NOT_OPEN',
        tooLate.ok ? 'unexpected ok' : `code=${tooLate.code}`,
      );
      check('M2. tidak ada baris MainAnswer baru', (await dbAnswerCount(s.sessionId)) === dbBefore);
    }
  }

  // ══════════════════════════════════════════════════════════
  // S2 — JELAJAH: matrix H
  // ══════════════════════════════════════════════════════════
  section('S2 JELAJAH — B cache basi, A persist, B close → regu maju tepat sekali');
  {
    const A = newInstance();
    const B = newInstance();
    const s = await setupSession(A.deps, ids, pins, {
      gameMode: 'jelajah-kata',
      questions: [question(1), question(2)],
      roster: ['Gita', 'Hana'],
    });
    await startSession(A.deps, teacherA, s.sessionId as never);
    await sync(s.sessionId, A, B);
    const rid = B.resolver.peek(s.sessionId as never)?.activeRound()?.id ?? '';

    const gitaId = s.players.get('Gita')!;
    const gitaTeam = s.teams.get(gitaId);
    const teamEligible = [...s.teams.values()].filter((t) => t === gitaTeam).length;

    const h1 = await submitAnswer(A.deps, {
      credential: s.credentials.get('Gita')!,
      roundId: rid as never,
      submissionId: subId() as never,
      selectedOptionId: 'a',
    });
    check('H1. A menyimpan jawaban benar Gita', h1.ok, h1.ok ? '' : `code=${h1.code}`);
    check(
      'H2. (bukti risiko) cache B belum melihat jawaban',
      B.resolver.peek(s.sessionId as never)?.getRoundFacts(rid as never)?.correctCount === 0,
    );

    await closeRound(B.deps, teacherA, s.sessionId as never);

    const reloadB = await B.deps.resolver.resolve(s.sessionId as never);
    const progress = reloadB.ok ? await teamProgress(s.sessionId, reloadB.engine) : {};
    const advanced = Object.entries(progress).filter(([, p]) => p > 0);
    const expected = (1 / teamEligible) * (100 / 2);
    check(
      `H3. tepat satu regu maju ${expected}% (accuracy 1/${teamEligible} × 100/2) — matrix H`,
      advanced.length === 1 && Math.abs(advanced[0][1] - expected) < 1e-9,
      JSON.stringify(progress),
    );
    check(
      'H4. regu yang maju = regu Gita',
      advanced.length === 1 && advanced[0][0] === gitaTeam,
      `advanced=${advanced[0]?.[0]} gitaTeam=${gitaTeam}`,
    );
  }

  // ══════════════════════════════════════════════════════════
  // S3 — KOTA: matrix K (dua round berurutan tidak bocor)
  // ══════════════════════════════════════════════════════════
  section('S3 KOTA — dua round berurutan: jawaban round N tidak bocor ke N+1');
  {
    const A = newInstance();
    const B = newInstance();
    const T = newInstance();
    const s = await setupSession(A.deps, ids, pins, {
      gameMode: 'kota-cahaya',
      questions: [question(1), question(2)],
      roster: ['Intan', 'Joko'],
    });
    await startSession(A.deps, teacherA, s.sessionId as never);

    await sync(s.sessionId, A, B);
    const rid0 = B.resolver.peek(s.sessionId as never)?.activeRound()?.id ?? '';
    await submitAnswer(A.deps, {
      credential: s.credentials.get('Intan')!,
      roundId: rid0 as never,
      submissionId: subId() as never,
      selectedOptionId: 'a',
    });
    await closeRound(B.deps, teacherA, s.sessionId as never);
    let ks = await kotaState(s.sessionId);
    check('K1. round 0 → kontribusi 1', ks !== null && ks.correctContribution === 1, JSON.stringify(ks));

    T.resolver.evict(s.sessionId as never);
    await startDiscussion(T.deps, teacherA, s.sessionId as never);
    await nextRound(T.deps, teacherA, s.sessionId as never);
    await sync(s.sessionId, A, B);
    const rid1 = B.resolver.peek(s.sessionId as never)?.activeRound()?.id ?? '';
    await submitAnswer(A.deps, {
      credential: s.credentials.get('Joko')!,
      roundId: rid1 as never,
      submissionId: subId() as never,
      selectedOptionId: 'a',
    });
    check(
      'K2. (bukti) cache B round 1 belum melihat jawaban',
      B.resolver.peek(s.sessionId as never)?.getRoundFacts(rid1 as never)?.correctCount === 0,
    );
    await closeRound(B.deps, teacherA, s.sessionId as never);
    ks = await kotaState(s.sessionId);
    check(
      'K3. kontribusi = 1 + 1 = 2 (tidak bocor/dobel) — matrix K',
      ks !== null && ks.correctContribution === 2,
      JSON.stringify(ks),
    );

    const reloaded = await B.deps.resolver.resolve(s.sessionId as never);
    const mm = reloaded.ok ? await mismatch(s.sessionId, reloaded.engine) : 'resolve gagal';
    check('K4. engine ≡ DB (2 round, 2 jawaban)', mm === null, mm ?? '');
  }

  // ══════════════════════════════════════════════════════════
  // S4 — KOTA: matrix L (dua resolver independen → hasil close sama)
  // ══════════════════════════════════════════════════════════
  section('S4 KOTA — dua resolver independen memberi hasil close sama');
  {
    const A = newInstance();
    const B = newInstance();
    const C = newInstance();
    const s = await setupSession(A.deps, ids, pins, {
      gameMode: 'kota-cahaya',
      questions: [question(1), question(2)],
      roster: ['Kiki', 'Lala'],
    });
    await startSession(A.deps, teacherA, s.sessionId as never);
    await sync(s.sessionId, A, B, C);
    const rid = C.resolver.peek(s.sessionId as never)?.activeRound()?.id ?? '';
    await submitAnswer(A.deps, {
      credential: s.credentials.get('Kiki')!,
      roundId: rid as never,
      submissionId: subId() as never,
      selectedOptionId: 'a',
    });
    const closeB = await closeRound(B.deps, teacherA, s.sessionId as never);
    check('L1. close via B sukses', closeB.ok);
    const ksAfterB = await kotaState(s.sessionId);
    check(
      'L2. kontribusi 1',
      ksAfterB !== null && ksAfterB.correctContribution === 1,
      JSON.stringify(ksAfterB),
    );
    const closeC = await closeRound(C.deps, teacherA, s.sessionId as never);
    check('L3. close kedua via C tetap sukses (idempotent)', closeC.ok);
    const ksAfterC = await kotaState(s.sessionId);
    check(
      'L4. hasil close kedua identik (kontribusi tetap 1, tidak dobel) — matrix L',
      ksAfterC !== null && ksAfterC.correctContribution === 1,
      JSON.stringify(ksAfterC),
    );
  }

  console.log('\n══════════════════════════════════════');
  console.log(`TOTAL: ${passed} lulus, ${failed} gagal`);
  console.log('══════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('FATAL:', error);
  process.exit(1);
});
