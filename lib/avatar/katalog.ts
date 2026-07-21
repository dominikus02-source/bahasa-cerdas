// Avatar catalogue.
//
// Three are free so every student can personalise immediately — that first
// small act of ownership is what makes a profile feel like theirs. The rest
// unlock by finishing Jalur Cerdas units, which makes the collection a reason
// to learn rather than decoration.
//
// Deliberately NOT priced in coins: the shop has never recorded a single
// purchase because the median student holds 10 coins against items costing
// 30-1500, and coins today come overwhelmingly from likes and comments rather
// than from learning. Gating on units earned keeps the reward pointed at the
// thing we want more of.

export interface AvatarItem {
  id: string;
  /** Public path — WebP, 320px, ~13KB each. */
  src: string;
  name: string;
  /** Jalur Cerdas units that must be completed. 0 = free for everyone. */
  unlockUnits: number;
}

export const AVATARS: AvatarItem[] = [
  { id: "2", src: "/avatar/2.webp", name: "Biru Bertanduk", unlockUnits: 0 },
  { id: "3", src: "/avatar/3.webp", name: "Si Tunas", unlockUnits: 0 },
  { id: "4", src: "/avatar/4.webp", name: "Merah Ceria", unlockUnits: 0 },
  { id: "5", src: "/avatar/5.webp", name: "Hijau Pemberani", unlockUnits: 1 },
  { id: "6", src: "/avatar/6.webp", name: "Kuning Riang", unlockUnits: 3 },
  { id: "7", src: "/avatar/7.webp", name: "Lumut Berbulu", unlockUnits: 5 },
  { id: "8", src: "/avatar/8.webp", name: "Jingga Bertaring", unlockUnits: 10 },
  { id: "9", src: "/avatar/9.webp", name: "Ungu Bermata Satu", unlockUnits: 15 },
  { id: "10", src: "/avatar/10.webp", name: "Pirus Melambai", unlockUnits: 20 },
];

export const FREE_AVATARS = AVATARS.filter((a) => a.unlockUnits === 0);

export function isAvatarUnlocked(avatar: AvatarItem, completedUnits: number): boolean {
  return completedUnits >= avatar.unlockUnits;
}

/** True when the path points at one of our catalogue files. */
export function isCatalogAvatar(src: string | null | undefined): boolean {
  return !!src && AVATARS.some((a) => a.src === src);
}

export function findAvatar(src: string | null | undefined): AvatarItem | undefined {
  return AVATARS.find((a) => a.src === src);
}

/** The next avatar a student can work toward, for nudging them onward. */
export function nextLockedAvatar(completedUnits: number): AvatarItem | undefined {
  return AVATARS.filter((a) => a.unlockUnits > completedUnits).sort(
    (a, b) => a.unlockUnits - b.unlockUnits
  )[0];
}
