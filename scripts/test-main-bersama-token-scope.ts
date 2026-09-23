/**
 * CSS TOKEN-SCOPE REGRESSION (8A.5) — source-level guard.
 *
 * Teacher pages render root `.mb-scope-guru` WITHOUT `.mb-scope`.
 * Design tokens MUST be defined under BOTH selectors, otherwise every
 * `var(--mb-*)` on teacher surfaces resolves to nothing (unstyled UI).
 * Run: npx tsx scripts/test-main-bersama-token-scope.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name} ${detail}`); }
}

const css = readFileSync(join(ROOT, "components/main-bersama/main-bersama.css"), "utf8");
check(
  "token block covers .mb-scope-guru",
  /\.mb-scope,\s*\.mb-scope-guru\s*\{[^}]*--mb-primary:/s.test(css),
);
const m = css.match(/\.mb-scope,\s*\.mb-scope-guru\s*\{([\s\S]*?)\n\}/);
const vars = new Set((m?.[1] ?? "").match(/--mb-[\w-]+(?=\s*:)/g) ?? []);
check("token block defines variables", vars.size >= 40, `got ${vars.size}`);
for (const f of [
  "components/main-bersama/teacher/setup-client.tsx",
  "components/main-bersama/student/game-client.tsx",
  "components/main-bersama/student/join-client.tsx",
]) {
  const src = readFileSync(join(ROOT, f), "utf8");
  const used = new Set([...src.matchAll(/var\((--mb-[\w-]+)/g)].map((x) => x[1]));
  const missing = [...used].filter((v) => !vars.has(v));
  check(`${f}: all tokens resolve`, missing.length === 0, missing.join(","));
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
