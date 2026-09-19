// ─── Identifier Aliases ─────────────────────────────────────
// Alias string sederhana — sengaja tanpa branded types agar
// ergonomis. Ketebalan ID dijamin oleh generator ID di layer
// application, bukan oleh sistem tipe.

export type SessionId = string;
export type PlayerId = string;
export type TeamId = string;
export type RoundId = string;
export type QuestionId = string;
export type SubmissionId = string;

/** ID internal soal di Bank Soal BahasaCerdas (referensi asal). */
export type SourceQuestionId = string;

/** ID user Supabase milik peserta terautentikasi (opsional untuk guest). */
export type AuthUserId = string;
