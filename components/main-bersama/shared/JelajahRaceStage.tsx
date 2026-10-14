import { Users } from 'lucide-react';
import { JelajahTrail } from '@/components/main-bersama/art/jelajah/JelajahTrail';
import styles from './play-controls.module.css';

export default function JelajahRaceStage({ teams, progress, playerCount, poses }: {
  teams: Array<{ id: string; name: string }>;
  progress: Record<string, number>;
  playerCount: number;
  poses?: Record<string, 'ready' | 'move' | 'celebrate'>;
}) {
  return (
    <section className={`${styles.raceScreen} mb-pj-phase mb-fade-in`} aria-labelledby="mb-race-title">
      <div className={styles.raceHeading}>
        <div><h2 id="mb-race-title">Petualangan regu dimulai!</h2><p>Jawab di perangkatmu. Setiap regu maju bersama lewat jawaban yang tepat.</p></div>
        <span><Users size={15} aria-hidden />{playerCount} siswa · {teams.length} regu</span>
      </div>
      <JelajahTrail teams={teams} progress={progress} poses={poses} compact />
    </section>
  );
}
