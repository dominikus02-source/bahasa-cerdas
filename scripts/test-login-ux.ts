/**
 * LOGIN 3.0 — Modern Unified Login (test suite).
 *
 * Memverifikasi visual baru + preservasi logic auth existing (statik).
 * Run: npx tsx scripts/test-login-ux.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const read = (p: string) => {
  try {
    return readFileSync(join(ROOT, p), "utf8");
  } catch {
    return "";
  }
};

let passed = 0;
let failed = 0;
function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      passed++;
      console.log(`  ✅ ${name}`);
    } else {
      failed++;
      console.log(`  ❌ ${name}`);
    }
  } catch (e) {
    failed++;
    console.log(`  ❌ ${name}: ${e instanceof Error ? e.message : e}`);
  }
}

console.log("\n════════════════════════════════════════════");
console.log("  LOGIN 3.0 — Modern Unified Login (Guru + Murid)");
console.log("════════════════════════════════════════════\n");

const page = read("app/(auth)/login/page.tsx");

console.log("── Struktur & brand ──");
test("1. login route exists", () => page.length > 0);
test("2. logo BC 2026 dari registry (bukan hardcode lama)", () =>
  page.includes('from "@/lib/brand"') &&
  page.includes("BRAND_LOGO_DARK") &&
  !page.includes("BC-logo.png"));
test("3. tagline resmi dipakai", () => page.includes("BRAND_TAGLINE"));
test("4. headline hero 'Satu Pintu, Seribu Kemampuan Berbahasa'", () =>
  page.includes("Satu Pintu") && page.includes("Seribu") && page.includes("Berbahasa"));
test("5. copy supporting netral (role auto-detect)", () =>
  page.includes("mengenali peran Anda secara otomatis"));
test("6. value card Guru ada", () =>
  page.includes("Untuk Guru") && page.includes("Mengajar, membuat materi"));
test("7. value card Murid ada", () =>
  page.includes("Untuk Murid") && page.includes("Belajar, berlatih"));
test("8. value card Aman & Terpercaya ada", () =>
  page.includes("Aman & Terpercaya") && page.includes("standar keamanan"));
test("9. ecosystem strip (4 item)", () =>
  page.includes("AI BC") && page.includes("Materi & Latihan") &&
  page.includes("Arena & Prestasi") && page.includes("Sistem keamanan berstandar tinggi"));

console.log("\n── Form & CTA ──");
test("10. email/username field ada", () =>
  page.includes("Email atau Username") && page.includes("nama@sekolah.sch.id atau username"));
test("11. password field ada (label + show/hide)", () =>
  page.includes("Kata Sandi") && page.includes("showPassword") && page.includes("Masukkan kata sandi"));
test("12. remember-me ada", () => page.includes("Ingat saya") && page.includes('type="checkbox"'));
test("13. forgot-password ada (route existing dipertahankan)", () =>
  page.includes("Lupa kata sandi?") && page.includes("/api/auth/forgot-password"));
test("14. CTA utama 'Masuk Sekarang'", () => page.includes("Masuk Sekarang"));
test("15. OAuth Google preserved (provider existing)", () =>
  page.includes("signInWithOAuth") && page.includes('provider: "google"'));
test("16. register route preserved", () => page.includes('href="/register"') && page.includes("Daftar sekarang"));

console.log("\n── Preservasi logic auth ──");
test("17. signInWithPassword + retry 429 dipertahankan", () =>
  page.includes("signInWithPassword") && page.includes("429") && page.includes("attempt"));
test("18. role redirect existing dipertahankan", () =>
  page.includes("isFounder ? \"/admin\"") && page.includes('role === "MURID" ? "/arena"'));
test("19. upsert /api/user/me + fallback simple-upsert dipertahankan", () =>
  page.includes("/api/user/me") && page.includes("/api/user/simple-upsert"));
test("20. error handling existing dipertahankan", () =>
  page.includes("Email belum dikonfirmasi") && page.includes("Email atau kata sandi salah"));

console.log("\n── Visual & aksesibilitas ──");
test("21. light mode surface putih + dark variant lengkap", () =>
  page.includes("bg-white") && page.includes("dark:bg-slate-900") && page.includes("dark:text-white"));
test("22. tidak ada horizontal overflow class (max-w narrow tidak overflow)", () =>
  !page.includes("min-w-[1200px]") && page.includes("max-w-6xl"));
test("23. layout dua kolom desktop + single column mobile", () =>
  page.includes("lg:grid-cols-2") && page.includes("order-1 lg:order-2"));
test("24. aksesibilitas: label terhubung (htmlFor/id), aria tombol password", () =>
  page.includes('htmlFor="email"') && page.includes('htmlFor="password"') &&
  page.includes('aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}'));
test("25. tombol ≥44px (h-12) + focus visible", () =>
  page.includes("h-12 w-full") && page.includes("focus:ring-2"));
test("26. tidak ada referensi logo lama (BC-logo/red brand)", () =>
  !page.includes("BC-logo.png") && !page.includes("from-red-600"));
test("27. background dekoratif ringan tanpa maskot/manusia", () =>
  page.includes("blur-3xl") && !page.includes("avatar"));
test("28. SATU brand block di hero (tanpa icon ganda BRAND_ICON + wordmark)", () => {
  const brandHeader = page.slice(page.indexOf('aria-label="Beranda BahasaCerdas"'), page.indexOf('aria-label="Beranda BahasaCerdas"') + 400);
  return !brandHeader.includes("BRAND_ICON") && brandHeader.includes("BRAND_LOGO_DARK") && brandHeader.includes("BRAND_LOGO_LIGHT");
});
test("29. nuansa batik subtle ada (BatikAccent, aria-hidden, opacity rendah)", () =>
  page.includes("BatikAccent") && read("components/decorations/BatikAccent.tsx").includes("aria-hidden=\"true\""));

/* ── Summary ── */
console.log("\n════════════════════════════════════════════");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("════════════════════════════════════════════\n");
if (failed > 0) process.exit(1);
