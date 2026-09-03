/**
 * GERBANG "SEGERA HADIR" — Tes Awal AI (diagnostic) belum siap produksi.
 *
 * QA 8.4.1 dipause di 18 butir (Groq-only). Selama AI_DIAGNOSTIC_COMING_SOON
 * aktif, preview "Aksi Hari Ini" menandai entri Tes Awal dengan comingSoon:true
 * dan UI menampilkan badge "Segera Hadir" — murid baru tidak memulai tes dengan
 * soal yang belum matang, dan tidak kecewa dengan hasilnya.
 *
 * Statik + unit murni (tanpa DB). Jangan melemahkan test lain.
 *
 * Run: npm run test:diagnostic-coming-soon
 */
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const noDiff = (path: string) => execSync(`git diff --name-only HEAD -- ${path}`, { encoding: "utf8", cwd: process.cwd() }).trim().length === 0;

const config = read("lib/diagnostic-ai/config.ts");
const route = read("app/api/player/diagnostic/route.ts");
// ContinueLearningCard dihapus dari beranda — cabang coming-soon kini di
// StudentHomeHero (comingSoon server-derived via payload preview).
const hero = read("components/student-home/StudentHomeHero.tsx");
const homeData = read("components/student-home/home-data.tsx");

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean) {
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`);
  }
}

console.log("── Konfigurasi gerbang ──");
// Gerbang saat ini TERBUKA (flag false — Tes Awal produksi aktif, terverifikasi
// lewat sesi nyata). Suite menguji cabang defensif di hero: jika flag dibalik
// ke true, entri Tes Awal harus degradasi aman (tanpa tombol mulai, CTA
// fallback ke Jalur Cerdas) tanpa mengubah route/sesi.
check("1. AI_DIAGNOSTIC_COMING_SOON didefinisikan = false (gerbang terbuka)", () =>
  config.includes("export const AI_DIAGNOSTIC_COMING_SOON = false;"));
check("2. komentar menjelaskan syarat QA (≥100 butir + audit 0 ❌) untuk balik ke true", () =>
  config.includes("qa-ai-diagnostic-8-4-1") && config.includes("AI_DIAGNOSTIC_COMING_SOON = false"));

console.log("\n── Route preview (server-authoritative) ──");
check("3. route mengimpor AI_DIAGNOSTIC_COMING_SOON", () => route.includes("AI_DIAGNOSTIC_COMING_SOON,"));
check("4. NO_BASELINE branch menghitung aiComingSoon (state + enabled + flag)", () =>
  route.includes("assessment.state === \"NO_BASELINE\" && aiDiagnosticEnabled() && AI_DIAGNOSTIC_COMING_SOON"));
check("5. reasonText jujur 'akan segera hadir' (bukan klaim tes tersedia)", () =>
  route.includes("Tes Awal sedang disempurnakan dan akan segera hadir"));
check("6. payload NO_BASELINE membawa comingSoon", () =>
  route.includes("comingSoon: aiComingSoon || undefined,"));
check("7. entri Tes Awal AI lain (branch AI) ikut ditandai comingSoon", () => {
  const aiBranch = route.slice(route.indexOf("if (aiDiagnosticEnabled()) {"), route.indexOf("} catch {"));
  return aiBranch.includes("AI_DIAGNOSTIC_COMING_SOON") && aiBranch.includes("comingSoon: aiComingSoon || undefined,");
});
check("8. BASELINE_IN_PROGRESS (resume) TIDAK ditandai — murid yang sedang tes tidak ditinggalkan", () => {
  const npm = route.slice(route.indexOf("For BASELINE_IN_PROGRESS"), route.indexOf("// Gerbang"));
  return !npm.includes("comingSoon");
});

console.log("\n── UI hero (pengganti kartu Aksi Hari Ini) ──");
check("9. cabang coming-soon DIAGNOSTIC ada di hero (fallback jujur 'Tes awal masih disiapkan')", () =>
  hero.includes("Tes awal masih disiapkan") && hero.includes('ctaLabel: "Mulai Belajar"'));
check("10. cabang coming-soon dipasang SEBELUM STATE A ('Mulai Tes' normal)", () =>
  hero.indexOf("myDay.comingSoon") > -1 && hero.indexOf("myDay.comingSoon") < hero.indexOf('ctaLabel: "Mulai Tes"'));
check("11. cabang coming-soon TIDAK memanggil startDiagnosticSession (tanpa tombol mulai)", () => {
  const blok = hero.slice(hero.indexOf("if (myDay.comingSoon)"), hero.indexOf('if (state === "BASELINE_IN_PROGRESS")'));
  return !blok.includes("startDiagnosticSession") && blok.includes('href: "/arena/jalur-cerdas"');
});
check("12. CTA fallback jujur ke Jalur Cerdas ('mulai belajar di Jalur Cerdas')", () =>
  hero.includes("Sambil menunggu, mulai belajar") && hero.includes('href: "/arena/jalur-cerdas"'));
check("13. path STATE A asli utuh — 'Mulai Tes' + 'Kenali kemampuanmu' tetap ada", () =>
  hero.includes("Mulai Tes") && /Kenali kemampuanmu/i.test(hero));

console.log("\n── Kontrak data ──");
check("14. MyDayResponse menyertakan comingSoon?: boolean dan hero membacanya", () =>
  homeData.includes("comingSoon?: boolean;") && hero.includes("myDay.comingSoon"));

console.log("\n── Protected zones & regression ──");
check("15. prisma/ & engine gamification/learning-loop 0 diff", () =>
  noDiff("prisma/ lib/gamification/ lib/learning-loop/ engines/ lib/apk.ts lib/coins.ts lib/award-xp.ts lib/adaptive-practice/ lib/learner-state/"));
check("16. route diagnostik tetap tanpa awardXp/addCoin (engine reward tak disentuh)", () =>
  !route.includes("awardXp") && !route.includes("addCoin"));

console.log("\n" + "=".repeat(60));
console.log(`Hasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
process.exit(0);