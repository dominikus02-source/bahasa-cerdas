/**
 * Pemilihan satu sumber musik Main Bersama per perangkat (tanpa DB/browser).
 *
 * Jalankan: npx tsx scripts/test-main-bersama-music-leader.ts
 */
import assert from 'node:assert/strict';
import {
  MUSIC_SURFACE_PRIORITY,
  pickMusicLeader,
  type MusicCandidate,
} from '../components/main-bersama/sound/music-leader';

const c = (id: string, surface: keyof typeof MUSIC_SURFACE_PRIORITY, since: number): MusicCandidate => ({
  id,
  priority: MUSIC_SURFACE_PRIORITY[surface],
  since,
});

// Tidak ada kandidat → tidak ada yang memutar.
assert.equal(pickMusicLeader([]), null);

// Satu tab → tab itu memimpin.
assert.equal(pickMusicLeader([c('a', 'murid', 5)]), 'a');

// Ruang guru selalu diutamakan, walau dibuka belakangan.
assert.equal(pickMusicLeader([c('murid', 'murid', 1), c('guru', 'guru', 99)]), 'guru');
assert.equal(pickMusicLeader([c('layar', 'layar', 1), c('guru', 'guru', 99)]), 'guru');
assert.equal(pickMusicLeader([c('murid', 'murid', 1), c('layar', 'layar', 50)]), 'layar');

// Dua tab ruang guru → yang lebih dulu memutar tetap memimpin.
assert.equal(pickMusicLeader([c('baru', 'guru', 20), c('lama', 'guru', 10)]), 'lama');

// Seri penuh → id terkecil, deterministik di semua tab.
assert.equal(pickMusicLeader([c('b', 'guru', 10), c('a', 'guru', 10)]), 'a');
assert.equal(pickMusicLeader([c('a', 'guru', 10), c('b', 'guru', 10)]), 'a');

// Pemimpin dibisukan (keluar dari daftar) → kandidat berikutnya mengambil alih.
const all = [c('guru', 'guru', 1), c('layar', 'layar', 2), c('murid', 'murid', 3)];
assert.equal(pickMusicLeader(all), 'guru');
assert.equal(pickMusicLeader(all.filter((x) => x.id !== 'guru')), 'layar');
assert.equal(pickMusicLeader(all.filter((x) => x.id === 'murid')), 'murid');

// Urutan masukan tidak memengaruhi hasil.
for (let i = 0; i < 20; i++) {
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  assert.equal(pickMusicLeader(shuffled), 'guru');
}

console.log('test-main-bersama-music-leader: OK');
