"use client";

import type { KotaPodiumEntry } from '@/src/main-bersama/contracts/views/common';

export default function KotaPodium({ entries }: { entries: readonly KotaPodiumEntry[] }) {
  const ordered = [2, 1, 3].flatMap((rank) => entries.filter((entry) => entry.rank === rank));
  return (
    <section className="mb-kota-podium" aria-label="Podium Pahlawan Kota">
      <header>
        <span className="mb-eyebrow">PODIUM SISWA</span>
        <h3 className="mb-display">Pahlawan Kota Cahaya</h3>
        <p>Penghargaan untuk kontribusi jawaban benar terbanyak. Nilai seri berbagi peringkat.</p>
      </header>
      {ordered.length === 0 ? <p className="mb-kota-podium-empty">Belum ada hasil siswa. Terima kasih sudah bermain bersama!</p> : (
        <ol className="mb-kota-podium-grid" data-count={ordered.length}>
          {ordered.map((entry, index) => (
            <li className="mb-kota-podium-card" data-rank={entry.rank} key={`${entry.rank}-${index}`}>
              <span className="mb-kota-podium-medal" aria-label={`Peringkat ${entry.rank}`}>{entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}</span>
              <img className="mb-kota-podium-avatar" src={entry.avatarUrl ?? '/avatar/2.webp'} alt="" width={112} height={112} />
              <strong className="mb-kota-podium-name">{entry.displayName}</strong>
              <span className="mb-kota-podium-contribution"><b>{entry.correctAnswers}</b> energi disumbangkan</span>
              <div className="mb-kota-podium-step"><b>{entry.rank}</b><span>Setiap jawaban benar menyalakan kota</span></div>
            </li>
          ))}
        </ol>
      )}
      <p className="mb-kota-podium-note">Kota ini dibangun bersama. Terima kasih kepada seluruh siswa yang ikut berkontribusi!</p>
      <style jsx>{`
        .mb-kota-podium { width: 100%; min-width: 0; margin: 20px auto 0; padding: clamp(18px, 3vw, 30px); border: 1px solid #dce9e8; border-radius: 28px; background: linear-gradient(150deg, #fff, #f5faf9); color: #193b46; box-shadow: 0 16px 40px rgba(19, 55, 65, .07); }
        .mb-kota-podium header { text-align: center; }
        .mb-kota-podium h3 { margin: 8px 0; font-size: clamp(1.4rem, 3vw, 2rem); color: #123d40; }
        .mb-kota-podium header p, .mb-kota-podium-note, .mb-kota-podium-empty { color: #59727b; line-height: 1.55; margin: 8px 0; }
        .mb-kota-podium-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); align-items: end; gap: 18px; max-width: 1100px; margin: 24px auto 0; padding: 0; list-style: none; }
        .mb-kota-podium-grid[data-count="1"] { max-width: 340px; }
        .mb-kota-podium-grid[data-count="2"] { max-width: 700px; }
        .mb-kota-podium-card { min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 18px 14px 0; text-align: center; border: 1px solid #dce9e8; border-radius: 24px; background: #fff; overflow: hidden; }
        .mb-kota-podium-card[data-rank="1"] { border-color: #edca77; background: linear-gradient(#fffaf0, #fff); }
        .mb-kota-podium-medal { font-size: 2rem; line-height: 1.2; }
        .mb-kota-podium-avatar { flex: none; display: block; width: 96px; height: 96px; object-fit: contain; border-radius: 50%; background: #edf4f5; border: 5px solid #fff; }
        .mb-kota-podium-card[data-rank="1"] .mb-kota-podium-avatar { width: 120px; height: 120px; }
        .mb-kota-podium-name { max-width: 100%; overflow-wrap: anywhere; font-size: clamp(1rem, 2vw, 1.3rem); line-height: 1.35; }
        .mb-kota-podium-contribution { color: #52737c; line-height: 1.5; }
        .mb-kota-podium-contribution b { color: #107a71; }
        .mb-kota-podium-step { display: flex; flex-direction: column; justify-content: center; gap: 4px; width: 100%; min-height: 70px; margin-top: 4px; padding: 12px; border-radius: 18px 18px 0 0; background: #e0eeef; }
        .mb-kota-podium-card[data-rank="1"] .mb-kota-podium-step { min-height: 100px; background: linear-gradient(135deg, #ffdf89, #ffc955); color: #624514; }
        .mb-kota-podium-card[data-rank="3"] .mb-kota-podium-step { background: #f2e5da; }
        .mb-kota-podium-step b { font-size: 1.8rem; line-height: 1; }
        .mb-kota-podium-step span { font-size: .78rem; line-height: 1.4; }
        .mb-kota-podium-note { text-align: center; margin-top: 20px; font-size: .9rem; }
        @media (max-width: 600px) { .mb-kota-podium-grid { gap: 12px; grid-template-columns: 1fr; } .mb-kota-podium-card[data-rank="1"] { order: -1; } }
        @media (min-width: 601px) and (max-height: 800px) { .mb-kota-podium { padding: 16px; } .mb-kota-podium h3 { font-size: 1.5rem; margin: 4px 0; } .mb-kota-podium header p { font-size: .85rem; margin: 4px 0; } .mb-kota-podium-grid { margin-top: 12px; } .mb-kota-podium-card { gap: 6px; padding-top: 12px; } .mb-kota-podium-avatar { width: 80px; height: 80px; } .mb-kota-podium-card[data-rank="1"] .mb-kota-podium-avatar { width: 104px; height: 104px; } .mb-kota-podium-step { min-height: 54px; padding: 10px; } .mb-kota-podium-card[data-rank="1"] .mb-kota-podium-step { min-height: 64px; } .mb-kota-podium-note { margin-top: 12px; font-size: .82rem; } }
      `}</style>
    </section>
  );
}
