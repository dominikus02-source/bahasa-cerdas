export type KuisTempurCharacterId =
  | "arga"
  | "ki-jaka"
  | "bu-ratmi"
  | "bu-sari"
  | "eyang-kartala"
  | "bagas"
  | "pak-warsa"
  | "pendaki"
  | "pak-empu";

export type KuisTempurCharacter = {
  id: KuisTempurCharacterId;
  name: string;
  role: string;
  source: "arga" | "runtime-atlas" | "npc-atlas";
  atlasUrl?: string;
  frame?: { x: number; y: number; width: number; height: number };
  previewUrl?: string;
  accent: string;
};

export const DEFAULT_KUIS_TEMPUR_CHARACTER_ID: KuisTempurCharacterId = "arga";

export const KUIS_TEMPUR_CHARACTERS: KuisTempurCharacter[] = [
  {
    id: "arga",
    name: "Arga",
    role: "Pendekar",
    source: "arga",
    previewUrl: "/game/rpg/characters/ARGA_MASTER_CHARACTER_REFERENCE.png",
    accent: "#f59e0b",
  },
  {
    id: "ki-jaka",
    name: "Ki Jaka",
    role: "Kepala Desa",
    source: "runtime-atlas",
    atlasUrl: "/game/rpg/visual/rpg_runtime_atlas.svg",
    frame: { x: 0, y: 0, width: 240, height: 160 },
    accent: "#60a5fa",
  },
  {
    id: "bu-ratmi",
    name: "Bu Ratmi",
    role: "Peramu",
    source: "runtime-atlas",
    atlasUrl: "/game/rpg/visual/rpg_runtime_atlas.svg",
    frame: { x: 240, y: 0, width: 240, height: 160 },
    accent: "#f472b6",
  },
  {
    id: "bu-sari",
    name: "Bu Sari",
    role: "Pustakawan",
    source: "runtime-atlas",
    atlasUrl: "/game/rpg/visual/rpg_runtime_atlas.svg",
    frame: { x: 480, y: 0, width: 240, height: 160 },
    accent: "#34d399",
  },
  {
    id: "eyang-kartala",
    name: "Eyang Kartala",
    role: "Tetua",
    source: "runtime-atlas",
    atlasUrl: "/game/rpg/visual/rpg_runtime_atlas.svg",
    frame: { x: 720, y: 0, width: 240, height: 160 },
    accent: "#a78bfa",
  },
  {
    id: "bagas",
    name: "Bagas",
    role: "Penjelajah",
    source: "npc-atlas",
    atlasUrl: "/game/rpg/visual/rpg_npc_atlas.svg",
    frame: { x: 0, y: 0, width: 240, height: 240 },
    accent: "#22d3ee",
  },
  {
    id: "pak-warsa",
    name: "Pak Warsa",
    role: "Petani",
    source: "npc-atlas",
    atlasUrl: "/game/rpg/visual/rpg_npc_atlas.svg",
    frame: { x: 240, y: 0, width: 240, height: 240 },
    accent: "#84cc16",
  },
  {
    id: "pendaki",
    name: "Pendaki",
    role: "Penjelajah Gunung",
    source: "npc-atlas",
    atlasUrl: "/game/rpg/visual/rpg_npc_atlas.svg",
    frame: { x: 480, y: 0, width: 240, height: 240 },
    accent: "#fb923c",
  },
  {
    id: "pak-empu",
    name: "Pak Empu",
    role: "Pandai Besi",
    source: "npc-atlas",
    atlasUrl: "/game/rpg/visual/rpg_npc_atlas.svg",
    frame: { x: 720, y: 0, width: 240, height: 240 },
    accent: "#facc15",
  },
];

const CHARACTER_IDS = new Set<KuisTempurCharacterId>(
  KUIS_TEMPUR_CHARACTERS.map((character) => character.id)
);

export function normalizeKuisTempurCharacterId(
  value: string | null | undefined
): KuisTempurCharacterId {
  return CHARACTER_IDS.has(value as KuisTempurCharacterId)
    ? (value as KuisTempurCharacterId)
    : DEFAULT_KUIS_TEMPUR_CHARACTER_ID;
}

export function getKuisTempurCharacter(value: string | null | undefined) {
  const id = normalizeKuisTempurCharacterId(value);
  return KUIS_TEMPUR_CHARACTERS.find((character) => character.id === id)!;
}
