import React, { useId } from "react";

interface IconProps {
  size?: number;
  className?: string;
}

const IconTile = ({ id, size, className, children }: IconProps & { id: string; children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none" role="img" aria-hidden="true">
    <defs>
      <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--clr-accent-strong)" />
        <stop offset="42%" stopColor="var(--clr-info)" />
        <stop offset="72%" stopColor="var(--clr-violet)" />
        <stop offset="100%" stopColor="var(--clr-danger)" />
      </linearGradient>
    </defs>
    <rect width="48" height="48" rx="10" fill={`url(#${id})`} />
    {children}
  </svg>
);

export const JumpaIcon = ({ size = 40, className }: IconProps) => {
  const id = useId();
  return <IconTile id={id} size={size} className={className}>
    <rect x="6" y="13" width="35" height="27" rx="4" stroke="white" strokeWidth="2.4" />
    <rect x="27" y="8" width="11" height="9" rx="2" fill="white" />
    <path d="m39 10 4-2v10l-4-2z" fill="white" />
    <circle cx="14" cy="25" r="3" fill="white" /><circle cx="24" cy="22" r="4" fill="white" /><circle cx="34" cy="25" r="3" fill="white" />
    <path d="M9 35v-2a5 5 0 0 1 10 0v2m0 0v-3a5 5 0 0 1 10 0v3m0 0v-2a5 5 0 0 1 10 0v2" fill="white" />
  </IconTile>;
};

export const NaraIcon = ({ size = 40, className }: IconProps) => {
  const id = useId();
  return <IconTile id={id} size={size} className={className}>
    <rect x="10" y="10" width="28" height="25" rx="11" stroke="white" strokeWidth="2.8" />
    <path d="M24 5v5m-2-5a2 2 0 1 1 4 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M8 17h2m28 0h2" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M18 22q2-4 4 0m4 0q2-4 4 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M17 29q7 4 14 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M15 36h14q4 0 4 4H17q-4 0-4-3 0-1 2-1Z" fill="white" />
    <path d="M34 29h8a4 4 0 0 1 4 4v2a4 4 0 0 1-4 4h-3l-4 3v-4a4 4 0 0 1-5-4v-1a4 4 0 0 1 4-4Z" fill="white" />
    <circle cx="36" cy="34" r="1" fill="var(--clr-violet)" /><circle cx="39" cy="34" r="1" fill="var(--clr-violet)" /><circle cx="42" cy="34" r="1" fill="var(--clr-violet)" />
  </IconTile>;
};

export const AksaraIcon = ({ size = 40, className }: IconProps) => {
  const id = useId();
  return <IconTile id={id} size={size} className={className}>
    <path d="M7 18h4v22H7zM37 18h4v22h-4z" fill="white" />
    <path d="M11 18q8-3 13 2 5-5 13-2v20q-8-3-13 2-5-5-13-2V18Z" fill="white" />
    <path d="M24 20v20" stroke="var(--clr-violet)" strokeWidth="1.3" />
    <path d="m24 23 11-17q1-2 3-1l2 1q1 1 0 3L29 27l-6 4 1-8Z" fill="white" />
    <path d="m35 6 3 2" stroke="var(--clr-violet)" strokeWidth="1.2" />
  </IconTile>;
};

export const TokoKaryaIcon = ({ size = 40, className }: IconProps) => {
  const id = useId();
  return <IconTile id={id} size={size} className={className}>
    <path d="M14 13q0-8 10-8t10 8" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
    <path d="M10 14h28l2 20-16-4-16 4 2-20Z" fill="white" />
    <circle cx="17" cy="18" r="2" fill="var(--clr-info)" /><circle cx="31" cy="18" r="2" fill="var(--clr-violet)" />
    <path d="m5 30 12 5 8 7-8 2-12-8Z" fill="white" />
    <circle cx="37" cy="36" r="8" fill="white" />
    <path d="m37 30 1.8 3.8 4.2.6-3 2.9.7 4.2-3.7-2-3.7 2 .7-4.2-3-2.9 4.2-.6Z" fill="var(--clr-danger)" />
  </IconTile>;
};

export const GimIcon = ({ size = 40, className }: IconProps) => {
  const id = useId();
  return <IconTile id={id} size={size} className={className}>
    <path d="m24 5 2.5 5.5 6 .8-4.4 4.2 1 6-5.1-2.8-5.1 2.8 1-6-4.4-4.2 6-.8Z" fill="white" />
    <path d="M10 22q-4 0-5 7l-1 9q0 5 5 5l8-7h14l8 7q5 0 5-5l-1-9q-1-7-5-7H10Z" fill="white" />
    <path d="M13 27v9m-4.5-4.5h9" stroke="var(--clr-info)" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="31" cy="29" r="1.8" fill="var(--clr-violet)" /><circle cx="35" cy="33" r="1.8" fill="var(--clr-violet)" /><circle cx="27" cy="35" r="1.8" fill="var(--clr-violet)" />
  </IconTile>;
};

export const JalurCerdasIcon = ({ size = 40, className }: IconProps) => {
  const id = useId();
  return <IconTile id={id} size={size} className={className}>
    <path d="M6 36h12V28h9V20h9V11" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M31 10h4V5l9 5-9 5v-5" fill="white" />
    <rect x="6" y="31" width="12" height="9" rx="1.5" fill="white" />
    <rect x="18" y="25" width="12" height="15" rx="1.5" fill="white" />
    <rect x="30" y="18" width="12" height="22" rx="1.5" fill="white" />
  </IconTile>;
};

export const BigtIcon = ({ size = 40, className }: IconProps) => {
  const id = useId();
  return <IconTile id={id} size={size} className={className}>
    <rect x="8" y="7" width="28" height="35" rx="4" fill="white" />
    <rect x="12" y="14" width="5" height="5" rx="1" fill="var(--clr-info)" /><path d="m13 16 1.5 1.5L17 14" stroke="white" strokeWidth="1.2" fill="none" />
    <path d="M21 15h10m-10 3h7" stroke="var(--clr-violet)" strokeWidth="1.8" strokeLinecap="round" />
    <rect x="12" y="24" width="5" height="5" rx="1" fill="var(--clr-info)" /><path d="m13 26 1.5 1.5L17 24" stroke="white" strokeWidth="1.2" fill="none" />
    <path d="M21 25h10m-10 3h7" stroke="var(--clr-violet)" strokeWidth="1.8" strokeLinecap="round" />
    <rect x="12" y="34" width="5" height="5" rx="1" fill="var(--clr-info)" /><path d="m13 36 1.5 1.5L17 34" stroke="white" strokeWidth="1.2" fill="none" />
    <circle cx="36" cy="36" r="9" fill="white" /><path d="m32 36 2.5 2.5 5-6" stroke="var(--clr-danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </IconTile>;
};

export const MainBersamaIcon = ({ size = 40, className }: IconProps) => {
  const id = useId();
  return <IconTile id={id} size={size} className={className}>
    <path d="m24 6 1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5Z" fill="white" />
    <path d="m10 14 2 2m24-2-2 2" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <circle cx="24" cy="25" r="6" fill="white" /><circle cx="11" cy="27" r="4" fill="white" /><circle cx="37" cy="27" r="4" fill="white" />
    <path d="M15 41v-4a9 9 0 0 1 18 0v4H15Zm-12-1v-3a8 8 0 0 1 8-8h2a9 9 0 0 0-3 7v4H3Zm30 0v-4a9 9 0 0 0-3-7h2a8 8 0 0 1 8 8v3h-7Z" fill="white" />
  </IconTile>;
};

export const FEATURE_ICONS = {
  jumpa: JumpaIcon,
  nara: NaraIcon,
  aksara: AksaraIcon,
  "toko-karya": TokoKaryaIcon,
  gim: GimIcon,
  "main-bersama": MainBersamaIcon,
  "jalur-cerdas": JalurCerdasIcon,
  bigt: BigtIcon,
} as const;
