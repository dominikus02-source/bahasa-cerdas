/**
 * NPC data — data-driven NPC definitions.
 *
 * Rendering/asset keys are data, not code. Dialogue trees are referenced by
 * id and will live with quest/dialogue content in later phases.
 */

export interface RPGNPCDefinition {
  id: string;
  name: string;
  /** Asset key resolved by the renderer. */
  asset: string;
  /** Entry dialogue id for the dialogue system. */
  dialogueId: string;
  /** Position on the home map (normalized). */
  position: { x: number; y: number };
  mapId: string;
}

export const NPCS: RPGNPCDefinition[] = [
  {
    id: "npc.ki-sundi",
    name: "Ki Sundi",
    asset: "npc.elder",
    dialogueId: "dlg.ki-sundi.intro",
    position: { x: 0.5, y: 0.42 },
    mapId: "map.village-square",
  },
  {
    id: "npc.maya",
    name: "Maya",
    asset: "npc.girl",
    dialogueId: "dlg.maya.intro",
    position: { x: 0.62, y: 0.6 },
    mapId: "map.village-square",
  },
];
