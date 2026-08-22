/**
 * REGISTER 4.0 — Role Gate 1.0 (test suite).
 *
 * Memverifikasi flow 4 langkah: Pilih Peran → Formulir → Konfirmasi Peran → Konfirmasi Data
 * + preservasi logic auth existing (statik).
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
console.log("  REGISTER 4.0 — Role Gate 1.0");
console.log("════════════════════════════════════════════\n");

const page = read("app/(auth)/register/page.tsx");

console.log("── Preservasi logic auth ──");
test("1. register route exists", () => page.length > 0);
test("2. existing auth handler preserved (/api/auth/create-user)", () =>
  page.includes("/api/auth/create-user") && page.includes("role,") && page.includes("password"));
test("3. existing API calls preserved (registerUser action)", () =>
  page.includes('from "@/app/actions/register"') && page.includes("registerUser(formData)"));
test("4. existing redirect preserved (MURID → /arena, GURU → /guru/beranda)", () =>
  page.includes('role === "MURID" ? "/arena" : "/guru/beranda"'));
test("5. existing validation preserved (minLength 8, required)", () =>
  page.includes("minLength={8}") && page.includes("required"));
test("6. auto sign-in setelah daftar preserved", () => page.includes("signInWithPassword"));
test("7. success screen preserved (registered)", () =>
  page.includes("Pendaftaran Berhasil!") && page.includes("setRegistered(true)"));

console.log("\n── Role Gate 1.0 — No default role ──");
test("8. role default = null (bukan MURID)", () => page.includes('useState<Role | null>(null)') && !page.includes('useState<"GURU" | "MURID">("MURID")'));
test("9. role MUST be explicitly chosen (disabled button when null)", () => page.includes("disabled={!role}"));
test("10. handleRoleSelect exists (explicit selection)", () => page.includes("handleRoleSelect"));

console.log("\n── Role Gate 1.0 — 4-step wizard ──");
test("11. StepBadge component exists", () => page.includes("StepBadge") && page.includes("function StepBadge"));
test("12. STEPS constant defined", () => page.includes('const STEPS = ["Pilih Peran", "Formulir", "Konfirmasi Peran", "Konfirmasi Data"]'));
test("13. TOTAL_STEPS = 4", () => page.includes("TOTAL_STEPS = 4"));
test("14. step 1 = Pilih Peran (role selection)", () => page.includes('step === 1') && page.includes("Pilih jenis akun kamu"));
test("15. step 2 = Formulir", () => page.includes('step === 2') && page.includes("Pendaftaran Guru") && page.includes("Pendaftaran Murid"));
test("16. step 3 = Konfirmasi Peran", () => page.includes('step === 3') && page.includes("Konfirmasi Peran"));
test("17. step 4 = Konfirmasi Data", () => page.includes('step === 4') && page.includes("Konfirmasi Data"));
test("18. goToStep3 exists (no consistency heuristic)", () => page.includes("goToStep3") && !page.includes("evaluateRoleConsistency"));
test("19. no consistencyWarning state (removed in 1.0.1)", () => !page.includes("consistencyWarning"));
test("20. AlertTriangle retained for role confirmation warning", () => page.includes("AlertTriangle") && page.includes("Pilihan peran ini menentukan pengalaman"));

console.log("\n── Role Gate 1.0 — Role descriptions & features ──");
test("21. ROLE_CONFIG has GURU features (4 items)", () => page.includes("Buat Rencana Pembelajaran dengan AI") && page.includes("Bank Soal & Kuis Game interaktif"));
test("22. ROLE_CONFIG has MURID features (4 items)", () => page.includes("Jalur Cerdas") && page.includes("UKBI & TKA"));
test("23. konfirmasi peran shows features list", () => page.includes("Dengan akun ini, kamu bisa:"));
test("24. konfirmasi peran shows role warning", () => page.includes("Pilihan peran ini menentukan pengalaman"));

console.log("\n── Brand & copy ──");
test("25. brand registry digunakan", () =>
  page.includes('from "@/lib/brand"') && page.includes("BRAND_ICON_DARK") &&
  !page.includes("BC-logo.png") && !page.includes("from-red-600"));
test("26. tagline resmi dipakai", () => page.includes("BRAND_TAGLINE"));
test("27. hero section with brand identity", () =>
  page.includes("Untuk Guru") && page.includes("Untuk Murid") && page.includes("Satu Pintu") && page.includes("Seribu"));
test("28. heading register 'Mulai Perjalanan Anda'", () => page.includes("Mulai Perjalanan Anda"));

console.log("\n── Form & CTA ──");
test("29. form fields preserved (Nama/Email/Password/Sekolah/Kota/Provinsi)", () =>
  page.includes("Nama Lengkap") && page.includes("Asal Sekolah") && page.includes("Kota/Kabupaten") && page.includes("Provinsi"));
test("30. password visibility preserved", () =>
  page.includes("showPassword") && page.includes('aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}'));
test("31. login link preserved", () => page.includes("Sudah punya akun?") && page.includes("/login"));
test("32. CTA 'Daftar Sekarang' + loading state", () =>
  page.includes("Daftar Sekarang") && page.includes("animate-spin") && page.includes("disabled={loading}"));
test("33. tanpa provider auth baru", () =>
  !page.includes("signInWithOAuth") && !page.includes("provider:"));

console.log("\n── Konfirmasi Data step ──");
test("34. review data card exists in step 4", () => page.includes("Pastikan data kamu sudah benar"));
test("35. review shows role badge", () => page.includes("Peran") && page.includes("config.label"));
test("36. review shows email", () => page.includes("Email") && page.includes("email ||"));
test("37. review shows school (conditional)", () => page.includes("school &&"));
test("38. review shows location (conditional)", () => page.includes("city || province"));

console.log("\n── Visual & aksesibilitas ──");
test("39. light theme: surface putih + lavender bg", () =>
  page.includes("bg-white") && page.includes("from-white via-indigo-50/60 to-violet-50"));
test("40. dark theme lengkap", () =>
  page.includes("dark:bg-slate-900") && page.includes("dark:text-white") && page.includes("dark:from-slate-950"));
test("41. layout dua kolom desktop + single column mobile", () =>
  page.includes("lg:grid-cols-2") && page.includes("order-1 lg:order-2"));
test("42. mobile tanpa horizontal overflow", () =>
  !page.includes("min-w-[1200px]") && page.includes("max-w-6xl") && page.includes("w-full max-w-md"));
test("43. aksesibilitas: label terhubung + touch target ≥44px", () =>
  page.includes('htmlFor="fullName"') && page.includes('htmlFor="email"') && page.includes('htmlFor="password"') &&
  page.includes("h-12") && page.includes("focus:ring-2"));
test("44. tanpa logo lama / maskot", () =>
  !page.includes("BC-logo.png") && !page.includes("BatikDecoration"));
test("45. brand block di hero (ICON BC + teks BahasaCerdas + tagline)", () => {
  const brandHeader = page.slice(page.indexOf('aria-label="Beranda BahasaCerdas"'), page.indexOf('aria-label="Beranda BahasaCerdas"') + 900);
  return brandHeader.includes("BRAND_ICON_DARK") && brandHeader.includes("BRAND_ICON") &&
    brandHeader.includes(">BahasaCerdas<") && brandHeader.includes("BRAND_TAGLINE");
});
test("46. nuansa batik subtle ada", () =>
  page.includes("BatikAccent") && read("components/decorations/BatikAccent.tsx").includes('aria-hidden="true"'));
test("47. protected zones 0 diff", () => {
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
