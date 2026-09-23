// ─── Orchestrator Dependencies (Tahap 6 §2) ─────────────────
// Dependensi yang diinjeksi ke orchestrator session-commands.
// Implementasi nyata di infrastructure (Prisma) + adapters;
// test memakai fake — application tidak pernah mengimpor
// Prisma/Supabase/Next langsung.

import type { Clock } from '../../domain/types/clock';
import type {
  PlayerId,
  SessionId,
  TeamId,
} from '../../domain/types/ids';
import type { MainSession } from '../../domain/entities/session';
import type { MainPlayer } from '../../domain/entities/player';
import type { MainQuestionSnapshot } from '../../domain/entities/question';
import type { RuntimePlayer } from '../../domain/entities/session-runtime-state';
import type { SessionEngine } from '../services/session-engine';
import type { GameEngineState } from '../../games/game-router';

/** Persist player runtime (upsert) — dipakai join/reconnect. */
export interface PlayerStore {
  saveRuntime(player: RuntimePlayer, sessionId: string): Promise<void>;
  /** Update koneksi (ephemeral — dipanggil join/reconnect/disconnect). */
  setConnected(sessionId: string, playerId: string, connected: boolean): Promise<void>;
  /** Anggota sesi (untuk team balancing + roster). */
  findBySession(sessionId: SessionId): Promise<RuntimePlayer[]>;
}

/** Persist mutasi sesi (phase/pause/progress). */
export interface SessionStore {
  save(session: MainSession): Promise<void>;
  saveSessionProgress(
    sessionId: SessionId,
    phase: MainSession['phase'],
    currentRoundIndex: number | null,
  ): Promise<void>;
  savePauseState(
    sessionId: SessionId,
    pause: MainPauseStatePort | null,
    pausedAt: Date,
  ): Promise<void>;
  findByPin(pin: string): Promise<MainSession | null>;
  /**
   * Lookup DISPLAY read-only (proyektor) — termasuk sesi final
   * SUMMARY/ENDED agar layar kelas tetap menampilkan hasil akhir.
   * Terpisah dari findByPin (semantik sesi aktif) — jalur join &
   * command tidak pernah memakai method ini.
   */
  findByPinForDisplay(pin: string): Promise<MainSession | null>;
  findOwnedBy(sessionId: SessionId, teacherId: string): Promise<MainSession | null>;
  findById(sessionId: SessionId): Promise<MainSession | null>;
}

/** Bentuk PauseState minimal untuk port (domain type re-export). */
export type MainPauseStatePort =
  | { fromPhase: 'question'; roundId: string; remainingMs: number }
  | { fromPhase: Exclude<MainSession['phase'], 'question' | 'paused'> };

/** Persist round + eligible snapshot (transaksional di infrastruktur). */
export interface RoundStore {
  save(round: MainRoundPort): Promise<void>;
}

/** Bentuk round minimal yang dibutuhkan port. */
export interface MainRoundPort {
  id: string;
  sessionId: string;
  index: number;
  question: MainQuestionSnapshot;
  eligiblePlayerIds: PlayerId[];
  eligibleTeamIds: Record<string, string | undefined>;
  phase: 'pending' | 'open' | 'review' | 'closed';
  openedAt?: Date;
  closesAt?: Date;
  closedAt?: Date;
}

/** Persist jawaban transaksional (idempotency durable). */
export interface AnswerStore {
  submitAnswer(input: {
    sessionId: string;
    roundId: string;
    playerId: string;
    submissionId: string;
    selectedOptionId: string;
    isCorrect: boolean;
    submittedAt: Date;
  }): Promise<
    | { ok: true; status: 'saved' | 'already-saved' }
    | { ok: false; code: 'ANSWER_ALREADY_EXISTS' | 'SUBMISSION_ID_CONFLICT' }
  >;
}

/** Persist state + round result game engine (idempotent). */
export interface GameStateStore {
  saveGameState(input: {
    sessionId: string;
    gameMode: 'jelajah-kata' | 'kota-cahaya';
    state: unknown;
    final: boolean;
  }): Promise<void>;
  saveGameRoundResult(input: {
    sessionId: string;
    gameMode: 'jelajah-kata' | 'kota-cahaya';
    roundId: string;
    result: unknown;
  }): Promise<{ ok: true; alreadyApplied: boolean } | { ok: false; code: 'ROUND_ALREADY_APPLIED' }>;
  loadGameState(
    sessionId: string,
  ): Promise<{ gameMode: 'jelajah-kata' | 'kota-cahaya'; status: 'ACTIVE' | 'FINAL'; state: unknown } | null>;
}

/** Persist finalisasi target Kota (kolom MainSession.kotaTargetCorrect). */
export interface KotaTargetStore {
  saveKotaTarget(sessionId: string, target: number): Promise<void>;
}

/**
 * Reconnect credential (§7): opaque, stateless signed — TIDAK ADA
 * yang disimpan di DB (schema change NIHIL, §20). Secret plaintext
 * / signature TIDAK PERNAH dikirim ke role lain.
 */
export interface PlayerCredentialStore {
  /** Terbitkan credential opaque untuk player (join). */
  issue(playerId: string, sessionId: string): string;
  /** Credential opaque → {playerId, sessionId}. TIDAK menyentuh DB. */
  resolve(credential: unknown): Promise<
    | { ok: true; playerId: string; sessionId: string }
    | { ok: false; code: 'MALFORMED_CREDENTIAL' | 'CREDENTIAL_MISMATCH' }
  >;
}

/**
 * Sinyal invalidation realtime (hardening §3/§5): server memberi tahu
 * client bahwa state sesi berubah — BUKAN pembawa state. Implementasi
 * produksi = Supabase Broadcast REST; test = fake/fallback.
 */
export interface RealtimeSignalPort {
  /**
   * Kirim sinyal untuk sesi. WAJIB best-effort: kegagalan TIDAK
   * boleh mengubah hasil command domain (correctness dari HTTP +
   * GET authoritative, bukan dari sinyal).
   */
  sendSessionUpdate(sessionId: SessionId): Promise<void>;
}

/** Resolver engine (cache warm → DB recovery). */
export interface EngineResolver {
  resolve(sessionId: SessionId): Promise<
    { ok: true; engine: SessionEngine } | { ok: false; code: 'SESSION_NOT_FOUND' }
  >;
  /**
   * Buang engine dari cache in-process (opsional).
   *
   * Dipakai saat operasi ditolak SETELAH persisten menolak: mutasi tidak
   * pernah diterapkan, dan cache yang mungkin basi terhadap DB (instance
   * lain / restart) tidak boleh dipakai lagi — resolve berikutnya membaca
   * ulang dari DB sebagai sumber kebenaran. Tidak mengubah game state.
   */
  discard?(sessionId: SessionId): void;
}

/** Clock. */
export interface OrchestratorClock {
  now(): Date;
}

/** Konfigurasi lengkap orchestrator. */
export interface SessionOrchestratorDeps {
  clock: OrchestratorClock;
  resolver: EngineResolver;
  players: PlayerStore;
  sessions: SessionStore;
  rounds: RoundStore;
  answers: AnswerStore;
  gameStates: GameStateStore;
  kotaTarget: KotaTargetStore;
  credentials: PlayerCredentialStore;
  /** Sinyal invalidation (produksi: Supabase Broadcast). */
  realtimeSignal: RealtimeSignalPort;
}

/** Konteks player yang sudah terverifikasi credential-nya. */
export interface ResolvedPlayerContext {
  sessionId: SessionId;
  playerId: PlayerId;
  /** Team id assignment (join jelajah). */
  teamId?: TeamId;
  player: RuntimePlayer;
  engine: SessionEngine;
}
