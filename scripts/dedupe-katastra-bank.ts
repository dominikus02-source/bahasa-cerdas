/**
 * Sprint 7 — Hapus baris soal duplikat di app/api/katastra/questions/route.ts
 * (keep-first per teks soal yang dinormalisasi). Setiap entri = satu baris.
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const file = resolve(__dirname, "../app/api/katastra/questions/route.ts");
const src = readFileSync(file, "utf8");
const lines = src.split("\n");

const seen = new Set<string>();
let removed = 0;
let total = 0;
const out = lines.map((l) => {
  if (!l.includes('text: "') || !l.includes("correct:")) return l;
  total++;
  const m = l.match(/text: "([^"]*)"/);
  const key = m ? m[1].trim().toLowerCase() : l;
  if (seen.has(key)) {
    removed++;
    return null; // drop line
  }
  seen.add(key);
  return l;
}).filter((l): l is string => l !== null);

writeFileSync(file, out.join("\n"));
console.log(`Katastra: ${total} baris soal → ${total - removed} unik (${removed} duplikat dihapus)`);
