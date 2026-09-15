/**
 * First controlled playable loop for Pendekar Suryakerta.
 *
 * This is configuration only. World geometry, collision, NPC dialogue,
 * encounter definitions, battle rules, rewards, and persistence remain in
 * their existing canonical modules. Keeping these slice choices together
 * prevents UI components from scattering coordinate or enemy assumptions.
 */

export const DESA_VERTICAL_SLICE = {
  mapId: "map.desa" as const,
  spawn: { x: 12, y: 19 },
  questGiverId: "ki",
  /** Exactly three regular Korog encounters for the first quest loop. */
  encounterIds: ["e1", "e2", "e3"] as const,
  requiredKorogWins: 3,
} as const;

export type DesaSliceEncounterId = (typeof DESA_VERTICAL_SLICE.encounterIds)[number];

export function isDesaSliceEncounterId(id: string): id is DesaSliceEncounterId {
  return (DESA_VERTICAL_SLICE.encounterIds as readonly string[]).includes(id);
}
