// ─── Session Engine ─────────────────────────────────────────
// Pemilik keputusan authoritative untuk satu sesi Main Bersama:
// fase, peserta, eligibility, round, jawaban, idempotency,
// pause/resume, close, discussion, next round, summary, end.
//
// - Tanpa import Next.js/React/Prisma/Supabase/Socket.IO/browser.
// - Clock di-inject (deterministik untuk test).
// - Expected gameplay error = typed result, BUKAN throw.
// - TIDAK menghitung game score (tahap 3B) — hanya fakta round.

import type { Clock } from '../../domain/types/clock';
import type {
  SessionEngineErrorCode,
  SessionEngineResult,
} from '../../domain/types/engine-result';
import type {
  PlayerId,
  RoundId,
  SessionId,
  SubmissionId,
  TeamId,
} from '../../domain/types/ids';
import type { SessionPhase } from '../../domain/types/session';
import type { MainRound } from '../../domain/entities/round';
import type { MainSession } from '../../domain/entities/session';
import type {
  AttemptRecord,
  RuntimePlayer,
  SessionQuestionSource,
  SessionRuntimeState,
  StoredAnswer,
} from '../../domain/entities/session-runtime-state';
import { canTransition } from '../../domain/rules/session-transitions';
import {
  computeEligibleFromRoundIndex,
  lockEligiblePlayerIds,
  markPlayerConnection,
} from '../../domain/rules/eligibility-rules';
import {
  computeCorrectness,
  evaluateAnswerSubmission,
} from '../../domain/rules/answer-rules';

export interface SessionEngineOptions {
  /** Sesi ber-phase 'preparing' (dibuat caller, mis. dari use-case). */
  session: MainSession;
  /** Snapshot soal sesi — source of truth jumlah round. */
  questions: SessionQuestionSource;
  clock: Clock;
  /** Durasi answering per round (ms, default 30 detik). */
  roundDurationMs?: number;
}

export interface JoinPlayerInput {
  playerId: PlayerId;
  displayName: string;
  userId?: string;
  teamId?: TeamId;
}

export interface JoinPlayerOutcome {
  playerId: PlayerId;
  eligibleFromRoundIndex: number;
  /** True bila join terjadi setelah round pertama dimulai. */
  lateJoin: boolean;
  /** True bila ini re-join/reconnect player yang sama. */
  rejoin: boolean;
}

export interface SubmitAnswerInput {
  roundId: RoundId;
  playerId: PlayerId;
  submissionId: SubmissionId;
  selectedOptionId: string;
}

/** ACK sukses submit — TIDAK memuat kebenaran jawaban. */
export interface SubmitAnswerOutcome {
  status: 'saved' | 'already-saved';
  submissionId: SubmissionId;
}

/**
 * Hasil EVALUASI submission (fase 1, tanpa mutasi).
 * Dibawa ke persistence; `applySubmission` menulis state HANYA bila
 * persistence menerima jawaban.
 */
export interface SubmissionEvaluation {
  status: 'saved' | 'already-saved';
  submissionId: SubmissionId;
  /** true = jawaban baru (apply menulis state); false = retry identik. */
  isNewAnswer: boolean;
  isCorrect: boolean;
  submittedAt: Date;
}

export interface OpenRoundOutcome {
  roundId: RoundId;
  index: number;
  eligiblePlayerIds: PlayerId[];
  openedAt: Date;
  closesAt: Date;
}

export type OpenRoundResult =
  | { outcome: 'round-opened'; round: OpenRoundOutcome }
  | { outcome: 'summary' };

/** Fakta factual round untuk konsumsi teacher view / game engine 3B. */
export interface RoundFacts {
  roundId: RoundId;
  index: number;
  eligiblePlayerIds: PlayerId[];
  submittedCount: number;
  correctCount: number;
  incorrectCount: number;
}

const DEFAULT_ROUND_DURATION_MS = 30_000;

export class SessionEngine {
  readonly state: SessionRuntimeState;
  private readonly clock: Clock;
  private readonly roundDurationMs: number;
  private readonly questions: SessionQuestionSource;

  constructor(options: SessionEngineOptions) {
    const { session, questions, clock } = options;
    this.clock = clock;
    this.questions = questions;
    this.roundDurationMs = options.roundDurationMs ?? DEFAULT_ROUND_DURATION_MS;
    if (questions.snapshots.length === 0) {
      // Sesi disiapkan tanpa soal = kesalahan pemanggil, bukan gameplay error.
      throw new Error('SessionEngine butuh minimal satu snapshot soal');
    }
    if (questions.snapshots.length !== session.totalRounds) {
      // Sinkronkan totalRounds dengan snapshot — snapshot adalah source of truth.
      session.totalRounds = questions.snapshots.length;
    }
    this.state = {
      session,
      players: new Map(),
      rounds: [],
      answersByRound: new Map(),
      attemptsByRound: new Map(),
      activeRoundIndex: null,
      pause: null,
    };
  }

  get sessionId(): SessionId {
    return this.state.session.id;
  }

  // ─── Lifecycle ────────────────────────────────────────────

  /** preparing → lobby. Set startedAt (sesi go-live). */
  openLobby(): SessionEngineResult<{ phase: SessionPhase }> {
    const check = canTransition(this.state.session.phase, 'lobby');
    if (!check.ok) return { ok: false, code: check.code };
    this.state.session.phase = 'lobby';
    this.state.session.startedAt = this.clock.now();
    return { ok: true, value: { phase: 'lobby' } };
  }

  /**
   * lobby → question (round pertama) atau discussion → question
   * (round berikutnya) / → summary (bila snapshot habis).
   * Eligible snapshot DIKUNCI sekali saat round dibuka.
   */
  openRound(): SessionEngineResult<OpenRoundResult> {
    const phase = this.state.session.phase;

    if (phase === 'discussion') {
      const nextIndex = (this.state.activeRoundIndex ?? -1) + 1;
      if (nextIndex >= this.state.session.totalRounds) {
        const check = canTransition(phase, 'summary');
        if (!check.ok) return { ok: false, code: check.code };
        this.state.session.phase = 'summary';
        return { ok: true, value: { outcome: 'summary' } };
      }
      return this.doOpenRound(nextIndex);
    }

    if (phase === 'lobby') {
      return this.doOpenRound(0);
    }

    return {
      ok: false,
      code: phase === 'ended' ? 'SESSION_ENDED' : 'INVALID_PHASE',
    };
  }

  private doOpenRound(index: number): SessionEngineResult<OpenRoundResult> {
    const check = canTransition(this.state.session.phase, 'question');
    if (!check.ok) return { ok: false, code: check.code };

    const now = this.clock.now();
    const snapshot = this.questionAt(index);
    if (!snapshot) return { ok: false, code: 'INVALID_PHASE' };

    // SNAPSHOT DIKUNCI — tidak dihitung ulang setelah titik ini.
    const eligiblePlayerIds = lockEligiblePlayerIds(this.state, index);
    // Snapshot regu yang berlaku saat round dibuka (fairness Jelajah Kata):
    // perubahan team setelah ini tidak boleh menyentuh round historis.
    const eligibleTeamIds: Record<string, string | undefined> = {};
    for (const pid of eligiblePlayerIds) {
      eligibleTeamIds[pid] = this.state.players.get(pid)?.teamId;
    }

    const round: MainRound = {
      id: `round-${this.state.session.id}-${index}` as RoundId,
      sessionId: this.state.session.id,
      index,
      question: snapshot,
      eligiblePlayerIds,
      eligibleTeamIds,
      phase: 'open',
      openedAt: now,
      closesAt: new Date(now.getTime() + this.roundDurationMs),
    };
    this.state.rounds.push(round);
    this.state.activeRoundIndex = index;
    this.state.session.currentRoundIndex = index;
    this.state.session.phase = 'question';

    const openedAt = round.openedAt as Date;
    const closesAt = round.closesAt as Date;
    return {
      ok: true,
      value: {
        outcome: 'round-opened',
        round: {
          roundId: round.id,
          index,
          eligiblePlayerIds: [...round.eligiblePlayerIds],
          openedAt,
          closesAt,
        },
      },
    };
  }

  /** question → closed. Idempotent: close kedua tidak mengubah apa pun. */
  closeRound(): SessionEngineResult<{ roundId: RoundId; closedAt: Date; alreadyClosed: boolean }> {
    const phase = this.state.session.phase;
    if (phase === 'closed') {
      const round = this.activeRound();
      return {
        ok: true,
        value: {
          roundId: round?.id as RoundId,
          closedAt: round?.closedAt as Date,
          alreadyClosed: true,
        },
      };
    }
    if (phase === 'ended') return { ok: false, code: 'SESSION_ENDED' };

    const check = canTransition(phase, 'closed');
    if (!check.ok) return { ok: false, code: check.code };

    const now = this.clock.now();
    const round = this.activeRound();
    if (round) {
      round.phase = 'closed';
      round.closedAt = now;
    }
    this.state.session.phase = 'closed';
    return { ok: true, value: { roundId: round?.id as RoundId, closedAt: now, alreadyClosed: false } };
  }

  /** closed → discussion. Reveal menjadi sah untuk round yang dibahas. */
  startDiscussion(): SessionEngineResult<{ phase: SessionPhase }> {
    const check = canTransition(this.state.session.phase, 'discussion');
    if (!check.ok) return { ok: false, code: check.code };
    const round = this.activeRound();
    if (round) round.phase = 'review';
    this.state.session.phase = 'discussion';
    return { ok: true, value: { phase: 'discussion' } };
  }

  /**
   * Jeda sesi. Dari question: simpan sisa waktu deadline.
   * Dari lobby/closed/discussion: cukup simpan fase asal.
   * Double pause = no-op aman.
   */
  pause(): SessionEngineResult<{ phase: 'paused' }> {
    const phase = this.state.session.phase;
    if (phase === 'paused') return { ok: true, value: { phase: 'paused' } };

    const check = canTransition(phase, 'paused');
    if (!check.ok) return { ok: false, code: check.code };

    if (phase === 'question') {
      const round = this.activeRound();
      if (!round?.closesAt) return { ok: false, code: 'ROUND_NOT_OPEN' };
      const remainingMs = Math.max(0, round.closesAt.getTime() - this.clock.now().getTime());
      this.state.pause = { fromPhase: 'question', roundId: round.id, remainingMs };
    } else {
      this.state.pause = { fromPhase: phase };
    }
    this.state.session.phase = 'paused';
    return { ok: true, value: { phase: 'paused' } };
  }

  /** paused → fase asal. Question mendapat deadline baru = now + sisa waktu. */
  resume(): SessionEngineResult<{ phase: SessionPhase }> {
    const pause = this.state.pause;
    if (this.state.session.phase !== 'paused' || !pause) {
      return { ok: false, code: 'INVALID_PHASE' };
    }
    const now = this.clock.now();
    if (pause.fromPhase === 'question') {
      const round = this.state.rounds.find((r) => r.id === pause.roundId);
      if (round) {
        round.closesAt = new Date(now.getTime() + pause.remainingMs);
      }
    }
    this.state.pause = null;
    this.state.session.phase = pause.fromPhase;
    return { ok: true, value: { phase: pause.fromPhase } };
  }

  /** Fase aktif apa pun (termasuk paused) → ended. Panggilan kedua = idempotent. */
  endSession(): SessionEngineResult<{ phase: 'ended'; alreadyEnded: boolean }> {
    if (this.state.session.phase === 'ended') {
      return { ok: true, value: { phase: 'ended', alreadyEnded: true } };
    }
    // Dari paused boleh langsung end (guru membatalkan sesi saat jeda).
    if (this.state.session.phase !== 'paused') {
      const check = canTransition(this.state.session.phase, 'ended');
      if (!check.ok) return { ok: false, code: check.code };
    }

    // Bookkeeping: round yang masih terbuka dikunci saat sesi diakhiri.
    const round = this.activeRound();
    if (round && round.phase === 'open') {
      round.phase = 'closed';
      round.closedAt = this.clock.now();
    }
    this.state.session.phase = 'ended';
    this.state.session.endedAt = this.clock.now();
    return { ok: true, value: { phase: 'ended', alreadyEnded: false } };
  }

  // ─── Players ──────────────────────────────────────────────

  /**
   * Join/re-join peserta. Late join saat round N → eligible N+1
   * (TIDAK masuk snapshot round aktif). summary/ended → ditolak.
   */
  joinPlayer(input: JoinPlayerInput): SessionEngineResult<JoinPlayerOutcome> {
    const existing = this.state.players.get(input.playerId);
    if (existing) {
      // Re-join = reconnect player yang sama, bukan player baru.
      existing.connected = true;
      return {
        ok: true,
        value: {
          playerId: existing.id,
          eligibleFromRoundIndex: existing.eligibleFromRoundIndex,
          lateJoin: existing.eligibleFromRoundIndex > 0,
          rejoin: true,
        },
      };
    }

    // Saat paused, evaluasi join terhadap fase asal sebelum pause
    // (paused dari lobby → eligible 0; dari question N → eligible N+1).
    const effectivePhase =
      this.state.session.phase === 'paused' && this.state.pause
        ? this.state.pause.fromPhase
        : this.state.session.phase;
    const computed = computeEligibleFromRoundIndex(
      effectivePhase,
      this.state.activeRoundIndex,
    );
    if (!computed.ok) return { ok: false, code: computed.code };

    const player: RuntimePlayer = {
      id: input.playerId,
      displayName: input.displayName,
      joinedAt: this.clock.now(),
      eligibleFromRoundIndex: computed.eligibleFromRoundIndex,
      connected: true,
      participationStatus: 'active',
    };
    if (input.userId !== undefined) player.userId = input.userId;
    if (input.teamId !== undefined) player.teamId = input.teamId;
    this.state.players.set(player.id, player);

    return {
      ok: true,
      value: {
        playerId: player.id,
        eligibleFromRoundIndex: player.eligibleFromRoundIndex,
        lateJoin: player.eligibleFromRoundIndex > 0,
        rejoin: false,
      },
    };
  }

  /** Disconnect hanya mengubah status koneksi — snapshot/answers utuh. */
  markDisconnected(playerId: PlayerId): boolean {
    return markPlayerConnection(this.state, playerId, false);
  }

  /** Reconnect mengaktifkan player yang sama. */
  markConnected(playerId: PlayerId): boolean {
    return markPlayerConnection(this.state, playerId, true);
  }

  // ─── Answers ──────────────────────────────────────────────

  /**
   * Fase 1 submission — EVALUASI (tanpa mutasi state).
   *
   * Urutan aturan (deterministik, sama seperti sebelumnya):
   *   round aktif milik sesi INI → player terdaftar → idempotency
   *   attempt (retry identik → already-saved; ID sama payload beda →
   *   SUBMISSION_ID_CONFLICT) → fase sesi → aturan bisnis via
   *   evaluateAnswerSubmission (opsi, duplicate, eligibility snapshot,
   *   deadline inclusive). Correctness dihitung server-side dan TIDAK
   *   masuk ACK.
   *
   * PENTING (integritas skor): fungsi ini MURNI — jangan panggil
   * answersFor()/attemptsFor() karena keduanya membuat Map kosong
   * (mutasi container). Pemanggil application WAJIB berurutan:
   *   evaluateSubmission → PERSIST → applySubmission
   * supaya submission yang DITOLAK tidak pernah meninggalkan jejak
   * di state engine (dan cache in-process-nya).
   */
  evaluateSubmission(
    input: SubmitAnswerInput,
  ): SessionEngineResult<SubmissionEvaluation> {
    // Round harus milik sesi ini dan round yang aktif.
    const round = this.state.rounds.find((r) => r.id === input.roundId);
    if (!round || round.index !== this.state.activeRoundIndex) {
      return { ok: false, code: 'ROUND_MISMATCH' };
    }

    // Player harus terdaftar pada sesi ini.
    const player = this.state.players.get(input.playerId);
    if (!player) return { ok: false, code: 'PLAYER_NOT_FOUND' };

    // Baca saja — TIDAK membuat Map baru (lihat catatan di atas).
    const existingAttempt =
      this.state.attemptsByRound.get(round.id)?.get(input.submissionId) ?? null;
    const existingAnswer =
      this.state.answersByRound.get(round.id)?.get(input.playerId) ?? null;

    // Idempotency attempt — sebelum fase, karena retry identik tidak
    // melakukan mutasi dan harus tetap dapat di-ACK.
    if (existingAttempt) {
      if (
        existingAttempt.playerId !== input.playerId ||
        existingAttempt.selectedOptionId !== input.selectedOptionId
      ) {
        return { ok: false, code: 'SUBMISSION_ID_CONFLICT' };
      }
      if (existingAttempt.accepted) {
        return {
          ok: true,
          value: {
            status: 'already-saved',
            submissionId: input.submissionId,
            isNewAnswer: false,
            isCorrect:
              existingAnswer?.isCorrect ??
              computeCorrectness(round.question, existingAttempt.selectedOptionId),
            submittedAt: existingAnswer?.submittedAt ?? this.clock.now(),
          },
        };
      }
    }

    // Fase sesi.
    const phase = this.state.session.phase;
    if (phase === 'ended') return { ok: false, code: 'SESSION_ENDED' };
    if (phase !== 'question') return { ok: false, code: 'ROUND_NOT_OPEN' };

    const now = this.clock.now();
    const evaluation = evaluateAnswerSubmission({
      round: {
        id: round.id,
        index: round.index,
        question: round.question,
        closesAt: round.closesAt as Date,
      },
      now,
      playerId: input.playerId,
      submissionId: input.submissionId,
      selectedOptionId: input.selectedOptionId,
      existingAnswer,
      existingAttempt,
      isEligible: round.eligiblePlayerIds.includes(input.playerId),
    });
    if (!evaluation.ok) return { ok: false, code: evaluation.code };

    return {
      ok: true,
      value: {
        status: evaluation.isNewAnswer ? 'saved' : 'already-saved',
        submissionId: input.submissionId,
        isNewAnswer: evaluation.isNewAnswer,
        isCorrect: existingAnswer?.isCorrect ?? evaluation.isCorrect,
        submittedAt: existingAnswer?.submittedAt ?? now,
      },
    };
  }

  /**
   * Fase 2 submission — TERAPKAN hasil evaluasi ke state engine.
   *
   * Murni in-memory (tanpa I/O) sehingga tidak bisa gagal: dipanggil
   * HANYA setelah persistence menerima jawaban. Retry identik
   * (isNewAnswer=false) = no-op, jadi tidak mungkin double-contribute.
   */
  applySubmission(
    input: SubmitAnswerInput,
    evaluation: SubmissionEvaluation,
  ): void {
    if (!evaluation.isNewAnswer) return;
    // Guard concurrency: jawaban final = 1:1 per player per round.
    if (this.state.answersByRound.get(input.roundId)?.has(input.playerId)) return;
    const answers = this.answersFor(input.roundId);
    const attempts = this.attemptsFor(input.roundId);
    const stored: StoredAnswer = {
      sessionId: this.state.session.id,
      roundId: input.roundId,
      playerId: input.playerId,
      submissionId: input.submissionId,
      selectedOptionId: input.selectedOptionId,
      submittedAt: evaluation.submittedAt,
      source: 'individual',
      isCorrect: evaluation.isCorrect,
      provenance: 'first-accepted',
    };
    answers.set(input.playerId, stored); // business uniqueness 1:1
    attempts.set(input.submissionId, {
      submissionId: input.submissionId,
      roundId: input.roundId,
      playerId: input.playerId,
      selectedOptionId: input.selectedOptionId,
      accepted: true,
    });
  }

  /**
   * Terima jawaban = evaluate + apply (komposisi dua fase).
   * Dipakai test/engine-only; jalur application produksi memanggil
   * evaluateSubmission + applySubmission terpisah agar persistence
   * berada DI ANTARA keduanya.
   */
  submitAnswer(input: SubmitAnswerInput): SessionEngineResult<SubmitAnswerOutcome> {
    const evaluated = this.evaluateSubmission(input);
    if (!evaluated.ok) return { ok: false, code: evaluated.code };
    this.applySubmission(input, evaluated.value);
    return {
      ok: true,
      value: {
        status: evaluated.value.status,
        submissionId: evaluated.value.submissionId,
      },
    };
  }

  // ─── Factual queries (tanpa game scoring) ────────────────

  getPhase(): SessionPhase {
    return this.state.session.phase;
  }

  activeRound(): MainRound | null {
    if (this.state.activeRoundIndex === null) return null;
    return this.state.rounds[this.state.activeRoundIndex] ?? null;
  }

  /** Fakta round; null bila roundId bukan milik sesi ini (isolation). */
  getRoundFacts(roundId: RoundId): RoundFacts | null {
    const round = this.state.rounds.find((r) => r.id === roundId);
    if (!round) return null;
    const answers = this.state.answersByRound.get(roundId);
    let correctCount = 0;
    let incorrectCount = 0;
    if (answers) {
      for (const answer of answers.values()) {
        if (answer.isCorrect) correctCount += 1;
        else incorrectCount += 1;
      }
    }
    return {
      roundId,
      index: round.index,
      eligiblePlayerIds: [...round.eligiblePlayerIds],
      submittedCount: answers?.size ?? 0,
      correctCount,
      incorrectCount,
    };
  }

  /** Jawaban final per round (internal — jangan kirim mentah ke siswa). */
  getRoundAnswers(roundId: RoundId): StoredAnswer[] {
    const answers = this.state.answersByRound.get(roundId);
    return answers ? [...answers.values()] : [];
  }

  // ─── Helpers ──────────────────────────────────────────────

  private questionAt(index: number) {
    return this.questions.snapshots[index] ?? null;
  }

  private answersFor(roundId: RoundId): Map<PlayerId, StoredAnswer> {
    let map = this.state.answersByRound.get(roundId);
    if (!map) {
      map = new Map();
      this.state.answersByRound.set(roundId, map);
    }
    return map;
  }

  private attemptsFor(roundId: RoundId): Map<SubmissionId, AttemptRecord> {
    let map = this.state.attemptsByRound.get(roundId);
    if (!map) {
      map = new Map();
      this.state.attemptsByRound.set(roundId, map);
    }
    return map;
  }
}

export type { SessionEngineErrorCode, SessionEngineResult };
