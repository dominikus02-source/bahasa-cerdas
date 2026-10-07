import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const packageJson = JSON.parse(read("package.json"));
const server = read("game-server/src/kuis-tempur-arena.ts");
const socketServer = read("game-server/src/server.ts");
const arena = read("components/game/KuisTempurArena.tsx");
const phaser = read("components/game/KuisTempurPhaserWorld.tsx");
const audio = read("lib/game/kuis-tempur-audio.ts");
const kuisTempurCharacters = read("lib/game/kuis-tempur-characters.ts");
const hub = read("components/game/KuisTempurHub.tsx");
const bridgeRoute = read("app/api/game/kuis-tempur/server/route.ts");
const guruKuisTempurRoute = read("app/(dashboard)/guru/game/kuis-tempur/page.tsx");
const guruGameHub = read("app/(dashboard)/guru/game/page.tsx");

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
check("Arga premium memakai 3 directional spritesheet", phaser.includes("sheet-char-arga-walk-down.png") && phaser.includes("sheet-char-arga-walk-side.png") && phaser.includes("sheet-char-arga-walk-up.png"));
check("Arga walk animation memakai 8 frame", phaser.includes("ARGA_FRAME_COUNT = 8") && phaser.includes("generateFrameNumbers"));
check("Arga direction mengikuti vektor gerak", phaser.includes("syncArgaMovement") && phaser.includes('direction = "side"') && phaser.includes('direction = "up"') && phaser.includes('direction = "down"'));
check("human multiplayer memakai characterId roster", phaser.includes("getKuisTempurCharacter(entity.characterId)") && server.includes('characterId: player.characterId || "arga"'));
check("hasil match punya winner spotlight + podium + hasil pribadi", arena.includes("Juara Arena") && arena.includes("podiumRows") && arena.includes("HASIL KAMU") && arena.includes("MAIN LAGI"));
check("MAIN LAGI memakai true arena rematch, bukan keluar room", arena.includes("requestRematch") && arena.includes("gameSocket.arenaRematch") && arena.includes("onArenaRematchStatus"));
check("server rematch vote threshold 60% dengan minimum 2", server.includes("Math.ceil(totalCount * 0.6)") && server.includes("requiredCount"));
check("server membatalkan stale cleanup sebelum rematch", server.includes("clearTimeout(match.cleanupTimer)") && server.includes("matches.get(match.room.code) !== match"));
check("KO feed berasal dari authoritative arena-ko", server.includes('emit("arena-ko"') && arena.includes("onArenaKo") && arena.includes("killFeed"));
check("custom SFX mencakup core combat loop", ["correct", "wrong", "shot", "hit", "ko", "respawn", "countdown", "finalRush", "victory"].every((name) => audio.includes(`"${name}"`)));
check("audio punya classroom mute control", arena.includes("toggleSound") && arena.includes("VolumeX") && audio.includes("setMuted"));
check("landscape phone punya compact question layout", arena.includes("max-height:620px") && arena.includes("orientation:landscape") && arena.includes("kt-question-panel"));
check("canvas touch tidak scroll halaman", phaser.includes("touch-none"));
check("roster selectable hanya hero authored", ["arga","ki-jaka","bu-ratmi","bu-sari","eyang-kartala","pak-empu"].every((id) => kuisTempurCharacters.includes(`id: "${id}"`)) && kuisTempurCharacters.includes("KUIS_TEMPUR_PLAYABLE_CHARACTERS"));
check("5 NPC authored dimuat sebagai runtime character", ["ki-jaka","bu-ratmi","bu-sari","eyang-kartala","pak-empu"].every((id) => kuisTempurCharacters.includes(id)) && phaser.includes('source === "authored"') && phaser.includes("NPC_RUNTIME_BASE") && phaser.includes("this.load.spritesheet") && phaser.includes("kt-char-${character.id}-idle"));
check("NPC punya animasi runtime idle/run/hit/KO", phaser.includes('visual.heroKind === "npc"') && phaser.includes("kt-npc-${visual.characterId}-") && phaser.includes("interact") && phaser.includes("talk") && phaser.includes("walk"));
check("lobby character select terasa seperti game", hub.includes("PILIH PETARUNGMU") && hub.includes("KARAKTER TERPILIH") && hub.includes("ROSTER KARAKTER") && hub.includes("arenaSelectCharacter"));
check("lobby character select punya carousel + arrow cycling", hub.includes("cycleCharacter") && hub.includes("ChevronLeft") && hub.includes("ChevronRight") && hub.includes("overflow-x-auto"));
check("lobby menegaskan semua karakter stat setara", hub.includes("SEMUA STAT SETARA") && hub.includes("HP SETARA") && hub.includes("DAMAGE SETARA") && hub.includes("SPEED SETARA"));
check("lobby punya compact player strip", hub.includes("PEMAIN DI ROOM") && hub.includes("MENUNGGU") && hub.includes("min-w-[170px]"));
check("lobby phone landscape punya compact game layout", hub.includes("max-height: 520px") && hub.includes("orientation: landscape") && hub.includes("kt-lobby-stage") && hub.includes("kt-room-panel"));
check("route guru Kuis Tempur mengarah ke hub multiplayer canonical", guruKuisTempurRoute.includes('redirect("/arena/game/kuis-tempur")') && !guruKuisTempurRoute.includes("KuisTempurSolo"));
check("card Kuis Tempur guru membuka hub multiplayer canonical", guruGameHub.includes('href: "/arena/game/kuis-tempur"') && guruGameHub.includes("hingga 10 pemain"));
check("server whitelist character selection", socketServer.includes("KUIS_TEMPUR_CHARACTER_IDS") && socketServer.includes("normalizeKuisTempurCharacterId") && socketServer.includes("arena-character-select"));
check("arena snapshot membawa characterId", server.includes("characterId: entity.characterId") && phaser.includes("entity.characterId"));
check("result bridge menerima sampai 10 pemain", bridgeRoute.includes("results.length > 10") && !bridgeRoute.includes("results.length > 2"));
check("persistence code mendukung id per ronde", bridgeRoute.includes("validPersistenceCode") && server.includes("persistenceCode"));
check("Phaser memakai authored hero PNG + monster PNG", phaser.includes("KUIS_TEMPUR_PLAYABLE_CHARACTERS") && phaser.includes("KUIS_TEMPUR_MONSTERS") && phaser.includes("kt-monster-${monster.id}") && !phaser.includes("rpg_runtime_atlas.svg"));
check("weapon rig memakai core + tip + glow", phaser.includes("weaponCore") && phaser.includes("weaponTip") && phaser.includes("ammoGlow"));
check("pointer hover memberi target reticle", phaser.includes("pointermove") && phaser.includes("pickTarget") && phaser.includes("targetRing"));
check("top-3 rank tampil di arena", phaser.includes("rankBadge") && phaser.includes("rank <= 3"));
check("jawaban benar memunculkan energy/combo feedback", phaser.includes("ENERGI +1") && phaser.includes("comboMatch"));
check("server memblokir target disconnected", server.includes("!target.connected") && server.includes("!shooter.connected"));
check("client tidak memilih target disconnected", phaser.includes("entity.connected !== false") && arena.includes("entity.connected !== false"));
check("share link ?join= auto-join room", read("components/game/KuisTempurHub.tsx").includes('params.get("join")') && read("components/game/KuisTempurHub.tsx").includes("gameSocket.joinRoom"));
check("Hub merespons host transfer", read("components/game/KuisTempurHub.tsx").includes("gameSocket.onHostChanged"));
const displayShell = read("components/game/KuisTempurDisplayShell.tsx");
check("landing punya Main Cepat sebagai mode utama", hub.includes("MAIN CEPAT") && hub.includes("CARI LAWAN OTOMATIS") && hub.includes("MODE UTAMA"));
check("multiplayer setup mengikuti mode → karakter → tampilan", hub.includes('phase === "setup"') && hub.includes("PILIH PETARUNG") && hub.includes("LANJUT PILIH TAMPILAN") && hub.includes("openMultiplayerSetup"));
check("landing punya Room Privat tanpa wajib pilih teman", hub.includes("ROOM PRIVAT") && hub.includes("createPrivateRoom"));
check("Main Cepat memakai queue arena publik", hub.includes('gameType: "KUIS_TEMPUR_ARENA"') && socketServer.includes("matchmaking === 'PUBLIC'"));
check("public arena 2-9 memakai auto countdown 12 detik", socketServer.includes("room.autoStartDeadline = Date.now() + 12_000") && socketServer.includes("room.players.size < 2"));
check("public arena 10/10 langsung mulai", socketServer.includes("room.players.size >= MAX_KUIS_TEMPUR_PLAYERS") && socketServer.includes("void startPublicArena(room)"));
check("public arena tidak memakai database room", socketServer.includes("id: `public-arena-${code}`") && socketServer.includes("players: new Map([[identity.sub, player]])"));
check("shared fullscreen shell dipakai Solo + multiplayer", arena.includes("KuisTempurDisplayShell") && read("components/game/KuisTempurSolo.tsx").includes("KuisTempurDisplayShell"));
check("fullscreen opsional punya dua pilihan", displayShell.includes("FULL SCREEN") && displayShell.includes("MAIN BIASA"));
check("portrait hanya memberi overlay ringan", displayShell.includes("Putar HP ke samping untuk bertempur") && displayShell.includes("pointer-events-none"));
check("fullscreen toggle bisa keluar tanpa reset game", displayShell.includes("document.exitFullscreen") && displayShell.includes("fullscreenchange"));
const leaveBlock = socketServer.slice(socketServer.indexOf("function handleLeave"), socketServer.indexOf("let shuttingDown"));
check("server transfer host sebelum player-list", leaveBlock.indexOf("room.hostId = newHost.id") >= 0 && leaveBlock.indexOf("room.hostId = newHost.id") < leaveBlock.indexOf("emit('player-list'"));

const spawnBlock = server.match(/const HUMAN_SPAWNS = \[([\s\S]*?)\n\];/)?.[1] || "";
const spawns = [...spawnBlock.matchAll(/\{ x: (\d+), y: (\d+) \}/g)].map((m) => `${m[1]},${m[2]}`);
check("tepat 10 spawn manusia", spawns.length === 10);
check("10 spawn manusia unik", new Set(spawns).size === 10);

console.log(`\nHasil: ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
