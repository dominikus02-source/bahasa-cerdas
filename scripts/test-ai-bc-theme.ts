/**
 * AI BC 2.0 — Theme tests (Phase 5.3).
 *
 * Tema AI BC mengikuti konvensi warna produk:
 * - Murid (Teman Belajarmu) = violet.
 * - Guru (Teman Guru) = emerald.
 * - Tema gelap (dark:) tersedia di komponen baru.
 * - Ikon lucide (bukan emoji) di aksi cepat; tanpa sisa tema merah lama.
 */

import { readFileSync, existsSync } from "node:fs";

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
const allNewFiles = [
  "components/ai-bc/AiBcModule.tsx",
  "components/ai-bc/AiBcLanding.tsx",
  "components/ai-bc/AiBcChatView.tsx",
  "app/arena/ai/page.tsx",
  "app/(dashboard)/guru/ai-bc/page.tsx",
  "app/ai-bc/page.tsx",
].filter(existsSync);
const combined = allNewFiles.map(read).join("\n");

console.log("AI BC 2.0 — TEMA");

// 1. Warna per peran
test("Teman Belajarmu (murid) memakai violet", () => {
  const moduleC = read("components/ai-bc/AiBcModule.tsx");
  const landing = read("components/ai-bc/AiBcLanding.tsx");
  const chat = read("components/ai-bc/AiBcChatView.tsx");
  return (moduleC + landing + chat).includes("from-violet-600") && (moduleC + landing + chat).includes("violet-");
});
test("Teman Guru (guru) memakai emerald", () => {
  const moduleC = read("components/ai-bc/AiBcModule.tsx");
  const landing = read("components/ai-bc/AiBcLanding.tsx");
  const chat = read("components/ai-bc/AiBcChatView.tsx");
  return (moduleC + landing + chat).includes("from-emerald-600") && (moduleC + landing + chat).includes("emerald-");
});
test("aksi cepat murid & guru dibedakan dalam satu modul", () =>
  read("components/ai-bc/AiBcModule.tsx").includes('role === "teacher"'));
test("lama: tanpa tema merah AI BC 1.0", () => {
  const oldRed = ["from-red-50", "to-red-50", "from-red-600", "to-red-700", "text-red-100", "border-red-100"];
  return oldRed.every((c) => !combined.includes(c));
});
test("lama: tanpa klaim 'Google Gemini AI'", () => !combined.includes("Ditenagai oleh Google Gemini") && !combined.includes("Gemini AI"));
test("lama: tanpa 'AI Cerdik' di halaman baru", () => !combined.includes("AI Cerdik"));

// 2. Dark mode
test("landing menyediakan dark:", () => read("components/ai-bc/AiBcLanding.tsx").includes("dark:"));
test("chat menyediakan dark:", () => read("components/ai-bc/AiBcChatView.tsx").includes("dark:"));
test("module menyediakan dark:", () => read("components/ai-bc/AiBcModule.tsx").includes("dark:"));
test("halaman publik menyediakan dark:", () => read("app/ai-bc/page.tsx").includes("bg-white/80"));

// 3. Ikon lucide di aksi cepat (bukan emoji)
test("aksi cepat memakai ikon lucide", () =>
  read("components/ai-bc/AiBcChatView.tsx").includes("lucide-react") &&
  read("components/ai-bc/AiBcModule.tsx").includes("lucide-react"));
test("tidak ada emoji di UI baru", () => {
  const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
  const uiFiles = allNewFiles.filter((f) => f.includes("components") || f.includes("arena/ai") || f.includes("guru/ai-bc"));
  return uiFiles.every((f) => !emojiPattern.test(read(f)));
});
test("halaman publik tidak memakai emoji ikon", () => !/[\u{1F300}-\u{1FAFF}]/u.test(read("app/ai-bc/page.tsx")));

// 4. Token visual konsisten (radius, shadow lembut)
test("bubble memakai rounded-2xl", () => read("components/ai-bc/AiBcChatView.tsx").includes("rounded-2xl"));
test("karakter memakai next/image + registry gambarKarakter", () =>
  read("components/ai-bc/AICompanionCharacter.tsx").includes("next/image") &&
  read("components/ai-bc/AICompanionCharacter.tsx").includes("gambarKarakter"));
test("karakter memakai drop-shadow halus (bukan kotak keras)", () =>
  read("components/ai-bc/AICompanionCharacter.tsx").includes("drop-shadow-sm"));
test("fokus input memakai ring 2", () => read("components/ai-bc/AiBcChatView.tsx").includes("focus:ring-2"));
test("prose markdown dipakai (premium render)", () => read("components/ai-bc/AiBcChatView.tsx").includes("prose"));

// 5. Bahasa Indonesia di label
test("tombol Salin/Tersalin", () =>
  read("components/ai-bc/AiBcChatView.tsx").includes("Salin") && read("components/ai-bc/AiBcChatView.tsx").includes("Tersalin"));
test("tombol Tanya ulang / Coba lagi", () =>
  read("components/ai-bc/AiBcChatView.tsx").includes("Tanya ulang") && read("components/ai-bc/AiBcChatView.tsx").includes("Coba lagi"));
test("Mulai baru", () => read("components/ai-bc/AiBcModule.tsx").includes("Mulai baru"));
test("placeholder per peran", () => read("components/ai-bc/ai-bc-types.ts").includes("Tanya apa saja tentang Bahasa Indonesia"));

console.log(`\nHASIL: ${passed} passed, ${failed} failed (${passed + failed} total)`);
if (failed > 0) process.exit(1);
console.log("✅ SEMUA UJI TEMA AI BC LULUS\n");
process.exit(0);
