import assert from 'node:assert/strict';
import { FakeClock } from '../src/main-bersama/domain/types/clock';
import { SessionEngine } from '../src/main-bersama/application/services/session-engine';
import { buildRoundFacts } from '../src/main-bersama/application/services/round-facts-projection';
import { finalizeKotaTarget } from '../src/main-bersama/application/services/kota-target-policy';
import { createGameState, applyGameRound } from '../src/main-bersama/games/game-router';
import { milestonesForProgress } from '../src/main-bersama/games/kota-cahaya/kota-cahaya-engine';
import { buildProjectorView, buildTeacherView } from '../src/main-bersama/presentation/view-mappers';
import { getKotaPodium } from '../lib/main-bersama/kota-podium';

function play(matrix: readonly (readonly boolean[])[]) {
  const clock = new FakeClock();
  const snapshots = matrix.map((_, index) => ({ id: `q${index}`, sourceQuestionId: `q${index}`, type: 'single-choice' as const, prompt: 'Soal audit', options: [{ id: 'a', text: 'Benar' }, { id: 'b', text: 'Lain' }], correctOptionId: 'a' }));
  const engine = new SessionEngine({ session: { id: 'kota-test', pin: '111222', teacherId: 'private-teacher', gameMode: 'kota-cahaya', phase: 'preparing', totalRounds: matrix.length, currentRoundIndex: null, createdAt: clock.now() }, questions: { sessionId: 'kota-test', gameMode: 'kota-cahaya', snapshots }, clock });
  assert(engine.openLobby().ok);
  matrix[0].forEach((_, index) => assert(engine.joinPlayer({ playerId: `private-player-${index}`, userId: `private-user-${index}`, displayName: `Siswa ${index + 1}`, avatarUrl: '/avatar/2.webp' }).ok));
  const target = finalizeKotaTarget({ eligiblePlayerCount: matrix[0].length, totalRounds: matrix.length });
  assert(target);
  const created = createGameState({ gameMode: 'kota-cahaya', kota: { targetCorrectAnswers: target } });
  assert(created.ok && created.value.gameMode === 'kota-cahaya');
  const game = created.value;
  for (let index = 0; index < matrix.length; index++) {
    assert(engine.openRound().ok);
    const round = engine.activeRound();
    assert(round);
    assert.equal(buildProjectorView(engine, clock.now(), game).finalResult, null, 'Awards are unavailable before summary.');
    matrix[index].forEach((correct, player) => {
      const input = { roundId: round.id, playerId: `private-player-${player}`, submissionId: `s-${index}-${player}`, selectedOptionId: correct ? 'a' : 'b' };
      assert(engine.submitAnswer(input).ok);
      assert(engine.submitAnswer(input).ok, 'Duplicate accepted submit is idempotent.');
    });
    assert(engine.closeRound().ok);
    const facts = buildRoundFacts(engine, round.id);
    assert(facts);
    assert(applyGameRound(game, facts).ok);
    const before = game.kota.correctContribution;
    assert(!applyGameRound(game, facts).ok);
    assert.equal(game.kota.correctContribution, before, 'Duplicate close cannot double energy.');
    assert(engine.startDiscussion().ok);
  }
  assert(engine.openRound().ok);
  assert.equal(engine.getPhase(), 'summary');
  const view = buildProjectorView(engine, clock.now(), game);
  assert(view.finalResult?.gameMode === 'kota-cahaya');
  assert.equal(game.kota.correctContribution, matrix.flat().filter(Boolean).length);
  const podium = view.finalResult.podium ?? [];
  const teacher = buildTeacherView(engine, clock.now(), game);
  assert.deepEqual(podium.map((p) => [p.displayName, p.correctAnswers, p.rank]), getKotaPodium(teacher.participants).map((p) => [p.displayName, p.correctAnswers, p.rank]));
  for (const entry of podium) assert.deepEqual(Object.keys(entry).sort(), ['avatarUrl', 'correctAnswers', 'displayName', 'rank']);
  assert(!JSON.stringify(view).includes('private-'), 'Projector contains no internal player/user/teacher identifiers.');
  assert(engine.endSession().ok);
  assert.deepEqual(buildProjectorView(engine, clock.now(), game).finalResult, view.finalResult, 'Awards survive session end.');
  return view.finalResult;
}

const completed = play([[true, true, true, true], [true, true, true, false], [true, false, false, false]]);
assert.equal(completed.missionAchieved, true);
assert.equal(completed.progressPercent, 100);
assert.deepEqual(completed.podium?.map((p) => p.rank), [1, 2, 2]);
assert.equal(play([[true], [true]]).podium?.length, 1, 'One student gets one centered award.');
const zero = play([[false, false, false, false]]);
assert(!zero.missionAchieved);
assert.equal(zero.progressPercent, 0);
assert.equal(zero.podium?.length, 4, 'Every shared first rank remains visible.');
assert.deepEqual(milestonesForProgress(24.999), []);
assert.deepEqual(milestonesForProgress(49.999), ['garden']);
assert.equal(milestonesForProgress(99.999).length, 3, 'Rounding cannot prematurely light the fourth area.');
assert.equal(milestonesForProgress(100).length, 4);
assert.deepEqual(getKotaPodium([]), []);
assert.equal(getKotaPodium(Array.from({ length: 8 }, (_, i) => ({ displayName: `Siswa ${i}`, correctAnswers: 2 }))).length, 8, 'Ties must not be sliced to three people.');
console.log('Kota lifecycle, contribution scoring, idempotency, public-safe podium, shared ranks, solo/zero results, final persistence in views and exact milestone thresholds passed.');
