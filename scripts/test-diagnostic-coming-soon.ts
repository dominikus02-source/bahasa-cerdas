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
const card = read("components/student-home/ContinueLearningCard.tsx");
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
check("1. AI_DIAGNOSTIC_COMING_SOON didefinisikan = true (soal AI belum siap produksi)", () =>
  config.includes("export const AI_DIAGNOSTIC_COMING_SOON = true;"));
check("2. komentar menjelaskan syarat balik ke false (QA ≥100 butir + audit 0 ❌)", () =>
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

console.log("\n── UI kartu Aksi Hari Ini ──");
check("9. badge 'Segera Hadir' dirender", () => card.includes("Segera Hadir"));
check("10. cabang coming-soon dipasang SEBELUM STATE A (Mulai Tes Awal)", () =>
  card.indexOf("STATE A+") > -1 && card.indexOf("STATE A+") < card.indexOf("STATE A — Belum ada bukti"));
check("11. cabang coming-soon TIDAK memanggil startDiagnosticSession (tanpa tombol mulai)", () => {
  const blok = card.slice(card.indexOf("STATE A+"), card.indexOf("STATE A — Belum ada bukti"));
  return !blok.includes("startDiagnosticSession") && blok.includes("currentMyDay.comingSoon");
});
check("12. CTA fallback jujur ke Jalur Cerdas ('mulai belajar dulu')", () =>
  card.includes("Sambil menunggu, mulai belajar dulu") && card.includes("href=\"/arena/jalur-cerdas\""));
check("13. path STATE A asli utuh — 'Mulai Tes Awal' + 'Kenali Kemampuanmu' tetap ada", () =>
  card.includes("Mulai Tes Awal") && card.includes("Kenali Kemampuanmu"));

console.log("\n── Kontrak data ──");
check("14. MyDayResponse menyertakan comingSoon?: boolean", () =>
  homeData.includes("comingSoon?: boolean;") && homeData.includes("Segera Hadir"));

console.log("\n── Protected zones & regression ──");
check("15. prisma/ & engine gamification/learning-loop 0 diff", () =>
  noDiff("prisma/ lib/gamification/ lib/learning-loop/ engines/ lib/apk.ts lib/coins.ts lib/award-xp.ts lib/adaptive-practice/ lib/learner-state/"));
check("16. route diagnostik tetap tanpa awardXp/addCoin (engine reward tak disentuh)", () =>
  !route.includes("awardXp") && !route.includes("addCoin"));

console.log("\n" + "=".repeat(60));
console.log(`Hasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
process.exit(0);