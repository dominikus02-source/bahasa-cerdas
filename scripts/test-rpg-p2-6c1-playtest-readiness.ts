/**
 * P2.6C.1 regression coverage for founder-playtest blockers found in runtime
 * audit. This tests the actual localStorage adapter; it does not pretend to
 * replace the authenticated browser journey.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createInitialGameState } from "../src/game/rpg/core/game-state";
import { createLocalStoragePersistence } from "../src/game/rpg/core/persistence";
import { createDefaultPlayer } from "../src/game/rpg/player/player-state";

const ROOT = process.cwd();
let passed = 0;
let failed = 0;

function check(name: string, condition: boolean): void {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${name}`);
  } else {
    failed += 1;
    console.log(`  ❌ ${name}`);
  }
}

function source(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function installStorage() {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
  };
  return store;
}

function validState(playerId: string, quest: { main: number; kills: number; flowers: number }) {
  const state = createInitialGameState(playerId);
  const player = createDefaultPlayer(playerId, "Founder");
  return {
    ...state,
    player: {
      ...player,
      position: { x: 12 / 46, y: 19 / 36 },
    },
    world: {
      mapId: "map.desa",
      tiles: { width: 1, height: 1, tiles: [] },
      entities: [],
      interactions: [],
    },
    quest,
    gold: 42,
    goldLedger: [{ id: "battle-1", delta: 12, reason: "battle-victory" }],
  };
}

console.log("\n💾 P2.6C.1 local preview persistence");
{
  installStorage();
  const persist = createLocalStoragePersistence("founder-playtest");
  check("quest progress 1/3 survives save and reload", (() => {
    persist.save(validState("founder-playtest", { main: 1, kills: 1, flowers: 0 }) as never);
    const restored = persist.load();
    return restored?.quest?.main === 1 && restored.quest.kills === 1 && restored.gold === 42;
  })());
  check("quest completion survives repeated save and reload", (() => {
    persist.save(validState("founder-playtest", { main: 2, kills: 3, flowers: 0 }) as never);
    persist.save(validState("founder-playtest", { main: 2, kills: 3, flowers: 0 }) as never);
    const restored = persist.load();
    return restored?.quest?.main === 2 && restored.quest.kills === 3 && restored.goldLedger?.length === 1;
  })());
}

console.log("\n🛡️ P2.6C.1 corrupted save recovery");
{
  const store = installStorage();
  const key = "bahasacerdas.rpg.save.founder-playtest";
  const persist = createLocalStoragePersistence("founder-playtest");
  store.set(key, "{not-json");
  check("invalid JSON is ignored", persist.load() === null && !persist.exists());

  const state = validState("founder-playtest", { main: 1, kills: 1, flowers: 0 });
  persist.save(state as never);
  const partial = JSON.parse(store.get(key)!);
  delete partial.player.stats;
  store.set(key, JSON.stringify(partial));
  check("partial player state is cleared before engine boot", persist.load() === null && !persist.exists());

  persist.save(state as never);
  const invalidQuest = JSON.parse(store.get(key)!);
  invalidQuest.world.quest = { main: "complete", kills: -1, flowers: 0 };
  store.set(key, JSON.stringify(invalidQuest));
  check("malformed quest state is cleared before engine boot", persist.load() === null && !persist.exists());

  persist.save(state as never);
  const crossPlayer = JSON.parse(store.get(key)!);
  crossPlayer.session.playerId = "other-user";
  crossPlayer.player.id = "other-user";
  store.set(key, JSON.stringify(crossPlayer));
  check("cross-player save is rejected", persist.load() === null && !persist.exists());
}

console.log("\n🎮 P2.6C.1 playtest observability");
const gameUi = source("src/game/rpg/ui/RPGGame.tsx");
const questUi = source("src/game/rpg/ui/RPGQuestPanel.tsx");
check("learning-pool readiness is surfaced to the founder", gameUi.includes("setLearningReady(pool.length > 0)") && questUi.includes("Tantangan Bahasa belum tersedia"));
check("preview remains server-gated; slice published premium-only", source("app/arena/game/rpg/preview/page.tsx").includes("canUseRpgFounderPreview") && source("lib/arena/game-registry.ts").includes("premiumOnly: true"));

console.log(`\n📊 Hasil: ${passed} lulus, ${failed} gagal\n`);
process.exit(failed > 0 ? 1 : 0);
