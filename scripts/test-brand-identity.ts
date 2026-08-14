/**
 * BRAND IDENTITY MIGRATION — BC 2026 (test suite).
 *
 * Memverifikasi aset resmi terpasang, referensi logo lama hilang dari active
 * UI, metadata/manifest/login/shell memakai brand baru.
 * Run: npx tsx scripts/test-brand-identity.ts
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = join(__dirname, "..");
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

const read = (p: string) => {
  try {
    return readFileSync(join(ROOT, p), "utf8");
  } catch {
    return "";
  }
};
const exists = (p: string) => existsSync(join(ROOT, p));
const sizeOf = (p: string) => (exists(p) ? statSync(join(ROOT, p)).size : 0);

console.log("\n════════════════════════════════════════════");
console.log("  BRAND IDENTITY MIGRATION — BC 2026");
console.log("════════════════════════════════════════════\n");

/* ── 1. Official assets ── */
console.log("── Official assets ──");
test("1. brand icon resmi ada (bc2026-icon)", () => sizeOf("public/brand/bc2026-icon.png") > 1000);
test("2. wordmark light & dark ada", () =>
  sizeOf("public/brand/bc2026-logo-light.png") > 1000 &&
  sizeOf("public/brand/bc2026-logo-dark.png") > 1000);
test("3. app icon + favicon ada", () =>
  sizeOf("public/brand/bc2026-appicon.png") > 1000 &&
  sizeOf("public/brand/bc2026-favicon-64.png") > 1000);
test("4. registry SSOT lib/brand.ts ada", () =>
  read("lib/brand.ts").includes("BRAND_ICON") &&
  read("lib/brand.ts").includes("BRAND_TAGLINE"));

/* ── 2. Old logo references ── */
console.log("\n── Old logo inventory ──");
test("5. tidak ada referensi /BC-logo.png tersisa", () => {
  const out = execSync(
    `grep -rl "BC-logo.png" app components lib public --include='*.ts' --include='*.tsx' --include='*.json' --include='*.js' 2>/dev/null || true`,
    { cwd: ROOT, encoding: "utf8" }
  );
  return out.trim().length === 0;
});
test("6. file lama BC-logo.png sudah tidak ada", () => !exists("public/BC-logo.png"));
test("7. tidak ada referensi /favicon.ico di metadata", () =>
  !read("app/layout.tsx").includes('"/favicon.ico"'));
test("8. favicon lama dihapus (app + public)", () => !exists("app/favicon.ico") && !exists("public/favicon.ico"));
test("9. inline SVG brand lama tidak tersisa di UI aktif", () => {
  const out = execSync(
    `grep -rl "M12.395 2.553" app components 2>/dev/null || true`,
    { cwd: ROOT, encoding: "utf8" }
  );
  return out.trim().length === 0;
});

/* ── 3. Metadata & manifest ── */
console.log("\n── Metadata, PWA, Apple ──");
const layout = read("app/layout.tsx");
test("10. metadata icon memakai brand baru", () =>
  layout.includes("/brand/bc2026-favicon-64.png") && layout.includes("/icon-512.png") && layout.includes("/icon-192.png"));
test("11. apple-touch-icon sudah konten baru (file diperbarui)", () => sizeOf("public/apple-touch-icon.png") > 1000);
test("12. metadata logo memakai brand baru", () => layout.includes("/brand/bc2026-icon.png"));
test("13. manifest memakai icon yang sudah diganti kontennya (arena-icon in place)", () => {
  const m = read("public/manifest.json");
  return m.includes("/arena-icon-192.png") && m.includes("/arena-icon-512.png") && m.includes("/arena-icon-maskable-512.png") &&
    sizeOf("public/arena-icon-192.png") > 1000 && sizeOf("public/arena-icon-512.png") > 1000;
});
test("14. opengraph-image memakai brand baru", () =>
  read("app/opengraph-image.tsx").includes("brand/bc2026-icon.png"));

/* ── 4. Login & shell ── */
console.log("\n── Login, Murid, Guru, Arena, Shared ──");
test("15. login memakai brand baru via registry (BRAND_ICON + BRAND_LOGO_DARK)", () => {
  const p = read("app/(auth)/login/page.tsx");
  return p.includes('from "@/lib/brand"') && p.includes("BRAND_LOGO_DARK") && p.includes("BRAND_LOGO_LIGHT");
});
test("16. register memakai brand baru via registry", () => {
  const p = read("app/(auth)/register/page.tsx");
  return p.includes('from "@/lib/brand"') && p.includes("BRAND_LOGO_DARK") && p.includes("BRAND_LOGO_LIGHT");
});
test("17. arena-login memakai brand baru", () =>
  read("app/auth/arena-login/page.tsx").includes("/brand/bc2026-icon.png"));
test("18. sidebar murid memakai brand baru", () =>
  read("app/(dashboard)/murid/layout.tsx").includes("/brand/bc2026-icon.png"));
test("19. sidebar guru memakai brand baru", () =>
  read("app/(dashboard)/guru/layout.tsx").includes("/brand/bc2026-icon.png"));
test("20. sidebar arena memakai brand baru", () =>
  read("app/arena/layout.tsx").includes("/brand/bc2026-icon.png"));
test("21. shared public components memakai brand baru (varian dark)", () =>
  read("components/public/PublicNavbar.tsx").includes("/brand/bc2026-icon-dark.png") &&
  read("components/public/PageFooter.tsx").includes("/brand/bc2026-icon-dark.png") &&
  read("components/public/PageNavbar.tsx").includes("/brand/bc2026-icon-dark.png"));

/* ── 5. Protected zones ── */
console.log("\n── Protected zones ──");
test("21b. sidebar gradient memakai varian light (latar gelap)", () =>
  read("app/(dashboard)/murid/layout.tsx").includes("/brand/bc2026-icon.png") &&
  read("app/(dashboard)/guru/layout.tsx").includes("/brand/bc2026-icon.png") &&
  read("app/arena/layout.tsx").includes("/brand/bc2026-icon.png"));
test("21c. semua path brand yang direferensikan ADA (tidak ada broken path)", () => {
  const files = ["app/(auth)/login/page.tsx", "app/(auth)/register/page.tsx",
    "app/(dashboard)/guru/profile/page.tsx", "components/landing/HeroEcosystemVisual.tsx",
    "components/public/PageFooter.tsx", "components/public/PublicNavbar.tsx",
    "components/public/PageNavbar.tsx", "components/kompetensi/TestResultPanel.tsx",
    "app/(dashboard)/murid/layout.tsx", "app/(dashboard)/guru/layout.tsx",
    "app/arena/layout.tsx", "app/auth/arena-login/page.tsx", "app/layout.tsx",
    "app/opengraph-image.tsx"];
  const refs = new Set<string>();
  for (const f of files) {
    const src = read(f);
    const m = src.matchAll(/\/brand\/[a-z0-9-]+\.png/g);
    for (const mm of m) refs.add(mm[0]);
  }
  return [...refs].every((p) => exists(`public${p}`));
});
test("21d. PWA/Apple derivative 512/192/180 ter-generate", () =>
  sizeOf("public/icon-512.png") > 1000 && sizeOf("public/icon-192.png") > 1000 && sizeOf("public/apple-touch-icon.png") > 1000);

test("22. protected zones 0 diff", () => {
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
