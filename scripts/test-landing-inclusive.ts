/**
 * Landing inklusif — Umum, Murid, Guru (setara).
 * Run: npx tsx scripts/test-landing-inclusive.ts
 */

import { existsSync, readFileSync } from "node:fs";
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


console.log("\n── Tentang, legalitas, dan copy publik ──");
const tentangPage = read("app/tentang/page.tsx");
const aboutHero = read("components/tentang/AboutHero.tsx");
const aboutTeam = read("components/tentang/AboutTeam.tsx");
const aboutLegal = read("components/tentang/AboutLegal.tsx");
const aboutBridge = read("components/landing/AboutBridge.tsx");
const aboutJourney = read("components/tentang/AboutJourney.tsx");
const privacy = read("app/kebijakan-privasi/page.tsx");
const terms = read("app/syarat-ketentuan/page.tsx");
const llms = read("public/llms.txt");
const publicFiles = [
  "app/tentang/page.tsx",
  "components/tentang/AboutHero.tsx",
  "components/tentang/AboutTeam.tsx",
  "components/tentang/AboutLegal.tsx",
  "components/tentang/AboutJourney.tsx",
  "components/landing/AboutBridge.tsx",
  "components/public/PageFooter.tsx",
  "app/kebijakan-privasi/page.tsx",
  "app/syarat-ketentuan/page.tsx",
  "public/llms.txt",
  "lib/json-ld.ts",
  "app/layout.tsx",
  "app/artikel/page.tsx",
];
test("21. hero Tentang: 'Dikembangkan oleh PT Bahasa Cerdas Indonesia.'", () =>
  aboutHero.includes("Dikembangkan oleh PT Bahasa Cerdas Indonesia."));
test("22. legalitas tetap section di /tentang, bukan halaman baru", () =>
  tentangPage.includes("AboutLegal") &&
  aboutLegal.includes('id="legalitas"') &&
  !existsSync(join(ROOT, "app/legalitas/page.tsx")));
test("23. legalitas ringkas: PT, alamat CFX, NIB, kontak, hak cipta; tanpa akta/SK/KBLI/pengurus", () =>
  aboutLegal.includes("BahasaCerdas dikelola oleh PT Bahasa Cerdas Indonesia") &&
  aboutLegal.includes("CFX Tower, Jl. Gatot Subroto Kav. 35-36, Kuningan Timur, Setiabudi, Jakarta Selatan 12950") &&
  aboutLegal.includes("NIB 0911260094193") &&
  !aboutLegal.includes("tanggal 9 November 2026") &&
  !aboutLegal.includes("usaha mikro") &&
  !aboutLegal.includes("Akta Pendirian") &&
  !aboutLegal.includes("Siti Aminah") &&
  !aboutLegal.includes("AHU-0089503") &&
  !aboutLegal.includes("KBLI") &&
  !aboutLegal.includes("85610") &&
  !aboutLegal.includes("Direktur") &&
  !aboutLegal.includes("Komisaris") &&
  aboutLegal.includes("halo@bahasacerdas.com") &&
  aboutLegal.includes("Pemegang Hak Cipta: PT Bahasa Cerdas Indonesia") &&
  aboutLegal.includes("001326318") &&
  aboutLegal.includes("EC002026106361") &&
  !aboutLegal.includes("NPWP") &&
  !aboutLegal.includes("PSE"));
test("24. tim inti + dewan penasihat terpisah, tanpa jabatan pengurus di kartu tim", () => {
  const coreBlock = aboutTeam.slice(aboutTeam.indexOf("const coreTeam"), aboutTeam.indexOf("const advisors"));
  const advisorBlock = aboutTeam.slice(aboutTeam.indexOf("const advisors"), aboutTeam.indexOf("function Avatar"));
  const core = [
    "Dominikus Wahyu Heru Cahyadi",
    "Alexander Suryanta",
    "Sugeng Riyanto",
    "Soleh Ahmad Nugraha",
  ];
  let last = -1;
  for (const name of core) {
    const i = coreBlock.indexOf(name);
    if (i < 0 || i < last) return false;
    last = i;
  }
  const melany = advisorBlock.indexOf("Melany Kusumawati");
  const widhar = advisorBlock.indexOf("Dr. B. Widharyanto, M.Pd.");
  return coreBlock.includes('role: "Founder & CEO"') &&
    !coreBlock.includes("Direktur") &&
    coreBlock.includes('role: "Co-Founder & CLO (Chief Learning Officer)"') &&
    !coreBlock.includes("Komisaris") &&
    coreBlock.includes('role: "CTO"') &&
    coreBlock.includes('role: "CBO"') &&
    !coreBlock.includes("Co-Founder & CTO") &&
    !coreBlock.includes("Co-Founder & CBO") &&
    !coreBlock.includes("Head of Content") &&
    aboutTeam.includes('id="advisor"') &&
    melany >= 0 && widhar > melany &&
    advisorBlock.includes('role: "Advisor"') &&
    !advisorBlock.includes("Dewan Penasihat") &&
    !advisorBlock.includes("Validator Akademik") &&
    !advisorBlock.includes("Komisaris") &&
    !aboutTeam.includes("Komisaris") &&
    !aboutTeam.includes("Validator Akademik") &&
    !aboutTeam.includes("Dewan Penasihat") &&
    !aboutLegal.includes("Komisaris") &&
    !aboutLegal.includes("Direktur") &&
    aboutBridge.includes('role: "Advisor"') &&
    !aboutBridge.includes("Komisaris") &&
    !aboutBridge.includes("Validator Akademik") &&
    !aboutBridge.includes("Dewan Penasihat") &&
    !aboutTeam.includes("Washadi");
});
test("24b. JSON-LD memakai gelar publik final, tanpa Head of Content atau Co-Founder pada CTO/CBO", () => {
  const jsonLd = read("lib/json-ld.ts");
  const layout = read("app/layout.tsx");
  return jsonLd.includes("publicPeopleLd") &&
    tentangPage.includes("publicPeopleLd") &&
    layout.includes("publicPeopleLd") &&
    jsonLd.includes("jobTitle: person.role") &&
    !jsonLd.includes("Head of Content") &&
    !tentangPage.includes("Head of Content") &&
    !layout.includes("Komisaris");
});
test("25. footer copyright PT, tautan Tim ke /tentang#tim", () =>
  footer.includes("PT Bahasa Cerdas Indonesia") &&
  footer.includes('href: "/tentang#tim"'));
test("26. privasi, syarat, JSON-LD, dan llms.txt memakai PT (bukan CV lama)", () =>
  privacy.includes("PT Bahasa Cerdas Indonesia") &&
  terms.includes("dikelola oleh") &&
  terms.includes("PT Bahasa Cerdas Indonesia") &&
  terms.includes("beralamat di CFX Tower, Jl. Gatot Subroto Kav. 35-36, Kuningan Timur, Setiabudi, Jakarta Selatan 12950") &&
  llms.includes("PT Bahasa Cerdas Indonesia") &&
  llms.includes("0911260094193") &&
  tentangPage.includes('name: "PT Bahasa Cerdas Indonesia"') &&
  tentangPage.includes('identifier: "0911260094193"') &&
  aboutJourney.includes("November 2026: PT Bahasa Cerdas Indonesia resmi berdiri"));
test("27. copy publik tidak memuat Washadi, CV Obah Mamah, Teras Kata, atau NIB lama", () =>
  publicFiles.every((f) => {
    const src = read(f);
    return !src.includes("Washadi") &&
      !src.includes("Obah Mamah") &&
      !src.includes("Teras Kata") &&
      !src.includes("1217000151443");
  }) && !aboutBridge.includes("Washadi"));
test("28. copy publik tidak memuat akta, notaris, SK AHU, KBLI, usaha mikro, atau jabatan pengurus", () =>
  publicFiles.every((f) => {
    const src = read(f);
    return !src.includes("Akta Pendirian") &&
      !src.includes("Siti Aminah") &&
      !src.includes("AHU-0089503") &&
      !src.includes("usaha mikro") &&
      !src.includes("KBLI") &&
      !src.includes("Direktur:") &&
      !src.includes("Komisaris") &&
      !src.includes("PSE");
  }));


console.log("\n── QA landing modern & konsisten dasbor BC ──");
const faqUi = read("components/landing/FAQSection.tsx");
const roleUi = read("components/landing/PilihPeranmuSection.tsx");
const company = read("lib/company.ts");
const layoutUi = read("app/layout.tsx");
const orgLd = read("lib/json-ld.ts");
const ogImage = read("app/opengraph-image.tsx");
test("FAQ: tombol native tidak double-toggle pada keyboard", () =>
  faqUi.includes("aria-expanded={isOpen}") &&
  faqUi.includes("onClick={() => toggleFAQ(i)}") &&
  !faqUi.includes("onKeyDown="));
test("Pilihan audiens: tiga kartu setara tanpa tab dan tombol sorotan palsu", () =>
  roleUi.includes('className="scroll-mt-24 relative min-w-0 flex flex-col') &&
  roleUi.includes("href={path.href}") &&
  !roleUi.includes("aria-pressed=") &&
  !roleUi.includes('role="tab"') &&
  !roleUi.includes('role="tabpanel"'));
test("Data PT pada metadata dan JSON-LD berasal dari COMPANY", () =>
  company.includes("streetAddress") &&
  layoutUi.includes("COMPANY.legalName") &&
  layoutUi.includes("COMPANY.nib") &&
  orgLd.includes("COMPANY.nib") &&
  footer.includes("COMPANY.address"));
test("OG image tersedia tanpa fetch font atau gambar eksternal", () =>
  ogImage.includes("ImageResponse") &&
  ogImage.includes("1200") && ogImage.includes("630") &&
  !ogImage.includes("fetch("));
test("Delapan ikon resmi BC tetap tampil di landing tanpa section duplikat", () =>
  ["JumpaIcon", "NaraIcon", "AksaraIcon", "TokoKaryaIcon", "GimIcon", "JalurCerdasIcon", "BigtIcon", "KomunitasIcon"].every((n) => hero.includes(n)) &&
  hero.includes('label: "JUMPA"') &&
  hero.includes("<Icon size={26} />"));
test("Produk dapat dinavigasi dari hero mobile", () =>
  hero.includes('aria-label="Produk BahasaCerdas"') &&
  hero.includes("overflow-x-auto") &&
  !hero.includes("mt-6 hidden min-w-0"));
test("Profil sosial: footer dan metadata memakai konfigurasi yang sama", () =>
  company.includes("social:") &&
  footer.includes("COMPANY.social.instagram") &&
  footer.includes("COMPANY.social.youtube") &&
  layoutUi.includes("COMPANY.social.instagram") &&
  orgLd.includes("COMPANY.social.youtube"));
test("SEO: tidak mengiklankan /search yang belum memiliki halaman", () =>
  !layoutUi.includes('"SearchAction"') &&
  !orgLd.includes('"SearchAction"'));
test("Landing ringkas: pesan perjalanan belajar tidak berulang", () =>
  page.includes("<EcosystemSection />") &&
  !page.includes("<LearningLoopSection />"));

test("Footer publik punya latar navy yang terdefinisi secara global (bukan token scoped UMUM)", () =>
  footer.includes('className="bg-zinc-900 text-white/70"') &&
  footer.includes('backgroundColor: "var(--bc-guru-header-night)"') &&
  !footer.includes("bg-bc-navy") &&
  read("app/theme/tokens.css").includes("--bc-guru-header-night:"));

console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`);
if (failed > 0) process.exit(1);
