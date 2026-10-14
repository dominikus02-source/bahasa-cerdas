import assert from 'node:assert/strict';
import { SessionEngine } from '../src/main-bersama/application/services/session-engine';
import { FakeClock } from '../src/main-bersama/domain/types/clock';
import { createGameState } from '../src/main-bersama/games/game-router';
import { autoAdvanceJelajahIfRoundComplete, endSession } from '../src/main-bersama/application/services/session-commands';
import { buildProjectorView, buildTeacherView } from '../src/main-bersama/presentation/view-mappers';
import type { SessionOrchestratorDeps } from '../src/main-bersama/application/services/orchestrator-ports';
import type { VerifiedTeacherActor } from '../src/main-bersama/application/use-cases/create-main-session';

const clock = new FakeClock();
const sessionId = 'manual-finish-regression';
const questions = [0, 1].map((i) => ({ id: 'q' + i, sourceQuestionId: 'source' + i,
  type: 'single-choice' as const, prompt: 'Soal ' + (i+1),
  options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correctOptionId: 'a' }));
const engine = new SessionEngine({
  session: { id: sessionId, pin: '123456', teacherId: 'teacher', gameMode: 'jelajah-kata',
    phase: 'question', currentRoundIndex: 0, totalRounds: 2, createdAt: clock.now() },
  questions: { sessionId, gameMode: 'jelajah-kata', snapshots: questions }, clock,
});
engine.state.players.set('student', {
  id: 'student', displayName: 'Murid', teamId: 'elang', joinedAt: clock.now(),
  eligibleFromRoundIndex: 0, connected: true, participationStatus: 'active',
});
engine.state.rounds = questions.map((question, index) => ({
  id: 'r' + index, sessionId, index, question, eligiblePlayerIds: ['student'],
  eligibleTeamIds: { student: 'elang' }, phase: 'open' as const, openedAt: clock.now(),
}));
engine.state.activeRoundIndex = 0;

const game = createGameState({ gameMode: 'jelajah-kata', totalRounds: 2, teamCount: 2 });
assert(game.ok);
const events: string[] = [];
const deps = {
  clock,
  resolver: {
    discard: () => events.push('discard'),
    resolve: async () => ({ ok: true as const, engine }),
  },
  sessions: { findOwnedBy: async () => engine.state.session },
  rounds: {
    claimAutoAdvance: async () => { events.push('INCORRECT-AUTO-ADVANCE'); return true; },
    finishIndependentJelajah: async () => { events.push('teacher-finish'); return true; },
  },
  gameStates: {
    loadGameState: async () => ({ sessionId, state: game.value }),
    saveGameState: async ({ final }: { final: boolean }) => { events.push('final:' + final); },
    saveGameRoundResult: async () => ({ ok: true as const }),
  },
  realtimeSignal: { sendSessionUpdate: async () => { events.push('signal'); } },
} as unknown as SessionOrchestratorDeps;

async function main() {
// Shared-round auto-advance must never touch independent Jelajah phase/rounds.
await autoAdvanceJelajahIfRoundComplete(deps, sessionId, 'r0');
assert(!events.includes('INCORRECT-AUTO-ADVANCE'));
assert.equal(engine.state.session.phase, 'question');
assert.equal(buildTeacherView(engine, clock.now(), game.value).allowedActions.canEndSession, true);

const actor = { role: 'GURU', userId: 'teacher' } as VerifiedTeacherActor;
const finished = await endSession(deps, actor, sessionId);
assert(finished.ok);
assert.deepEqual(events.filter((e) => e === 'teacher-finish'), ['teacher-finish']);
assert(events.includes('final:true'));
assert.equal(engine.state.session.phase, 'ended');
const projector = buildProjectorView(engine, clock.now(), game.value);
assert.equal(projector.phase, 'ended');
assert(projector.finalResult?.gameMode === 'jelajah-kata');
assert.equal(projector.finalResult.teamRanking.length, 2);
console.log('Jelajah: no legacy auto-end, teacher-only finalization and final podium passed.');

}
main().catch((error) => { console.error(error); process.exitCode = 1; });
