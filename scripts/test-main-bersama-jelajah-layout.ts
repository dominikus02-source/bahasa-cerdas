import assert from 'node:assert/strict';
import { getJelajahLayout, getJelajahTeams, JELAJAH_MASCOT_SIZE } from '../lib/main-bersama/jelajah-layout';
const ids = ['elang', 'harimau', 'rusa', 'badak', 'gajah', 'beruang'];
const teams = ids.slice(0, 4).map(id => ({ id }));
const start = getJelajahLayout(teams, {}).positions;
let count = 0;
for (let a = 0; a <= 100; a += 10) for (let b = 0; b <= 100; b += 10)
  for (let c = 0; c <= 100; c += 10) for (let d = 0; d <= 100; d += 10) {
    const progress = { elang: a, harimau: b, rusa: c, badak: d };
    const { positions, height } = getJelajahLayout(teams, progress);
    assert.equal(positions.size, 4);
    for (const team of teams) {
      const point = positions.get(team.id)!;
      const origin = start.get(team.id)!;
      assert(point.x - JELAJAH_MASCOT_SIZE / 2 >= 190, 'Mascots cannot cover team names.');
      assert(point.x + JELAJAH_MASCOT_SIZE / 2 < 1104, 'Mascots cannot cover progress badges.');
      assert(point.y - JELAJAH_MASCOT_SIZE >= 50);
      assert(point.y + 32 <= height, 'Every team must stay within the stage.');
      assert.equal(point.x - origin.x, point.distance, 'Only authoritative progress moves a team forward.');
      assert.equal(point.y, origin.y, 'Each team keeps its own lane regardless of rank.');
    }
    count++;
  }
for (const teamCount of [2, 3, 4, 5, 6]) {
  const active = ids.slice(0, teamCount).map(id => ({ id, name: `Regu ${id}` }));
  assert.deepEqual(getJelajahTeams([...active].reverse()).map(team => team.id), ids.slice(0, teamCount));
  const origin = getJelajahLayout(active, {}).positions;
  for (const percent of [0, 33, 50, 100]) {
    const { positions, height } = getJelajahLayout(active, Object.fromEntries(active.map(team => [team.id, percent])));
    const points = [...positions.values()];
    assert.equal(positions.size, teamCount);
    assert.equal(new Set(points.map(point => point.x)).size, 1, 'Tied progress must have the exact same horizontal position.');
    assert.equal(new Set(points.map(point => point.y)).size, teamCount, 'Every mascot has a separate lane.');
    points.forEach((point, i) => {
      assert(point.y + 32 < height);
      if (i > 0) assert(point.y - points[i - 1].y > JELAJAH_MASCOT_SIZE + 3, 'No vertical overlap, even during the stride animation.');
      assert.equal(point.y, origin.get(active[i].id)!.y);
    });
  }
}
for (const value of [NaN, Infinity, -30, 200]) {
  for (const point of getJelajahLayout(teams, { elang: value }).positions.values()) assert(Number.isFinite(point.x) && Number.isFinite(point.y));
}
assert.equal(getJelajahLayout([], {}).positions.size, 4, 'The existing four-team fallback is preserved.');
assert.deepEqual(getJelajahTeams([{id:'beruang',name:'Beruang Kelas A'},{id:'gajah'}]).map(t=>[t.id,t.name]), [['gajah','Gajah'],['beruang','Beruang Kelas A']]);
console.log(`${count} progress combinations + 2–6 team lane checks passed: canonical order, equal starts, no overlap and no clipping.`);
