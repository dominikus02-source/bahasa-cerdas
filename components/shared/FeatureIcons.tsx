import React, { useId } from "react";

const Gradient = ({ id }: { id: string }) => (
  <defs>
    <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#14b8a6" />
      <stop offset="50%" stopColor="#3b82f6" />
      <stop offset="100%" stopColor="#8b5cf6" />
    </linearGradient>
  </defs>
);

interface IconProps {
  size?: number;
  className?: string;
}

export const JumpaIcon = ({ size = 40, className }: IconProps) => {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
      <Gradient id={gradientId} />
      <rect width="48" height="48" rx="14" fill={`url(#${gradientId})`} />
      <rect x="12" y="16" width="16" height="12" rx="2" fill="white" />
      <path d="M30 18l8 3.5v7L30 32V18z" fill="white" />
      <circle cx="17" cy="20" r="1.5" fill={`url(#${gradientId})`} />
      <circle cx="22" cy="21.5" r="1" fill={`url(#${gradientId})`} />
    </svg>
  );
};

export const NaraIcon = ({ size = 40, className }: IconProps) => {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
      <Gradient id={gradientId} />
      <rect width="48" height="48" rx="14" fill={`url(#${gradientId})`} />
      <path d="M14 18a10 10 0 0 1 20 0v6a10 10 0 0 1-20 0v-6z" fill="white" />
      <circle cx="20" cy="20" r="1.8" fill={`url(#${gradientId})`} />
      <circle cx="28" cy="20" r="1.8" fill={`url(#${gradientId})`} />
      <path d="M20 25q4 2.5 8 0" stroke={`url(#${gradientId})`} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M32 14l2.5-2.5m0 0L37 14m-2.5-2.5V16" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
};

export const MainBersamaIcon = ({ size = 40, className }: IconProps) => {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
      <Gradient id={gradientId} />
      <rect width="48" height="48" rx="14" fill={`url(#${gradientId})`} />
      <circle cx="18" cy="20" r="4" fill="white" />
      <circle cx="30" cy="20" r="4" fill="white" />
      <path d="M12 32c0-4 3-6 6-6s6 2 6 6" fill="white" />
      <path d="M24 32c0-4 3-6 6-6s6 2 6 6" fill="white" />
    </svg>
  );
};

export const GimIcon = ({ size = 40, className }: IconProps) => {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
      <Gradient id={gradientId} />
      <rect width="48" height="48" rx="14" fill={`url(#${gradientId})`} />
      <path d="M12 24h24a5 5 0 0 1 5 5v3a3 3 0 0 1-3 3h-3l-2-3h-8l-2 3h-3a3 3 0 0 1-3-3v-3a5 5 0 0 1 5-5z" fill="white" />
      <circle cx="20" cy="28" r="1.6" fill={`url(#${gradientId})`} />
      <circle cx="24" cy="26.5" r="1.1" fill={`url(#${gradientId})`} />
      <circle cx="28" cy="28" r="1.6" fill={`url(#${gradientId})`} />
      <rect x="16" y="18" width="16" height="4" rx="1" fill="white" opacity="0.95" />
    </svg>
  );
};

export const JalurCerdasIcon = ({ size = 40, className }: IconProps) => {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
      <Gradient id={gradientId} />
      <rect width="48" height="48" rx="14" fill={`url(#${gradientId})`} />
      <path d="M12 34h6v-6h6v-6h6v-6h6" stroke="white" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 12h8v6h-8z" fill="white" />
    </svg>
  );
};

export const NaraGuruIcon = ({ size = 40, className }: IconProps) => {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
      <Gradient id={gradientId} />
      <rect width="48" height="48" rx="14" fill={`url(#${gradientId})`} />
      <path d="M16 20a8 8 0 0 1 16 0v5a8 8 0 0 1-16 0v-5z" fill="white" />
      <circle cx="21" cy="21" r="1.5" fill={`url(#${gradientId})`} />
      <circle cx="27" cy="21" r="1.5" fill={`url(#${gradientId})`} />
      <path d="M21 25q3 2 6 0" stroke={`url(#${gradientId})`} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M32 16l2-2m0 0l2 2m-2-2v3" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="14" y="30" width="20" height="3" rx="1.5" fill="white" opacity="0.9" />
    </svg>
  );
};

export const AksaraIcon = ({ size = 40, className }: IconProps) => {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
      <Gradient id={gradientId} />
      <rect width="48" height="48" rx="14" fill={`url(#${gradientId})`} />
      <path d="M24 12l10 20H14L24 12z" fill="white" />
      <path d="M20 28h8" stroke={`url(#${gradientId})`} strokeWidth="2" />
    </svg>
  );
};

export const TokoKaryaIcon = ({ size = 40, className }: IconProps) => {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
      <Gradient id={gradientId} />
      <rect width="48" height="48" rx="14" fill={`url(#${gradientId})`} />
      <path d="M16 20h16l-2 12H18l-2-12z" fill="white" />
      <path d="M18 20v-4a6 6 0 0 1 12 0v4" stroke="white" strokeWidth="2" fill="none" />
      <path d="M20 28h8v4H20z" fill={`url(#${gradientId})`} />
    </svg>
  );
};

export const BigtIcon = ({ size = 40, className }: IconProps) => {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
      <Gradient id={gradientId} />
      <rect width="48" height="48" rx="14" fill={`url(#${gradientId})`} />
      <path d="M16 14h16v20H16z" fill="white" />
      <path d="M20 20h8M20 24h8M20 28h5" stroke={`url(#${gradientId})`} strokeWidth="1.5" />
      <circle cx="32" cy="30" r="4" fill="white" />
      <path d="M30 30l1.5 1.5L34 29" stroke={`url(#${gradientId})`} strokeWidth="1.5" fill="none" />
    </svg>
  );
};

export const FEATURE_ICONS = {
  jumpa: JumpaIcon,
  nara: NaraIcon,
  "main-bersama": MainBersamaIcon,
  gim: GimIcon,
  "jalur-cerdas": JalurCerdasIcon,
  "nara-guru": NaraGuruIcon,
  aksara: AksaraIcon,
  "toko-karya": TokoKaryaIcon,
  bigt: BigtIcon,
} as const;
