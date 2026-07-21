// Emoji are never rendered in the Arena interface.
//
// They are sized and styled by the operating system, so the same screen looks
// different on iOS, Android and Windows, and their colours cannot be brought in
// line with the palette. Using them as icons is the quickest way to make a
// product look cheap — a standing instruction from the product owner.
//
// Learning units do carry an emoji in the database. That value is allowed, but
// only as a lookup key in components/arena/UnitIcon.tsx, which maps it to a
// real vector icon that inherits the surrounding size and colour.
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F900}-\u{1F9FF}]/u;

// The one file permitted to contain emoji, because there they are keys.
const KEY_MAP = "components/arena/UnitIcon.tsx";

// Content parsers are exempt: seeded lesson material marks correct and wrong
// examples with "✓ " and "✗ " prefixes, and these files match those markers to
// decide how to render a line. The glyphs are data being read, not glyphs being
// drawn — the parser turns them into styled components.
const PARSER_EXEMPT = ["app/arena/jalur-cerdas/[unitId]/belajar/page.tsx"];

const ROOTS = ["app/arena", "components/arena", "app/(dashboard)/murid"];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".tsx") || full.endsWith(".ts")) out.push(full);
  }
  return out;
}

let fail = 0;
const offenders: string[] = [];

for (const root of ROOTS) {
  for (const file of walk(join(process.cwd(), root))) {
    const rel = file.slice(process.cwd().length + 1);
    if (rel === KEY_MAP || PARSER_EXEMPT.includes(rel)) continue;
    const src = readFileSync(file, "utf8");
    src.split("\n").forEach((line, i) => {
      if (EMOJI.test(line)) offenders.push(`${rel}:${i + 1}  ${line.trim().slice(0, 70)}`);
    });
  }
}

if (offenders.length > 0) {
  fail++;
  console.log("FAIL  emoji ditemukan di UI murid:");
  offenders.forEach((o) => console.log("        " + o));
} else {
  console.log("PASS  tidak ada emoji dirender di UI Arena & dasbor murid");
}

// The key map must still exist and still resolve to real icons, otherwise the
// rule above is being satisfied by having deleted the icons entirely.
const map = readFileSync(join(process.cwd(), KEY_MAP), "utf8");
const ok = (label: string, cond: boolean) => {
  if (!cond) fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
};
ok("UnitIcon memetakan emoji ke ikon lucide", /from "lucide-react"/.test(map));
ok("UnitIcon punya fallback ikon nyata", /BookOpen className=\{c\}/.test(map));
ok(
  "kartu belajar Arena memakai UnitIcon",
  /<UnitIcon/.test(readFileSync(join(process.cwd(), "app/arena/page.tsx"), "utf8"))
);

console.log(fail === 0 ? "\nSEMUA LULUS" : `\n${fail} GAGAL`);
process.exit(fail === 0 ? 0 : 1);
