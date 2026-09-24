/**
 * MAIN BERSAMA — SUBMIT-vs-CLOSE RACE HARDENING
 *
 * Database: Postgres test LOKAL (docker bc-mb-test-pg, port 54329) — BUKAN
 * database production/Supabase. Safety guard sama dengan suite Tahap 4–7
 * (require-test-db: hanya host lokal bernama "mbtest").
 *
 * RISIKO YANG DIUJI (blocker correctness terakhir):
 *   Instance A boleh saja memulai submit saat cache engine-nya masih OPEN.
 *   Instance B boleh saja menutup round secara durable + memuat ulang
 *   jawaban authoritative. Tanpa linearisasi durable, A bisa mem-persist
 *   MainAnswer SETELAH snapshot scoring B → HTTP success + baris tersimpan
 *   tetapi hasil round TIDAK memuat jawaban itu.
 *
 * INVARIANT TERKUNCI (satu titik linearisasi durable = MainRound.status):
 *   SETIAP submit yang bersaing dengan closeRound menghasilkan:
 *     SUBMIT MENANG → jawaban persist saat round masih OPEN; reload facts
 *                     pada close melihatnya dan men-skor TEPAT SEKALI;
 *     CLOSE MENANG  → submit ditolak (ROUND_NOT_OPEN), TIDAK ada baris
 *                     MainAnswer, TIDAK ada efek game-state.
 *   Terlarang: accepted-tapi-tak-discoring, rejected-tapi-tersimpan,
 *   atau discoring dua kali.
 *
 * Harness memakai function PRODUKSI nyata (createMainSession, openLobby,
 * joinSession, startSession, submitAnswer, closeRound, startDiscussion,
 * nextRound) + resolver terpisah untuk mensimulasikan dua proses, dan
 * "gate" deterministik di batas persistence (sebelum tulis / sebelum
 * transisi durable) untuk menghasilkan interleaving yang dapat diulang.
 *
 * Jalankan:
 *   TEST_DATABASE_URL="postgresql://postgres:mbtest@localhost:54329/mbtest?schema=public" \
 *     npx tsx scripts/test-main-bersama-submit-close-race.ts
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

// ─── Harness repos (pola sama dengan cache-coherence/vertical slice) ──
const prismaPlayers = new PrismaPlayerRepository();
const prismaSessions = new PrismaSessionRepository();
const prismaRounds = new PrismaRoundRepository();
const prismaAnswers = new PrismaAnswerRepository();
const prismaGameStates = new PrismaGameStateRepository();

const realStores = {
  players: {
    async saveRuntime(p: Parameters<typeof prismaPlayers.saveRuntime>[0], s: string) {
      await prismaPlayers.saveRuntime(p, s);
    },
    async setConnected(s: string, p: string, c: boolean) {
      await prismaPlayers.setConnected(s, p, c);
    },
    async findBySession(s: string) {
      return prismaPlayers.findRuntimeBySession(s);
    },
  },
  sessions: {
    async save(x: Parameters<typeof prismaSessions.save>[0]) {
      await prismaSessions.save(x);
    },
    async saveSessionProgress(
      s: string,
      p: Parameters<typeof prismaSessions.saveSessionProgress>[1],
      i: number | null,
    ) {
      await prismaSessions.saveSessionProgress(s, p, i);
    },
    async savePauseState(s: string, p: unknown, at: Date) {
      await prismaSessions.savePauseState(s, p as never, at);
    },
    async findByPin(p: string) {
      return prismaSessions.findActiveByPin(p);
    },
    async findByPinForDisplay(p: string) {
      return prismaSessions.findLatestByPin(p);
    },
    async findOwnedBy(s: string, t: string) {
      return prismaSessions.findSessionOwnedBy(s, t);
    },
    async findById(s: string) {
      return prismaSessions.findById(s);
    },
  },
  rounds: {
    async save(r: Parameters<typeof prismaRounds.save>[0]) {
      await prismaRounds.save(r);
    },
  },
  answers: {
    async submitAnswer(input: Parameters<typeof prismaAnswers.submitAnswer>[0]) {
      return prismaAnswers.submitAnswer(input);
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
    async loadGameState(s: string) {
      const gs = await prismaGameStates.loadGameState(s);
      if (!gs) return null;
      return {
        gameMode: gs.gameMode,
        status: gs.status,
        state: deserializeGameStateFromStore(gs.gameMode, gs.state),
      };
    },
  },
  kotaTarget: {
    async saveKotaTarget(s: string, t: number) {
      await db.mainSession.update({ where: { id: s }, data: { kotaTargetCorrect: t } });
    },
  },
};

/**
 * Gate deterministik: menahan pemanggilan fn() pertama setelah arm() sampai
 * release(), supaya interleaving bisa diulang persis.
 */
class Gate {
  private armed = false;
  private reachedResolve!: () => void;
  private releaseResolve!: () => void;
  private reachedPromise: Promise<void> = new Promise((r) => (this.reachedResolve = r));
  private releasePromise: Promise<void> = new Promise((r) => (this.releaseResolve = r));
  hits = 0;

  arm(): void {
    this.armed = true;
    this.reachedPromise = new Promise((r) => (this.reachedResolve = r));
    this.releasePromise = new Promise((r) => (this.releaseResolve = r));
  }
  get reached(): Promise<void> {
    return this.reachedPromise;
  }
  async wait(): Promise<void> {
    if (this.armed) {
      this.armed = false;
      this.hits++;
      this.reachedResolve();
      await this.releasePromise;
    }
  }
  release(): void {
    this.releaseResolve();
  }
}

function makeDeps(
  clock: FakeClock,
  resolver: SessionEngineResolver,
  gates?: { answers?: Gate; rounds?: Gate },
): SessionOrchestratorDeps {
  const answers = gates?.answers
    ? {
        async submitAnswer(input: Parameters<typeof prismaAnswers.submitAnswer>[0]) {
          await gates.answers!.wait();
          return realStores.answers.submitAnswer(input);
        },
      }
    : realStores.answers;
  const rounds = gates?.rounds
    ? {
        async save(r: Parameters<typeof prismaRounds.save>[0]) {
          await gates.rounds!.wait();
          return realStores.rounds.save(r);
        },
      }
    : realStores.rounds;
  return {
    clock,
    resolver,
    players: realStores.players,
    sessions: realStores.sessions,
    rounds,
    answers,
    gameStates: realStores.gameStates,
    kotaTarget: realStores.kotaTarget,
    credentials: {
      issue: (p: string, s: string) => issuePlayerCredential(p, s),
      async resolve(c: unknown) {
        return resolvePlayerCredential(c);
      },
    },
    realtimeSignal: { async sendSessionUpdate() {} },
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
  };
}
class FakeBankSoal implements BankSoalQuestionSource {
  constructor(private readonly qs: BankSoalQuestionInput[]) {}
  async loadQuestions(ref: BankSoalPackageRef): Promise<BankSoalSourceResult> {
    if (ref.kind !== 'SOAL_SET') return { ok: false, code: 'PACKAGE_NOT_FOUND' };
    return { ok: true, contentTitle: 'Antonim', questions: this.qs.map((q) => ({ ...q })) };
  }
}
class SeqIds implements IdGenerator {
  private n = 0;
  newId(): string {
    this.n += 1;
    return `race-${this.n}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
class SeqPins implements PinGenerator {
  newPin(): string {
    return String(Math.floor(100000 + Math.random() * 899999));
  }
}
const classesFake: MainBersamaClassDirectory = {
  async getClassSummary(id: string) {
    return id === 'kelas-A'
      ? { id, name: 'Kelas 8A', teacherId: 'teacher-1', isActive: true }
      : null;
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
  return `race-${String(subCounter).padStart(4, '0')}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

interface Instance {
  resolver: SessionEngineResolver;
  deps: SessionOrchestratorDeps;
}
interface SetupResult {
  sessionId: string;
  credentials: Map<string, string>;
  players: Map<string, string>;
  teams: Map<string, string | undefined>;
}

async function setupSession(
  ids: IdGenerator,
  pins: PinGenerator,
  opts: {
    gameMode: 'jelajah-kata' | 'kota-cahaya';
    questions: BankSoalQuestionInput[];
    roster: string[];
    instances: Instance[];
  },
): Promise<SetupResult> {
  const deps = opts.instances[0].deps;
  const created = await createMainSession(
    {
      actor: teacherA,
      bankSoal: new FakeBankSoal(opts.questions),
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
  await startSession(deps, teacherA, sessionId as never);
  const playerRows = await db.mainPlayer.findMany({ where: { sessionId } });
  const players = new Map<string, string>();
  const teams = new Map<string, string | undefined>();
  for (const p of playerRows) {
    players.set(p.displayName, p.id);
    teams.set(p.id, p.teamId ?? undefined);
  }
  await sync(sessionId, ...opts.instances);
  return { sessionId, credentials, players, teams };
}

async function sync(sessionId: string, ...insts: Instance[]): Promise<void> {
  for (const i of insts) {
    i.resolver.evict(sessionId as never);
    const r = await i.resolver.resolve(sessionId as never);
    if (!r.ok) throw new Error('sync resolve gagal');
  }
}

function activeRoundId(i: Instance, sessionId: string): string {
  return i.resolver.peek(sessionId as never)?.activeRound()?.id ?? '';
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
/** Set accepted answer DB vs set jawaban engine (matrix N). */
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

async function main(): Promise<void> {
  console.log('\n=== MAIN BERSAMA — SUBMIT-vs-CLOSE RACE HARDENING ===\n');
  await cleanDb();

  const clock = new FakeClock();
  const ids = new SeqIds();
  const pins = new SeqPins();

  const newInstance = (gates?: { answers?: Gate; rounds?: Gate }): Instance => {
    const resolver = new SessionEngineResolver({ clock, roundDurationMs: 60_000 });
    return { resolver, deps: makeDeps(clock, resolver, gates) };
  };

  // ══════════════════════════════════════════════════════════
  // S1 KOTA — matrix A, B, C, D, E, F, I, J, K, L, M
  // ══════════════════════════════════════════════════════════
  section('S1 KOTA — setup (2 pemain, 2 round)');
  {
    const A = newInstance();
    const B = newInstance();
    const T = newInstance();
    const s = await setupSession(ids, pins, {
      gameMode: 'kota-cahaya',
      questions: Array.from({ length: 12 }, (_, i) => question(i + 1)),
      roster: ['Adi', 'Bila'],
      instances: [A, B, T],
    });
    const rid0 = activeRoundId(B, s.sessionId);
    check('setup. round aktif ada', rid0.length > 0);

    // ── matrix A: submit commit dulu, lalu close → dihitung sekali ──
    section('A — submit commit dulu, lalu close → persist + diskor sekali');
    {
      const sA = subId();
      const r = await submitAnswer(A.deps, {
        credential: s.credentials.get('Adi')!,
        roundId: rid0 as never,
        submissionId: sA as never,
        selectedOptionId: 'a',
      });
      check('A1. submit sukses saved', r.ok && r.value.status === 'saved', r.ok ? '' : `code=${r.code}`);
      const close = await closeRound(B.deps, teacherA, s.sessionId as never);
      check('A2. close sukses', close.ok);
      const ks = await kotaState(s.sessionId);
      check('A3. kontribusi = 1 (persist sblm close dihitung sekali)', ks?.correctContribution === 1, JSON.stringify(ks));
      check('A4. DB 1 baris', (await dbAnswerCount(s.sessionId)) === 1);
    }

    // ── transisi ke round berikutnya ──
    const advance = async () => {
      // Tutup round tadi dilakukan instance lain (A/B) — cache guru (T)
      // harus di-refresh dari DB sebelum transisi fase.
      T.resolver.evict(s.sessionId as never);
      const disc = await startDiscussion(T.deps, teacherA, s.sessionId as never);
      if (!disc.ok) throw new Error(`startDiscussion gagal: ${disc.code}`);
      const next = await nextRound(T.deps, teacherA, s.sessionId as never);
      if (!next.ok || next.value.phase !== 'question') {
        throw new Error(`nextRound gagal: ${JSON.stringify(next)}`);
      }
      await sync(s.sessionId, A, B, T);
      return activeRoundId(B, s.sessionId);
    };
    let rid = await advance();

    // ── matrix B: close commit dulu, lalu submit (resolve segar) → ditolak ──
    section('B — close commit dulu, lalu submit → ROUND_NOT_OPEN, tanpa baris');
    {
      const close = await closeRound(B.deps, teacherA, s.sessionId as never);
      check('B1. close sukses', close.ok);
      const before = await dbAnswerCount(s.sessionId);
      const r = await submitAnswer(B.deps, {
        credential: s.credentials.get('Bila')!,
        roundId: rid as never,
        submissionId: subId() as never,
        selectedOptionId: 'a',
      });
      check('B2. submit ditolak ROUND_NOT_OPEN', !r.ok && r.code === 'ROUND_NOT_OPEN', r.ok ? 'ok?' : `code=${r.code}`);
      check('B3. tidak ada baris MainAnswer baru', (await dbAnswerCount(s.sessionId)) === before);
      const ks = await kotaState(s.sessionId);
      check('B4. kontribusi tidak bertambah (=1)', ks?.correctContribution === 1, JSON.stringify(ks));
    }

    // ── matrix C: overlap deterministik — submit mulai dulu, pause, close menang ──
    section('C — overlap deterministik: submit pause, close menang → ditolak');
    {
      rid = await advance();
      const gate = new Gate();
      const A2 = newInstance({ answers: gate });
      await sync(s.sessionId, A2);
      const before = await dbAnswerCount(s.sessionId);
      gate.arm();
      const pending = submitAnswer(A2.deps, {
        credential: s.credentials.get('Adi')!,
        roundId: rid as never,
        submissionId: subId() as never,
        selectedOptionId: 'a',
      });
      await gate.reached;
      const close = await closeRound(B.deps, teacherA, s.sessionId as never);
      check('C1. close menang saat submit tertahan', close.ok);
      gate.release();
      const r = await pending;
      check('C2. submit ditolak ROUND_NOT_OPEN', !r.ok && r.code === 'ROUND_NOT_OPEN', r.ok ? 'ok?' : `code=${r.code}`);
      check('C3. tidak ada baris tersimpan', (await dbAnswerCount(s.sessionId)) === before);
      const ks = await kotaState(s.sessionId);
      check('C4. kontribusi tidak berubah (=1)', ks?.correctContribution === 1, JSON.stringify(ks));
    }

    // ── matrix D: overlap deterministik — close mulai dulu, submit menang ──
    section('D — overlap deterministik: close mulai dulu tapi submit commit dulu → dihitung');
    {
      rid = await advance();
      const closeGate = new Gate();
      const B2 = newInstance({ rounds: closeGate });
      await sync(s.sessionId, B2);
      const before = await dbAnswerCount(s.sessionId);
      closeGate.arm();
      const pendingClose = closeRound(B2.deps, teacherA, s.sessionId as never);
      await closeGate.reached; // close sudah 'closed' di memori, transisi durable tertahan
      const r = await submitAnswer(A.deps, {
        credential: s.credentials.get('Adi')!,
        roundId: rid as never,
        submissionId: subId() as never,
        selectedOptionId: 'a',
      });
      check('D1. submit sukses (round masih OPEN durable)', r.ok, r.ok ? '' : `code=${r.code}`);
      closeGate.release();
      const close = await pendingClose;
      check('D2. close selesai setelah submit commit', close.ok);
      const ks = await kotaState(s.sessionId);
      check('D3. kontribusi = 1 + 1 = 2 (submit yang menang dihitung sekali)', ks?.correctContribution === 2, JSON.stringify(ks));
      check('D4. DB menambah 1 baris', (await dbAnswerCount(s.sessionId)) === before + 1);
    }

    // ── matrix E: jawaban BENAR dalam race → diskor tepat sekali ──
    section('E — Kota jawaban benar dalam race → diskor tepat sekali');
    {
      rid = await advance();
      const gate = new Gate();
      const A2 = newInstance({ answers: gate });
      await sync(s.sessionId, A2);
      gate.arm();
      const pending = submitAnswer(A2.deps, {
        credential: s.credentials.get('Bila')!,
        roundId: rid as never,
        submissionId: subId() as never,
        selectedOptionId: 'a',
      });
      await gate.reached;
      // Close TIDAK dilakukan dulu; submit dilepas → menang.
      gate.release();
      const r = await pending;
      check('E1. submit benar sukses', r.ok, r.ok ? '' : `code=${r.code}`);
      await closeRound(B.deps, teacherA, s.sessionId as never);
      const ks = await kotaState(s.sessionId);
      check('E2. kontribusi = 2 + 1 = 3 (tepat sekali)', ks?.correctContribution === 3, JSON.stringify(ks));
    }

    // ── matrix F: jawaban SALAH dalam race → persist, tanpa kontribusi benar ──
    section('F — Kota jawaban salah dalam race → persist, tanpa kontribusi');
    {
      rid = await advance();
      const gate = new Gate();
      const A2 = newInstance({ answers: gate });
      await sync(s.sessionId, A2);
      const before = await dbAnswerCount(s.sessionId);
      gate.arm();
      const pending = submitAnswer(A2.deps, {
        credential: s.credentials.get('Adi')!,
        roundId: rid as never,
        submissionId: subId() as never,
        selectedOptionId: 'b', // salah
      });
      await gate.reached;
      gate.release();
      const r = await pending;
      check('F1. submit salah sukses persisted', r.ok, r.ok ? '' : `code=${r.code}`);
      await closeRound(B.deps, teacherA, s.sessionId as never);
      const ks = await kotaState(s.sessionId);
      check('F2. kontribusi tetap 3 (salah tidak berkontribusi)', ks?.correctContribution === 3, JSON.stringify(ks));
      check('F3. baris tetap tersimpan (1 baru)', (await dbAnswerCount(s.sessionId)) === before + 1);
    }

    // ── matrix I: dua submit + close saling tumpang tindih ──
    section('I — dua submit + close: setiap yang accepted dihitung tepat sekali');
    {
      rid = await advance();
      const gate = new Gate();
      const A2 = newInstance({ answers: gate });
      await sync(s.sessionId, A2);
      const before = await dbAnswerCount(s.sessionId);
      // submit#1 (Adi) commit lebih dulu.
      const ok1 = await submitAnswer(A.deps, {
        credential: s.credentials.get('Adi')!,
        roundId: rid as never,
        submissionId: subId() as never,
        selectedOptionId: 'a',
      });
      // submit#2 (Bila) tertahan di batas persistence, close menang.
      gate.arm();
      const pending = submitAnswer(A2.deps, {
        credential: s.credentials.get('Bila')!,
        roundId: rid as never,
        submissionId: subId() as never,
        selectedOptionId: 'a',
      });
      await gate.reached;
      await closeRound(B.deps, teacherA, s.sessionId as never);
      gate.release();
      const r2 = await pending;
      check('I1. submit#1 accepted', ok1.ok);
      check('I2. submit#2 (kalah) ditolak ROUND_NOT_OPEN', !r2.ok && r2.code === 'ROUND_NOT_OPEN', r2.ok ? 'ok?' : `code=${r2.code}`);
      const ks = await kotaState(s.sessionId);
      check('I3. kontribusi = 3 + 1 = 4 (accepted tepat sekali, rejected nol)', ks?.correctContribution === 4, JSON.stringify(ks));
      check('I4. DB 1 baris baru saja', (await dbAnswerCount(s.sessionId)) === before + 1);
    }

    // ── matrix J: submissionId duplikat + close → kontrak konflik terjaga ──
    section('J — submissionId duplikat (payload beda) + close → konflik dipertahankan');
    {
      rid = await advance();
      const sharedSub = subId();
      const first = await submitAnswer(A.deps, {
        credential: s.credentials.get('Adi')!,
        roundId: rid as never,
        submissionId: sharedSub as never,
        selectedOptionId: 'a',
      });
      check('J1. submit pertama accepted', first.ok);
      const before = await dbAnswerCount(s.sessionId);
      await closeRound(B.deps, teacherA, s.sessionId as never);
      const dup = await submitAnswer(B.deps, {
        credential: s.credentials.get('Bila')!,
        roundId: rid as never,
        submissionId: sharedSub as never, // sama, player beda
        selectedOptionId: 'a',
      });
      check('J2. duplikat → SUBMISSION_ID_CONFLICT (409) dipertahankan', !dup.ok && dup.code === 'SUBMISSION_ID_CONFLICT', dup.ok ? 'ok?' : `code=${dup.code}`);
      check('J3. tidak ada baris tambahan', (await dbAnswerCount(s.sessionId)) === before);
    }

    // ── matrix K: retry identik + close → no duplicate, sudah-saved terjaga ──
    section('K — retry identik + close → already-saved, tanpa kontribusi ganda');
    {
      rid = await advance();
      const sK = subId();
      const first = await submitAnswer(A.deps, {
        credential: s.credentials.get('Adi')!,
        roundId: rid as never,
        submissionId: sK as never,
        selectedOptionId: 'a',
      });
      check('K1. submit pertama accepted', first.ok);
      const before = await dbAnswerCount(s.sessionId);
      const gate = new Gate();
      const A2 = newInstance({ answers: gate });
      await sync(s.sessionId, A2);
      gate.arm();
      const pending = submitAnswer(A2.deps, {
        credential: s.credentials.get('Adi')!,
        roundId: rid as never,
        submissionId: sK as never, // retry identik
        selectedOptionId: 'a',
      });
      await gate.reached;
      await closeRound(B.deps, teacherA, s.sessionId as never);
      gate.release();
      const retry = await pending;
      check('K2. retry identik → already-saved walau round sudah CLOSED', retry.ok && retry.value.status === 'already-saved', retry.ok ? retry.value.status : `code=${retry.code}`);
      check('K3. tidak ada baris ganda', (await dbAnswerCount(s.sessionId)) === before);
      const ks = await kotaState(s.sessionId);
      check('K4. kontribusi = 5 + 1 = 6 (tidak dobel)', ks?.correctContribution === 6, JSON.stringify(ks));
    }

    // ── matrix L: resolver basi setelah durable CLOSED → tidak bisa persist ──
    section('L — resolver basi (cache OPEN) setelah durable CLOSED → tolak');
    {
      rid = await advance();
      const stale = newInstance();
      // Prim cache OPEN lebih dulu (belum ada close).
      await sync(s.sessionId, stale);
      check('L1. cache basi melihat round aktif', activeRoundId(stale, s.sessionId) === rid);
      await closeRound(B.deps, teacherA, s.sessionId as never);
      const before = await dbAnswerCount(s.sessionId);
      const r = await submitAnswer(stale.deps, {
        credential: s.credentials.get('Bila')!,
        roundId: rid as never,
        submissionId: subId() as never,
        selectedOptionId: 'a',
      });
      check('L2. submit cache basi ditolak ROUND_NOT_OPEN', !r.ok && r.code === 'ROUND_NOT_OPEN', r.ok ? 'ok?' : `code=${r.code}`);
      check('L3. tidak ada baris', (await dbAnswerCount(s.sessionId)) === before);
      check('L4. cache dibuang setelah penolakan durable (peek null)', stale.resolver.peek(s.sessionId as never) === null);
    }

    // ── matrix M: close kedua idempotent ──
    section('M — close kedua tetap idempotent');
    {
      const ksBefore = await kotaState(s.sessionId);
      const close2 = await closeRound(B.deps, teacherA, s.sessionId as never);
      check('M1. close kedua sukses', close2.ok);
      check('M2. dilaporkan alreadyClosed', close2.ok && close2.value.alreadyClosed === true);
      const ksAfter = await kotaState(s.sessionId);
      check('M3. kontribusi tidak berubah', ksAfter?.correctContribution === ksBefore?.correctContribution, JSON.stringify(ksAfter));
    }

    // ── matrix N: set DB == set dipakai round facts (di semua round) ──
    section('N — set accepted answer DB ≡ set yang dipakai round facts');
    {
      const N = newInstance();
      await sync(s.sessionId, N);
      const mm = await mismatch(s.sessionId, N.resolver.peek(s.sessionId as never) ?? A.resolver.peek(s.sessionId as never)!);
      check('N1. engine (hydrate dari DB) ≡ MainAnswer untuk tiap round', mm === null, mm ?? '');
    }
  }

  // ══════════════════════════════════════════════════════════
  // S2 JELAJAH — matrix G, H
  // ══════════════════════════════════════════════════════════
  section('S2 JELAJAH — setup (2 pemain, 2 round)');
  {
    const A = newInstance();
    const B = newInstance();
    const T = newInstance();
    const s = await setupSession(ids, pins, {
      gameMode: 'jelajah-kata',
      questions: [question(1), question(2)],
      roster: ['Gita', 'Hana'],
      instances: [A, B, T],
    });
    const rid0 = activeRoundId(B, s.sessionId);
    const gitaTeam = s.teams.get(s.players.get('Gita')!);
    const teamEligible = [...s.teams.values()].filter((t) => t === gitaTeam).length;
    const expected = (1 / teamEligible) * (100 / 2);

    // ── matrix G: submit menang → regu maju tepat sekali ──
    section('G — Jelajah submit menang race → regu maju tepat sekali');
    {
      const gate = new Gate();
      const A2 = newInstance({ answers: gate });
      await sync(s.sessionId, A2);
      gate.arm();
      const pending = submitAnswer(A2.deps, {
        credential: s.credentials.get('Gita')!,
        roundId: rid0 as never,
        submissionId: subId() as never,
        selectedOptionId: 'a',
      });
      await gate.reached;
      gate.release(); // submit menang
      const r = await pending;
      check('G1. submit benar sukses', r.ok, r.ok ? '' : `code=${r.code}`);
      await closeRound(B.deps, teacherA, s.sessionId as never);
      const reload = await B.deps.resolver.resolve(s.sessionId as never);
      const progress = reload.ok ? await teamProgress(s.sessionId, reload.engine) : {};
      const advanced = Object.entries(progress).filter(([, p]) => p > 0);
      check(
        `G2. tepat satu regu maju ${expected}% (sekali)`,
        advanced.length === 1 && Math.abs(advanced[0][1] - expected) < 1e-9,
        JSON.stringify(progress),
      );
      check('G3. regu yang maju = regu Gita', advanced.length === 1 && advanced[0][0] === gitaTeam, `adv=${advanced[0]?.[0]} gita=${gitaTeam}`);
    }

    // ── matrix H: submit kalah → tidak ada kemajuan ──
    section('H — Jelajah submit kalah race → tanpa kemajuan');
    {
      T.resolver.evict(s.sessionId as never);
      const disc = await startDiscussion(T.deps, teacherA, s.sessionId as never);
      if (!disc.ok) throw new Error(`startDiscussion gagal: ${disc.code}`);
      const next = await nextRound(T.deps, teacherA, s.sessionId as never);
      if (!next.ok || next.value.phase !== 'question') throw new Error('nextRound gagal');
      await sync(s.sessionId, A, B, T);
      const rid1 = activeRoundId(B, s.sessionId);
      const gate = new Gate();
      const A2 = newInstance({ answers: gate });
      await sync(s.sessionId, A2);
      const before = await dbAnswerCount(s.sessionId);
      gate.arm();
      const pending = submitAnswer(A2.deps, {
        credential: s.credentials.get('Hana')!,
        roundId: rid1 as never,
        submissionId: subId() as never,
        selectedOptionId: 'a',
      });
      await gate.reached;
      await closeRound(B.deps, teacherA, s.sessionId as never);
      gate.release();
      const r = await pending;
      check('H1. submit kalah ditolak ROUND_NOT_OPEN', !r.ok && r.code === 'ROUND_NOT_OPEN', r.ok ? 'ok?' : `code=${r.code}`);
      check('H2. tidak ada baris baru', (await dbAnswerCount(s.sessionId)) === before);
      const reload = await B.deps.resolver.resolve(s.sessionId as never);
      const progress = reload.ok ? await teamProgress(s.sessionId, reload.engine) : {};
      const hanaTeam = s.teams.get(s.players.get('Hana')!);
      const hanaProgress = hanaTeam ? (progress[hanaTeam] ?? 0) : 0;
      check('H3. regu Hana tidak maju pada round ini', hanaProgress === 0, JSON.stringify(progress));
    }
  }

  // ══════════════════════════════════════════════════════════
  // S3 §10 — NO LOST-ACKNOWLEDGED-ANSWER (cross-check eksplisit)
  // ══════════════════════════════════════════════════════════
  section('S3 §10 — setiap accepted pra-close ada di buildRoundFacts; rejected tanpa baris');
  {
    const A = newInstance();
    const B = newInstance();
    const s = await setupSession(ids, pins, {
      gameMode: 'kota-cahaya',
      questions: [question(1), question(2)],
      roster: ['Rani', 'Sari'],
      instances: [A, B],
    });
    const rid = activeRoundId(B, s.sessionId);
    // accepted pra-close (2), lalu close, lalu rejected (1).
    const acc1 = await submitAnswer(A.deps, {
      credential: s.credentials.get('Rani')!,
      roundId: rid as never,
      submissionId: subId() as never,
      selectedOptionId: 'a',
    });
    const acc2 = await submitAnswer(A.deps, {
      credential: s.credentials.get('Sari')!,
      roundId: rid as never,
      submissionId: subId() as never,
      selectedOptionId: 'a',
    });
    const acceptedRows = await db.mainAnswer.findMany({ where: { sessionId: s.sessionId, roundId: rid } });
    await closeRound(B.deps, teacherA, s.sessionId as never);
    const rejected = await submitAnswer(B.deps, {
      credential: s.credentials.get('Rani')!,
      roundId: rid as never,
      submissionId: subId() as never,
      selectedOptionId: 'a',
    });
    const factsEngine = newInstance();
    await sync(s.sessionId, factsEngine);
    const engine = factsEngine.resolver.peek(s.sessionId as never)!;
    const facts = engine.getRoundFacts(rid as never);
    check('§10.1 dua submit accepted sebelum close', acc1.ok && acc2.ok);
    check('§10.2 rejecting submit ditolak (close menang)', !rejected.ok && rejected.code === 'ROUND_NOT_OPEN');
    check(
      '§10.3 setiap baris accepted pra-close direpresentasikan di facts',
      acceptedRows.length === 2 && facts !== null && facts.submittedCount === acceptedRows.length,
      `rows=${acceptedRows.length} facts=${JSON.stringify(facts)}`,
    );
    check(
      '§10.4 rejected TIDAK menyisakan baris (rows == accepted)',
      (await dbAnswerCount(s.sessionId)) === acceptedRows.length,
    );
    const ks = await kotaState(s.sessionId);
    check('§10.5 kontribusi = 2 (accepted benar diskor, rejected nol)', ks?.correctContribution === 2, JSON.stringify(ks));
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
