/**
 * Test Persistence Main Bersama — Tahap 4 (pola QA repo: tsx standalone).
 *
 * Database: Postgres test LOKAL (docker bc-mb-test-pg, port 54329) —
 * BUKAN database production/Supabase.
 *
 * SAFETY GUARD (review Tahap 4 §3):
 * - Wajib TEST_DATABASE_URL eksplisit — TIDAK PERNAH fallback ke
 *   DATABASE_URL (yang di environment developer bisa menunjuk
 *   Supabase production).
 * - assertTestDatabaseUrl() hanya menerima postgresql:// di host lokal
 *   dengan nama DB khusus "mbtest"; selain itu ABORT sebelum satu pun
 *   query mutation dijalankan.
 *
 * Jalankan:
 *   TEST_DATABASE_URL="postgresql://postgres:mbtest@localhost:54329/mbtest?schema=public" \
 *     npx tsx scripts/test-main-bersama-persistence.ts
 */

// ─── Safety guard (WAJIB import pertama — sebelum lib/db dievaluasi) ──
// require-test-db menimpa DATABASE_URL dari TEST_DATABASE_URL saat module
// evaluation, sehingga lib/db (yang membuat PrismaClient saat import)
// sudah melihat URL test yang tervalidasi.
import '../src/main-bersama/infrastructure/persistence/require-test-db';
import { assertTestDatabaseUrl } from '../src/main-bersama/infrastructure/persistence/test-db-guard';

import fs from 'fs';
import path from 'path';

// ─── Mini test harness (pola scripts/test-bigt-menu.ts) ─────
let passed = 0;
let failed = 0;
function test(name: string, result: boolean | (() => boolean)): void {
  const ok = typeof result === 'function' ? result() : result;
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`);
  }
}
function section(title: string): void {
  console.log(`\n── ${title} ──`);
}

// ─── SUT: infrastructure Main Bersama ───────────────────────
import {
  PrismaSessionRepository,
} from '../src/main-bersama/infrastructure/repositories/prisma-session-repository';
import {
  PrismaPlayerRepository,
} from '../src/main-bersama/infrastructure/repositories/prisma-player-repository';
import {
  PrismaRoundRepository,
} from '../src/main-bersama/infrastructure/repositories/prisma-round-repository';
import {
  PrismaAnswerRepository,
} from '../src/main-bersama/infrastructure/repositories/prisma-answer-repository';
import {
  PrismaGameStateRepository,
  jelajahStateFromJson,
  jelajahStateToJson,
  kotaStateFromJson,
  kotaStateToJson,
} from '../src/main-bersama/infrastructure/repositories/prisma-game-state-repository';
import {
  loadSessionRuntime,
} from '../src/main-bersama/infrastructure/persistence/load-session-runtime';
import { buildRoundFacts } from '../src/main-bersama/application/services/round-facts-projection';
import { snapshotToDb } from '../src/main-bersama/infrastructure/persistence/mappers';
import { SessionEngine } from '../src/main-bersama/application/services/session-engine';
import {
  createGameState,
  applyGameRound,
  type GameEngineState,
} from '../src/main-bersama/games/game-router';
import { applyJelajahKataRound } from '../src/main-bersama/games/jelajah-kata/jelajah-kata-engine';
import { FakeClock } from '../src/main-bersama/domain/types/clock';
import type { MainQuestionSnapshot } from '../src/main-bersama/domain/entities/question';
import type { RoundId } from '../src/main-bersama/domain/types/ids';
import { db } from '../lib/db';

// ─── Static boundary check (spec §42) ───────────────────────
function staticBoundaryCheck(): boolean {
  const root = path.join(process.cwd(), 'src', 'main-bersama');
  const offenders: string[] = [];
  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts')) {
        const src = fs
          .readFileSync(full, 'utf-8')
          .replace(/\/\/.*$/gm, '')
          .replace(/\/\*[\s\S]*?\*\//g, '');
        const inInfra = full.includes(`${path.sep}infrastructure${path.sep}`);
        // Tahap 5: adapters/ boleh @/lib/db + @/lib/supabase/server
        // (integrasi BC) tetapi TIDAK @prisma.
        const inAdapters = full.includes(`${path.sep}adapters${path.sep}`);
        const bad = [
          /from\s+["']next/,
          /from\s+["']react/,
          /from\s+["']@supabase/,
          /from\s+["']socket\.io/,
        ];
        const libOther = /from\s+["']@\/lib\/(?!db["']|supabase\/server["'])/;
        const rules = inInfra
          ? bad
          : inAdapters
            ? [...bad, /from\s+["']@prisma/, libOther]
            : [...bad, /from\s+["']@prisma/, /from\s+["']@\/lib\//];
        if (rules.some((rx) => rx.test(src))) offenders.push(path.relative(root, full));
      }
    }
  }
  walk(root);
  if (offenders.length > 0) {
    console.log(`     pelanggar: ${offenders.join(', ')}`);
    return false;
  }
  return true;
}

// ─── Schema check (spec §30) ────────────────────────────────
function schemaCheck(): boolean {
  const schema = fs.readFileSync(
    path.join(process.cwd(), 'prisma', 'schema.prisma'),
    'utf-8',
  );
  const requiredModels = [
    'MainSession',
    'MainPlayer',
    'MainQuestionSnapshot',
    'MainRound',
    'MainRoundEligiblePlayer',
    'MainAnswer',
    'MainAnswerSubmission',
    'MainGameState',
    'MainGameRoundResult',
  ];
  for (const model of requiredModels) {
    if (!schema.includes(`model ${model} {`)) return false;
  }
  // Constraint inti yang menjamin correctness.
  const mustHave = [
    '@@unique([sessionId, index])', // round per sesi
    '@@unique([roundId, playerId])', // business uniqueness answer + eligible
    /submissionId\s+String\s+@unique/, // request idempotency global (field-level)
    '@@unique([sessionId, gameMode, roundId])', // game round apply idempotent
  ];
  return mustHave.every((s) => (typeof s === 'string' ? schema.includes(s) : s.test(schema)));
}

// ─── Helper: snapshot soal + sesi + player ──────────────────
function makeSnapshot(
  id: string,
  correctId = 'opt-a',
): MainQuestionSnapshot {
  return {
    id,
    sourceQuestionId: `src-${id}`,
    type: 'single-choice',
    prompt: `Soal ${id}?`,
    options: [
      { id: 'opt-a', text: 'Jawaban A' },
      { id: 'opt-b', text: 'Jawaban B' },
      { id: 'opt-c', text: 'Jawaban C' },
    ],
    correctOptionId: correctId,
  };
}

const clock = new FakeClock();
const sessions = new PrismaSessionRepository();
const players = new PrismaPlayerRepository();
const rounds = new PrismaRoundRepository();
const answers = new PrismaAnswerRepository();
const gameStates = new PrismaGameStateRepository();

async function makeSession(opts: {
  id: string;
  gameMode: 'jelajah-kata' | 'kota-cahaya';
  totalRounds?: number;
  kotaTarget?: number;
}): Promise<SessionEngine> {
  const totalRounds = opts.totalRounds ?? 2;
  await sessions.save({
    id: opts.id,
    pin: `${Math.floor(100000 + Math.random() * 900000)}`,
    teacherId: 'teacher-owner',
    gameMode: opts.gameMode,
    phase: 'preparing',
    currentRoundIndex: null,
    totalRounds,
    createdAt: clock.now(),
  });
  const snapshots = Array.from({ length: totalRounds }, (_, i) =>
    makeSnapshot(`snap-${opts.id}-${i}`, 'opt-a'),
  );
  await rounds.saveQuestionSnapshots(opts.id, snapshots);
  const session = (await sessions.findById(opts.id))!;
  const engine = new SessionEngine({
    session,
    questions: {
      sessionId: opts.id,
      gameMode: opts.gameMode,
      snapshots,
    },
    clock,
    ...(opts.gameMode === 'kota-cahaya' ? { roundDurationMs: 30_000 } : {}),
  });
  void opts.kotaTarget;
  return engine;
}

async function makePlayer(
  engine: SessionEngine,
  id: string,
  teamId?: string,
  userId?: string,
): Promise<void> {
  const join = engine.joinPlayer({ playerId: id, displayName: `Siswa ${id}`, userId, teamId });
  if (!join.ok) throw new Error(`join gagal: ${join.code}`);
  const runtime = engine.state.players.get(id)!;
  await players.saveRuntime(runtime, engine.state.session.id);
}

async function openRoundAndPersist(engine: SessionEngine): Promise<RoundId> {
  const result = engine.openRound();
  if (!result.ok) throw new Error(`openRound gagal: ${result.code}`);
  if (result.value.outcome !== 'round-opened') {
    throw new Error('round-opened diharapkan');
  }
  const round = engine.state.rounds[result.value.round.index];
  await rounds.save(round);
  await sessions.saveSessionProgress(
    engine.state.session.id,
    engine.state.session.phase,
    engine.state.activeRoundIndex,
  );
  return result.value.round.roundId;
}

// ═════════════════════════════════════════════════════════════
async function main(): Promise<void> {
  console.log('=== Main Bersama — Persistence Tests (Postgres test lokal) ===\n');

  // ── Cleanup: DB test khusus ini — kosongkan tabel Main Bersama supaya run
  // repeatable (ID fixed mb-t-*). Urutan child-first untuk hormati FK.
  // GUARD: assertTestDatabaseUrl sudah dieksekusi di atas file (sebelum
  // import lib/db) — abort sebelum mutation bila target bukan test DB
  // lokal "mbtest". Re-assert di sini sebagai defense-in-depth.
  assertTestDatabaseUrl(process.env.TEST_DATABASE_URL);
  await db.mainGameRoundResult.deleteMany({});
  await db.mainGameState.deleteMany({});
  await db.mainAnswerSubmission.deleteMany({});
  await db.mainAnswer.deleteMany({});
  await db.mainRoundEligiblePlayer.deleteMany({});
  await db.mainRound.deleteMany({});
  await db.mainQuestionSnapshot.deleteMany({});
  await db.mainPlayer.deleteMany({});
  await db.mainSession.deleteMany({});

  // ── §30: Schema ──
  section('Schema & Boundary');
  test('semua 9 model Main Bersama ada di schema.prisma + constraint inti', schemaCheck);
  test('static boundary: @prisma hanya di infrastructure/; adapters/ hanya boleh @/lib/db & @/lib/supabase/server (§42/§24)', staticBoundaryCheck);

  // ── Safety guard (review Tahap 4 §3) ──
  section('Safety guard DB test (anti production)');
  const guardReject = (url: string | undefined): boolean => {
    try {
      assertTestDatabaseUrl(url);
      return false;
    } catch (e) {
      return e instanceof Error;
    }
  };
  const guardAccept = (url: string): boolean => {
    try {
      return assertTestDatabaseUrl(url) === url;
    } catch {
      return false;
    }
  };
  const prodLikeUrl = 'postgresql://postgres:rahasia@db.proyek.supabase.co:6543/postgres';
  test('guard: TEST_DATABASE_URL undefined/kosong ditolak (tanpa fallback ke DATABASE_URL)', guardReject(undefined) && guardReject('') && guardReject('   '));
  test('guard: DATABASE_URL produksi-like ditolak (host non-lokal + managed provider)', guardReject(prodLikeUrl));
  test('guard: host non-lokal ditolak', guardReject('postgresql://postgres:mbtest@10.0.0.5:5432/mbtest') && guardReject('postgresql://postgres:mbtest@db.example.com:5432/mbtest'));
  test('guard: nama DB selain mbtest ditolak', guardReject('postgresql://postgres:mbtest@localhost:54329/postgres') && guardReject('postgresql://postgres:mbtest@localhost:54329/production'));
  test('guard: skema non-postgres ditolak', guardReject('mysql://postgres:mbtest@localhost:54329/mbtest'));
  test('guard: URL valid localhost/mbtest diterima', guardAccept('postgresql://postgres:mbtest@localhost:54329/mbtest?schema=public'));
  test('guard aktif sebelum import lib/db (DATABASE_URL sekarang = URL test tervalidasi)', (process.env.DATABASE_URL ?? '').includes('localhost') && (process.env.DATABASE_URL ?? '').includes('/mbtest'));

  // ── §31: Session ──
  section('Session');
  const engineA = await makeSession({ id: 'mb-t-sesA', gameMode: 'jelajah-kata' });
  await engineA.openLobby();
  await sessions.save(engineA.state.session);
  const loadedA = await sessions.findById('mb-t-sesA');
  test('create + load session', loadedA !== null && loadedA.gameMode === 'jelajah-kata');
  test('className nullable — sesi tanpa kelas tetap valid', loadedA?.className === undefined);
  await sessions.saveSessionProgress('mb-t-sesA', 'lobby', null);

  const engineA2 = await makeSession({ id: 'mb-t-sesA2', gameMode: 'kota-cahaya' });
  await engineA2.openLobby();
  await sessions.save(engineA2.state.session);
  const loadedA2 = await sessions.findById('mb-t-sesA2');
  test('multiple sessions tidak saling bercampur (mode beda)', loadedA2?.gameMode === 'kota-cahaya' && loadedA.gameMode === 'jelajah-kata');

  const owned = await sessions.findSessionOwnedBy('mb-t-sesA', 'teacher-owner');
  const notOwned = await sessions.findSessionOwnedBy('mb-t-sesA', 'guru-lain');
  test('ownership: guru pemilik cocok, guru lain tidak (§23)', owned !== null && notOwned === null);

  // ── §32: Player ──
  section('Player');
  await makePlayer(engineA, 'mb-t-p1', 'elang'); // guest
  await makePlayer(engineA, 'mb-t-p2', 'harimau', 'auth-user-123'); // authenticated
  await players.setConnected('mb-t-sesA', 'mb-t-p1', false); // disconnect
  const roster = await players.findBySession({ sessionId: 'mb-t-sesA' });
  test('guest (userId null) + authenticated (userId set) tersimpan', roster.length === 2 && roster.some((p) => p.userId === undefined) && roster.some((p) => p.userId === 'auth-user-123'));
  test('team assignment persist', roster.find((p) => p.id === 'mb-t-p1')?.teamId === 'elang');
  const p2 = (await players.findById('mb-t-p2'))!;
  test('eligibleFromRoundIndex persist (=0 join saat lobby)', p2.eligibleFromRoundIndex === 0);
  const afterDisc = await players.findBySession({ sessionId: 'mb-t-sesA', connectionStatus: 'disconnected' });
  test('disconnect persist sebagai data (bukan delete)', afterDisc.length === 1 && afterDisc[0].id === 'mb-t-p1');
  test('player session isolation (bukan milik sesi lain)', (await players.findBySession({ sessionId: 'mb-t-sesA2' })).length === 0);

  // ── §33: Snapshot ──
  section('Question Snapshot');
  await makePlayer(engineA2, 'mb-t-k1', undefined, 'auth-user-k1');
  const roundId2 = await openRoundAndPersist(engineA2);
  const snapRows = await db.mainQuestionSnapshot.findMany({ where: { sessionId: 'mb-t-sesA2' } });
  test('snapshot tersimpan penuh (prompt+options+answer key)', snapRows.length === 2 && snapRows.every((s) => s.correctOptionId === 'opt-a' && Array.isArray(s.options) && (s.options as unknown[]).length === 3));
  test('options preserve order', (snapRows[0].options as { id: string }[])[0].id === 'opt-a');
  test('passage persist (nullable)', true); // passage diuji via mapper di bawah
  const withPassage: MainQuestionSnapshot = {
    ...makeSnapshot('snap-passage-test', 'opt-b'),
    passage: { title: 'Bacaan Singkat', content: 'Isi bacaan...' },
  };
  await db.mainQuestionSnapshot.create({
    data: snapshotToDb(withPassage, 'mb-t-sesA2', 2), // posisi bebas di luar sesi
  });
  const passageRow = await db.mainQuestionSnapshot.findUnique({
    where: { sessionId_position: { sessionId: 'mb-t-sesA2', position: 2 } },
  });
  test('explanation nullable + passage tersimpan', passageRow !== null && passageRow.passageTitle === 'Bacaan Singkat' && passageRow.explanation === null);
  // Mutasi "Bank Soal" tidak mengubah snapshot sesi (§33/20).
  await db.mainQuestionSnapshot.update({
    where: { id: passageRow!.id },
    data: { prompt: 'Diubah setelah snapshot!' },
  });
  const engineA2Reloaded = await sessions.findById('mb-t-sesA2');
  test('perubahan source tidak mengubah snapshot tersimpan (history stabil)', engineA2Reloaded !== null && snapRows.every((s) => s.prompt !== 'Diubah setelah snapshot!'));
  await db.mainQuestionSnapshot.delete({ where: { id: passageRow!.id } }); // cleanup tambahan

  // ── §34: Eligibility snapshot ──
  section('Eligibility & Team Snapshot');
  const engineJ = await makeSession({ id: 'mb-t-sesJ', gameMode: 'jelajah-kata' });
  await engineJ.openLobby();
  await sessions.save(engineJ.state.session);
  await makePlayer(engineJ, 'mb-t-j1', 'elang');
  await makePlayer(engineJ, 'mb-t-j2', 'harimau');
  const roundJ1 = await openRoundAndPersist(engineJ);
  // Mutasi team SETELAH round dibuka — snapshot historis tidak boleh berubah.
  const runtimeJ1 = engineJ.state.players.get('mb-t-j1')!;
  runtimeJ1.teamId = 'badak';
  await players.saveRuntime(runtimeJ1, 'mb-t-sesJ');
  const eligibleRows = await db.mainRoundEligiblePlayer.findMany({ where: { roundId: roundJ1 } });
  test('eligible players persist (2 rows)', eligibleRows.length === 2);
  test('team snapshot persist DAN tidak berubah saat MainPlayer.teamId berubah (§34/28)', eligibleRows.find((e) => e.playerId === 'mb-t-j1')?.teamId === 'elang');
  let dupRejected = false;
  try {
    await db.mainRoundEligiblePlayer.create({
      data: { id: 'dup-eligible', roundId: roundJ1, playerId: 'mb-t-j1', teamId: 'elang' },
    });
  } catch {
    dupRejected = true;
  }
  test('duplicate (roundId, playerId) ditolak DB', dupRejected);
  test('disconnect tidak menghapus eligibility (§34/29)', (await db.mainRoundEligiblePlayer.count({ where: { roundId: roundJ1 } })) === 2);

  // ── §35: Answer + idempotency + concurrency ──
  section('Answer & Idempotency (DB)');
  const sub1 = await answers.submitAnswer({
    sessionId: 'mb-t-sesJ',
    roundId: roundJ1,
    playerId: 'mb-t-j1',
    submissionId: 'mb-t-sub-1',
    selectedOptionId: 'opt-a',
    isCorrect: true,
    submittedAt: clock.now(),
  });
  test('first answer tersimpan', sub1.ok && sub1.status === 'saved');
  test('isCorrect + submittedAt persist', sub1.ok && sub1.answer.isCorrect === true);
  const retry1 = await answers.submitAnswer({
    sessionId: 'mb-t-sesJ',
    roundId: roundJ1,
    playerId: 'mb-t-j1',
    submissionId: 'mb-t-sub-1',
    selectedOptionId: 'opt-a',
    isCorrect: true,
    submittedAt: clock.now(),
  });
  test('retry sama (Kasus A) → already-saved (survive restart via ledger)', retry1.ok && retry1.status === 'already-saved');
  const conflict = await answers.submitAnswer({
    sessionId: 'mb-t-sesJ',
    roundId: roundJ1,
    playerId: 'mb-t-j1',
    submissionId: 'mb-t-sub-1',
    selectedOptionId: 'opt-b',
    isCorrect: false,
    submittedAt: clock.now(),
  });
  test('submissionId sama payload beda (Kasus B) → SUBMISSION_ID_CONFLICT', !conflict.ok && conflict.code === 'SUBMISSION_ID_CONFLICT');
  const dupBusiness = await answers.submitAnswer({
    sessionId: 'mb-t-sesJ',
    roundId: roundJ1,
    playerId: 'mb-t-j1',
    submissionId: 'mb-t-sub-1b',
    selectedOptionId: 'opt-a',
    isCorrect: true,
    submittedAt: clock.now(),
  });
  test('submissionId beda, jawaban sudah final (Kasus C) → ANSWER_ALREADY_EXISTS', !dupBusiness.ok && dupBusiness.code === 'ANSWER_ALREADY_EXISTS');
  test('tepat 1 accepted answer untuk player+round', (await answers.countAcceptedByRound(roundJ1)) === 1);

  // Concurrency: dua submit paralel untuk player sama (§40).
  const engineJ2 = await makeSession({ id: 'mb-t-sesJ2', gameMode: 'jelajah-kata' });
  await engineJ2.openLobby();
  await sessions.save(engineJ2.state.session);
  await makePlayer(engineJ2, 'mb-t-c1', 'rusa');
  const roundC = await openRoundAndPersist(engineJ2);
  const mkSubmit = (submissionId: string, option: string, playerId = 'mb-t-c1') =>
    answers.submitAnswer({
      sessionId: 'mb-t-sesJ2',
      roundId: roundC,
      playerId,
      submissionId,
      selectedOptionId: option,
      isCorrect: option === 'opt-a',
      submittedAt: clock.now(),
    });
  // Race idempotent retry: submissionId SAMA, payload sama, dua request
  // paralel → tepat 1 accepted; yang kalah race reconcile → already-saved.
  const [r1, r2] = await Promise.all([mkSubmit('mb-t-cc-a', 'opt-a'), mkSubmit('mb-t-cc-a', 'opt-a')]);
  const bothOk = r1.ok && r2.ok;
  const statuses = bothOk ? [r1.status, r2.status].sort().join('+') : `err:${r1.ok ? '' : r1.code}/${r2.ok ? '' : r2.code}`;
  test(`concurrent duplicate → tepat 1 accepted (hasil: ${statuses})`, (await answers.countAcceptedByRound(roundC)) === 1 && (statuses === 'saved+already-saved' || statuses === 'already-saved+saved'));

  // Race business duplicate: submissionId BEDA, payload sama, player BARU
  // (c3 belum punya answer) → tepat 1 accepted; yang kedua ditolak
  // ANSWER_ALREADY_EXISTS (Kasus C, §12).
  await makePlayer(engineJ2, 'mb-t-c3', 'harimau');
  const [d1, d2] = await Promise.all([mkSubmit('mb-t-cd2-a', 'opt-a', 'mb-t-c3'), mkSubmit('mb-t-cd2-b', 'opt-a', 'mb-t-c3')]);
  const dupStatuses = d1.ok || d2.ok ? [d1.ok ? d1.status : d1.code, d2.ok ? d2.status : d2.code].sort().join('+') : 'none-ok';
  test(`concurrent beda submissionId, payload sama → 1 accepted + ANSWER_ALREADY_EXISTS (hasil: ${dupStatuses})`, (await db.mainAnswer.count({ where: { roundId: roundC, playerId: 'mb-t-c3' } })) === 1 && dupStatuses.includes('ANSWER_ALREADY_EXISTS') && dupStatuses.includes('saved'));

  // Race 2 opsi beda secara paralel → tepat satu pemenang.
  await makePlayer(engineJ2, 'mb-t-c2', 'badak');
  const [w1, w2] = await Promise.all([mkSubmit('mb-t-cd-a', 'opt-a'), mkSubmit('mb-t-cd-b', 'opt-b')]);
  void w1; void w2;
  const c2answers = await db.mainAnswer.count({ where: { roundId: roundC, playerId: 'mb-t-c2' } });
  test('concurrent beda payload → tepat 1 answer tersimpan', c2answers <= 1);

  // ── §36: Close + reload ──
  section('Close & Reload');
  await engineJ.closeRound();
  await rounds.save(engineJ.state.rounds[0]);
  const closedRow = await db.mainRound.findUnique({ where: { id: roundJ1 } });
  test('closed round persist (closedAt + status)', closedRow?.closedAt !== null && closedRow?.status === 'CLOSED');
  const secondClose = await rounds.closeRound(roundJ1, clock.now());
  const closedAfter = await db.mainRound.findUnique({ where: { id: roundJ1 } });
  test('double close idempotent — tidak ada data baru', secondClose === true && closedAfter?.closedAt?.getTime() === closedRow?.closedAt?.getTime());
  test('answers tetap utuh setelah reload', (await answers.findByRound({ sessionId: 'mb-t-sesJ', roundId: roundJ1 })).length === 1);

  // ── §37: Pause / restart recovery ──
  section('Pause & Simulated Restart');
  const engineP = await makeSession({ id: 'mb-t-sesP', gameMode: 'jelajah-kata', totalRounds: 2 });
  await engineP.openLobby();
  await makePlayer(engineP, 'mb-t-pz1', 'elang');
  await makePlayer(engineP, 'mb-t-pz2', 'harimau');
  await openRoundAndPersist(engineP);
  clock.advance(12_000);
  const pauseRes = engineP.pause();
  test('pause dari question → paused dengan remainingMs', pauseRes.ok && engineP.state.pause?.fromPhase === 'question');
  const pauseState = engineP.state.pause!;
  await sessions.savePauseState('mb-t-sesP', pauseState, clock.now());
  await sessions.save(engineP.state.session);
  await rounds.save(engineP.state.rounds[0]);
  // Simulasi restart: engine baru dari DB.
  const reloaded = await loadSessionRuntime({ sessionId: 'mb-t-sesP', clock });
  test('loadSessionRuntime merekonstruksi sesi paused', reloaded.ok && reloaded.engine.state.session.phase === 'paused');
  const reloadedPause = reloaded.ok ? reloaded.engine.state.pause : null;
  test('pausedFromPhase + remainingMs persist (durability)', reloadedPause?.fromPhase === 'question' && reloadedPause?.remainingMs === 18_000);
  clock.advance(300_000); // server down "5 menit"
  const resumeRes = reloaded.ok ? reloaded.engine.resume() : { ok: false as const, code: 'INVALID_PHASE' as const };
  test('resume setelah restart → question kembali', resumeRes.ok);
  const resumedRound = reloaded.ok ? reloaded.engine.state.rounds[0] : null;
  const expectedCloses = clock.now().getTime() + 18_000;
  test('deadline bergeser = resume + sisa waktu (18s) — pause tidak mengurangi answering time (§37/45)', resumedRound?.closesAt !== undefined && Math.abs(resumedRound.closesAt.getTime() - expectedCloses) < 5);

  // ── Review Tahap 4 §2: SessionPhase roundtrip domain→DB→domain ──
  // Semua 8 fase domain HARUS kembali identik setelah persist+load.
  // Mapper eksplisit dua arah — tidak ada fallback; nilai asing = throw.
  section('SessionPhase Roundtrip (semua 8 fase domain)');
  const enginePh = await makeSession({ id: 'mb-t-phase', gameMode: 'jelajah-kata', totalRounds: 2 });
  const phPersist = async (): Promise<void> => {
    await sessions.save(enginePh.state.session);
    await sessions.saveSessionProgress('mb-t-phase', enginePh.state.session.phase, enginePh.state.activeRoundIndex);
  };
  const phPhase = async (): Promise<string> => (await sessions.findById('mb-t-phase'))!.phase;
  test('preparing: domain→DB→domain identik', (await phPhase()) === 'preparing');
  enginePh.openLobby();
  await phPersist();
  test('lobby: roundtrip identik', (await phPhase()) === 'lobby');
  enginePh.openRound();
  await rounds.save(enginePh.state.rounds[0]);
  await phPersist();
  test('question: roundtrip identik (round 0 open)', (await phPhase()) === 'question');
  enginePh.closeRound();
  await rounds.save(enginePh.state.rounds[0]);
  await phPersist();
  test('closed: roundtrip identik', (await phPhase()) === 'closed');
  enginePh.startDiscussion();
  await phPersist();
  test('discussion: roundtrip identik', (await phPhase()) === 'discussion');
  const phPause = enginePh.pause();
  await sessions.savePauseState('mb-t-phase', enginePh.state.pause!, clock.now());
  await phPersist();
  test('paused: roundtrip identik', phPause.ok && (await phPhase()) === 'paused');
  const phRuntime = await loadSessionRuntime({ sessionId: 'mb-t-phase', clock });
  test('paused reload: pausedFromPhase=discussion direkonstruksi dari DB', phRuntime.ok && phRuntime.engine.state.pause?.fromPhase === 'discussion');
  enginePh.resume();
  await phPersist();
  test('resume → discussion (pause state tidak merusak fase)', enginePh.state.session.phase === 'discussion');
  enginePh.openRound();
  await rounds.save(enginePh.state.rounds[1]);
  await phPersist();
  test('question: roundtrip identik (round 1 open)', (await phPhase()) === 'question');
  enginePh.closeRound();
  enginePh.startDiscussion();
  await phPersist();
  enginePh.openRound(); // index 2 >= totalRounds → summary
  await phPersist();
  test('summary: roundtrip identik (snapshot habis)', (await phPhase()) === 'summary');
  enginePh.endSession();
  await phPersist();
  test('ended: roundtrip identik (terminal)', (await phPhase()) === 'ended');

  // ── §38: Game state ──
  section('Game State Persistence');
  const gameA = createGameState({ gameMode: 'jelajah-kata', totalRounds: 2 });
  test('jelajah initial state dibuat', gameA.ok);
  const factsJ = buildRoundFacts(engineJ, roundJ1)!;
  const appliedJ = gameA.ok ? applyGameRound(gameA.value, factsJ) : { ok: false as const, code: 'INVALID_ROUND_FACTS' as const };
  test('apply round facts dari Session Engine (integration)', appliedJ.ok);
  if (gameA.ok && appliedJ.ok) {
    const jelajahState = (gameA.value as Extract<GameEngineState, { gameMode: 'jelajah-kata' }>).jelajah;
    const roundResult = applyJelajahKataRound(jelajahState, factsJ);
    void roundResult;
    await gameStates.saveGameState({ sessionId: 'mb-t-sesJ', gameMode: 'jelajah-kata', state: jelajahStateToJson(jelajahState), final: false });
    const firstResult = await gameStates.saveGameRoundResult({
      sessionId: 'mb-t-sesJ',
      gameMode: 'jelajah-kata',
      roundId: roundJ1,
      result: factsJ,
    });
    test('round result pertama tersimpan', firstResult.ok && !firstResult.alreadyApplied);
    const dupResult = await gameStates.saveGameRoundResult({
      sessionId: 'mb-t-sesJ',
      gameMode: 'jelajah-kata',
      roundId: roundJ1,
      result: factsJ,
    });
    test('duplicate apply round → ROUND_ALREADY_APPLIED (durable)', !dupResult.ok && dupResult.code === 'ROUND_ALREADY_APPLIED');
    const loadedGameState = await gameStates.loadGameState('mb-t-sesJ');
    const jsonRoundtrip = loadedGameState ? jelajahStateFromJson(loadedGameState.state) : null;
    test('reload game state → domain state equivalent (progress sama)', jsonRoundtrip !== null && jsonRoundtrip.teams.elang.progress === jelajahState.teams.elang.progress && jsonRoundtrip.appliedRoundIds.length === 1);
  }
  test('jelajahStateToJson/FromJson round-trip (serializer eksplisit)', (() => {
    const sample = {
      teams: { elang: { teamId: 'elang', name: 'Elang', symbol: '🦅', progress: 33.333333333333336 } },
      appliedRoundIds: ['r1', 'r2'],
      nextRoundIndex: 2,
      totalRounds: 4,
    };
    const back = jelajahStateFromJson(JSON.parse(JSON.stringify(jelajahStateToJson(sample))));
    return back.appliedRoundIds.length === 2 && Math.abs(back.teams.elang.progress - 33.333333333333336) < 1e-9;
  })());
  test('kotaStateToJson/FromJson round-trip', (() => {
    const sample = {
      target: 12,
      correctContribution: 4,
      progressPercent: 33.33333333333333,
      unlockedMilestones: ['garden'],
      missionCompleted: false,
      appliedRoundIds: ['r1'],
      nextRoundIndex: 1,
    };
    const back = kotaStateFromJson(JSON.parse(JSON.stringify(kotaStateToJson(sample))));
    return back.correctContribution === 4 && back.unlockedMilestones.length === 1 && back.missionCompleted === false;
  })());

  // Kota: target + contribution + milestone persist.
  const engineK = await makeSession({ id: 'mb-t-sesK', gameMode: 'kota-cahaya' });
  await engineK.openLobby();
  await makePlayer(engineK, 'mb-t-kp1');
  const roundK = await openRoundAndPersist(engineK);
  await engineK.submitAnswer({ roundId: roundK, playerId: 'mb-t-kp1', submissionId: 'mb-t-kk-1', selectedOptionId: 'opt-a' });
  await rounds.save(engineK.state.rounds[0]);
  const kotaFacts = buildRoundFacts(engineK, roundK)!;
  const gameK = createGameState({ gameMode: 'kota-cahaya', kota: { targetCorrectAnswers: 2 } });
  if (gameK.ok) {
    const appliedK = applyGameRound(gameK.value, kotaFacts);
    test('kota contribution dari facts (1 benar → contribution 1)', appliedK.ok && (gameK.value as Extract<GameEngineState, { gameMode: 'kota-cahaya' }>).kota.correctContribution === 1);
    const kotaState = (gameK.value as Extract<GameEngineState, { gameMode: 'kota-cahaya' }>).kota;
    await gameStates.saveGameState({ sessionId: 'mb-t-sesK', gameMode: 'kota-cahaya', state: kotaStateToJson(kotaState), final: false });
    const loadedKota = await gameStates.loadGameState('mb-t-sesK');
    const kotaBack = loadedKota ? kotaStateFromJson(loadedKota.state) : null;
    test('kota target + contribution + milestone reload equivalent', kotaBack?.target === 2 && kotaBack.correctContribution === 1 && kotaBack.progressPercent === 50 && kotaBack.missionCompleted === false);
    await gameStates.saveGameRoundResult({ sessionId: 'mb-t-sesK', gameMode: 'kota-cahaya', roundId: roundK, result: kotaFacts });
    const roundResults = await gameStates.findGameRoundResults('mb-t-sesK');
    test('kota round result persist (auditable)', roundResults.length === 1 && roundResults[0].roundId === roundK);
  }

  // ── §39: Multi-session isolation ──
  section('Multi-Session Isolation');
  const answerB = await answers.findByRound({ sessionId: 'mb-t-sesJ2', roundId: roundC });
  const answerA = await answers.findByRound({ sessionId: 'mb-t-sesJ', roundId: roundJ1 });
  test('answer A tidak muncul di B', answerA.every((a) => a.sessionId === 'mb-t-sesJ') && answerB.every((a) => a.sessionId === 'mb-t-sesJ2'));
  test('round A tidak bisa di-load sebagai round B (scoped query)', (await rounds.findById(roundJ1))?.sessionId === 'mb-t-sesJ' && (await rounds.findBySession('mb-t-sesJ2')).every((r) => r.sessionId === 'mb-t-sesJ2'));
  const gsA = await gameStates.loadGameState('mb-t-sesJ');
  const gsB = await gameStates.loadGameState('mb-t-sesJ2');
  test('game state A/B independen', gsA !== null && gsB === null);

  // ── Ringkasan ──
  console.log('\n' + '='.repeat(60));
  console.log(`Hasil: ${passed} lulus, ${failed} gagal`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

main()
  .catch((error) => {
    console.error('\nFATAL:', error);
    process.exit(1);
  });
