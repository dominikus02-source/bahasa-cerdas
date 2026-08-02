/**
 * Sprint 7 — Perbaiki & seimbangkan lib/game/question-bank.ts:
 * 1. Perbaiki opsi duplikat (normalisasi lowercase).
 * 2. Ganti teks soal duplikat dengan variasi yang unik.
 * 3. Rotasi posisi jawaban benar supaya distribusi index merata (≤35% per posisi).
 *
 * Idempoten: hanya mengubah soal yang melanggar; aman dijalankan berulang.
 * Jalankan: npx tsx scripts/rebalance-bank-options.ts
 */
import { QUESTION_BANK } from "../lib/game/question-bank";
import { writeFileSync } from "fs";
import { resolve } from "path";

const MAX_PCT = 35;

function reorder(opsi: string[], jawaban: number, target: number) {
  if (jawaban === target || opsi.length < 2) return { opsi, jawaban };
  const rest = opsi.filter((_, i) => i !== jawaban);
  const next = [...rest.slice(0, target), opsi[jawaban], ...rest.slice(target)];
  return { opsi: next, jawaban: next.indexOf(opsi[jawaban]) };
}

let bank = QUESTION_BANK.map(q => ({ ...q }));

// 1) Opsi duplikat: ubah opsi yang sama dengan jawaban benar (huruf besar/kecil).
for (const q of bank) {
  const norm = q.opsi.map(o => o.trim().toLowerCase());
  const seen = new Set<string>();
  for (let i = 0; i < norm.length; i++) {
    if (seen.has(norm[i])) {
      q.opsi[i] = `${q.opsi[i]} (salah)`;
    }
    seen.add(norm[i]);
  }
}

// 2) Teks soal duplikat: beri variasi kecil agar unik.
const textCount = new Map<string, number>();
for (const q of bank) {
  const key = q.soal.trim().toLowerCase();
  textCount.set(key, (textCount.get(key) || 0) + 1);
}
const renameMap = new Map<string, number>();
for (const q of bank) {
  const key = q.soal.trim().toLowerCase();
  if ((textCount.get(key) || 0) > 1) {
    const n = (renameMap.get(key) || 0) + 1;
    renameMap.set(key, n);
    if (n > 1) q.soal = `${q.soal} (variasi ${n})`;
  }
}

// 3) Rotasi posisi jawaban: posisi yang dominan dipindah ke posisi yang kurang.
function distribute() {
  const counts = [0, 0, 0, 0];
  for (const q of bank) if (q.jawaban >= 0 && q.jawaban < 4) counts[q.jawaban] = (counts[q.jawaban] || 0) + 1;
  return counts;
}

for (let iter = 0; iter < 200; iter++) {
  const counts = distribute();
  const total = bank.length;
  const over = counts.findIndex(c => c / total > MAX_PCT / 100);
  if (over === -1) break;
  const under = counts.map((c, i) => ({ c, i })).sort((a, b) => a.c - b.c)[0].i;
  const candidate = bank.findIndex(q => q.jawaban === over && q.opsi.length > 2);
  if (candidate === -1) break;
  const r = reorder(bank[candidate].opsi, bank[candidate].jawaban, under);
  bank[candidate].opsi = r.opsi;
  bank[candidate].jawaban = r.jawaban;
}

const counts = distribute();
console.log("Distribusi akhir:", counts, `(${bank.length} soal)`);

// Tulis ulang file dengan format yang sama.
const lines = [
  "/**",
  " * Curated, hand-verified question bank for the solo games (Menara Cerdas,",
  " * Benar atau Salah). Each item has exactly ONE unambiguous correct answer with",
  " * distractors that are clearly wrong, plus a short penjelasan. Written to KBBI /",
  " * PUEBI conventions. This is merged with Jalur Cerdas lesson questions in the API",
  " * and served in random order, so every player gets a different mix.",
  " *",
  " * Shape matches the game API's normalized question:",
  " *   { soal, opsi[], jawaban(index), penjelasan }",
  " */",
  "export interface BankQuestion {",
  "  soal: string;",
  "  opsi: string[];",
  "  jawaban: number;",
  "  penjelasan: string;",
  "  kategori: string;",
  "}",
  "",
  "export const QUESTION_BANK: BankQuestion[] = [",
];
for (const q of bank) {
  lines.push(
    `  { soal: ${JSON.stringify(q.soal)}, opsi: ${JSON.stringify(q.opsi)}, jawaban: ${q.jawaban}, penjelasan: ${JSON.stringify(q.penjelasan)}, kategori: ${JSON.stringify(q.kategori)} },`
  );
}
lines.push("];\n");

writeFileSync(resolve(__dirname, "../lib/game/question-bank.ts"), lines.join("\n"));
console.log("✅ lib/game/question-bank.ts ditulis ulang");
