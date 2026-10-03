import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getTeacherPrimaryAction } from '../lib/main-bersama/teacher-primary-action';
import type { TeacherSessionView } from '../src/main-bersama/contracts/views/teacher';

type ActionView = Parameters<typeof getTeacherPrimaryAction>[0];
const permissions: TeacherSessionView['allowedActions'] = {
  canStartSession: true, canCloseRound: true, canStartDiscussion: true,
  canOpenNextRound: true, canGoToNextRound: true, canPause: true,
  canResume: true, canEndSession: true,
};
const base: ActionView = {
  phase: 'lobby', allowedActions: permissions,
  participants: [{} as TeacherSessionView['participants'][number]],
  currentRoundIndex: 0, totalRounds: 4,
};
for (const [phase, command] of [
  ['lobby', 'start'], ['question', 'close-round'], ['closed', 'discuss'],
  ['discussion', 'next-round'], ['paused', 'resume'], ['summary', 'end'],
] as const) {
  const action = getTeacherPrimaryAction({ ...base, phase });
  assert.equal(action?.command, command);
  assert.equal(action?.disabled, false);
}
assert.equal(getTeacherPrimaryAction({ ...base, participants: [] })?.disabled, true);
assert.equal(getTeacherPrimaryAction({ ...base, allowedActions: { ...permissions, canStartSession: false } })?.disabled, true);
assert.equal(getTeacherPrimaryAction({ ...base, phase: 'question', allowedActions: { ...permissions, canCloseRound: false } })?.disabled, true);
assert.equal(getTeacherPrimaryAction({ ...base, phase: 'discussion', allowedActions: { ...permissions, canGoToNextRound: false } })?.disabled, true);
const final = getTeacherPrimaryAction({ ...base, phase: 'discussion', currentRoundIndex: 3, allowedActions: { ...permissions, canGoToNextRound: false } });
assert.equal(final?.label, 'Lihat Hasil');
assert.equal(final?.command, 'next-round');
assert.equal(final?.disabled, false);
for (const phase of ['preparing', 'ended'] as const) assert.equal(getTeacherPrimaryAction({ ...base, phase }), null);
const trail = readFileSync(resolve('components/main-bersama/art/jelajah/JelajahTrail.tsx'), 'utf8');
const backgroundPaths = [...trail.matchAll(/href="(\/main-bersama\/[^" ]+)"/g)].map(match => match[1]);
assert.ok(backgroundPaths.length > 0, 'Journey needs an illustration');
for (const path of backgroundPaths) assert.ok(existsSync(resolve(`public${path}`)), `Missing journey asset: ${path}`);
const registry = readFileSync(resolve('components/main-bersama/art/registry.tsx'), 'utf8');
for (const match of registry.matchAll(/src: '(\/main-bersama\/[^']+)'/g)) {
  assert.ok(existsSync(resolve(`public${match[1]}`)), `Missing team mascot: ${match[1]}`);
}
console.log('Teacher phase controls, permission guards, journey background and mascot assets: passed.');
