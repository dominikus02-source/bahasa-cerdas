"use client";

import { useState, type ReactNode } from 'react';
import type { KotaPodiumEntry } from '@/src/main-bersama/contracts/views/common';
import { milestonesForProgress } from '@/src/main-bersama/games/kota-cahaya/kota-cahaya-engine';
import { KotaScene } from '@/components/main-bersama/art/kota/KotaScene';
import { CityProgress } from '@/components/main-bersama/shared/CityProgress';
import KotaPodium from './KotaPodium';

export default function KotaFinalDisplay({ progressPercent, missionAchieved, podium, city }: { progressPercent: number; missionAchieved: boolean; podium: readonly KotaPodiumEntry[]; city?: ReactNode }) {
  const [panel, setPanel] = useState<'podium' | 'city'>('podium');
  const finalUnlocked = milestonesForProgress(progressPercent);
  return (
    <section className="mb-kota-final-display">
      <header className="mb-kota-final-heading">
        <span className="mb-eyebrow">PERMAINAN SELESAI · KOTA CAHAYA</span>
        <h2 className="mb-display">{missionAchieved ? 'Kota Cahaya Menyala!' : 'Terima kasih, Pahlawan Kota!'}</h2>
        <p><strong>{Math.round(progressPercent)}% energi kota</strong> · {finalUnlocked.length} dari 4 area menyala bersama kontribusi kelas.</p>
      </header>
      <div className="mb-kota-final-tabs" role="group" aria-label="Pilih hasil Kota Cahaya">
        <button type="button" aria-pressed={panel === 'podium'} onClick={() => setPanel('podium')}>Podium Siswa</button>
        <button type="button" aria-pressed={panel === 'city'} onClick={() => setPanel('city')}>Kota yang Kita Bangun</button>
      </div>
      <div className="mb-kota-final-panel">
        {panel === 'podium' ? <KotaPodium entries={podium} /> : (
          <div className="mb-kota-final-city">
            {city ?? <><KotaScene unlocked={finalUnlocked} /><CityProgress progressPercent={progressPercent} unlockedMilestones={finalUnlocked} /></>}
          </div>
        )}
      </div>
      <style jsx>{`
        .mb-kota-final-display { display: flex; flex-direction: column; gap: 12px; min-height: 0; min-width: 0; width: min(100%, 1240px); margin: 0 auto; }
        .mb-kota-final-heading { text-align: center; flex: none; padding: 14px; border: 1px solid #d6e8e5; border-radius: 24px; background: linear-gradient(125deg, #eefbf6, #fff8e6, #f0f7ff); }
        .mb-kota-final-heading h2 { margin: 8px 0; font-size: clamp(1.7rem, 3.6vw, 3rem); line-height: 1.15; color: #123d40; }
        .mb-kota-final-heading p { margin: 0; color: #59727b; line-height: 1.5; }
        .mb-kota-final-tabs { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; flex: none; }
        .mb-kota-final-tabs button { min-height: 44px; padding: 10px 18px; border-radius: 14px; border: 1px solid #cdddde; background: #fff; color: #30515c; font: inherit; font-weight: 800; cursor: pointer; }
        .mb-kota-final-tabs button[aria-pressed="true"] { background: #087f73; color: #fff; border-color: #087f73; }
        .mb-kota-final-tabs button:focus-visible { outline: 3px solid #8b5cf6; outline-offset: 3px; }
        .mb-kota-final-panel { min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 0 4px 4px; }
        .mb-kota-final-panel :global(.mb-kota-podium) { margin-top: 0; }
        .mb-kota-final-city { display: flex; flex-direction: column; gap: 14px; }
        .mb-kota-final-city :global(.mb-kota-scene) { max-height: 440px; }
        @media (max-width: 600px) { .mb-kota-final-heading p { font-size: .9rem; } .mb-kota-final-tabs button { padding: 10px 12px; font-size: .88rem; } }
        @media (min-width: 601px) and (max-height: 800px) { .mb-kota-final-display { gap: 10px; } .mb-kota-final-heading { padding: 10px; } .mb-kota-final-heading h2 { margin: 4px 0; font-size: 1.8rem; } .mb-kota-final-heading p { font-size: .85rem; } }
      `}</style>
    </section>
  );
}
