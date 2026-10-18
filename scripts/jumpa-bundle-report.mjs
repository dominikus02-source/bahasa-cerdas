#!/usr/bin/env node
/**
 * JUMPA — laporan ukuran bundle klien dari hasil `next build` (Turbopack).
 * Next 16 tidak lagi mencetak "First Load JS", jadi angka dihitung dari
 * manifest build:
 *   awal   = rootMainFiles + entryJSFiles semua segmen rute (layout → page)
 *   lazy   = chunk yang hanya dirujuk (import dinamis) dari chunk khusus rute,
 *            diunduh saat dibutuhkan (mis. masuk panggilan)
 * Ukuran: mentah dan gzip (-9), dalam KB.
 *
 *   node scripts/jumpa-bundle-report.mjs [--json]
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import vm from "node:vm";

const NEXT = path.resolve(".next");
const ROUTES = [
  { label: "/jumpa/[code] (lobby + ruang)", dir: "jumpa/[code]", segs: ["app/layout", "app/jumpa/layout", "app/jumpa/[code]/page"] },
  { label: "/jumpa (beranda)", dir: "jumpa", segs: ["app/layout", "app/jumpa/layout", "app/jumpa/page"] },
  { label: "/guru/kelasku (tombol Mulai JUMPA)", dir: "(dashboard)/guru/kelasku", segs: ["app/layout", "app/(dashboard)/guru/layout", "app/(dashboard)/guru/kelasku/page"] },
  { label: "/ (beranda situs)", dir: "", segs: ["app/layout", "app/page"] },
];

const kb = (n) => Math.round((n / 1024) * 10) / 10;
const sizeCache = new Map();
function size(rel) {
  if (sizeCache.has(rel)) return sizeCache.get(rel);
  const file = path.join(NEXT, rel.replace(/^\/?_next\//, ""));
  if (!fs.existsSync(file)) return { raw: 0, gz: 0 };
  const buf = fs.readFileSync(file);
  const v = { raw: buf.length, gz: zlib.gzipSync(buf, { level: 9 }).length };
  sizeCache.set(rel, v);
  return v;
}
function sum(files) {
  let raw = 0, gz = 0;
  for (const f of files) { const s = size(f); raw += s.raw; gz += s.gz; }
  return { raw, gz, count: files.size ?? files.length };
}
function manifestFor(dir) {
  const file = path.join(NEXT, "server/app", dir, "page_client-reference-manifest.js");
  if (!fs.existsSync(file)) return null;
  const ctx = { globalThis: {} };
  ctx.globalThis.__RSC_MANIFEST = {};
  vm.runInNewContext(fs.readFileSync(file, "utf8"), ctx);
  return Object.values(ctx.globalThis.__RSC_MANIFEST)[0];
}
const CHUNK_RE = /static\/chunks\/[A-Za-z0-9_.~-]+\.js/g;
function referenced(rel) {
  const file = path.join(NEXT, rel);
  if (!fs.existsSync(file)) return [];
  return [...new Set(fs.readFileSync(file, "utf8").match(CHUNK_RE) ?? [])];
}

const build = JSON.parse(fs.readFileSync(path.join(NEXT, "build-manifest.json"), "utf8"));
const root = new Set([...(build.rootMainFiles ?? []), ...(build.polyfillFiles ?? [])]);
const rows = [];
for (const r of ROUTES) {
  const m = manifestFor(r.dir);
  if (!m) { rows.push({ route: r.label, missing: true }); continue; }
  const initial = new Set(root);
  const specific = new Set();
  for (const seg of r.segs) {
    for (const f of m.entryJSFiles[`[project]/${seg}`] ?? []) {
      initial.add(f);
      if (seg.endsWith("/page")) specific.add(f);
    }
  }
  // Import dinamis: telusuri rujukan chunk dari chunk khusus halaman.
  const lazy = new Set();
  const queue = [...specific];
  while (queue.length) {
    const cur = queue.shift();
    for (const ref of referenced(cur)) {
      if (initial.has(ref) || lazy.has(ref)) continue;
      lazy.add(ref);
      queue.push(ref);
    }
  }
  const a = sum(initial), l = sum(lazy);
  rows.push({ route: r.label, initialKB: kb(a.raw), initialGzKB: kb(a.gz), initialChunks: a.count, lazyKB: kb(l.raw), lazyGzKB: kb(l.gz), lazyChunks: l.count });
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  console.log("Rute | JS awal (mentah / gzip) | JS lazy saat dibutuhkan (mentah / gzip)");
  for (const r of rows) {
    if (r.missing) { console.log(`${r.route} | (tidak ada di build)`); continue; }
    console.log(`${r.route} | ${r.initialKB} KB / ${r.initialGzKB} KB (${r.initialChunks} chunk) | ${r.lazyKB} KB / ${r.lazyGzKB} KB (${r.lazyChunks} chunk)`);
  }
}
