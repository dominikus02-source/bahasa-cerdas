import React from "react";

/** Approved PNG icons: preserved exactly as delivered in Google Drive icons.zip. */
export const BC_ICON_ASSETS = {
  jumpa: "/feature-icons/01_video-meeting.png",
  nara: "/feature-icons/02_ai-chatbot.png",
  aksara: "/feature-icons/03_menulis-buku.png",
  "toko-karya": "/feature-icons/04_belanja-bintang.png",
  gim: "/feature-icons/05_game.png",
  "jalur-cerdas": "/feature-icons/06_level-progres.png",
  bigt: "/feature-icons/07_checklist.png",
  komunitas: "/feature-icons/08_komunitas.png",
} as const;
export type BCIconName = keyof typeof BC_ICON_ASSETS;
type IconProps = { size?: number; className?: string; "aria-hidden"?: boolean | "true" | "false" };
export function BCFeatureIcon({ name, size = 40, className }: IconProps & { name: BCIconName }) {
  return <img src={BC_ICON_ASSETS[name]} alt="" aria-hidden="true" width={size} height={size}
    decoding="async" className={className} style={{ width:size, height:size, objectFit:"contain", flexShrink:0 }} />;
}
export const JumpaIcon = (p:IconProps) => <BCFeatureIcon name="jumpa" {...p} />;
export const NaraIcon = (p:IconProps) => <BCFeatureIcon name="nara" {...p} />;
export const AksaraIcon = (p:IconProps) => <BCFeatureIcon name="aksara" {...p} />;
export const TokoKaryaIcon = (p:IconProps) => <BCFeatureIcon name="toko-karya" {...p} />;
export const GimIcon = (p:IconProps) => <BCFeatureIcon name="gim" {...p} />;
export const JalurCerdasIcon = (p:IconProps) => <BCFeatureIcon name="jalur-cerdas" {...p} />;
export const BigtIcon = (p:IconProps) => <BCFeatureIcon name="bigt" {...p} />;
export const KomunitasIcon = (p:IconProps) => <BCFeatureIcon name="komunitas" {...p} />;
export const FEATURE_ICONS = { jumpa:JumpaIcon, nara:NaraIcon, aksara:AksaraIcon, "toko-karya":TokoKaryaIcon, gim:GimIcon, "jalur-cerdas":JalurCerdasIcon, bigt:BigtIcon, komunitas:KomunitasIcon } as const;
