// ─── Projector Session View ─────────────────────────────────
// View proyektor: HANYA public-safe. Tidak pernah memuat token,
// auth identifier, user id internal, jawaban individual siswa,
// atau answer key sebelum reveal.

import type { GameMode, SessionPhase } from '../../domain/types/session';
import type { PublicQuestionView } from '../../domain/entities/question';
import type { TeamPublicInfo } from './common';
import type { SessionId, TeamId } from '../../domain/types/ids';

/** Data join untuk QR code di layar — tanpa secret. */
export interface ProjectorJoinInfo {
  pin: string;
  /** URL absolut untuk QR (domain student ditentukan deployment nanti). */
  joinUrlTemplate: string;
  className?: string;
}

export interface ProjectorSessionView {
  role: 'projector';
  sessionId: SessionId;
  /** ISO-8601 UTC. */
  serverTime: string;
  revision: number;

  gameMode: GameMode;
  phase: SessionPhase;

  /**
   * Nama konten yang sedang dimainkan (mis. "Antonim") — snapshot
   * public-safe saat sesi dibuat; tetap ada sampai summary/ended.
   */
  contentTitle: string;

  /** PIN + data QR hanya diekspos saat lobby (sebelum soal mulai). */
  joinInfo: ProjectorJoinInfo | null;

  className?: string;

  currentRoundIndex: number | null;
  totalRounds: number;
  /** Deadline putaran aktif; public-safe untuk timer Layar Kelas. */
  currentRoundClosesAt: string | null;
  /** Soal aktif versi publik — tanpa answer key. */
  currentQuestion: PublicQuestionView | null;

  /** Partisipasi agregat — tanpa identitas siswa. */
  participation: {
    playerCount: number;
    eligibleCount: number;
    submittedCount: number;
  };

  teams: TeamPublicInfo[];

  /** Progres game publik (sesuai mode). */
  gameProgress:
    | { gameMode: 'jelajah-kata'; teamProgress: Record<TeamId, number> }
    | { gameMode: 'kota-cahaya'; progressPercent: number; unlockedMilestones: string[] };

  /** Ada hanya saat fase discussion/summary/ended. */
  revealedRound: {
    roundId: string;
    question: PublicQuestionView;
    correctOptionId: string;
    explanation?: string;
    /** Distribusi agregat pilihan. */
    optionCounts: Record<string, number>;
  } | null;

  /** Podium/hasil akhir — hanya saat summary/ended. */
  finalResult:
    | { gameMode: 'jelajah-kata'; teamRanking: { teamId: TeamId; progress: number }[] }
    | { gameMode: 'kota-cahaya'; missionAchieved: boolean; progressPercent: number }
    | null;
}
