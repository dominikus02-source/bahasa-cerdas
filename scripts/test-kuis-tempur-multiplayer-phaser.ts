import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const packageJson = JSON.parse(read("package.json"));
const server = read("game-server/src/kuis-tempur-arena.ts");
const socketServer = read("game-server/src/server.ts");
const arena = read("components/game/KuisTempurArena.tsx");
const phaser = read("components/game/KuisTempurPhaserWorld.tsx");

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${label}`);
  } else {
    failed += 1;
    console.error(`  ❌ ${label}`);
  }
}

console.log("\n— KUIS TEMPUR MULTIPLAYER PHASER GATE —");

check("Phaser 4 dependency terkunci", /^\^?4\.2\.1$/.test(String(packageJson.dependencies?.phaser || "")));
check("renderer melakukan dynamic import Phaser (SSR-safe)", phaser.includes('await import("phaser")'));
check("arena React memakai Phaser world", arena.includes("<KuisTempurPhaserWorld"));
check("client world = 1400x840", phaser.includes("const WORLD_W = 1400;") && phaser.includes("const WORLD_H = 840;"));
check("server world = 1400x840", server.includes("const WORLD_W = 1400;") && server.includes("const WORLD_H = 840;"));
check("server max player = 10", socketServer.includes("const MAX_KUIS_TEMPUR_PLAYERS = 10;"));
check("arena engine cap human = 10", server.includes("const MAX_HUMAN_PLAYERS = 10;"));
check("multiplayer utama tidak spawn bot", server.includes("const BOT_COUNT = 0;"));
check("server menolak pemain ke-11", socketServer.includes("room.players.size >= MAX_KUIS_TEMPUR_PLAYERS"));
check("camera mengikuti local hero", phaser.includes("this.cameras.main.startFollow"));
check("visual state diinterpolasi", phaser.includes("Phaser.Math.Linear"));
check("world memakai aset base + modular", phaser.includes("assets/world/base/arena_base_01.png") && phaser.includes("assets/world/trees/") && phaser.includes("assets/world/props/"));
check("living foliage memakai tween", phaser.includes("repeat: -1") && phaser.includes("Sine.inOut"));
check("FINAL RUSH terikat timeLeft <= 30", phaser.includes("timeLeft <= 30"));
check("combat hit punya projectile + impact", phaser.includes("playHit(") && phaser.includes("gameSocket.onArenaHit") && phaser.includes("cameras.main.shake"));
check("answer benar punya local hero pulse", phaser.includes("pulseLocalHero"));
check("pointer arena bisa move atau shoot", phaser.includes("arenaShoot") && phaser.includes("arenaMove"));
check("hero punya state idle/run/attack/hit/KO", phaser.includes("heroRun") && phaser.includes("heroAttack") && phaser.includes("heroHit") && phaser.includes("playKo") && phaser.includes("playRespawn"));
check("top-3 rank tampil di arena", phaser.includes("rankBadge") && phaser.includes("rank <= 3"));
check("jawaban benar memunculkan energy/combo feedback", phaser.includes("ENERGI +1") && phaser.includes("comboMatch"));
check("server memblokir target disconnected", server.includes("!target.connected") && server.includes("!shooter.connected"));
check("client tidak memilih target disconnected", phaser.includes("entity.connected !== false") && arena.includes("entity.connected !== false"));

const spawnBlock = server.match(/const HUMAN_SPAWNS = \[([\s\S]*?)\n\];/)?.[1] || "";
const spawns = [...spawnBlock.matchAll(/\{ x: (\d+), y: (\d+) \}/g)].map((m) => `${m[1]},${m[2]}`);
check("tepat 10 spawn manusia", spawns.length === 10);
check("10 spawn manusia unik", new Set(spawns).size === 10);

console.log(`\nHasil: ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
