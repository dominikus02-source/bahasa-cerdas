import React, { useId } from "react";

const Gradient = ({ id }: { id: string }) => (
  <defs>
    <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#14b8a6" /> {/* warna-izin: gradasi merek BahasaCerdas */}
      <stop offset="50%" stopColor="#3b82f6" /> {/* warna-izin: gradasi merek BahasaCerdas */}
      <stop offset="100%" stopColor="#8b5cf6" /> {/* warna-izin: gradasi merek BahasaCerdas */}
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
    <rect width="48" height="48" rx="12" fill={`url(#${gradientId})`} />
    <path d="M14 16h12v10H14z" fill="white" />
    <path d="M28 18l8 4-8 4v-8z" fill="white" />
    <circle cx="18" cy="20" r="2" fill={`url(#${gradientId})`} />
    <circle cx="22" cy="21" r="1.5" fill={`url(#${gradientId})`} />
  </svg>
  );
};

export const NaraIcon = ({ size = 40, className }: IconProps) => {
  const gradientId = useId();
  return (
  <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
    <Gradient id={gradientId} />
    <rect width="48" height="48" rx="12" fill={`url(#${gradientId})`} />
    <path d="M14 16a10 10 0 0 1 20 0v8a10 10 0 0 1-20 0v-8z" fill="white" />
    <circle cx="20" cy="20" r="1.5" fill={`url(#${gradientId})`} />
    <circle cx="28" cy="20" r="1.5" fill={`url(#${gradientId})`} />
    <path d="M20 24q4 3 8 0" stroke={`url(#${gradientId})`} strokeWidth="1.5" fill="none" />
    <path d="M32 14l2-2m0 0l2 2m-2-2v4" stroke="white" strokeWidth="1.5" />
  </svg>
  );
};

export const AksaraIcon = ({ size = 40, className }: IconProps) => {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
      <defs><linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#FB7185" /><stop offset="100%" stopColor="#DC2626" /></linearGradient></defs>
      <rect width="48" height="48" rx="12" fill={`url(#${gradientId})`} />
      <path d="M10 21.5c4-2.5 8-2.5 14 0v15c-6-2.5-10-2.5-14 0v-15Z" fill="white" />
      <path d="M38 21.5c-4-2.5-8-2.5-14 0v15c6-2.5 10-2.5 14 0v-15Z" fill="white" />
      <path d="M24 21.5v15" stroke="#F97373" strokeWidth="1.5" />
      <path d="m29 10 2.5 1.5-8 13-2.5-1.5 8-13Z" fill="white" />
      <path d="m29 10 2.5 1.5 1.5-2.5-2.5-1.5L29 10Z" fill="white" />
      <path d="m21 23 2.5 1.5-3.5 1 1-2.5Z" fill="white" />
    </svg>
  );
};

export const TokoKaryaIcon = ({ size = 40, className }: IconProps) => {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill={`url(#${gradientId})`} />
      <path d="M12 18.5 24 13l12 5.5v17H12v-17Z" fill="white" />
      <path d="M12 18.5 24 24l12-5.5M24 24v11.5" stroke="#6366F1" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m34 8 .9 2.3 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.3Z" fill="#FDE68A" />
      <circle cx="35" cy="30" r="5" fill="#FDE68A" />
      <path d="m35 26.8 1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3 1-2Z" fill="#7C3AED" />
    </svg>
  );
};

export const GimIcon = ({ size = 40, className }: IconProps) => {
  const gradientId = useId();
  return (
  <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
    <Gradient id={gradientId} />
    <rect width="48" height="48" rx="12" fill={`url(#${gradientId})`} />
    <path d="M14 22h20a6 6 0 0 1 6 6v4a4 4 0 0 1-4 4h-2l-2-3h-8l-2 3h-2a4 4 0 0 1-4-4v-4a6 6 0 0 1 6-6z" fill="white" />
    <circle cx="20" cy="28" r="1.5" fill={`url(#${gradientId})`} />
    <circle cx="24" cy="26" r="1" fill={`url(#${gradientId})`} />
    <circle cx="28" cy="28" r="1.5" fill={`url(#${gradientId})`} />
    <path d="M18 18h12v4H18z" fill="white" opacity="0.9" />
  </svg>
  );
};

export const JalurCerdasIcon = ({ size = 40, className }: IconProps) => {
  const gradientId = useId();
  return (
  <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
    <Gradient id={gradientId} />
    <rect width="48" height="48" rx="12" fill={`url(#${gradientId})`} />
    <path d="M14 34h6v-6h6v-6h6v-6h6" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M28 14h8v6h-8z" fill="white" />
  </svg>
  );
};

export const BigtIcon = ({ size = 40, className }: IconProps) => {
  const gradientId = useId();
  return (
  <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
    <Gradient id={gradientId} />
    <rect width="48" height="48" rx="12" fill={`url(#${gradientId})`} />
    <path d="M16 14h16v20H16z" fill="white" />
    <path d="M20 20h8M20 24h8M20 28h5" stroke={`url(#${gradientId})`} strokeWidth="1.5" />
    <circle cx="32" cy="30" r="4" fill="white" />
    <path d="M30 30l1.5 1.5L34 29" stroke={`url(#${gradientId})`} strokeWidth="1.5" fill="none" />
  </svg>
  );
};


export const MainBersamaIcon = ({ size = 40, className }: IconProps) => {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
      <Gradient id={gradientId} />
      <rect width="48" height="48" rx="12" fill={`url(#${gradientId})`} />
      <circle cx="18" cy="18" r="5" fill="white" />
      <circle cx="30" cy="18" r="5" fill="white" />
      <path d="M8 35c0-6 4-10 10-10s10 4 10 10v2H8v-2z" fill="white" />
      <path d="M20 35c0-6 4-10 10-10s10 4 10 10v2H20v-2z" fill="white" opacity="0.82" />
      <path d="M21 22h6m-3-3v6" stroke={`url(#${gradientId})`} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
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
