// ─── Clock ──────────────────────────────────────────────────
// Kontrak waktu ter-inject: production memakai system clock,
// test memakai fake clock. Engine TIDAK memanggil Date.now()
// secara tersebar agar deadline/pause/resume dapat diuji
// deterministik.

export interface Clock {
  now(): Date;
}

/** Jam sistem untuk production. */
export const systemClock: Clock = {
  now: () => new Date(),
};

/** Jam palsu untuk test — waktu berjalan hanya lewat advance(). */
export class FakeClock implements Clock {
  private current: Date;

  constructor(startAt: Date = new Date('2026-09-18T07:00:00.000Z')) {
    this.current = new Date(startAt.getTime());
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  /** Majukan waktu fake (ms positif; mundur ditolak agar test deterministik). */
  advance(ms: number): void {
    if (ms < 0) throw new Error('FakeClock.advance menolak nilai negatif');
    this.current = new Date(this.current.getTime() + ms);
  }
}
