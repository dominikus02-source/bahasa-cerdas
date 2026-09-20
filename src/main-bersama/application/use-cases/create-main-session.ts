// ─── Use Case: Create Main Session (Prepared) ───────────────
// Alur (Tahap 5 §18) — TIDAK membuka lobby/realtime:
//   1. verify teacher (identity SUDAH diverifikasi Auth adapter)
//   2. verify class access bila class dipilih
//   3. load Bank Soal source
//   4. validate compatibility (tanpa silent drop)
//   5. adapt supported questions
//   6. snapshot soal (id baru, urutan paket terjaga)
//   7. create MainSession (phase preparing)
//   8. persist snapshots (SATU transaksi bersama sesi)
//   9. initialize game state (4 regu / misi kota)
//  10. return prepared session
//
// Teacher identity TIDAK pernah diambil dari body request —
// use-case menerima MainBersamaActor yang sudah diverifikasi
// Auth adapter dari server context (Tahap 5 §13).

import type {
  GameMode,
} from '../../domain/types/session';
import type { GameEngineState } from '../../games/game-router';
import { DEFAULT_CONTENT_TITLE, type MainSession } from '../../domain/entities/session';
import type { MainQuestionSnapshot } from '../../domain/entities/question';
import { createGameState } from '../../games/game-router';
import type {
  BankSoalPackageRef,
  BankSoalQuestionSource,
  IdGenerator,
  MainBersamaClassDirectory,
  MainSessionCreationStore,
  PinGenerator,
} from './ports';
import {
  evaluatePackageCompatibility,
  useSupportedQuestions,
  type UnusedQuestionsInfo,
} from '../../adapters/bank-soal/compatibility';
import { resolveGameConfig } from './session-defaults';

export interface CreateMainSessionInput {
  gameMode: GameMode;
  /** Paket/tema Bank Soal yang dipilih guru. */
  packageRef: BankSoalPackageRef;
  /** Kelas KelasKu opsional (demo/acara tanpa kelas tetap valid). */
  classId?: string;
  /** Default diisi bila tidak diberikan (lihat session-defaults.ts). */
  config?: { roundDurationMs?: number; kotaTargetCorrect?: number };
  /**
   * Pilihan EKSPLISIT caller (fix review Tahap 5 §1): pakai hanya
   * soal kompatibel dari paket campuran (mis. 30 → 27 + 3
   * ISIAN_SINGKAT). Tanpa flag ini paket campuran tetap ditolak
   * PACKAGE_INCOMPATIBLE — TIDAK ada silent drop otomatis.
   */
  useSupportedQuestions?: boolean;
}

/** Aktor terverifikasi (dari Auth adapter, bukan request body). */
export interface VerifiedTeacherActor {
  userId: string;
  role: 'GURU' | 'ADMIN';
}

export type CreateMainSessionResult =
  | {
      ok: true;
      session: MainSession;
      /** Snapshot soal yang dipersist (urutan = position). */
      snapshots: MainQuestionSnapshot[];
      initialState: GameEngineState;
      /**
       * Transparansi subset (mode useSupportedQuestions): daftar soal
       * yang TIDAK dipakai + alasannya. `unused.count === 0` pada
       * mode strict — informasi ini tidak pernah hilang diam-diam.
       */
      unused: UnusedQuestionsInfo;
    }
  | {
      ok: false;
      code:
        | 'UNAUTHORIZED'
        | 'CLASS_NOT_FOUND'
        | 'CLASS_FORBIDDEN'
        | 'PACKAGE_NOT_FOUND'
        | 'PACKAGE_EMPTY'
        | 'PACKAGE_INCOMPATIBLE'
        | 'NO_SUPPORTED_QUESTIONS'
        | 'INVALID_GAME_CONFIG'
        | 'PIN_TAKEN'
        /** Skema Main Bersama belum ada / DB tak terjangkau (bukan bug pemanggil). */
        | 'SESSION_STORE_UNAVAILABLE'
        | 'SESSION_CREATION_FAILED';
      /** Detail kompatibilitas bila PACKAGE_INCOMPATIBLE. */
      detail?: { total: number; supported: number; unsupported: number };
      reason?: string;
    };

export async function createMainSession(
  deps: {
    actor: VerifiedTeacherActor;
    bankSoal: BankSoalQuestionSource;
    classes: MainBersamaClassDirectory;
    store: MainSessionCreationStore;
    ids: IdGenerator;
    pins: PinGenerator;
  },
  input: CreateMainSessionInput,
): Promise<CreateMainSessionResult> {
  // 1. Teacher — use-case hanya menerima actor terverifikasi.
  //    Role guru wajib; siswa/guest tidak pernah sampai ke sini.
  if (!deps.actor?.userId || (deps.actor.role !== 'GURU' && deps.actor.role !== 'ADMIN')) {
    return { ok: false, code: 'UNAUTHORIZED' };
  }
  const teacherId = deps.actor.userId;

  // 2. Kelas (opsional) — otorisasi + snapshot nama saat dibuat.
  let className: string | undefined;
  if (input.classId !== undefined) {
    const cls = await deps.classes.getClassSummary(input.classId);
    if (!cls) return { ok: false, code: 'CLASS_NOT_FOUND' };
    if (cls.teacherId !== teacherId) return { ok: false, code: 'CLASS_FORBIDDEN' };
    className = cls.name; // display snapshot — bukan identity
  }

  // 3. Muat soal dari Bank Soal existing (read-only). Label konten ikut
  //    terbawa dari sumber (tema/SoalSet) — snapshot, bukan query ulang.
  const source = await deps.bankSoal.loadQuestions(input.packageRef);
  if (!source.ok) return { ok: false, code: 'PACKAGE_NOT_FOUND' };
  if (source.questions.length === 0) return { ok: false, code: 'PACKAGE_EMPTY' };
  // Defensif: sumber yang lupa mengirim label tidak boleh membuat sesi
  // gagal — jatuh ke label netral.
  const contentTitle = (source.contentTitle ?? '').trim().slice(0, 120) || DEFAULT_CONTENT_TITLE;

  // 4-5. Kompatibilitas eksplisit + adaptasi (satu pass).
  //      Mode default = STRICT: paket campuran ditolak supaya caller
  //      SADAR ada soal yang tidak didukung. Mode useSupportedQuestions
  //      = keputusan EKSPLISIT caller setelah melihat compat result.
  const compat = evaluatePackageCompatibility(source.questions);
  if (!compat.fullyCompatible && input.useSupportedQuestions !== true) {
    return {
      ok: false,
      code: 'PACKAGE_INCOMPATIBLE',
      detail: {
        total: compat.total,
        supported: compat.supported,
        unsupported: compat.unsupported,
      },
    };
  }
  const subset = useSupportedQuestions(compat);
  if (!subset.ok) {
    // Semua soal unsupported — subset kosong, tetap ditolak meski
    // caller meminta useSupportedQuestions.
    return { ok: false, code: 'NO_SUPPORTED_QUESTIONS' };
  }
  const adapted = subset.questions;
  const unused = subset.unused;

  // 6. Snapshot: id baru per snapshot; identitas asal tetap di
  //    sourceQuestionId. Urutan paket = position di DB.
  const now = new Date();
  const totalRounds = adapted.length;
  const snapshots: MainQuestionSnapshot[] = adapted.map((q) => ({
    ...q,
    id: deps.ids.newId(),
  }));

  // Konfigurasi + default (fix review Tahap 5 §2): Jelajah tanpa
  // config; Kota eksplisit → FINAL, absen → PENDING_ROSTER (bukan
  // angka default — finalisasi saat roster diketahui, nanti).
  const resolved = resolveGameConfig(input.gameMode, totalRounds, input.config);
  if (!resolved.ok) {
    return { ok: false, code: resolved.code, reason: resolved.reason };
  }
  const kotaTargetResolution =
    resolved.config.gameMode === 'kota-cahaya' ? resolved.config.kotaTarget : null;
  // Pending target = null di kolom kotaTargetCorrect (nullable sejak
  // Tahap 4 — representasi bersih, tanpa sentinel angka magic).
  const kotaTargetCorrect =
    kotaTargetResolution?.kind === 'FINAL' ? kotaTargetResolution.target : null;

  // 9. Initial game state — empat regu valid / misi kota.
  //     Kota PENDING_ROSTER: state game BELUM dibuat di prepared
  //     session (target belum ada) — dibuat saat finalisasi target
  //     sebelum game dimulai (tahap start-session/realtime).
  let initialState: GameEngineState | undefined;
  let kotaPending = false;
  if (resolved.config.gameMode === 'jelajah-kata') {
    const stateResult = createGameState({ gameMode: 'jelajah-kata', totalRounds });
    if (!stateResult.ok) {
      return {
        ok: false,
        code: stateResult.code === 'INVALID_GAME_CONFIG' ? 'INVALID_GAME_CONFIG' : 'SESSION_CREATION_FAILED',
        reason: 'initial game state ditolak engine',
      };
    }
    initialState = stateResult.value;
  } else if (kotaTargetResolution?.kind === 'FINAL') {
    const stateResult = createGameState({
      gameMode: 'kota-cahaya',
      kota: { targetCorrectAnswers: kotaTargetCorrect! },
    });
    if (!stateResult.ok) {
      return {
        ok: false,
        code: stateResult.code === 'INVALID_GAME_CONFIG' ? 'INVALID_GAME_CONFIG' : 'SESSION_CREATION_FAILED',
        reason: 'initial game state ditolak engine',
      };
    }
    initialState = stateResult.value;
  } else {
    // PENDING_ROSTER: engine state menyusul setelah target difinalisasi.
    kotaPending = true;
  }

  // 7. Sesi domain — phase preparing, lobby belum dibuka.
  const session: MainSession = {
    id: deps.ids.newId(),
    pin: deps.pins.newPin(),
    teacherId,
    ...(input.classId !== undefined ? { classId: input.classId } : {}),
    ...(className !== undefined ? { className } : {}),
    // SNAPSHOT identitas konten (§7): sesi tetap menampilkan nama tema
    // meski sumber Bank Soal kemudian berubah atau hilang.
    contentTitle,
    gameMode: input.gameMode,
    phase: 'preparing',
    currentRoundIndex: null,
    totalRounds,
    createdAt: now,
  };

  // 8+9. Persist konsisten: session + snapshots + initial game
  // state dalam SATU transaksi (rollback bila gagal di tengah).
  // Kota PENDING_ROSTER: TANPA initial game state row (target belum
  // ada) — store menerima state null untuk kasus ini.
  const persisted = await deps.store.createMainSessionWithRuntime({
    session,
    kotaTargetCorrect,
    snapshots,
    initialState: kotaPending ? null : initialState!,
    gameMode: input.gameMode,
  });
  if (!persisted.ok) {
    return { ok: false, code: persisted.code };
  }

  return { ok: true, session, snapshots, initialState: initialState!, unused };
}
