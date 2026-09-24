"use client";
// ─── Kota Scene 8B — layered night city, milestone layers light up.
// garden 25 → library 50 → homes 75 → town-center 100.
// Inactive = silhouette (visible, never failure). data-milestone ready for 8C.

export type KotaMilestoneKey = 'garden' | 'library' | 'homes' | 'town-center';

export const KOTA_MILESTONES: Array<{ key: KotaMilestoneKey; label: string; at: number }> = [
  { key: 'garden', label: 'Taman', at: 25 },
  { key: 'library', label: 'Perpustakaan', at: 50 },
  { key: 'homes', label: 'Rumah', at: 75 },
  { key: 'town-center', label: 'Pusat Kota', at: 100 },
];

function Windows({ x, y, w, n, lit, litColor }: { x: number; y: number; w: number; n: number; lit: boolean; litColor: string }) {
  const gap = w / n;
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => (
        <rect
          key={i}
          x={x + i * gap + 2}
          y={y}
          width={Math.max(3, gap - 5)}
          height={9}
          rx={1.5}
          fill={lit ? litColor : '#0b1e3a'}
          opacity={lit ? 1 : 0.85}
        />
      ))}
    </g>
  );
}

interface KotaSceneProps {
  unlocked: string[];
  mini?: boolean;
  /** 8C.2 — transient REVEAL subset of `unlocked` (glow/arrive, then settle). */
  reveal?: string[];
}

export function KotaScene({ unlocked, mini = false, reveal = [] }: KotaSceneProps) {
  const on = new Set(unlocked);
  const revealing = new Set(reveal);
  const lit = (k: string) => on.has(k);
  const glow = 'var(--mb-kota-glow)';
  const winLit = 'var(--mb-kota-glow)';
  const B = 'var(--mb-kota-building)';
  return (
    <svg
      viewBox="0 0 800 300"
      className="mb-kota-scene"
      role="img"
      aria-label="Kota Cahaya"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <rect x="0" y="0" width="800" height="300" rx="18" fill="var(--mb-kota-night)" />
      {/* stars */}
      <g fill="#ffffff" opacity="0.8">
        {[
          [60, 36], [150, 70], [250, 30], [340, 62], [440, 34], [540, 66],
          [640, 40], [730, 74], [110, 110], [300, 100], [480, 110], [690, 120],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.4 : 1.5} />
        ))}
      </g>
      <circle cx="712" cy="52" r="24" fill="#f8fafc" opacity="0.92" />
      <circle cx="704" cy="46" r="20" fill="var(--mb-kota-night)" opacity="0.55" />
      {/* ground */}
      <rect x="0" y="238" width="800" height="62" fill="#13253a" />
      {/* ── garden (trees) ── */}
      <g data-milestone="garden" data-lit={lit('garden')} data-reveal={revealing.has('garden')} className={revealing.has('garden') ? 'mb-kota-reveal' : undefined}>
        {[120, 175, 230].map((x, i) => (
          <g key={x}>
            <rect x={x - 3} y={208} width={6} height={32} rx={3} fill={B} />
            <circle cx={x} cy={196 - (i % 2) * 8} r={17} fill={B} />
            <circle cx={x} cy={196 - (i % 2) * 8} r={17} fill={lit('garden') ? '#34d399' : 'transparent'} opacity={lit('garden') ? 0.9 : 0} />
            {lit('garden') ? <circle cx={x} cy={196 - (i % 2) * 8} r={24} fill={glow} opacity="0.18" /> : null}
          </g>
        ))}
      </g>
      {/* ── library (columned hall) ── */}
      <g data-milestone="library" data-lit={lit('library')} data-reveal={revealing.has('library')} className={revealing.has('library') ? 'mb-kota-reveal' : undefined}>
        <rect x="300" y="170" width="120" height="70" rx="6" fill={B} />
        <rect x="292" y="158" width="136" height="14" rx="4" fill={B} />
        {[312, 336, 360, 384].map((x) => (
          <rect key={x} x={x} y={176} width={10} height={64} rx={3} fill={lit('library') ? winLit : '#0b1e3a'} opacity={lit('library') ? 0.95 : 0.9} />
        ))}
        {lit('library') ? <circle cx={360} cy={200} r={52} fill={glow} opacity="0.12" /> : null}
      </g>
      {/* ── homes (two houses) ── */}
      <g data-milestone="homes" data-lit={lit('homes')} data-reveal={revealing.has('homes')} className={revealing.has('homes') ? 'mb-kota-reveal' : undefined}>
        <g>
          <rect x="460" y="196" width="56" height="44" rx="4" fill={B} />
          <path d="M454 198 L488 172 L522 198 Z" fill={B} />
          <Windows x={468} y={208} w={40} n={2} lit={lit('homes')} litColor={winLit} />
        </g>
        <g>
          <rect x="528" y="204" width="48" height="36" rx="4" fill={B} />
          <path d="M522 206 L552 184 L582 206 Z" fill={B} />
          <Windows x={535} y={214} w={34} n={2} lit={lit('homes')} litColor={winLit} />
        </g>
        {lit('homes') ? <circle cx={518} cy={208} r={44} fill={glow} opacity="0.1" /> : null}
      </g>
      {/* ── town-center (beacon tower) ── */}
      <g data-milestone="town-center" data-lit={lit('town-center')} data-reveal={revealing.has('town-center')} className={revealing.has('town-center') ? 'mb-kota-reveal' : undefined}>
        {lit('town-center') ? <circle cx={660} cy={120} r={64} fill={glow} opacity="0.16" /> : null}
        <rect x="636" y="120" width="48" height="120" rx="6" fill={B} />
        <path d="M628 122 L660 92 L692 122 Z" fill={B} />
        <circle cx={660} cy={84} r={lit('town-center') ? 11 : 7} fill={lit('town-center') ? glow : B} />
        <Windows x={642} y={136} w={36} n={3} lit={lit('town-center')} litColor={winLit} />
        <Windows x={642} y={156} w={36} n={3} lit={lit('town-center')} litColor={winLit} />
        <Windows x={642} y={176} w={36} n={3} lit={lit('town-center')} litColor={winLit} />
        {!mini ? (
          <g stroke={lit('town-center') ? glow : B} strokeWidth="3" strokeLinecap="round" opacity={lit('town-center') ? 0.9 : 0.5}>
            <path d="M660 60 L660 30" />
            <path d="M648 38 L660 30 L672 38" fill="none" />
          </g>
        ) : null}
      </g>
    </svg>
  );
}
