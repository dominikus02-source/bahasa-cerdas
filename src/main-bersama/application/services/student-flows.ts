// ─── Orchestrator: Student Join / Reconnect / Answer (§5-§10/§15-§16) ──
// Flow siswa: PIN → join → credential → jawab. Authoritative server:
// eligibility, deadline, correctness, team assignment semua di sini.
//
// Team assignment (§9): regu berimbang deterministic — join baru
// Jelajah dapat regu dengan anggota tersedikit (tie = urutan domain).
// Late join (§10): eligibleFromRoundIndex dihitung Session Engine —
// round aktif TIDAK termasuk. Summary/ended ditolak.
//
// Reconnect (§7): credential opaque stateless-signed — display name
// TIDAK PERNAH jadi proof identity.

import { randomUUID } from 'crypto';
import type {
  PlayerId,
  RoundId,
  SessionId,
  SubmissionId,
  TeamId,
} from '../../domain/types/ids';
import type { RuntimePlayer } from '../../domain/entities/session-runtime-state';
import type { SessionEngine } from './session-engine';
import type { SessionOrchestratorDeps } from './orchestrator-ports';
import { pickBalancedTeam } from './team-assignment';
import { validateDisplayName } from './display-name';
import { buildStudentView } from '../../presentation/view-mappers';
import type { GameEngineState } from '../../games/game-router';

// ─── Typed results ──────────────────────────────────────────

export type StudentErrorCode =
  | 'SESSION_NOT_FOUND'
  | 'INVALID_PHASE'
  | 'SESSION_ENDED'
  | 'PLAYER_NOT_FOUND'
  | 'CREDENTIAL_INVALID'
  | 'NAME_EMPTY'
  | 'NAME_TOO_SHORT'
  | 'NAME_TOO_LONG'
  | 'NAME_CONTROL_CHARS'
  | 'ROUND_NOT_OPEN'
  | 'PLAYER_NOT_ELIGIBLE'
  | 'INVALID_OPTION'
  | 'ANSWER_ALREADY_EXISTS'
  | 'SUBMISSION_ID_CONFLICT'
  | 'DEADLINE_PASSED'
  | 'ROUND_MISMATCH'
  | 'INTERNAL';

export type StudentResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: StudentErrorCode; reason?: string };

/** Player baru/rejoin + credential opaque SEKALI lihat (join saja). */
export interface JoinOutcome {
  sessionId: SessionId;
  playerId: PlayerId;
  displayName: string;
  eligibleFromRoundIndex: number;
  lateJoin: boolean;
  rejoin: boolean;
  /** Credential opaque — TIDAK pernah dikirim ke role lain (§7). */
  credential: string;
  teamId?: string;
}

// ─── Join via PIN (§5/§6/§9/§10) ────────────────────────────

export interface JoinSessionInput {
  pin: string;
  displayName?: string;
  /** User BC id bila siswa login; undefined = guest (§6). */
  userId?: string;
}

/**
 * Join via PIN:
 *  - PIN → sesi aktif (SUMMARY/ENDED tidak joinable — repo v1 PIN
 *    global unik, tidak didesain ulang sekarang, §30);
 *  - authenticated student: player dicari by userId (rejoin pakai
 *    nama tersimpan); guest: nama WAJIB valid, re-join nama sama =
 *    pemain sama (reconnect);
 *  - Jelajah: team balanced assignment HANYA untuk join baru;
 *  - credential opaque diterbitkan saat join (stateless-signed).
 */
export async function joinSession(
  deps: SessionOrchestratorDeps,
  input: JoinSessionInput,
): Promise<StudentResult<JoinOutcome>> {
  const pin = typeof input.pin === 'string' ? input.pin.trim() : '';
  if (!/^\d{6}$/.test(pin)) return { ok: false, code: 'SESSION_NOT_FOUND' };

  const session = await deps.sessions.findByPin(pin);
  if (!session) return { ok: false, code: 'SESSION_NOT_FOUND' };

  // Join boleh terjadi lintas instance/serverless. Cache resolver lokal bisa
  // tertinggal di PREPARING/LOBBY padahal sesi sudah QUESTION di DB, sehingga
  // join sah bisa salah ditolak INVALID_PHASE. Paksa rehydrate authoritative
  // sebelum memutuskan eligibility/fase join.
  deps.resolver.discard?.(session.id);
  const loaded = await deps.resolver.resolve(session.id);
  if (!loaded.ok) return { ok: false, code: 'SESSION_NOT_FOUND' };
  const engine = loaded.engine;

  // Nama: guest wajib valid sejak awal; authenticated boleh default.
  let guestName: string | undefined;
  if (input.userId === undefined) {
    const check = validateDisplayName(input.displayName);
    if (!check.ok) return { ok: false, code: check.code };
    guestName = check.value;
  }

  // Re-join: authenticated by userId; guest by nama tersimpan.
  const players = await deps.players.findBySession(session.id);
  const existing: RuntimePlayer | undefined = input.userId
    ? players.find((p) => p.userId === input.userId)
    : players.find((p) => p.userId === undefined && p.displayName === guestName);

  const displayName = existing
    ? existing.displayName
    : (guestName ?? `Siswa ${players.length + 1}`);

  // Team balance: hanya join BARU yang mengubah komposisi; rejoin
  // mempertahankan regu (round historis tidak boleh terdistorsi).
  const teamId =
    session.gameMode === 'jelajah-kata'
      ? (existing?.teamId ?? pickBalancedTeam(players))
      : undefined;

  const join = engine.joinPlayer({
    playerId: (existing?.id ?? randomUUID()) as PlayerId,
    displayName,
    ...(input.userId !== undefined ? { userId: input.userId } : {}),
    ...(teamId !== undefined ? { teamId: teamId as TeamId } : {}),
  });
  if (!join.ok) {
    return {
      ok: false,
      code: join.code === 'SESSION_ENDED' ? 'SESSION_ENDED' : 'INVALID_PHASE',
    };
  }
  const joinedPlayer = engine.state.players.get(join.value.playerId);
  if (!joinedPlayer) return { ok: false, code: 'INTERNAL' };

  // Mint credential SEBELUM persist. Bila konfigurasi signing bermasalah,
  // join gagal tanpa meninggalkan "phantom participant" di DB/proyektor.
  // Credential tetap opaque/stateless dan hanya diberikan SEKALI.
  const credential = deps.credentials.issue(join.value.playerId, session.id);
  await deps.players.saveRuntime(joinedPlayer, session.id);
  // Sinyal lobby: peserta baru (participant count berubah) —
  // teacher/projector menarik ulang state (pull-on-notify, §5).
  await deps.realtimeSignal.sendSessionUpdate(session.id);

  return {
    ok: true,
    value: {
      sessionId: session.id,
      playerId: join.value.playerId,
      displayName: joinedPlayer.displayName,
      eligibleFromRoundIndex: join.value.eligibleFromRoundIndex,
      lateJoin: join.value.lateJoin,
      rejoin: join.value.rejoin,
      credential,
      ...(joinedPlayer.teamId !== undefined ? { teamId: joinedPlayer.teamId } : {}),
    },
  };
}

// ─── Reconnect (§7) ─────────────────────────────────────────

export interface ReconnectOutcome {
  engine: SessionEngine;
  playerId: PlayerId;
  sessionId: SessionId;
  gameState: GameEngineState | null;
}

/**
 * Reconnect: credential opaque → player yang sama.
 * playerId/displayName/PIN saja TIDAK cukup — credential wajib.
 */
export async function reconnectPlayer(
  deps: SessionOrchestratorDeps,
  input: { credential: unknown },
): Promise<StudentResult<ReconnectOutcome>> {
  const resolved = await deps.credentials.resolve(input.credential);
  if (!resolved.ok) return { ok: false, code: 'CREDENTIAL_INVALID' };

  // Reconnect/state GET adalah read-authoritative boundary. Cache proses ini
  // bisa tertinggal dari command guru yang diproses instance Vercel lain.
  deps.resolver.discard?.(resolved.sessionId);
  const loaded = await deps.resolver.resolve(resolved.sessionId);
  if (!loaded.ok) return { ok: false, code: 'SESSION_NOT_FOUND' };
  const engine = loaded.engine;
  const player = engine.state.players.get(resolved.playerId);
  if (!player) return { ok: false, code: 'PLAYER_NOT_FOUND' };

  // Jangan menulis connected=true pada setiap poll/refetch; itu menghasilkan
  // write storm tanpa perubahan state. Hanya transisikan bila memang perlu.
  if (!player.connected) {
    engine.markConnected(resolved.playerId);
    await deps.players.setConnected(resolved.sessionId, resolved.playerId, true);
  }

  const persisted = await deps.gameStates.loadGameState(resolved.sessionId);
  return {
    ok: true,
    value: {
      engine,
      playerId: resolved.playerId,
      sessionId: resolved.sessionId,
      gameState: persisted ? (persisted.state as GameEngineState) : null,
    },
  };
}

// ─── Submit Answer (§15/§16) ────────────────────────────────

export interface SubmitAnswerCommand {
  credential: unknown;
  roundId: RoundId;
  submissionId: SubmissionId;
  selectedOptionId: string;
}

/**
 * Submit jawaban siswa — urutan dikunci (invariant integritas skor:
 * "hanya jawaban DITERIMA yang mengubah game state"):
 *
 *   credential → player → EVALUASI (murni, tanpa mutasi)
 *   → PERSIST transaksional (idempotency/uniqueness di DB)
 *   → APPLY efek engine TEPAT sekali → ACK tanpa correctness.
 *
 * Penolakan (4xx/SUBMISSION_ID_CONFLICT/…) keluar SEBELUM apply,
 * sehingga tidak ada contribution/progress/milestone yang berubah.
 * Semua aturan (fase, eligibility, deadline server inclusive, opsi
 * valid, idempotency, correctness) tetap dihitung Session Engine.
 */
export async function submitAnswer(
  deps: SessionOrchestratorDeps,
  input: SubmitAnswerCommand,
): Promise<StudentResult<{ status: 'saved' | 'already-saved'; submissionId: string }>> {
  const resolved = await deps.credentials.resolve(input.credential);
  if (!resolved.ok) return { ok: false, code: 'CREDENTIAL_INVALID' };

  const loaded = await deps.resolver.resolve(resolved.sessionId);
  if (!loaded.ok) return { ok: false, code: 'SESSION_NOT_FOUND' };
  const engine = loaded.engine;
  const player = engine.state.players.get(resolved.playerId);
  if (!player) return { ok: false, code: 'PLAYER_NOT_FOUND' };

  // Cross-session guard: roundId wajib milik sesi player (§39.38).
  const round = engine.state.rounds.find((r) => r.id === input.roundId);
  if (!round) return { ok: false, code: 'ROUND_NOT_OPEN' };

  // 1. EVALUASI murni — tanpa mutasi state engine (keputusan + correctness).
  const evaluated = engine.evaluateSubmission({
    roundId: input.roundId,
    playerId: resolved.playerId,
    submissionId: input.submissionId,
    selectedOptionId: input.selectedOptionId,
  });
  if (!evaluated.ok) {
    return { ok: false, code: evaluated.code as StudentErrorCode };
  }

  // 2. PERSIST durable (idempotency survive restart, constraint DB).
  // Ditolak di sini = tidak ada game-state side effect sama sekali.
  const persisted = await deps.answers.submitAnswer({
    sessionId: resolved.sessionId,
    roundId: input.roundId,
    playerId: resolved.playerId,
    submissionId: input.submissionId,
    selectedOptionId: input.selectedOptionId,
    isCorrect: evaluated.value.isCorrect,
    submittedAt: evaluated.value.submittedAt,
  });
  if (!persisted.ok) {
    // Cache engine in-process bisa BASI terhadap ledger DB (instance lain
    // / restart): buang supaya resolve berikutnya membaca set accepted
    // yang authoritative dari DB (bayangan "hantu" tidak pernah ada).
    deps.resolver.discard?.(resolved.sessionId);
    return { ok: false, code: persisted.code };
  }

  // 3. APPLY efek engine TEPAT sekali (murni in-memory, tidak bisa gagal).
  engine.applySubmission(
    {
      roundId: input.roundId,
      playerId: resolved.playerId,
      submissionId: input.submissionId,
      selectedOptionId: input.selectedOptionId,
    },
    evaluated.value,
  );

  // Jawaban sukses mengubah aggregate "sudah menjawab". Broadcast segera
  // supaya layar guru/proyektor menarik state authoritative tanpa menunggu
  // safety poll. Payload tetap hanya invalidation signal; tidak membawa
  // pilihan/kebenaran jawaban.
  try {
    await deps.realtimeSignal.sendSessionUpdate(resolved.sessionId);
  } catch {
    // Realtime hanya freshness hint. ACK jawaban yang sudah durable tidak
    // boleh berubah menjadi gagal bila transport broadcast sedang bermasalah.
  }

  return {
    ok: true,
    value: { status: persisted.status, submissionId: input.submissionId },
  };
}

// ─── Student-safe view ──────────────────────────────────────

/** View siswa (reconnect/state sync) — mapper role-specific, tanpa key. */
export function studentView(
  engine: SessionEngine,
  playerId: PlayerId,
  gameState: GameEngineState | null,
) {
  return buildStudentView(engine, playerId, new Date(), gameState);
}
