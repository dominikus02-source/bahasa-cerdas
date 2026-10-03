// Only the explicitly configured localhost mbtest database may be mutated.
import '../src/main-bersama/infrastructure/persistence/require-test-db';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { db } from '../lib/db';
import { PrismaRoundRepository } from '../src/main-bersama/infrastructure/repositories/prisma-round-repository';
import { PrismaAnswerRepository } from '../src/main-bersama/infrastructure/repositories/prisma-answer-repository';
import { PrismaPlayerRepository } from '../src/main-bersama/infrastructure/repositories/prisma-player-repository';
import { loadSessionRuntime } from '../src/main-bersama/infrastructure/persistence/load-session-runtime';
import { getTeamRoundIndex, getIndependentTeamProgress, IndependentRosterClosedError } from '../src/main-bersama/application/services/independent-jelajah';

const sessionId = randomUUID();
const now = new Date();
const players = [{ id: randomUUID(), teamId: 'elang' }, { id: randomUUID(), teamId: 'elang' }, { id: randomUUID(), teamId: 'harimau' }];
const roundRepo = new PrismaRoundRepository();
const answerRepo = new PrismaAnswerRepository();
async function runtime() {
  const loaded = await loadSessionRuntime({ sessionId, clock: { now: () => now } });
  assert(loaded.ok);
  return loaded.engine;
}
async function main() {
  try {
    await db.mainSession.create({ data: { id: sessionId, pin: sessionId, teacherId: 'independent-local-test', gameMode: 'JELAJAH_KATA', phase: 'LOBBY', totalRounds: 2,
      players: { create: players.map((p) => ({ ...p, displayName: p.id })) },
      questionSnapshots: { create: [0, 1].map((position) => ({ position, sourceQuestionId: `q${position}`, type: 'single-choice', prompt: 'Test', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correctOptionId: 'a' })) },
      gameStates: { create: { gameMode: 'JELAJAH_KATA', state: { teams: { elang: { name: 'Elang', symbol: 'E', progress: 0 }, harimau: { name: 'Harimau', symbol: 'H', progress: 0 } }, appliedRoundIds: [], nextRoundIndex: 0, totalRounds: 2 } } },
    } });
    const starts = await Promise.all([roundRepo.startIndependentJelajah(sessionId, now), roundRepo.startIndependentJelajah(sessionId, now)]);
    assert.equal(starts[0].roundId, starts[1].roundId, 'Concurrent starts are idempotent.');
    const rounds = await roundRepo.findBySession(sessionId);
    assert.equal(rounds.length, 2);
    assert(rounds.every((r) => r.eligiblePlayerIds.length === 3 && r.closesAt === undefined));
    const input = (playerIndex: number, index: number, option = 'a') => ({ sessionId, playerId: players[playerIndex].id, roundId: rounds[index].id, submissionId: `${sessionId}-${playerIndex}-${index}`, selectedOptionId: option, isCorrect: false, submittedAt: now });
    const skipped = await answerRepo.submitAnswer(input(0, 1));
    assert(!skipped.ok && skipped.code === 'ROUND_NOT_OPEN', 'Future question cannot be skipped.');
    const concurrent = await Promise.all([answerRepo.submitAnswer(input(0, 0)), answerRepo.submitAnswer(input(1, 0, 'b'))]);
    assert(concurrent.every((r) => r.ok), JSON.stringify(concurrent));
    assert(concurrent[0].ok && concurrent[0].answer.isCorrect, 'Correctness comes from server snapshot, not caller.');
    let loaded = await runtime();
    assert.equal(getTeamRoundIndex(loaded.state, 'elang'), 1);
    assert.equal(getTeamRoundIndex(loaded.state, 'harimau'), 0);
    assert.equal(getIndependentTeamProgress(loaded.state).elang, 25);
    await assert.rejects(new PrismaPlayerRepository().saveRuntime({ id: randomUUID(), displayName: 'Late', teamId: 'elang', connected: true, joinedAt: now, eligibleFromRoundIndex: 1, participationStatus: 'active' }, sessionId), IndependentRosterClosedError);
    const returning = loaded.state.players.get(players[0].id);
    assert(returning);
    await new PrismaPlayerRepository().saveRuntime(returning, sessionId);
    const retry = await answerRepo.submitAnswer(input(0, 0));
    assert(retry.ok && retry.status === 'already-saved');
    const changed = await answerRepo.submitAnswer(input(0, 0, 'b'));
    assert(!changed.ok && changed.code === 'SUBMISSION_ID_CONFLICT');
    assert((await answerRepo.submitAnswer(input(0, 1))).ok);
    assert((await answerRepo.submitAnswer(input(1, 1))).ok);
    loaded = await runtime();
    assert.equal(loaded.state.session.phase, 'question', 'Finished Elang waits for Harimau.');
    assert.equal(getTeamRoundIndex(loaded.state, 'elang'), 2);
    assert((await answerRepo.submitAnswer(input(2, 0))).ok);
    assert((await answerRepo.submitAnswer(input(2, 1))).ok);
    loaded = await runtime();
    assert.equal(loaded.state.session.phase, 'summary', 'Final answer automatically ends the game.');
    assert.equal(getIndependentTeamProgress(loaded.state).elang, 75);
    assert.equal(getIndependentTeamProgress(loaded.state).harimau, 100);
    const game = await db.mainGameState.findUniqueOrThrow({ where: { sessionId } });
    assert.equal(game.status, 'FINAL');
    assert.equal(await db.mainAnswer.count({ where: { sessionId } }), 6);
    assert((await roundRepo.findBySession(sessionId)).every((r) => r.phase === 'closed'));
    const finalRetry = await answerRepo.submitAnswer(input(2, 1));
    assert(finalRetry.ok && finalRetry.status === 'already-saved', 'Retry survives finalization and reload.');
    console.log('✅ PostgreSQL: concurrent start/answers, independent progress, frozen roster, reconnect, idempotency, automatic finalization and restart recovery.');
  } finally {
    await db.mainSession.deleteMany({ where: { id: sessionId } });
    await db.$disconnect();
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
