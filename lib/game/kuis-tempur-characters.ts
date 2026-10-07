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
  source: "arga" | "authored" | "legacy";
  previewUrl?: string;
  runtimeUrl?: string;
  accent: string;
  selectable?: boolean;
};

export const DEFAULT_KUIS_TEMPUR_CHARACTER_ID: KuisTempurCharacterId = "arga";

const HERO_BASE = "/game/kuis-tempur/characters/heroes";

export const KUIS_TEMPUR_CHARACTERS: KuisTempurCharacter[] = [
  {
    id: "arga",
    name: "Arga",
    role: "Pendekar",
    source: "arga",
    previewUrl: `${HERO_BASE}/arga.png`,
    accent: "#f59e0b",
    selectable: true,
  },
  {
    id: "ki-jaka",
    name: "Ki Jaka",
    role: "Tetua Desa",
    source: "authored",
    previewUrl: `${HERO_BASE}/ki-jaka.png`,
    runtimeUrl: `${HERO_BASE}/ki-jaka.png`,
    accent: "#60a5fa",
    selectable: true,
  },
  {
    id: "bu-ratmi",
    name: "Bu Ratmi",
    role: "Penjaga Warung",
    source: "authored",
    previewUrl: `${HERO_BASE}/bu-ratmi.png`,
    runtimeUrl: `${HERO_BASE}/bu-ratmi.png`,
    accent: "#f472b6",
    selectable: true,
  },
  {
    id: "bu-sari",
    name: "Bu Sari",
    role: "Guru Desa",
    source: "authored",
    previewUrl: `${HERO_BASE}/bu-sari.png`,
    runtimeUrl: `${HERO_BASE}/bu-sari.png`,
    accent: "#34d399",
    selectable: true,
  },
  {
    id: "eyang-kartala",
    name: "Eyang Kartala",
    role: "Penjaga Hutan",
    source: "authored",
    previewUrl: `${HERO_BASE}/eyang-kartala.png`,
    runtimeUrl: `${HERO_BASE}/eyang-kartala.png`,
    accent: "#a78bfa",
    selectable: true,
  },
  {
    id: "pak-empu",
    name: "Pak Empu",
    role: "Pandai Besi",
    source: "authored",
    previewUrl: `${HERO_BASE}/pak-empu.png`,
    runtimeUrl: `${HERO_BASE}/pak-empu.png`,
    accent: "#facc15",
    selectable: true,
  },
  // Legacy IDs stay recognizable for old persisted rooms, but are no longer
  // selectable until authored runtime art exists at the same quality bar.
  { id: "bagas", name: "Bagas", role: "Penjelajah", source: "legacy", accent: "#22d3ee", selectable: false },
  { id: "pak-warsa", name: "Pak Warsa", role: "Petani", source: "legacy", accent: "#84cc16", selectable: false },
  { id: "pendaki", name: "Pendaki", role: "Penjelajah Gunung", source: "legacy", accent: "#fb923c", selectable: false },
];

export const KUIS_TEMPUR_PLAYABLE_CHARACTERS = KUIS_TEMPUR_CHARACTERS.filter(
  (character) => character.selectable !== false
);

const PLAYABLE_IDS = new Set<KuisTempurCharacterId>(
  KUIS_TEMPUR_PLAYABLE_CHARACTERS.map((character) => character.id)
);

export function normalizeKuisTempurCharacterId(
  value: string | null | undefined
): KuisTempurCharacterId {
  return PLAYABLE_IDS.has(value as KuisTempurCharacterId)
    ? (value as KuisTempurCharacterId)
    : DEFAULT_KUIS_TEMPUR_CHARACTER_ID;
}

export function getKuisTempurCharacter(value: string | null | undefined) {
  const id = normalizeKuisTempurCharacterId(value);
  return KUIS_TEMPUR_CHARACTERS.find((character) => character.id === id)!;
}
