import assert from 'node:assert/strict';
import { getStudentPodium } from '../lib/main-bersama/student-podium';
const students = [
  { id: 'A', progressRank: 1 },
  { id: 'B', progressRank: 1 },
  { id: 'C', progressRank: 3 },
  { id: 'D', progressRank: 4 },
];
assert.deepEqual(getStudentPodium(students).map((p) => p.id), ['A', 'B', 'C']);
assert.deepEqual(getStudentPodium(students.slice(0, 1)), students.slice(0, 1));
assert.deepEqual(getStudentPodium([]), []);
assert.deepEqual(getStudentPodium([{ progressRank: 1 }, { progressRank: 2 }, { progressRank: 3 }]).map((p) => p.progressRank), [2, 1, 3]);
assert.equal(students.length, 4);
console.log('Student podium: tied winners retained, solo/empty podium, rank order and source preservation passed.');
