/**
 * Test untuk komponen Social Proof landing page:
 *  1. formatSocialProofNumber — aturan pembulatan ke bawah (floor), format id-ID.
 *  2. Kontrak API publik: route ada, memakai cache Redis + snapshot data.
 *
 * Jalankan: npx tsx scripts/test-social-proof.ts
 */

import * as fs from "fs";
import * as path from "path";

let passed = 0;
let failed = 0;

function check(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf-8");
}

// ─── 1. FORMATTER ──────────────────────────────────────────────────────
console.log("\n📋 Test 1: formatSocialProofNumber (pembulatan ke bawah)");

import { formatSocialProofNumber } from "../lib/format-social-proof";

const fixtures: [number, string][] = [
  [0, "0"],
  [1, "1"],
  [5, "5"],
  [9, "9"],
  [10, "10+"],
  [50, "50+"],
  [99, "90+"],
  [100, "100+"],
  [286, "280+"],
  [999, "990+"],
  [1000, "1.000+"],
  [1163, "1.100+"],
  [1419, "1.400+"],
  [1708, "1.700+"],
  [1799, "1.700+"],
  [1800, "1.800+"],
  [1999, "1.900+"],
  [2000, "2.000+"],
  [2486, "2.400+"],
  [9872, "9.800+"],
  [9999, "9.900+"],
  [10000, "10.000+"],
  [12345, "12.000+"],
  [100000, "100.000+"],
  [1234567, "1.230.000+"],
];

for (const [input, expected] of fixtures) {
  check(
    formatSocialProofNumber(input) === expected,
    `format(${input}) === "${expected}"`,
    `got "${formatSocialProofNumber(input)}"`
  );
}

// Edge: input tidak valid → 0
check(formatSocialProofNumber(NaN) === "0", "format(NaN) === \"0\"");
check(formatSocialProofNumber(-5) === "0", "format(-5) === \"0\"");
check(formatSocialProofNumber(2.7) === "2", "format(2.7) === \"2\"");

// ── 2. KONTAK API ──────────────────────────────────────────────────────
console.log("\n📋 Test 2: Kontrak API /api/public/social-proof");
{
  const routePath = "app/api/public/social-proof/route.ts";
  const routeExists = fs.existsSync(path.join(__dirname, "..", routePath));
  check(routeExists, `Route ${routePath} ada`, routeExists ? undefined : "File tidak ditemukan");

  if (routeExists) {
    const content = readFile(routePath);
    check(content.includes("export async function GET"), "GET handler ada");
    check(content.includes("Cache-Control"), "Set Cache-Control header");
    check(content.includes("s-maxage"), "s-maxage CDN cache ada");
    check(content.includes("stale-while-revalidate"), "stale-while-revalidate ada");
    check(content.includes("getSocialProofSnapshot"), "Memakai lib/social-proof.ts snapshot");
    check(!content.includes("1.700") && !content.includes("1.400"), "Tidak ada angka hardcoded");
  }
}

// ─── 3. LIB SNAPSHOT ───────────────────────────────────────────────────
console.log("\n📋 Test 3: lib/social-proof.ts (sumber data)");
{
  const libPath = "lib/social-proof.ts";
  const libExists = fs.existsSync(path.join(__dirname, "..", libPath));
  check(libExists, `Lib ${libPath} ada`, libExists ? undefined : "File tidak ditemukan");

  if (libExists) {
    const content = readFile(libPath);
    check(content.includes("db.user.count"), "count user total (pengguna)");
    check(content.includes('role: "MURID"'), "count role MURID (murid)");
    check(content.includes('role: "GURU"'), "count role GURU (guru)");
    check(content.includes("db.studentKarya.count"), "count karya siswa");
    check(content.includes("getOrSet"), "Cache Redis getOrSet");
    check(content.includes("CACHE_TTL_SECONDS"), "TTL cache terdefinisi");
    check(content.includes("return null"), "Fail-open mengembalikan null saat DB error");
    check(!content.includes("1.700") && !content.includes("1.400"), "Tidak ada nilai statis");
  }
}

// ─── 4. UI SOCIAL PROOF ────────────────────────────────────────────────
console.log("\n📋 Test 4: components/landing/SocialProof.tsx (UI dinamis)");
{
  const componentPath = "components/landing/SocialProof.tsx";
  const content = readFile(componentPath);

  check(content.includes('"use client"'), "Client component");
  check(content.includes("/api/public/social-proof"), "Fetch ke public endpoint");
  check(content.includes("formatSocialProofNumber"), "Pakai formatter terpusat");
  check(content.includes("initial"), "Menerima snapshot server-side (prop initial)");
  check(content.includes("fallbackLabel") || content.includes("—"), "Fallback label tanpa angka");
  check(!content.includes("1.700") && !content.includes("1.400"), "Tidak ada angka statis");
  check(content.includes("label: \"Pengguna\""), "Header: Pengguna");
  check(content.includes("label: \"Murid\""), "Header: Murid");
  check(content.includes("label: \"Guru\""), "Header: Guru");
  check(content.includes("label: \"Karya Siswa\""), "Header: Karya Siswa");
}

// ─── SUMMARY ───────────────────────────────────────────────────────────
console.log(`\n${"=".repeat(50)}`);
console.log(`📊 Test Social Proof — Passed: ${passed}, Failed: ${failed}`);
console.log(`   ${passed + failed} total assertions`);
console.log(`${"=".repeat(50)}`);
process.exit(failed > 0 ? 1 : 0);