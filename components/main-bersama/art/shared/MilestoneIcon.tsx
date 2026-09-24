"use client";
// ─── Milestone Icon 8B — small landmark glyphs (chips, labels, track nodes).

import type { KotaMilestoneKey } from '../kota/KotaScene';

export function MilestoneIcon({ kind, size = 20 }: { kind: KotaMilestoneKey | string; size?: number }) {
  const s = {
    fill: 'none', stroke: 'currentColor', strokeWidth: 2.2,
    strokeLinecap: 'round', strokeLinejoin: 'round',
  } as const;
  let body: React.ReactNode = null;
  if (kind === 'garden') {
    body = (
      <g {...s}>
        <circle cx="12" cy="9" r="5" />
        <path d="M12 14 L12 21 M12 21 L7 21 M12 21 L17 21" />
      </g>
    );
  } else if (kind === 'library') {
    body = (
      <g {...s}>
        <path d="M4 20 L4 8 M8 20 L8 8 M16 20 L16 8 M20 20 L20 8 M3 20 L21 20 M3 8 L21 8" />
      </g>
    );
  } else if (kind === 'homes') {
    body = (
      <g {...s}>
        <path d="M4 12 L12 5 L20 12 M6 11 L6 20 L18 20 L18 11" />
      </g>
    );
  } else {
    body = (
      <g {...s}>
        <path d="M9 21 L9 8 L15 8 L15 21 M9 21 L15 21 M12 8 L12 3 M9 4.5 L12 3 L15 4.5" />
      </g>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      {body}
    </svg>
  );
}
