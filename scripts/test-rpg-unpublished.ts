/**
 * EMERGENCY VISIBILITY FIX — Pendekar Suryakerta UNPUBLISHED.
 *
 * Membuktikan:
 * 1. RPG tidak muncul di katalog/unggulan/baru (batas registry kanonik).
 * 2. /arena/game/rpg diblokir server-side untuk semua user biasa.
 * 3. Tidak ada gim Arena lain yang terdampak.
 * 4. Source RPG tidak dihapus/diubah (hanya akses yang dijaga).
 * 5. Tidak ada penyembunyian CSS/client-only.
 *
 * Usage: npx tsx scripts/test-rpg-unpublished.ts
 * Exit 0 = SEMUA LULUS, 1 = ada yang gagal.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { GAME_REGISTRY, featuredGame, gameById } from "../lib/arena/game-registry";

const ROOT = process.cwd();
let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function src(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

console.log("\n🔒 Registry — batas kanonik");
const rpg = gameById("rpg");
check("entri rpg ada di registry", !!rpg);
check("rpg.unpublished === true", rpg?.unpublished === true);
check(
  "featuredGame() bukan RPG",
  featuredGame().id !== "rpg",
  `malah ${featuredGame().id}`
);
check("featuredGame() sudah published", !featuredGame().unpublished);
check(
  "tidak ada gim lain yang unpublished",
  GAME_REGISTRY.filter((g) => g.id !== "rpg" && g.unpublished).length === 0
);

console.log("\n🎮 Regresi gim lain");
const kuis = gameById("kuis-tempur");
check("kuis-tempur tetap terdaftar", !!kuis);
check("kuis-tempur tetap published", !kuis?.unpublished);
check(
  "jumlah entri published tidak berkurang selain RPG",
  GAME_REGISTRY.filter((g) => !g.unpublished).length === GAME_REGISTRY.length - 1
);

console.log("\n🖥️ Discovery surfaces (filter sumber)");
const hub = src("components/arena/game-hub/GameHubClient.tsx");
check("GameHubClient memfilter unpublished", hub.includes("!g.unpublished"));
const home = src("components/arena/ArenaHomepage.tsx");
check("ArenaHomepage mengecualikan unpublished", home.includes("!game.unpublished"));
check("ArenaHomepage pakai featuredGame()", home.includes("featuredGame()"));

console.log("\n🛡️ Guard route /arena/game/rpg (server-side)");
const page = src("app/arena/game/rpg/page.tsx");
check("page.tsx BUKAN client component", !page.includes('"use client"'));
check("page.tsx memakai redirect()", page.includes('from "next/navigation"'));
check("page.tsx cek sesi (getUser)", page.includes("getUser"));
check("page.tsx blokir unpublished", page.includes("game.unpublished"));
check(
  "redirect terjadi SEBELUM render (bukan kondisional client)",
  page.indexOf("redirect(") !== -1 &&
    page.indexOf("redirect(") < page.indexOf("return <RpgClient")
);
check("RpgClient.tsx ada (split client utuh)", existsSync(join(ROOT, "app/arena/game/rpg/RpgClient.tsx")));
const client = src("app/arena/game/rpg/RpgClient.tsx");
check("RpgClient tetap render RPGGame (engine utuh)", client.includes("RPGGame"));
check(
  "tidak ada penyembunyian CSS (hidden/display:none untuk rpg)",
  !/rpg.*(hidden|display:\s*none)/i.test(page)
);

console.log("\n📦 Preservasi source RPG (tidak dihapus)");
check("engine UI ada", existsSync(join(ROOT, "src/game/rpg/ui/RPGGame.tsx")));
check("world-state ada", existsSync(join(ROOT, "src/game/rpg/world/world-state.ts")));
check("data maps ada", existsSync(join(ROOT, "src/game/rpg/data/maps.ts")));
const rpgDirs = readdirSync(join(ROOT, "src/game/rpg"));
for (const d of ["world", "rendering", "data", "ui"]) {
  check(`modul RPG ${d}/ utuh`, rpgDirs.includes(d));
}

console.log(`\n📊 Hasil: ${pass} lulus, ${fail} gagal\n`);
process.exit(fail > 0 ? 1 : 0);
