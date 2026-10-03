import type { TeacherSessionView } from '@/src/main-bersama/contracts/views/teacher';

type ActionView = Pick<TeacherSessionView, 'phase' | 'allowedActions' | 'participants' | 'currentRoundIndex' | 'totalRounds'> & { automaticTeams?: boolean };

export interface TeacherPrimaryAction {
  command: 'start' | 'close-round' | 'discuss' | 'next-round' | 'resume' | 'end';
  label: string;
  disabled: boolean;
}

/** Both teacher tabs follow the same authoritative session permissions. */
export function getTeacherPrimaryAction(view: ActionView): TeacherPrimaryAction | null {
  const allowed = view.allowedActions;
  if (view.automaticTeams && !['lobby', 'summary', 'ended'].includes(view.phase)) return null;
  switch (view.phase) {
    case 'lobby':
      return { command: 'start', label: 'Mulai Permainan', disabled: !allowed.canStartSession || view.participants.length === 0 };
    case 'question':
      return { command: 'close-round', label: 'Tutup Jawaban', disabled: !allowed.canCloseRound };
    case 'closed':
      return { command: 'discuss', label: 'Bahas Jawaban', disabled: !allowed.canStartDiscussion };
    case 'discussion': {
      const isLastRound = (view.currentRoundIndex ?? -1) + 1 >= view.totalRounds;
      return { command: 'next-round', label: isLastRound ? 'Lihat Hasil' : 'Soal Berikutnya', disabled: isLastRound ? !allowed.canEndSession : !allowed.canGoToNextRound };
    }
    case 'paused':
      return { command: 'resume', label: 'Lanjutkan Permainan', disabled: !allowed.canResume };
    case 'summary':
      return { command: 'end', label: 'Tutup Sesi', disabled: !allowed.canEndSession };
    default:
      return null;
  }
}
