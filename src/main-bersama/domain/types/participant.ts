// ─── Participant & Connection ───────────────────────────────

/**
 * Peran koneksi/client pada sesi.
 * `teacher` dan `projector` adalah operator/pengamat — bukan peserta permainan,
 * sehingga tidak pernah menjadi `MainPlayer`.
 */
export type ParticipantRole = 'teacher' | 'student' | 'projector';

/**
 * Status koneksi transport seorang peserta. Murni domain —
 * state UI (loading, hover, dsb.) tidak pernah masuk sini.
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'left';

/** Kondisi keaktifan peserta terhadap permainan saat ini. */
export type ParticipationStatus = 'active' | 'inactive';

/**
 * Status penyimpanan jawaban milik peserta untuk round berjalan.
 * Dikirim pada view siswa — bukan kebenaran jawaban.
 */
export type AnswerSaveStatus = 'not-submitted' | 'saved' | 'stale-rejected';
