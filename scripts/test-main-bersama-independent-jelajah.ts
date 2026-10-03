import assert from 'node:assert/strict';
import { SessionEngine } from '../src/main-bersama/application/services/session-engine';
import { FakeClock } from '../src/main-bersama/domain/types/clock';
import type { MainQuestionSnapshot } from '../src/main-bersama/domain/entities/question';
import { getTeamRoundIndex, getIndependentTeamProgress, getIndependentTeamStatus } from '../src/main-bersama/application/services/independent-jelajah';
import { buildStudentView, buildTeacherView } from '../src/main-bersama/presentation/view-mappers';
import { getTeacherPrimaryAction } from '../lib/main-bersama/teacher-primary-action';
const clock = new FakeClock();
const questions: MainQuestionSnapshot[] = [0, 1].map((index) => ({ id: `q${index}`, sourceQuestionId: `bank${index}`, type: 'single-choice', prompt: `Question ${index}`, options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correctOptionId: 'a', explanation: 'Secret explanation' }));
const engine = new SessionEngine({ session: { id: 'independent-test', pin: '123456', teacherId: 'teacher', gameMode: 'jelajah-kata', phase: 'question', currentRoundIndex: 0, totalRounds: 2, createdAt: clock.now() }, questions: { sessionId: 'independent-test', gameMode: 'jelajah-kata', snapshots: questions }, clock });
const players = [{ id: 'e1', teamId: 'elang' }, { id: 'e2', teamId: 'elang' }, { id: 'h1', teamId: 'harimau' }];
for (const player of players) engine.state.players.set(player.id, { ...player, displayName: player.id, joinedAt: clock.now(), eligibleFromRoundIndex: 0, connected: true, participationStatus: 'active' });
engine.state.rounds = questions.map((question, index) => ({ id: `r${index}`, sessionId: 'independent-test', index, question, eligiblePlayerIds: players.map((p) => p.id), eligibleTeamIds: Object.fromEntries(players.map((p) => [p.id, p.teamId])), phase: 'open', openedAt: clock.now() }));
engine.state.activeRoundIndex = 0;
function submit(playerId: string, roundIndex: number, selectedOptionId = 'a') {
 const input = { playerId, roundId: `r${roundIndex}`, submissionId: `${playerId}-${roundIndex}`, selectedOptionId };
 const result = engine.evaluateSubmission(input);
 assert(result.ok, JSON.stringify(result));
 engine.applySubmission(input, result.value);
 return result.value;
}
function student(playerId: string) {
 const result = buildStudentView(engine, playerId, clock.now());
 assert(result.ok);
 return result.view;
}
assert.equal(getTeamRoundIndex(engine.state, 'elang'), 0);
assert.equal(engine.evaluateSubmission({ playerId: 'e1', roundId: 'r1', submissionId: 'skip', selectedOptionId: 'a' }).ok, false);
submit('e1', 0);
assert.equal(getTeamRoundIndex(engine.state, 'elang'), 0);
assert.equal(getIndependentTeamProgress(engine.state).elang, 0, 'Incomplete team cannot gain progress yet.');
const waiting = student('e1');
assert.equal(waiting.phase, 'question');
if (waiting.phase === 'question') { assert.equal(waiting.ownAnswerStatus, 'saved'); assert.equal(waiting.teamAnsweredCount, 1); assert.equal(waiting.teamEligibleCount, 2); }
submit('e2', 0, 'b');
assert.equal(getTeamRoundIndex(engine.state, 'elang'), 1);
assert.equal(getTeamRoundIndex(engine.state, 'harimau'), 0);
assert.equal(getIndependentTeamProgress(engine.state).elang, 25, 'Accuracy uses team size and total questions, not speed.');
const advanced = student('e1'); const slower = student('h1');
assert.equal(advanced.phase, 'question'); assert.equal(slower.phase, 'question');
if (advanced.phase === 'question' && slower.phase === 'question') {
 assert.equal(advanced.roundIndex, 1); assert.equal(slower.roundIndex, 0);
 assert.equal(advanced.closesAt, '');
 assert(!('correctOptionId' in advanced.question)); assert(!('explanation' in advanced.question));
}
assert.equal(submit('e1', 0).status, 'already-saved', 'Retry still succeeds after group advances.');
assert.equal(engine.evaluateSubmission({ playerId: 'e1', roundId: 'r0', submissionId: 'e1-0', selectedOptionId: 'b' }).ok, false);
clock.advance(24 * 60 * 60 * 1000);
submit('e1', 1); submit('e2', 1);
assert.equal(getTeamRoundIndex(engine.state, 'elang'), 2);
const finished = student('e1');
assert.equal(finished.phase, 'question'); if (finished.phase === 'question') assert.equal(finished.teamFinished, true);
assert.equal(Object.values(getIndependentTeamStatus(engine.state)).every((team) => team.finished), false);
submit('h1', 0); submit('h1', 1);
assert.equal(Object.values(getIndependentTeamStatus(engine.state)).every((team) => team.finished), true);
assert.equal(getIndependentTeamProgress(engine.state).elang, 75);
assert.equal(getIndependentTeamProgress(engine.state).harimau, 100);
const teacher = buildTeacherView(engine, clock.now());
assert.equal(teacher.automaticTeams, true);
assert.equal(teacher.allowedActions.canCloseRound, false);
assert.equal(getTeacherPrimaryAction(teacher), null);
engine.state.session.phase = 'summary';
assert.equal(student('e1').phase, 'summary');
assert.equal(getTeacherPrimaryAction(buildTeacherView(engine, clock.now()))?.command, 'end');
const recovered = new SessionEngine({ session: { ...engine.state.session }, questions: { sessionId: 'independent-test', gameMode: 'jelajah-kata', snapshots: questions }, clock });
recovered.state.players = new Map(engine.state.players);
recovered.state.rounds = engine.state.rounds.map((round) => ({ ...round }));
recovered.state.answersByRound = new Map(engine.state.answersByRound);
assert.equal(getTeamRoundIndex(recovered.state, 'elang'), 2);
assert.deepEqual(getIndependentTeamProgress(recovered.state), getIndependentTeamProgress(engine.state));
console.log('Independent Jelajah passed: team barriers, separate questions, fair scoring, retry safety, no answer leakage, waiting/final views and automatic controls.');
