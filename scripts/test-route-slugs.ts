/**
 * Route slug guard — mencegah outage 30 Okt 2026.
 *
 * Next.js menolak dua segmen dinamis dengan NAMA BERBEDA pada level yang sama
 * (mis. app/api/x/[id] dan app/api/x/[projectId]). `next build` tetap lolos,
 * tetapi runtime melempar error pada SETIAP request → seluruh situs 500.
 *
 * Tes ini menelusuri app/ dan gagal bila satu direktori memiliki >1 nama slug
 * dinamis ([a], [...a], [[...a]]). Route group "(x)" dan slot "@x" dilebur ke
 * induknya karena tidak menambah segmen URL.
 *
 * Usage: npx tsx scripts/test-route-slugs.ts [appDir]
 */
import { readdirSync, statSync } from "fs";
import { join, resolve } from "path";

const root = resolve(process.argv[2] || join(process.cwd(), "app"));

const dynamicName = (name: string) => {
  const m = /^\[{1,2}(?:\.\.\.)?([^\]]+)\]{1,2}$/.exec(name);
  return m ? m[1] : null;
};
const transparent = (name: string) => /^\(.+\)$/.test(name) || name.startsWith("@");

/** Map URL-level key → set of dynamic slug names seen at that level. */
const levels = new Map<string, Map<string, string[]>>();

function walk(dir: string, urlKey: string) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (!statSync(full).isDirectory() || name === "node_modules") continue;
    if (transparent(name)) { walk(full, urlKey); continue; }
    const slug = dynamicName(name);
    if (slug) {
      const seen = levels.get(urlKey) ?? new Map<string, string[]>();
      seen.set(slug, [...(seen.get(slug) ?? []), full.slice(root.length + 1)]);
      levels.set(urlKey, seen);
      walk(full, `${urlKey}/[*]`);
    } else {
      walk(full, `${urlKey}/${name}`);
    }
  }
}

walk(root, "");
let failed = 0;
let checked = 0;
for (const [level, seen] of levels) {
  checked++;
  if (seen.size > 1) {
    failed++;
    console.log(`  ❌ ${level || "/"}: slug berbeda pada level yang sama → ${[...seen.entries()].map(([s, d]) => `[${s}] (${d.join(", ")})`).join(" vs ")}`);
  }
}
console.log(`\nRoute slug guard: ${checked} level dinamis diperiksa, ${failed} konflik.`);
if (failed) process.exit(1);
console.log("  ✅ Tidak ada konflik nama slug dinamis.");
