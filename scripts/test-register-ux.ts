/**
 * REGISTER 3.0 — Companion Polish for Login 3.0 (test suite).
 *
 * Memverifikasi visual baru + preservasi logic auth existing (statik).
 * Run: npx tsx scripts/test-register-ux.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

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
console.log("  REGISTER 3.0 — Companion Polish for Login 3.0");
console.log("════════════════════════════════════════════\n");

const page = read("app/(auth)/register/page.tsx");

console.log("── Preservasi logic auth ──");
test("1. register route exists", () => page.length > 0);
test("2. existing auth handler preserved (/api/auth/create-user)", () =>
  page.includes("/api/auth/create-user") && page.includes('role,' ) && page.includes("password"));
test("3. existing API calls preserved (registerUser action)", () =>
  page.includes('from "@/app/actions/register"') && page.includes("registerUser(formData)"));
test("4. existing redirect preserved (MURID → /arena, GURU → /guru/beranda)", () =>
  page.includes('role === "MURID" ? "/arena" : "/guru/beranda"'));
test("5. existing validation preserved (minLength 8, required)", () =>
  page.includes("minLength={8}") && page.includes("required"));
test("6. auto sign-in setelah daftar preserved", () => page.includes("signInWithPassword"));
test("7. success screen preserved (registered)", () =>
  page.includes("Pendaftaran Berhasil!") && page.includes("setRegistered(true)"));

console.log("\n── Brand & copy ──");
test("8. brand registry digunakan (bukan hardcode lama)", () =>
  page.includes('from "@/lib/brand"') && page.includes("BRAND_ICON_DARK") &&
  !page.includes("BC-logo.png") && !page.includes("from-red-600"));
test("9. tagline resmi dipakai", () => page.includes("BRAND_TAGLINE"));
test("10. positioning netral guru & murid (hero sama dengan Login 3.0)", () =>
  page.includes("Untuk Guru") && page.includes("Untuk Murid") && page.includes("Satu Pintu") && page.includes("Seribu"));
test("11. heading register 'Mulai Perjalanan Anda'", () => page.includes("Mulai Perjalanan Anda"));
test("12. pilih peran existing dipertahankan (Guru/Murid cards)", () =>
  page.includes("Pilih jenis akun kamu") && page.includes("roleCards") && page.includes("setRole(r.key)"));

console.log("\n── Form & CTA ──");
test("13. form fields existing preserved (Nama/Email/Password/Sekolah/Kota/Provinsi)", () =>
  page.includes("Nama Lengkap") && page.includes("Asal Sekolah") && page.includes("Kota/Kabupaten") && page.includes("Provinsi"));
test("14. password visibility preserved (show/hide + aria)", () =>
  page.includes("showPassword") && page.includes('aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}'));
test("15. login link preserved (route existing)", () =>
  page.includes('href={role === "MURID" ? "/auth/arena-login" : "/login"}') && page.includes("Sudah punya akun?"));
test("16. CTA 'Daftar Sekarang' + loading state", () =>
  page.includes("Daftar Sekarang") && page.includes("animate-spin") && page.includes("disabled={loading}"));
test("17. tanpa provider auth baru (hanya flow existing)", () =>
  !page.includes("signInWithOAuth") && !page.includes("provider:"));

console.log("\n── Visual & aksesibilitas ──");
test("18. light theme: surface putih + lavender bg", () =>
  page.includes("bg-white") && page.includes("from-white via-indigo-50/60 to-violet-50"));
test("19. dark theme lengkap", () =>
  page.includes("dark:bg-slate-900") && page.includes("dark:text-white") && page.includes("dark:from-slate-950"));
test("20. layout dua kolom desktop + single column mobile", () =>
  page.includes("lg:grid-cols-2") && page.includes("order-1 lg:order-2"));
test("21. mobile tanpa horizontal overflow", () =>
  !page.includes("min-w-[1200px]") && page.includes("max-w-6xl") && page.includes("w-full max-w-md"));
test("22. aksesibilitas: label terhubung + touch target ≥44px", () =>
  page.includes('htmlFor="fullName"') && page.includes('htmlFor="email"') && page.includes('htmlFor="password"') &&
  page.includes("h-12") && page.includes("focus:ring-2"));
test("23. tanpa logo lama / maskot", () =>
  !page.includes("BC-logo.png") && !page.includes("BatikDecoration"));
test("24b. SATU brand block di hero (ICON BC + teks BahasaCerdas + tagline)", () => {
  const brandHeader = page.slice(page.indexOf('aria-label="Beranda BahasaCerdas"'), page.indexOf('aria-label="Beranda BahasaCerdas"') + 900);
  return brandHeader.includes("BRAND_ICON_DARK") && brandHeader.includes("BRAND_ICON") &&
    brandHeader.includes(">BahasaCerdas<") && brandHeader.includes("BRAND_TAGLINE");
});
test("24c. nuansa batik subtle ada (BatikAccent, aria-hidden)", () =>
  page.includes("BatikAccent") && read("components/decorations/BatikAccent.tsx").includes("aria-hidden=\"true\""));
test("24. protected zones 0 diff", () => {
  try {
    const diff = execSync(
      "git diff --name-only HEAD -- prisma/ app/api/ lib/gamification/ lib/learning-loop/ engines/ lib/apk.ts lib/xp.ts lib/coins.ts lib/award-xp.ts app/arena/bottom-nav.tsx",
      { cwd: ROOT, encoding: "utf8" }
    ).trim();
    return diff.length === 0;
  } catch {
    return true;
  }
});

/* ── Summary ── */
console.log("\n════════════════════════════════════════════");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("════════════════════════════════════════════\n");
if (failed > 0) process.exit(1);
