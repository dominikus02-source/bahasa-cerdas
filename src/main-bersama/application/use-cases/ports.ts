// ─── Use-Case Ports (Application Boundary) ──────────────────
// Kontrak yang DIINJEKSI ke use-case. Implementasi nyata ada di
// adapters/ (Bank Soal, KelasKu, Auth) dan infrastructure/
// (Prisma transaction). Application tidak pernah mengimpor
// Prisma/Supabase langsung — dependensi selalu menghadap ke dalam.

import type { GameMode } from '../../domain/types/session';
import type { GameEngineState } from '../../games/game-router';
import type { MainSession } from '../../domain/entities/session';

// ─── Bank Soal ──────────────────────────────────────────────

/** Jenis sumber paket soal di Bank Soal BahasaCerdas (v1). */
export type BankSoalPackageRef =
  | { kind: 'SOAL_SET'; soalSetId: string }
  | { kind: 'MASTER_THEME'; theme: string }
  /**
   * Tema Bank Soal (grup `Soal` source=MASTER_BANK per `topik`) — jalur
   * yang dipakai tombol "Gunakan untuk Main Bersama" di halaman Bank
   * Soal. Pilihan soal (jumlah/tingkat/seed) memakai aturan pemilihan
   * yang SAMA dengan Latihan (`pickBankSoalSet`), sehingga set yang
   * dipratinjau guru = set yang dimainkan.
   *
   * Ini referensi-sumber, BUKAN paket baru: tidak ada SoalSet/Soal
   * duplikat yang dibuat, dan tidak ada isi soal yang dikirim client.
   */
  | {
      kind: 'BANK_THEME';
      topic: string;
      /** Jumlah soal yang diminta guru (1..30). Default: semua yang lolos. */
      count?: number;
      /** MUDAH | SEDANG | SULIT — kosong = semua tingkat. */
      difficulty?: string | null;
      /** Seed pemilihan deterministik; kosong = urutan sumber apa adanya. */
      seed?: string;
    };

/**
 * Bentuk netral soal dari Bank Soal — SATU bentuk input untuk
 * semua sumber (Soal DB, master JSON, UKBI/TKA nanti). Adapter
 * Bank Soal yang menormalkan perbedaan format, bukan domain.
 */
export interface BankSoalQuestionInput {
  /** ID stabil soal di sumber (Soal.id / kodeSoal / id UKBI). */
  sourceQuestionId: string;
  /** Tipe asli di sumber (mis. PILIHAN_GANDA, BENAR_SALAH, pilihan_ganda). */
  type: string;
  /** Pertanyaan (Soal.text / UKBI stem). */
  prompt: string;
  /** Opsi asli: string[] (Soal/master) atau {id,text}[] (UKBI/TKA). */
  options: string[] | ReadonlyArray<{ id: string; text: string }>;
  /** Kunci jawaban asli: index "0", huruf "B", atau id opsi. */
  correctAnswer: string;
  explanation?: string | null;
  /** Stimulus/bacaan bila ada (UKBI membaca). Tidak pernah dipotong. */
  passage?: string | null;
  passageTitle?: string | null;
}

export type BankSoalSourceResult =
  | {
      ok: true;
      questions: BankSoalQuestionInput[];
      /** Label public-safe dari sumber soal (mis. nama tema/SoalSet). */
      contentTitle: string;
    }
  | { ok: false; code: 'PACKAGE_NOT_FOUND' };

/** Port sumber soal (dipakai use-case, diimplementasi adapter). */
export interface BankSoalQuestionSource {
  loadQuestions(ref: BankSoalPackageRef): Promise<BankSoalSourceResult>;
}

/** Parameter pemilihan satu tema Bank Soal (varian BANK_THEME). */
export interface BankThemeSelection {
  topic: string;
  count?: number;
  difficulty?: string | null;
  seed?: string;
}

/**
 * Port khusus tema Bank Soal.
 *
 * Dipisah karena pemilihannya memakai aturan Bank Soal BahasaCerdas
 * (gerbang pengiriman + seeded pick) yang tinggal di `lib/` — hanya
 * boleh disentuh lapisan infrastructure. Adapter Bank Soal tetap
 * bersih: ia menerima implementasi port ini lewat konstruktor
 * (komposisi di route), bukan mengimpor util BC langsung.
 */
export interface BankThemeQuestionSource {
  load(ref: BankThemeSelection): Promise<BankSoalSourceResult>;
}

// ─── KelasKu ────────────────────────────────────────────────

/** Ringkasan kelas minimal untuk otorisasi + snapshot nama. */
export interface MainBersamaClassSummary {
  id: string;
  /** Nama saat dibaca — dipakai sebagai className snapshot. */
  name: string;
  teacherId: string;
  isActive: boolean;
}

/** Port direktori kelas KelasKu (dipakai use-case). */
export interface MainBersamaClassDirectory {
  getClassSummary(classId: string): Promise<MainBersamaClassSummary | null>;
}

// ─── Persistence ────────────────────────────────────────────

/**
 * Store transaksional pembuatan sesi: session + snapshots + initial
 * game state dalam SATU transaksi (rollback bila gagal di tengah).
 * Dijalankan di infrastructure (Prisma); tipe yang lewat di sini
 * murni domain.
 *
 * `initialState: null` = Kota Cahaya PENDING_ROSTER (target belum
 * difinalisasi) — TIDAK ada baris game state dibuat untuk kasus ini;
 * state dibuat saat finalisasi target sebelum game dimulai.
 */
export interface MainSessionCreationStore {
  createMainSessionWithRuntime(input: {
    session: MainSession;
    /** Konfigurasi eksplisit Kota Cahaya (null untuk Jelajah ATAU pending roster). */
    kotaTargetCorrect: number | null;
    snapshots: MainSessionCreationSnapshot[];
    initialState: GameEngineState | null;
    gameMode: GameMode;
  }): Promise<
    | { ok: true }
    | { ok: false; code: 'PIN_TAKEN' | 'SESSION_CREATION_FAILED' }
  >;
}

/** Snapshot siap-persist (sudah diberi id oleh application). */
export type MainSessionCreationSnapshot = {
  id: string;
  sourceQuestionId: string;
  type: 'single-choice' | 'true-false' | 'passage-single-choice';
  prompt: string;
  options: ReadonlyArray<{ id: string; text: string }>;
  correctOptionId: string;
  explanation?: string;
  passage?: { title?: string; content: string };
};

// ─── Generators ─────────────────────────────────────────────

/** Generator id (snapshot/session). Diinjeksi agar test deterministik. */
export interface IdGenerator {
  newId(): string;
}

/** Generator PIN join 6 digit. Diinjeksi agar test deterministik. */
export interface PinGenerator {
  newPin(): string;
}
