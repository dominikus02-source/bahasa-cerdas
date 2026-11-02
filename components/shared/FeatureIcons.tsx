import React, { useId } from "react";

/**
 * BahasaCerdas feature icon family.
 * Brand colors and strong white pictograms inspired by the product reference.
 * Each pictogram uses the same 48px canvas, 12px corner radius and a
 * generous safe area. SVGs remain sharp in mobile cards and retina displays.
 */
interface IconProps { size?: number; className?: string; }

function FeatureTile({ size = 40, className, children, label }: IconProps & {
  children: React.ReactNode;
  label: string;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className}
      fill="none" role="img" aria-label={label} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00DAC9" />
          <stop offset="42%" stopColor="#1989FF" />
          <stop offset="74%" stopColor="#7938F5" />
          <stop offset="100%" stopColor="#FA3EA8" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill={`url(#${id})`} />
      <g stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  );
}

/** Jumpa: live video learning, with participants and a camera. */
export function JumpaIcon(props: IconProps) {
  return <FeatureTile {...props} label="Jumpa - pertemuan video">
    <rect x="8.5" y="13" width="31" height="25" rx="4" />
    <rect x="26.5" y="9.5" width="9" height="7" rx="1.5" fill="white" stroke="none" />
    <path d="m37 11 3.5-2v8L37 15" fill="white" stroke="none" />
    <circle cx="17" cy="23" r="3" fill="white" stroke="none" />
    <circle cx="27" cy="23" r="3" fill="white" stroke="none" />
    <path d="M11.5 32c.4-3.8 2.4-5.8 5.5-5.8s5.1 2 5.5 5.8M21.5 32c.4-3.8 2.4-5.8 5.5-5.8s5.1 2 5.5 5.8" />
  </FeatureTile>;
}

/** Nara: a friendly, unmistakably conversational AI assistant. */
export function NaraIcon(props: IconProps) {
  return <FeatureTile {...props} label="Nara - asisten AI">
    <rect x="10" y="15" width="28" height="23" rx="10" fill="white" stroke="none" />
    <path d="M24 15v-4" />
    <circle cx="24" cy="9.5" r="2.5" fill="white" stroke="none" />
    <path d="M10 24H7v7h3M38 24h3v7h-3" />
    <path d="M16 25q3-5 6 0m4 0q3-5 6 0" stroke="#6B38ED" strokeWidth="2.6" />
    <path d="M20 31q4 3 8 0" stroke="#6B38ED" strokeWidth="1.7" />
    <circle cx="35" cy="35" r="8" fill="white" stroke="none" />
    <path d="M31.5 35h.1m3.4 0h.1m3.3 0h.1" stroke="#B629E9" strokeWidth="3.4" />
  </FeatureTile>;
}

/** Aksara: an open book plus a writing nib, not an ambiguous letterform. */
export function AksaraIcon(props: IconProps) {
  return <FeatureTile {...props} label="Aksara - membaca dan menulis">
    <path d="M7.5 17c6-1.4 11.6-.6 16.5 3.2 4.9-3.8 10.5-4.6 16.5-3.2v20c-6-1.4-11.6-.6-16.5 3.2-4.9-3.8-10.5-4.6-16.5-3.2z" fill="white" stroke="none" />
    <path d="M24 20v20M10.5 21c3.4-.4 6.5.3 9.1 1.7M28 22.7c2.9-1.4 6-2.1 9.3-1.7" stroke="#6E36ED" strokeWidth="1.5" />
    <path d="M22 28c2-11 7-17 15-22-1 8-5 17-15 22z" fill="white" stroke="#6E36ED" strokeWidth="1.7" />
    <path d="M20 32c2-5 5-10 11-17" stroke="#6E36ED" strokeWidth="1.5" />
  </FeatureTile>;
}

/** Toko Karya: commerce + learning materials, with a distinct star badge. */
export function TokoKaryaIcon(props: IconProps) {
  return <FeatureTile {...props} label="Toko Karya - karya dan produk belajar">
    <path d="M13 18h22l1.4 18H11.6z" fill="white" stroke="none" />
    <path d="M18 18v-3a6 6 0 0 1 12 0v3" />
    <path d="m13 28 7-3 7 3 8-3" stroke="#7039EB" strokeWidth="1.6" />
    <circle cx="35" cy="34.5" r="9" fill="white" stroke="none" />
    <path d="m35 28.6 1.8 3.7 4.1.6-3 2.9.7 4.1-3.6-1.9-3.6 1.9.7-4.1-3-2.9 4.1-.6z" fill="#CC2BDD" stroke="none" />
  </FeatureTile>;
}

/** Gim: recognizable gamepad silhouette with D-pad and buttons. */
export function GimIcon(props: IconProps) {
  return <FeatureTile {...props} label="Gim - permainan bahasa">
    <path d="M13 18.5c-3.7.2-6.1 3.5-6.8 7.5l-1 7c-.5 3.4 3.1 5.9 6 3.9l6.3-4.8h13l6.3 4.8c2.9 2 6.5-.5 6-3.9l-1-7c-.7-4-3.1-7.3-6.8-7.5z" fill="white" stroke="none" />
    <path d="M14 23.5v9M9.5 28h9" stroke="#2769FA" strokeWidth="3.2" />
    <circle cx="32" cy="25" r="2.2" fill="#8333ED" stroke="none" />
    <circle cx="36.5" cy="29" r="2.2" fill="#8333ED" stroke="none" />
    <circle cx="27.5" cy="29" r="2.2" fill="#8333ED" stroke="none" />
    <path d="m24 8 1.8 3.8 4.2.6-3 2.9.7 4.1L24 17.5l-3.7 1.9.7-4.1-3-2.9 4.2-.6z" fill="white" stroke="none" />
  </FeatureTile>;
}

/** Jalur Cerdas: ascending milestones and an aspirational destination. */
export function JalurCerdasIcon(props: IconProps) {
  return <FeatureTile {...props} label="Jalur Cerdas - perjalanan belajar">
    <rect x="7" y="30" width="10" height="10" rx="1.2" fill="white" stroke="none" />
    <rect x="18" y="23" width="10" height="17" rx="1.2" fill="white" stroke="none" />
    <rect x="29" y="15" width="10" height="25" rx="1.2" fill="white" stroke="none" />
    <path d="M29 15V7m0 1 12 4.5-12 4.5" fill="white" stroke="white" />
  </FeatureTile>;
}

/** BIGT: a structured assessment checklist with a completion badge. */
export function BigtIcon(props: IconProps) {
  return <FeatureTile {...props} label="BIGT - tes dan evaluasi">
    <rect x="11" y="8" width="27" height="33" rx="4" fill="white" stroke="none" />
    {[17, 24, 31].map(y => <g key={y}>
      <rect x="15" y={y - 3} width="6" height="6" rx="1" fill="#3970FA" stroke="none" />
      <path d={`m16.4 ${y} 1.4 1.4 2.3-2.8`} stroke="white" strokeWidth="1.3" />
      <path d={`M24 ${y - 1}h9`} stroke="#6540EE" strokeWidth="2" />
    </g>)}
    <circle cx="35" cy="35" r="9" fill="white" stroke="none" />
    <path d="m30.5 35 3 3 6-6" stroke="#AA2BE8" strokeWidth="3.1" />
  </FeatureTile>;
}

export const FEATURE_ICONS = {
  jumpa: JumpaIcon,
  nara: NaraIcon,
  aksara: AksaraIcon,
  "toko-karya": TokoKaryaIcon,
  gim: GimIcon,
  "jalur-cerdas": JalurCerdasIcon,
  bigt: BigtIcon,
} as const;
