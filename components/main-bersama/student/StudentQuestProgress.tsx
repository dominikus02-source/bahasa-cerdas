import type { ReactNode } from 'react';
import { Compass, Flag } from 'lucide-react';
import { TeamMascot } from '@/components/main-bersama/art/registry';
import styles from './student-quest-progress.module.css';

export default function StudentQuestProgress({ team, currentRound, totalRounds, gameMode, status }: {
  team: { id: string; name: string } | null;
  currentRound: number;
  totalRounds: number;
  gameMode: string;
  status: ReactNode;
}) {
  const adventure = gameMode === 'jelajah-kata';
  return (
    <div className={styles.quest} data-adventure={adventure}>
      <div className={styles.mascot} aria-hidden>
        {team ? <TeamMascot teamId={team.id} pose="ready" size={128} eager /> : <Compass size={54} />}
      </div>
      <div className={styles.details}>
        <span className={styles.mode}><Compass size={12} aria-hidden />{adventure ? 'JELAJAH KATA' : 'KOTA CAHAYA'}</span>
        <strong>{team ? `Ayo, Regu ${team.name}!` : 'Ayo, nyalakan kotamu!'}</strong>
        <div className={styles.round}><span>Soal {currentRound} dari {totalRounds}</span>{status}</div>
        <div className={styles.progress} role="progressbar" aria-label="Progres soal" aria-valuenow={currentRound} aria-valuemin={1} aria-valuemax={totalRounds}>
          <span style={{ width: `${(currentRound / totalRounds) * 100}%` }} />
          <Flag size={13} aria-hidden />
        </div>
      </div>
    </div>
  );
}
