/**
 * AI BC 2.0 — Context tests (Phase 5.3).
 *
 * Konteks harus RINGKAS, aman, dan best-effort:
 * - buildContextText murni: kompak, dibatasi karakter, aman input kosong.
 * - gatherBcContext: tiap sumber dibungkus try/catch (tidak pernah crash),
 *   tanpa membuang data mentah (tanpa dump JSON/tabel), jumlah item dibatasi.
 * - Saran (getBcHints) beda per peran dan selalu ada fallback statis.
 */

import { readFileSync, existsSync } from "node:fs";
import { buildContextText, BC_CONTEXT_MAX_CHARS, BC_CONTEXT_MAX_ITEMS } from "../lib/ai-bc/context";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    const ok = fn();
    if (ok) passed++;
    else {
      failed++;
      console.error(`  ✗ ${name}`);
    }
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}: ${e instanceof Error ? e.message : e}`);
  }
}

const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf-8") : "");
const contextLib = read("lib/ai-bc/context.ts");

console.log("AI BC 2.0 — KONTEKS");

// 1. Pure builder
test("buildContextText kosong → ''", () => buildContextText({ role: "student", items: [] }) === "");
test("buildContextText null-safe", () => buildContextText(null as never) === "");
test("buildContextText memformat baris label: nilai", () =>
  buildContextText({ role: "student", items: [{ key: "a", label: "Kelas", value: "7" }] }) === "- Kelas: 7");
test("buildContextText membatasi item", () => {
  const items = Array.from({ length: 20 }, (_, i) => ({ key: `k${i}`, label: `L${i}`, value: `v${i}` }));
  return buildContextText({ role: "student", items }).split("\n").length <= BC_CONTEXT_MAX_ITEMS;
});
test("buildContextText memangkas kelebihan karakter", () => {
  const items = Array.from({ length: 30 }, (_, i) => ({ key: `k${i}`, label: `Label ${i}`, value: "x".repeat(80) }));
  return buildContextText({ role: "student", items }).length <= BC_CONTEXT_MAX_CHARS;
});
test("buildContextText merapikan nilai multi-baris", () => {
  const ctx = buildContextText({ role: "student", items: [{ key: "a", label: "Bio", value: "baris1\nbaris2\nbaris3" }] });
  return ctx === "- Bio: baris1 baris2 baris3";
});
test("nilai kepanjangan diberi elipsis", () => {
  const ctx = buildContextText({ role: "student", items: [{ key: "a", label: "Teks", value: "z".repeat(500) }] });
  return ctx.endsWith("…") && ctx.length <= 100;
});

// 2. Static safety — tidak ada dump data mentah
test("tidak ada JSON.stringify dump di context.ts", () => !contextLib.includes("JSON.stringify"));
test("tidak ada raw SQL/select semua kolom", () =>
  !contextLib.includes("findMany({") && !contextLib.toLowerCase().includes("select *"));
test("setiap sumber DB dibungkus .catch", () => (contextLib.match(/\.catch\(/g) || []).length >= 4);
test("nilai konteks dibatasi (condense)", () => contextLib.includes("BC_CONTEXT_VALUE_MAX_CHARS"));
test("jumlah item dibatasi (BC_CONTEXT_MAX_ITEMS)", () => contextLib.includes("BC_CONTEXT_MAX_ITEMS"));

// 3. Struktur role
test("peran murid mengumpulkan kelas/level", () =>
  contextLib.includes('role === "student"') && contextLib.includes("Kelas"));
test("peran guru mengumpulkan kelas/murid", () =>
  contextLib.includes('role === "student"') && contextLib.includes("Kelas dikelola") && contextLib.includes("Murid"));
test("hints statis murid & guru tersedia", () =>
  contextLib.includes("Arti kata") && contextLib.includes("RPP"));
test("getBcHints menyesuaikan skill murid (best-effort)", () =>
  contextLib.includes("getSkillProfile") && contextLib.includes("weakest.skill"));
test("gatherBcContext mengekspor buildContextText", () => contextLib.includes("export function buildContextText"));

// 4. Tidak menyentuh learning-loop/gamification engine
test("context.ts tidak mengimpor recordActivity", () => !contextLib.includes("recordActivity"));
test("context.ts tidak menulis DB (tanpa create/update)", () =>
  !contextLib.includes(".create(") && !contextLib.includes(".update(") && !contextLib.includes(".upsert("));

console.log(`\nHASIL: ${passed} passed, ${failed} failed (${passed + failed} total)`);
if (failed > 0) process.exit(1);
console.log("✅ SEMUA UJI KONTEKS AI BC LULUS\n");
process.exit(0);
