/**
 * Landing inklusif — Umum, Murid, Guru (setara).
 * Run: npx tsx scripts/test-landing-inclusive.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseRegisterRoleParam } from "../lib/auth/register-role-param";

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

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

console.log("\n═══ Landing inklusif 2026-11-11 ═══\n");

const hero = read("components/landing/HeroSection.tsx");
const peran = read("components/landing/PilihPeranmuSection.tsx");
const page = read("app/page.tsx");
const nav = read("components/public/PageNavbar.tsx");
const footer = read("components/public/PageFooter.tsx");
const register = read("app/(auth)/register/page.tsx");
const cta = read("components/landing/FinalCTA.tsx");
const brand = read("lib/brand.ts");
const SLOGAN = "Kini belajar Bahasa Indonesia lebih menyenangkan";

const LINE1 = "Bahasa menghubungkan";
const LINE2 = "gagasan, manusia, dan masa depan.";
const SUB = "Satu tempat untuk belajar, berlatih, bermain, dan berkarya dalam Bahasa Indonesia, untuk siapa saja.";

console.log("── Hero ──");
test("1. headline dua baris, huruf persis, satu ukuran font", () =>
  hero.includes(LINE1) &&
  hero.includes(LINE2) &&
  !hero.includes("Bahasa Menghubungkan") &&
  !hero.includes("Gagasan, Manusia, dan Masa Depan.") &&
  !hero.includes("dengan cara yang baru") &&
  !hero.includes("text-[0.55em]") &&
  !hero.includes("sm:text-[0.5em]"));
test("1b. gradien hanya di baris kedua", () => {
  const g = hero.indexOf("backgroundImage: \"var(--bc-grad-brand)\"");
  const l1 = hero.indexOf(LINE1);
  const l2 = hero.indexOf(LINE2);
  return g > l1 && g < l2 && l1 >= 0 && l2 > l1;
});
test("2. subheadline persis", () =>
  hero.includes(SUB) && SUB.trim().split(/\s+/).length <= 20);
test("3. CTA utama Mulai Gratis ke /register", () =>
  hero.includes("Mulai Gratis") && hero.includes('href="/register"'));
test("4. label 'Atau mulai sebagai:' plus chip Umum, Murid, Guru", () => {
  const start = hero.indexOf("const ROLE_CHIPS");
  const block = start >= 0 ? hero.slice(start, hero.indexOf("];", start)) : "";
  const u = block.indexOf('label: "Umum"');
  const m = block.indexOf('label: "Murid"');
  const g = block.indexOf('label: "Guru"');
  return hero.includes("Atau mulai sebagai:") &&
    u >= 0 && m > u && g > m &&
    block.includes("/register?role=umum") &&
    block.includes("/register?role=murid") &&
    block.includes("/register?role=guru") &&
    !hero.includes("Saya Umum") &&
    !hero.includes("Saya Murid") &&
    !hero.includes("Saya Guru");
});
test("5. empat angka kepercayaan dari social-proof (bukan angka statis) dengan caption persis", () =>
  hero.includes('label: "Pengguna"') &&
  hero.includes('note: "dari umum, murid, hingga guru"') &&
  hero.includes('label: "Murid"') &&
  hero.includes('note: "aktif belajar"') &&
  hero.includes('label: "Guru"') &&
  hero.includes('note: "mengajar dan membimbing"') &&
  hero.includes('label: "Karya Siswa"') &&
  hero.includes('note: "puisi, cerpen, pantun, dan lainnya"') &&
  hero.includes("/api/public/social-proof") &&
  hero.includes("formatSocialProofNumber") &&
  !/\b(users|students|teachers|works):\s*\d{2,}/.test(hero));
test("6. hero tidak memosisikan situs sebagai khusus guru", () =>
  !/khusus guru/i.test(hero) && !hero.includes("Guru mengajar. Murid belajar."));
test("6b. tidak ada lockup logo kedua atau slogan 'Kini belajar...' di hero", () =>
  !hero.includes("BRAND_SLOGAN") &&
  !hero.includes(SLOGAN) &&
  !hero.includes("BRAND_ICON") &&
  !hero.includes("BRAND_NAME") &&
  !brand.includes("BRAND_SLOGAN") &&
  hero.includes("Untuk umum, murid, dan guru"));

console.log("\n── Pilih Peranmu ──");
test("7. section Pilih Peranmu dirender di beranda", () =>
  page.includes("PilihPeranmuSection") && peran.includes("Pilih Peranmu"));
test("8. urutan jalur Umum, Murid, Guru", () => {
  const u = peran.indexOf('key: "umum"');
  const m = peran.indexOf('key: "murid"');
  const g = peran.indexOf('key: "guru"');
  return u >= 0 && m > u && g > m;
});
test("9. tiap jalur 3 manfaat + CTA ke rute yang ada", () =>
  peran.includes("Mulai Jelajah") && peran.includes('href: "/register?role=umum"') &&
  peran.includes("Masuk Arena") && peran.includes('href: "/arena"') &&
  peran.includes("Masuk Dasbor Guru") && peran.includes('href: "/guru/beranda"') &&
  (peran.match(/benefits: \[/g) || []).length === 3 &&
  peran.includes("AKSARA") && peran.includes("NARA") && peran.includes("BIGT") &&
  peran.includes("Jalur Cerdas") && peran.includes("MAIN BERSAMA") &&
  peran.includes("MGMP digital"));

console.log("\n── Navigasi & footer ──");
test("10. nav sederhana: Produk, Toko Karya, dan menu Untuk Siapa", () => {
  const top = ["Produk", "Toko Karya"];
  let last = -1;
  for (const label of top) {
    const i = nav.indexOf(`label: "${label}"`);
    if (i < 0 || i < last) return false;
    last = i;
  }
  const audience = ["Untuk Umum", "Untuk Murid", "Untuk Guru"];
  last = -1;
  for (const label of audience) {
    const i = nav.indexOf(`label: "${label}"`);
    if (i < 0 || i < last) return false;
    last = i;
  }
  const topLevelCount = (nav.match(/const navLinks = \[/g) || []).length;
  return topLevelCount === 1 &&
    nav.includes("Untuk Siapa") &&
    nav.includes('href: "/#produk"') &&
    nav.includes('href: "/marketplace"') &&
    nav.includes('href: "/#untuk-umum"') &&
    nav.includes('href: "/#untuk-murid"') &&
    nav.includes('href: "/#untuk-guru"') &&
    !nav.includes('href: "/faq"') &&
    (nav.match(/href: "\/#produk"/g) || []).length >= 1;
});
test("10b. navbar logo saja, tanpa slogan/tagline kecil di bawah wordmark", () =>
  !nav.includes("BRAND_SLOGAN") &&
  !nav.includes(SLOGAN) &&
  !brand.includes("BRAND_SLOGAN") &&
  nav.includes("Logo BahasaCerdas") &&
  nav.includes("BahasaCerdas"));
test("11. FAQ dan Tentang tidak di navbar, ada di footer", () =>
  !nav.includes('href: "/faq"') &&
  !nav.includes('href: "/tentang"') &&
  footer.includes('href: "/faq"') &&
  footer.includes('href: "/tentang"'));
test("12. tombol Masuk dan Mulai Gratis tetap di navbar", () =>
  nav.includes("Masuk") && nav.includes("Mulai Gratis"));
test("13. pengguna UMUM diarahkan ke /umum, bukan dasbor guru", () =>
  nav.includes('role === "UMUM"') && nav.includes('return "/umum"'));

console.log("\n── Pendaftaran ──");
test("14. ?role= preselect UI saja (parser terpisah dari role-intent)", () =>
  register.includes("parseRegisterRoleParam") &&
  register.includes("setRole(pre)") &&
  !register.includes('verifyRoleIntent(new URLSearchParams'));
test("15. parser hanya menerima umum/murid/guru", () =>
  parseRegisterRoleParam("umum") === "UMUM" &&
  parseRegisterRoleParam("MURID") === "MURID" &&
  parseRegisterRoleParam("guru") === "GURU" &&
  parseRegisterRoleParam("admin") === null &&
  parseRegisterRoleParam("investor") === null &&
  parseRegisterRoleParam("") === null);
test("16. kartu peran berurutan Umum, Murid, Guru", () => {
  const u = register.indexOf('key: "UMUM"');
  const m = register.indexOf('key: "MURID"');
  const g = register.indexOf('key: "GURU"');
  return u >= 0 && m > u && g > m;
});
test("17. Google OAuth tetap lewat role-intent, bukan query param", () =>
  register.includes("/api/auth/role-intent") &&
  register.includes("handleGoogleRegister"));

console.log("\n── Metadata & CTA akhir ──");
test("18. metadata SEO menyebut umum, murid, dan guru", () =>
  page.includes("masyarakat umum, murid, dan guru") &&
  !page.includes("untuk guru dan murid. Belajar, berlatih"));
test("19. Final CTA berurutan Umum, Murid, Guru", () => {
  const u = cta.indexOf("masyarakat umum");
  const m = cta.indexOf("Untuk murid");
  const g = cta.indexOf("Untuk guru");
  return u >= 0 && m > u && g > m;
});
test("20. wording lama 'Untuk Mahasiswa, Umum & Investor' tidak muncul di UI landing/register/nav", () => {
  const files = [
    "app/page.tsx",
    "components/landing/HeroSection.tsx",
    "components/landing/PilihPeranmuSection.tsx",
    "components/public/PageNavbar.tsx",
    "components/public/PageFooter.tsx",
    "app/(auth)/register/page.tsx",
    "components/landing/FinalCTA.tsx",
  ];
  return files.every((f) => !read(f).includes("Untuk Mahasiswa, Umum & Investor"));
});

console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`);
if (failed > 0) process.exit(1);
