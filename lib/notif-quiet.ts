/**
 * NOTIFICATION SYSTEM 1.0 — game quiet mode flag (module-level, tanpa React).
 *
 * Dipakai PlayerContext agar reward popup global TIDAK muncul selama fase
 * gameplay aktif (menutupi HUD/soal/timer). Game menandai masuk/keluar;
 * reward selama quiet tetap di-queue dan dimunculkan setelah selesai —
 * TIDAK ada reward yang hilang, TIDAK ada perubahan kalkulasi reward.
 */
let quiet = false;

export function setQuiet(value: boolean) {
  quiet = value;
}

export function isQuiet(): boolean {
  return quiet;
}

/**
 * Hook pola helper untuk komponen game:
 *   useGameQuiet(aktif) → setQuiet(aktif) saat nilai berubah + reset saat unmount.
 * Karena module-level (bukan React state), dipanggil langsung di useEffect.
 */
export function useGameQuietEffect(active: boolean) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return () => setQuiet(active);
}
