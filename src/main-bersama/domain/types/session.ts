// ─── Session Lifecycle ──────────────────────────────────────

/** Dua mode permainan Main Bersama. Jangan tambahkan mode lain tanpa keputusan domain. */
export type GameMode = 'jelajah-kata' | 'kota-cahaya';

/**
 * Fase eksplisit siklus hidup sesi.
 * - Animasi/efek visual proyektor BUKAN session phase (urusan presentation).
 * - `closed` (guru menutup sesi: join baru ditolak, permainan dihentikan)
 *   dipisah dari `discussion` (pembahasan soal pada round tertentu).
 * - `paused` dipertahankan sebagai state domain agar reconnect client tahu
 *   permainan sedang ditahan guru.
 */
export type SessionPhase =
  | 'preparing'
  | 'lobby'
  | 'question'
  | 'closed'
  | 'discussion'
  | 'paused'
  | 'summary'
  | 'ended';

/** Fase round individual, lebih granular dari phase sesi. */
export type RoundPhase = 'pending' | 'open' | 'review' | 'closed';

/** Fase pembelajaran sebuah soal terhadap kelas. */
export type QuestionPhase = 'answering' | 'revealed' | 'archived';

/** Bagaimana jawaban peserta diperoleh dalam mode permainan. */
export type AnswerSource = 'individual' | 'team-consensus';

/** Arah sinkronisasi untuk event `state:sync`. */
export type SyncReason = 'join' | 'reconnect' | 'phase-change' | 'tick' | 'request';
