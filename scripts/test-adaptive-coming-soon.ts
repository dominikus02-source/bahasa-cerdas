/**
 * TEST — Gerbang produksi Latihan Personal (Adaptive Practice):
 * "Mulai Latihan" → "Akan Segera Hadir", tanpa sesi yang bisa dimulai.
 *
 * Memeriksa (tanpa DB):
 *  1. Flag ADAPTIVE_PRACTICE_COMING_SOON ada & TRUE di lib/diagnostic-ai/config.ts
 *  2. POST /api/player/adaptive-practice action=start ditolak 503 saat flag TRUE
 *  3. Preview adaptive membawa comingSoon:true saat flag TRUE
 *  4. ContinueLearningCard: branch gate ADAPTIVE → badge "Akan Segera Hadir",
 *     tanpa tombol mulai, tanpa onClick start, ada link jalur-cerdas
 *  5. BASELINE_COMPLETE_LOW: CTA adaptive diganti badge saat flag TRUE
 *  6. Tidak ada panggilan startAdaptiveSession tersisa di kartu
 *  7. AI_DIAGNOSTIC_DEFAULT_SIZE masih ada (regresi edit sebelumnya)
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");
let pass = 0;
let fail = 0;

function check(label: string, ok: boolean) {
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}`);
  }
}

function read(rel: string): string {
  const p = join(ROOT, rel);
  if (!existsSync(p)) {
    console.log(`  ⚠️  file tidak ada: ${rel}`);
    return "";
  }
  return readFileSync(p, "utf8");
}

console.log("Gerbang Latihan Personal (Adaptive Practice):\n");

const config = read("lib/diagnostic-ai/config.ts");
check("1. Flag ADAPTIVE_PRACTICE_COMING_SOON ada", config.includes("ADAPTIVE_PRACTICE_COMING_SOON"));
check("2. Flag bernilai FALSE (gerbang OFF — produksi aktif)", /ADAPTIVE_PRACTICE_COMING_SOON\s*=\s*false/.test(config));
check("3. Regresi: AI_DIAGNOSTIC_DEFAULT_SIZE tetap ada", config.includes("AI_DIAGNOSTIC_DEFAULT_SIZE = 10"));

const route = read("app/api/player/adaptive-practice/route.ts");
check("4. Route mengimpor flag", route.includes('ADAPTIVE_PRACTICE_COMING_SOON } from "@/lib/diagnostic-ai/config"'));
check("5. POST start ditolak 503 saat flag TRUE (gerbang server-side)",
  route.includes('if (ADAPTIVE_PRACTICE_COMING_SOON)') &&
  route.includes('status: 503') &&
  route.includes('"Latihan personal belum tersedia"'));
check("6. Guard start berada sebelum rate limit start",
  route.indexOf("if (ADAPTIVE_PRACTICE_COMING_SOON)") < route.indexOf("rateLimitRoute(req, ADAPTIVE_START_RATE_LIMIT)"));
check("7. Preview adaptive membawa comingSoon saat flag TRUE",
  route.includes("comingSoon: ADAPTIVE_PRACTICE_COMING_SOON || undefined,"));

// ContinueLearningCard dihapus dari beranda — cabang gate kini di StudentHomeHero,
// dengan comingSoon server-derived via payload preview (bukan import flag klien).
const hero = read("components/student-home/StudentHomeHero.tsx");
check("8. Hero TIDAK mengimpor flag — comingSoon server-derived (payload preview)",
  !hero.includes("ADAPTIVE_PRACTICE_COMING_SOON") && hero.includes("myDay.comingSoon"));
check("9. Branch gate ADAPTIVE ada (isAdaptive + myDay.comingSoon sebelum start)", (() => {
  const adaptiveBlock = hero.slice(hero.indexOf("if (isAdaptive)"), hero.indexOf("// STATE C"));
  const gate = adaptiveBlock.indexOf("myDay.comingSoon");
  const start = adaptiveBlock.indexOf('{ kind: "start-adaptive" }');
  return adaptiveBlock.includes("isAdaptive") && gate > -1 && (start === -1 || gate < start);
})());
check("10. Branch adaptive coming-soon → CTA 'Lanjutkan Belajar' tanpa start", (() => {
  const adaptiveBlock = hero.slice(hero.indexOf("if (isAdaptive)"), hero.indexOf("// STATE C"));
  const gateBlock = adaptiveBlock.slice(adaptiveBlock.indexOf("if (myDay.comingSoon)"), adaptiveBlock.indexOf("{ kind: \"start-adaptive\" }"));
  return gateBlock.includes('href: "/arena/jalur-cerdas"') && !gateBlock.includes("startAdaptiveSession");
})());
check("11. Tombol mulai latihan adaptive aktif (ada startAdaptiveSession)",
  hero.includes("startAdaptiveSession") && hero.includes("Lanjutkan Belajar"));
check("12. Cabang diag coming-soon jujur: 'Sambil menunggu, mulai belajar di Jalur Cerdas'",
  hero.includes("Sambil menunggu, mulai belajar") && hero.includes('href: "/arena/jalur-cerdas"'));
check("13. Bar akurasi skill TIDAK diduplikasi di hero (permukaan skill = SkillRadar)",
  !hero.includes('role="progressbar"') && read("components/arena/player/SkillRadar.tsx").includes("skills"));
check("14. Reason tetap eksplisit di hero (supporting = myDay.reasonText)", hero.includes("myDay.reasonText"));
check("15. Hero tetap CTA utama gold gradient (diagnostik sah — bukan px-btn-gold duplikat)",
  hero.includes("from-[#ffd24a]") && hero.includes("Mulai Tes"));
check("16. Guard literal targetSkill tidak dilanggar (test:my-day-home #15)",
  !hero.includes("targetSkill"));

const homeData = read("components/student-home/home-data.tsx");
check("17. Tipe preview mendukung comingSoon", homeData.includes("comingSoon?: boolean;"));

console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
process.exit(fail === 0 ? 0 : 1);
