import assert from 'node:assert/strict';
import { activeJelajahTeamKeys, JELAJAH_TEAM_KEYS } from '../src/main-bersama/domain/entities/team';
import { resolveGameConfig } from '../src/main-bersama/application/use-cases/session-defaults';
import { createGameState } from '../src/main-bersama/games/game-router';
import { pickBalancedTeam } from '../src/main-bersama/application/services/team-assignment';
import { jelajahStateToJson, jelajahStateFromJson } from '../src/main-bersama/infrastructure/repositories/prisma-game-state-repository';
import { getJelajahTeams, getJelajahLayout } from '../lib/main-bersama/jelajah-layout';

assert.deepEqual(activeJelajahTeamKeys(), ['elang', 'harimau', 'rusa', 'badak']);
assert.deepEqual(activeJelajahTeamKeys(6), ['elang', 'harimau', 'rusa', 'badak', 'gajah', 'beruang']);
assert.equal(JELAJAH_TEAM_KEYS.length, 6);
for (const count of [2,3,4,5,6]) {
  const config = resolveGameConfig('jelajah-kata', 10, {teamCount: count, maxMembersPerTeam: 6});
  assert.equal(config.ok, true);
  const state = createGameState({gameMode:'jelajah-kata', totalRounds: 10, teamCount: count, maxMembersPerTeam: 6});
  assert.equal(state.ok, true);
  if (!state.ok || state.value.gameMode !== 'jelajah-kata') throw new Error('invalid state');
  const game = state.value.jelajah;
  assert.equal(Object.keys(game.teams).length, count);
  const members: {teamId: string}[] = [];
  for (let i=0;i<count*6;i++) {
    const teamId = pickBalancedTeam(members, Object.keys(game.teams), game.maxMembersPerTeam);
    assert(teamId);
    members.push({teamId});
  }
  assert.equal(pickBalancedTeam(members, Object.keys(game.teams), 6), null);
  for (const id of Object.keys(game.teams))
    assert.equal(members.filter(member=>member.teamId===id).length, 6);
  const persisted = jelajahStateFromJson(jelajahStateToJson(game));
  assert.equal(persisted.maxMembersPerTeam, 6);
  assert.equal(Object.keys(persisted.teams).length, count);
  assert.equal(getJelajahTeams(Object.values(game.teams).map(t=>({id:t.teamId,name:t.name}))).length,count);
  assert.equal(getJelajahLayout(Object.values(game.teams).map(t=>({id:t.teamId})),{}).positions.size,count);
}
for (const count of [0,1,7,2.5,-2]) assert.equal(resolveGameConfig('jelajah-kata',10,{teamCount:count}).ok,false);
for (const cap of [0,-1,51,2.4]) assert.equal(resolveGameConfig('jelajah-kata',10,{maxMembersPerTeam:cap}).ok,false);
assert.equal(pickBalancedTeam([], [], 5),null);
console.log('Six-team capacity, balanced joins, legacy defaults, state persistence and 2-6 layouts passed.');
