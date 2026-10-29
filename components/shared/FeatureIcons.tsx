import React from "react";

const Gradient = () => (
  <defs>
    <linearGradient id="bc-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
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

export const JumpaIcon = ({ size = 40, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
    <Gradient />
    <rect width="48" height="48" rx="12" fill="url(#bc-gradient)" />
    <path d="M14 16h12v10H14z" fill="white" />
    <path d="M28 18l8 4-8 4v-8z" fill="white" />
    <circle cx="18" cy="20" r="2" fill="url(#bc-gradient)" />
    <circle cx="22" cy="21" r="1.5" fill="url(#bc-gradient)" />
  </svg>
);

export const NaraIcon = ({ size = 40, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
    <Gradient />
    <rect width="48" height="48" rx="12" fill="url(#bc-gradient)" />
    <path d="M14 16a10 10 0 0 1 20 0v8a10 10 0 0 1-20 0v-8z" fill="white" />
    <circle cx="20" cy="20" r="1.5" fill="url(#bc-gradient)" />
    <circle cx="28" cy="20" r="1.5" fill="url(#bc-gradient)" />
    <path d="M20 24q4 3 8 0" stroke="url(#bc-gradient)" strokeWidth="1.5" fill="none" />
    <path d="M32 14l2-2m0 0l2 2m-2-2v4" stroke="white" strokeWidth="1.5" />
  </svg>
);

export const AksaraIcon = ({ size = 40, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
    <Gradient />
    <rect width="48" height="48" rx="12" fill="url(#bc-gradient)" />
    <path d="M24 12l10 20H14L24 12z" fill="white" />
    <path d="M20 28h8" stroke="url(#bc-gradient)" strokeWidth="2" />
  </svg>
);

export const TokoKaryaIcon = ({ size = 40, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
    <Gradient />
    <rect width="48" height="48" rx="12" fill="url(#bc-gradient)" />
    <path d="M16 20h16l-2 12H18l-2-12z" fill="white" />
    <path d="M18 20v-4a6 6 0 0 1 12 0v4" stroke="white" strokeWidth="2" fill="none" />
    <path d="M20 28h8v4H20z" fill="url(#bc-gradient)" />
  </svg>
);

export const GimIcon = ({ size = 40, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
    <Gradient />
    <rect width="48" height="48" rx="12" fill="url(#bc-gradient)" />
    <path d="M14 22h20a6 6 0 0 1 6 6v4a4 4 0 0 1-4 4h-2l-2-3h-8l-2 3h-2a4 4 0 0 1-4-4v-4a6 6 0 0 1 6-6z" fill="white" />
    <circle cx="20" cy="28" r="1.5" fill="url(#bc-gradient)" />
    <circle cx="24" cy="26" r="1" fill="url(#bc-gradient)" />
    <circle cx="28" cy="28" r="1.5" fill="url(#bc-gradient)" />
    <path d="M18 18h12v4H18z" fill="white" opacity="0.9" />
  </svg>
);

export const JalurCerdasIcon = ({ size = 40, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
    <Gradient />
    <rect width="48" height="48" rx="12" fill="url(#bc-gradient)" />
    <path d="M14 34h6v-6h6v-6h6v-6h6" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M28 14h8v6h-8z" fill="white" />
  </svg>
);

export const BigtIcon = ({ size = 40, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
    <Gradient />
    <rect width="48" height="48" rx="12" fill="url(#bc-gradient)" />
    <path d="M16 14h16v20H16z" fill="white" />
    <path d="M20 20h8M20 24h8M20 28h5" stroke="url(#bc-gradient)" strokeWidth="1.5" />
    <circle cx="32" cy="30" r="4" fill="white" />
    <path d="M30 30l1.5 1.5L34 29" stroke="url(#bc-gradient)" strokeWidth="1.5" fill="none" />
  </svg>
);

export const FEATURE_ICONS = {
  jumpa: JumpaIcon,
  nara: NaraIcon,
  aksara: AksaraIcon,
  "toko-karya": TokoKaryaIcon,
  gim: GimIcon,
  "jalur-cerdas": JalurCerdasIcon,
  bigt: BigtIcon,
} as const;
