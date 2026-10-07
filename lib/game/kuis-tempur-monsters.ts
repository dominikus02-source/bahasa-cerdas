export type KuisTempurMonsterId = "korog" | "korog-perang" | "golem-batu" | "korog-bayangan";

export type KuisTempurMonster = {
  id: KuisTempurMonsterId;
  name: string;
  role: string;
  runtimeUrl: string;
  accent: string;
};

const MONSTER_BASE = "/game/kuis-tempur/characters/monsters";

export const KUIS_TEMPUR_MONSTERS: KuisTempurMonster[] = [
  { id: "korog", name: "Korog", role: "Monster Hutan", runtimeUrl: `${MONSTER_BASE}/korog.png`, accent: "#84cc16" },
  { id: "korog-perang", name: "Korog Perang", role: "Korog Elite", runtimeUrl: `${MONSTER_BASE}/korog-perang.png`, accent: "#f97316" },
  { id: "golem-batu", name: "Golem Batu", role: "Penjaga Reruntuhan", runtimeUrl: `${MONSTER_BASE}/golem-batu.png`, accent: "#38bdf8" },
  { id: "korog-bayangan", name: "Korog Bayangan", role: "Monster Kegelapan", runtimeUrl: `${MONSTER_BASE}/korog-bayangan.png`, accent: "#c084fc" },
];

export function getKuisTempurMonster(value: string | null | undefined) {
  return KUIS_TEMPUR_MONSTERS.find((monster) => monster.id === value) || KUIS_TEMPUR_MONSTERS[0];
}
