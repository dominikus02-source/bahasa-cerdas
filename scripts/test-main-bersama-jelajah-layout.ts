import assert from 'node:assert/strict';
import { getJelajahLayout, getJelajahTeams, JELAJAH_MASCOT_SIZE } from '../lib/main-bersama/jelajah-layout';
const teams = ['elang', 'harimau', 'rusa', 'badak'].map((id) => ({ id }));
const start = getJelajahLayout(teams, {}).positions;
let count = 0;
for (let a = 0; a <= 100; a += 10) for (let b = 0; b <= 100; b += 10)
  for (let c = 0; c <= 100; c += 10) for (let d = 0; d <= 100; d += 10) {
    const progress = { elang: a, harimau: b, rusa: c, badak: d };
    const { positions } = getJelajahLayout(teams, progress);
    assert.equal(positions.size, 4);
    for (const team of teams) {
      const point = positions.get(team.id)!;
      const origin = start.get(team.id)!;
      assert(point.x - JELAJAH_MASCOT_SIZE / 2 >= 28);
      assert(point.x + JELAJAH_MASCOT_SIZE / 2 <= 1172);
      assert(point.y - JELAJAH_MASCOT_SIZE >= 90);
      assert(point.y + 32 <= 530, 'The fourth mascot must never be clipped.');
      assert(point.y + 30 >= 423 && point.y + 30 <= 495);
      assert.equal(point.x - origin.x, point.distance, 'Only progress moves a team forward.');
      assert.equal(point.y, origin.y, 'Road depth never depends on leaderboard order.');
    }
    count += 1;
  }
for (const percent of [0, 33, 50, 100]) {
  const points = [...getJelajahLayout(teams, Object.fromEntries(teams.map((team) => [team.id, percent]))).positions.values()];
  assert.equal(new Set(points.map((point) => point.distance)).size, 1, 'Tied teams share the same forward distance.');
}
const points = [...start.values()];
assert(points[3].x - points[0].x < JELAJAH_MASCOT_SIZE, 'Starting avatars intentionally overlap in perspective.');
const lead = getJelajahLayout(teams, { elang: 33 }).positions;
assert(lead.get('elang')!.distance > lead.get('badak')!.distance);
assert(lead.get('elang')!.x > start.get('elang')!.x);
for (const value of [NaN, Infinity, -30, 200]) {
  for (const point of getJelajahLayout(teams, { elang: value }).positions.values()) assert(Number.isFinite(point.x) && Number.isFinite(point.y));
}
assert.deepEqual(getJelajahTeams(teams.slice(0, 3)).map((team) => team.id), teams.map((team) => team.id));
assert.equal(getJelajahLayout([], {}).positions.size, 4, 'All four regu are present even with incomplete view data.');
console.log(`${count} perspective layouts passed: four regu, overlapping start, progress-only advancement, road depth and clipping bounds.`);
