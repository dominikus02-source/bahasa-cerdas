// ─── Session Recovery Service ───────────────────────────────
// Menyediakan SessionEngine untuk sessionId — dari cache in-process
// bila masih hangat, dari PostgreSQL bila proses restart. Persistence
// adalah source of recovery; cache HANYA optimasi.
//
// Penting (Tahap 6 §29): setelah kehilangan memory (restart), sesi
// yang sama direkonstruksi penuh dari DB dan perilaku (close,
// answer, idempotency) tetap benar. Cache DIBUANG saat proses
// restart — di sinilah DB path diuji.

import type { Clock } from '../../domain/types/clock';
import { systemClock } from '../../domain/types/clock';
import type { SessionId } from '../../domain/types/ids';
import { SessionEngine } from './session-engine';
import { loadSessionRuntime } from '../../infrastructure/persistence/load-session-runtime';

export type SessionRecoveryResult =
  | { ok: true; engine: SessionEngine; fromCache: boolean }
  | { ok: false; code: 'SESSION_NOT_FOUND' };

export interface SessionRecoveryOptions {
  sessionId: SessionId;
  clock?: Clock;
  /** Durasi round untuk pembukaan round berikutnya (ms). */
  roundDurationMs?: number;
}

/**
 * Resolver engine per proses. Cache in-memory keyed sessionId —
 * SINGLE-process assumption (Vercel serverless = 1 instance per
 * invokation; multi-instance akan tetap BENAR karena loader DB
 * selalu bisa dipanggil, hanya tanpa cache hit).
 */
export class SessionEngineResolver {
  private readonly cache = new Map<SessionId, SessionEngine>();
  private readonly clock: Clock;
  private readonly roundDurationMs?: number;

  constructor(options: { clock?: Clock; roundDurationMs?: number } = {}) {
    this.clock = options.clock ?? systemClock;
    this.roundDurationMs = options.roundDurationMs;
  }

  /** Ambil engine dari cache (tanpa DB). Null bila belum dimuat. */
  peek(sessionId: SessionId): SessionEngine | null {
    return this.cache.get(sessionId) ?? null;
  }

  /** Simpan/replace engine di cache (setelah orchestrator memutasi). */
  put(sessionId: SessionId, engine: SessionEngine): void {
    this.cache.set(sessionId, engine);
  }

  /** Buang cache (dipakai test restart; produksi tidak perlu). */
  evict(sessionId: SessionId): void {
    this.cache.delete(sessionId);
  }

  async resolve(sessionId: SessionId): Promise<SessionRecoveryResult> {
    const cached = this.cache.get(sessionId);
    if (cached) return { ok: true, engine: cached, fromCache: true };

    const loaded = await loadSessionRuntime({
      sessionId,
      clock: this.clock,
      roundDurationMs: this.roundDurationMs,
    });
    if (!loaded.ok) return { ok: false, code: 'SESSION_NOT_FOUND' };
    this.cache.set(sessionId, loaded.engine);
    return { ok: true, engine: loaded.engine, fromCache: false };
  }
}
