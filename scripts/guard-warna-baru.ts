/**
 * GUARD WARNA BARU — tolak hex/rgb/hsl mentah BARU di luar file token.
 *
 * Hanya baris yang DITAMBAHKAN dibanding basis (PR: base branch; push ke
 * main: commit sebelumnya) yang diperiksa, jadi warna lama tidak membuat CI
 * merah — tetapi tidak boleh bertambah. Sumber warna satu-satunya:
 * app/theme/tokens.css (var(--clr-*), var(--bc-*), kelas Tailwind bc-*).
 *
 * Pengecualian:
 *   - Jalur data/kanvas/server di ALLOW (warna gim Phaser, OG image, ekspor PDF).
 *   - Baris dengan komentar `warna-izin: <alasan>` (mis. warna merek pihak ketiga).
 *
 * Jalankan: npm run guard:warna        (GUARD_BASE=<sha|ref> opsional)
 */
import { execFileSync } from "node:child_process";

const TOKEN_FILE = "app/theme/tokens.css";
const EXT = /\.(?:tsx?|jsx?|mjs|css)$/;
const ALLOW: RegExp[] = [
  /^app\/theme\/tokens\.css$/,
  /^scripts\//, /^tests?\//, /^public\//, /^prisma\//, /^game-server\//, /^loadtest\//, /^supabase\//, /^twa\//, /^ops\//,
  /^src\/game\//, /^lib\/game\//, /^lib\/gamification\//, /^lib\/arena-junior\//, /^lib\/arena\/game-registry\.ts$/, /^lib\/cosmetics\.ts$/,
  /^app\/api\//, /opengraph-image\.tsx$/, /(?:^|\/)icon\.tsx$/, /apple-icon\.tsx$/, /\.test\.tsx?$/, /\.d\.ts$/,
  /^tailwind\.config\.ts$/,
];
const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![\w-])/g;
const FUNC = /\b(?:rgba?|hsla?)\(\s*[\d.]/g;
const RAW_TW = /\b(?:bg|text|border|from|via|to|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|rose|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink)-\d{2,3}\b/g;

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).trim();
}
function valid(ref: string | undefined): ref is string {
  if (!ref || /^0+$/.test(ref)) return false;
  try { git(["rev-parse", "--verify", `${ref}^{commit}`]); return true; } catch { return false; }
}
function resolveBase(): string {
  const env = process.env.GUARD_BASE;
  if (valid(env)) {
    // PR: base sha; push: sha sebelum push. Pakai merge-base agar hanya perubahan cabang ini.
    try { return git(["merge-base", env, "HEAD"]); } catch { return env; }
  }
  for (const ref of ["origin/main", "main"]) {
    if (!valid(ref)) continue;
    const mb = git(["merge-base", ref, "HEAD"]);
    if (mb !== git(["rev-parse", "HEAD"])) return mb;
    if (valid("HEAD~1")) return git(["rev-parse", "HEAD~1"]); // HEAD = main → periksa commit terakhir
  }
  throw new Error("Tidak menemukan basis diff (set GUARD_BASE).");
}

const base = resolveBase();
const diff = git(["diff", "-U0", "--no-color", "--diff-filter=AMR", base, "HEAD", "--", "."]);
type Hit = { file: string; line: number; text: string; what: string };
const blocking: Hit[] = [];
const warnings: Hit[] = [];
let file = "";
let lineNo = 0;
for (const raw of diff.split("\n")) {
  if (raw.startsWith("+++ ")) { file = raw.slice(4).replace(/^b\//, ""); continue; }
  const h = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
  if (h) { lineNo = Number(h[1]); continue; }
  if (!raw.startsWith("+") || raw.startsWith("+++")) continue;
  const text = raw.slice(1);
  const n = lineNo++;
  if (!EXT.test(file) || ALLOW.some((re) => re.test(file))) continue;
  if (/warna-izin:/.test(text)) continue;
  const trimmed = text.trim();
  if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;
  const found = [...(text.match(HEX) || []), ...(text.match(FUNC) || [])];
  if (found.length) blocking.push({ file, line: n, text: trimmed.slice(0, 160), what: found.join(", ") });
  const raws = text.match(RAW_TW);
  if (raws) warnings.push({ file, line: n, text: trimmed.slice(0, 160), what: [...new Set(raws)].join(", ") });
}

console.log(`Guard warna — basis ${base.slice(0, 8)}…HEAD`);
if (warnings.length) {
  console.log(`\nPeringatan (tidak menggagalkan): ${warnings.length} baris baru memakai warna Tailwind mentah. Pakai token bc-* (bg-bc-surface, text-bc-text-2, …).`);
  for (const w of warnings.slice(0, 20)) console.log(`  ${w.file}:${w.line}  ${w.what}`);
  if (warnings.length > 20) console.log(`  … +${warnings.length - 20} lagi`);
}
if (blocking.length) {
  console.log(`\nGAGAL: ${blocking.length} baris baru berisi warna mentah di luar ${TOKEN_FILE}:`);
  for (const b of blocking) console.log(`  ${b.file}:${b.line}  [${b.what}]  ${b.text}`);
  console.log(`\nGanti dengan var(--clr-*) / kelas bc-* (lihat docs/PANDUAN_DESAIN_BC.md §0). Warna merek pihak ketiga: tambahkan komentar "warna-izin: <alasan>" di baris itu.`);
  process.exit(1);
}
console.log("\nLULUS: tidak ada warna mentah baru.");
