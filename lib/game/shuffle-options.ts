/**
 * Pengacakan opsi jawaban untuk SEMUA game arcade (Menara Cerdas,
 * Benar-Salah, Irama Kata, Lari Kata, Tebak Kata, Susun Kata, Katastra,
 * Tantang Teman). Setiap permintaan soal, posisi jawaban benar diacak
 * supaya murid tidak bisa menebak "jawaban selalu yang kedua".
 *
 * Dipakai di server (route API) — klien tidak pernah menentukan posisi
 * jawaban. Bentuk jawaban index (angka) di-remap mengikuti posisi baru.
 */
export function shuffleOptions(
  opsi: string[],
  jawaban: number
): { opsi: string[]; jawaban: number } {
  if (!Array.isArray(opsi) || opsi.length <= 1) return { opsi, jawaban };
  if (jawaban < 0 || jawaban >= opsi.length) return { opsi, jawaban };

  const idx = opsi.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }

  const opsiBaru = idx.map((i) => opsi[i]);
  const jawabanBaru = idx.indexOf(jawaban);
  return { opsi: opsiBaru, jawaban: jawabanBaru };
}

/** Alias untuk bentuk soal katastra: { options, correct }. */
export function shuffleKatastraQuestion<T extends { options: string[]; correct: number }>(
  q: T
): T {
  const { opsi, jawaban } = shuffleOptions(q.options, q.correct);
  return { ...q, options: opsi, correct: jawaban };
}
