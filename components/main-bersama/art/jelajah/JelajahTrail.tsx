"use client";

import { Flag, MapPin } from 'lucide-react';
import { TeamMascot } from '../registry';
import { getJelajahLayout, getJelajahTeams, JELAJAH_TRAVEL } from '@/lib/main-bersama/jelajah-layout';
import styles from './jelajah-trail.module.css';

interface TrailTeam { id: string; name: string }
type TrailPose = 'ready' | 'move' | 'celebrate';
const TEAM_COLORS: Record<string, string> = {
  elang: '#f5cc70', harimau: '#ffa77b', rusa: '#a3e89b',
  badak: '#9bddff', gajah: '#76e6d5', beruang: '#d6b4ff',
};
const MASCOT_GROUND: Record<string, Record<TrailPose, number>> = {
  elang: { ready: 986, move: 930, celebrate: 1008 },
  harimau: { ready: 983, move: 982, celebrate: 980 },
  rusa: { ready: 1000, move: 1011, celebrate: 993 },
  badak: { ready: 983, move: 963, celebrate: 986 },
  gajah: { ready: 1005, move: 999, celebrate: 1016 },
  beruang: { ready: 996, move: 1000, celebrate: 999 },
};

/** Fixed team order and separate tracks; progress still comes entirely from the server. */
export function JelajahTrail({ teams, progress, compact = false, poses }: {
  teams: TrailTeam[];
  progress: Record<string, number>;
  compact?: boolean;
  poses?: Record<string, TrailPose>;
}) {
  const shown = getJelajahTeams(teams);
  const { positions } = getJelajahLayout(shown, progress);
  const mascotSize = compact ? 112 : 128;

  return (
    <div className={`${styles.world} mb-jelajah-world mb-jelajah-lanes`} data-compact={compact} data-teams={shown.length}>
      <svg className={styles.scenery} aria-hidden viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice">
        <image href="/main-bersama/jelajah/backgrounds/jk-1.webp" width="1200" height="600" preserveAspectRatio="xMidYMid slice" />
      </svg>
      <div className={styles.heading}>
        <span><MapPin size={16} aria-hidden /> Lembah Pagi <small>JELAJAH KATA</small></span>
        <span>{shown.length} regu dalam petualangan</span>
      </div>
      <ol className={styles.lanes} aria-label="Perjalanan regu">
        {shown.map((team, index) => {
          const value = (positions.get(team.id)?.distance ?? 0) / JELAJAH_TRAVEL * 100;
          const color = TEAM_COLORS[team.id] ?? '#0f766e';
          const pose = poses?.[team.id] ?? 'ready';
          const groundOffset = mascotSize * (1 - (MASCOT_GROUND[team.id]?.[pose] ?? 1024) / 1024);
          return (
            <li key={team.id} data-team-lane={team.id} className={styles.lane}
              style={{ '--lane-color': color, '--mascot-size': `${mascotSize}px` } as React.CSSProperties}>
              <div className={styles.teamName}><i>{index + 1}</i><strong>{team.name}</strong><span>REGU</span></div>
              <div className={styles.course}>
                <div className={styles.rail}>
                  <span className={styles.fill} style={{ width: `${value}%` }} />
                  {[0, 25, 50, 75, 100].map(point => <i key={point} className={styles.checkpoint} data-reached={value >= point} style={{ left: `${point}%` }} aria-hidden />)}
                  <span className={`${styles.marker} ${pose === 'move' ? styles.moving : ''}`}
                    style={{ left: `${value}%` }} aria-hidden>
                    <span className={styles.sprite} style={{ translate: `0 ${groundOffset}px` }}>
                      <TeamMascot teamId={team.id} pose={pose} size={mascotSize} eager />
                    </span>
                  </span>
                </div>
                <span className={styles.start} aria-hidden>MULAI</span>
                <span className={styles.finish} aria-hidden><Flag size={18} />FINIS</span>
              </div>
              <span className={styles.percentage} aria-label={`Regu ${team.name} mencapai ${Math.round(value)} persen`}>{Math.round(value)}%</span>
            </li>
          );
        })}
      </ol>
      <div className={`${styles.caption} mb-jelajah-world-caption`}>
        <span>Setiap jawaban tepat membawa regumu lebih jauh.</span>
        <strong>Berpetualang bersama!</strong>
      </div>
    </div>
  );
}
