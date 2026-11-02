/**
 * Gate CI (setelah `next build`): bundle publik bebas nama penyedia AI.
 *
 * Semua file di .next/static (JS/CSS yang diunduh browser) dan halaman
 * prerender (.next/server/app/**\/*.html|.rsc|.body) bisa dibaca siapa saja.
 * Gate gagal bila memuat nama penyedia/model AI.
 *
 * Jalankan: npm run build && npm run test:no-ai-provider-bundle
 */
import fs from "node:fs";
import path from "node:path";
import { AI_PROVIDER_NAME_PATTERN } from "../lib/ai/public-ai-sanitize";

const ROOT = path.resolve(__dirname, "..");
const NEXT = path.join(ROOT, ".next");

function walk(dir: string, exts: RegExp, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts, out);
    else if (exts.test(entry.name)) out.push(full);
  }
  return out;
}

if (!fs.existsSync(path.join(NEXT, "static"))) {
  console.error("✗ .next/static tidak ada — jalankan `npm run build` dulu.");
  process.exit(1);
}

const files = [
  ...walk(path.join(NEXT, "static"), /\.(js|css|json|html|txt)$/),
  ...walk(path.join(NEXT, "server", "app"), /\.(html|rsc|body|meta)$/),
];
const hits: string[] = [];
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const re = new RegExp(AI_PROVIDER_NAME_PATTERN.source, "gi");
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    const ctx = text.slice(Math.max(0, i - 50), i + m[0].length + 50).replace(/\s+/g, " ");
    hits.push(`${path.relative(ROOT, file)}: "${m[0]}" … ${ctx}`);
  }
}
console.log(`${files.length} file bundle publik dipindai.`);
if (hits.length) {
  hits.slice(0, 80).forEach((h) => console.error(`  ✗ ${h}`));
  console.error(`\n✗ ${hits.length} nama penyedia AI ditemukan di bundle publik.`);
  process.exit(1);
}
console.log("✓ Bundle publik bebas nama penyedia AI.");
