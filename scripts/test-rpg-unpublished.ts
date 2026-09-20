/**
 * P2.8 / P2.10-FREEZE — Pendekar Suryakerta visibility guard.
 *
 * Membuktikan:
 * 1. RPG terdaftar di registry dengan premiumOnly + unpublished (P2.10-FREEZE).
 * 2. RPG TIDAK muncul di discovery (unpublished = true).
 * 3. featuredGame() memilih game published (bukan RPG).
 * 4. Tidak ada gim Arena lain yang terdampak.
 * 5. Source RPG tidak dihapus/diubah (hanya akses yang dijaga).
 * 6. Discovery surfaces memfilter unpublished dengan benar.
 * 7. Founder/admin bypass tersedia di RPG page.
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

console.log("\n🔒 Registry — P2.10-FREEZE state");
const rpg = gameById("rpg");
check("entri rpg ada di registry", !!rpg);
check("rpg premiumOnly tetap aktif", rpg?.premiumOnly === true);
check("rpg unpublished (P2.10-FREEZE)", rpg?.unpublished === true);
check(
  "featuredGame() BUKAN RPG (unpublished di-skip)",
  featuredGame().id !== "rpg",
  `malah ${featuredGame().id}`
);
check("featuredGame() published", !featuredGame().unpublished);
check(
  "hanya RPG yang unpublished",
  GAME_REGISTRY.filter((g) => g.unpublished).length === 1 &&
    GAME_REGISTRY.filter((g) => g.unpublished)[0]?.id === "rpg"
);

console.log("\n🎮 Regresi gim lain");
const kuis = gameById("kuis-tempur");
check("kuis-tempur tetap terdaftar", !!kuis);
check("kuis-tempur tetap published", !kuis?.unpublished);
check(
  "gim lain semua published (hanya RPG unpublished)",
  GAME_REGISTRY.filter((g) => g.id !== "rpg" && g.unpublished).length === 0
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
check("page.tsx memakai play gate Premium", page.includes("requireRpgPlayAccess()"));
check("page.tsx render halaman terkunci untuk non-Premium", page.includes("<RpgLocked"));
check(
  "gate berjalan SEBELUM render gameplay (bukan kondisional client)",
  page.indexOf("requireRpgPlayAccess()") !== -1 &&
    page.indexOf("requireRpgPlayAccess()") < page.indexOf("return <RpgClient")
);
check("RpgClient.tsx ada (split client utuh)", existsSync(join(ROOT, "app/arena/game/rpg/RpgClient.tsx")));
const client = src("app/arena/game/rpg/RpgClient.tsx");
check("RpgClient tetap render RPGGame (engine utuh)", client.includes("RPGGame"));
check(
  "tidak ada penyembunyian CSS (hidden/display:none untuk rpg)",
  !/rpg.*(hidden|display:\s*none)/i.test(page)
);

console.log("\n🔑 Founder/admin bypass (P2.10-FREEZE)");
check("page.tsx cek isFounder/ADMIN bypass", page.includes("isFounder") && page.includes('role === "ADMIN"'));
check("page.tsx bypass unpublished untuk founder/admin", page.includes("PREVIEW_DENIED"));
check("page.tsx render RpgClient saat bypass", page.includes("RpgClient playerId={user.id}"));

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
