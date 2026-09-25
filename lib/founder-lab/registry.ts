export type FounderLabStatus = "BUILDING" | "FOUNDER_TEST" | "QA" | "READY" | "PUBLISHED";

export interface FounderLabFeature {
  id: string;
  name: string;
  description: string;
  status: FounderLabStatus;
  version: string;
  previewPath: string;
  owner: string;
  lastUpdated: string;
  focus: string[];
  knownIssues: string[];
  requiresSandbox: boolean;
}

/**
 * Single source of truth for features that are intentionally not part of the
 * normal user-facing navigation yet. Keep this registry small and explicit.
 */
export const FOUNDER_LAB_FEATURES: readonly FounderLabFeature[] = [
  {
    id: "rpg-pendekar-suryakerta",
    name: "Pendekar Suryakerta",
    description: "Founder preview RPG petualangan BahasaCerdas sebelum dipublikasikan.",
    status: "FOUNDER_TEST",
    version: "P2.13",
    previewPath: "/arena/game/rpg",
    owner: "Founder",
    lastUpdated: "2026-09-25",
    focus: [
      "Movement & interaction feel",
      "Camera look-ahead & zoom",
      "Combat impact feedback",
      "Touch controls",
      "Quest dan learning loop",
    ],
    knownIssues: [
      "Atlas produksi standalone belum tersedia; visual masih memakai runtime asset yang sudah terdaftar.",
      "Founder preview belum memakai persistence sandbox terpisah dari state RPG reguler.",
    ],
    requiresSandbox: true,
  },
];

export function getFounderLabFeature(id: string): FounderLabFeature | null {
  return FOUNDER_LAB_FEATURES.find((feature) => feature.id === id) ?? null;
}
