/**
 * MY DAY / LEARNING COMPANION — test Step 2B (statis, tanpa DB).
 * Run: npx tsx scripts/test-my-day-home.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const read = (p: string) => {
  try { return readFileSync(join(ROOT, p), "utf8"); } catch { return ""; }
};

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean) {
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
}

console.log("\nTEST MY DAY HOME 2B (statis, tanpa DB)\n");

const page = read("app/(dashboard)/murid/beranda/page.tsx");
const continueCard = read("components/student-home/ContinueLearningCard.tsx");
const mentorCard = read("components/arena/player/MentorCard.tsx");
const skillRadar = read("components/arena/player/SkillRadar.tsx");
const arena = read("components/student-home/ArenaHomeSection.tsx");
const premium = read("components/student-home/PremiumValueCard.tsx");
const homeData = read("components/student-home/home-data.tsx");
const adaptiveApi = read("app/api/player/adaptive-practice/route.ts");
const allStudentHome = ["StudentHomeHero", "ContinueLearningCard", "AIBCHomeCard", "LearningJourneySection", "RuangBelajarSection", "SimulasiUjianSection", "RecentWorksSection", "ArenaHomeSection", "PremiumValueCard", "SecondaryLearningInfo"]
  .map((f) => `components/student-home/${f}.tsx`).map(read).join("\n");

// 1 — My Day renders
check("1. Beranda dibungkus HomeDataProvider", page.includes("<HomeDataProvider>"));
check("1. SkillRadar terintegrasi dari canonical My Day state", page.includes("<SkillRadar") && page.includes("myDay?.learnerState"));
check("1. PremiumValueCard terintegrasi", page.includes("<PremiumValueCard />"));

// 2 — Personalized next action dari Learning Loop
check("2. Rekomendasi dari adaptive preview canonical", homeData.includes("/api/player/adaptive-practice?mode=preview") && adaptiveApi.includes("selectAdaptivePractice"));
check("2. Primary action memakai server My Day response", continueCard.includes("myDay.actionTitle") && continueCard.includes("myDay.reasonText") && !continueCard.includes('action || {'));

// 3 — Session loading
check("3. Loading state eksplisit (skeleton)", continueCard.includes("myDayLoading") && continueCard.includes("px-skeleton"));

// 4 — Session error + retry
check("4. Error state jujur ('Belum bisa memuat rekomendasi')", continueCard.includes("Belum bisa memuat rekomendasi belajarmu."));
check("4. Tombol Coba Lagi (retry)", continueCard.includes("Coba Lagi") && continueCard.includes("refreshMyDay"));
check("4. Error branch tidak menampilkan rekomendasi palsu", continueCard.includes("myDayFailed") && !continueCard.includes("Lanjutkan Perjalananmu"));

// 5 — Empty/new student
check("5. Insufficient data memiliki judul jujur", adaptiveApi.includes("Mulai Latihan Hari Ini") && adaptiveApi.includes("GENERAL_LEARNING"));
check("5. Insufficient data fallback ke rute belajar nyata", adaptiveApi.includes("/arena/jalur-cerdas"));
check("5. Insufficient data tidak mengklaim adaptive", adaptiveApi.includes('mode: "FALLBACK"'));

// 7 — One dominant CTA (gold hanya di ContinueLearningCard + MentorCard insight)
check("7. Satu CTA emas di student-home", !["StudentHomeHero", "AIBCHomeCard", "LearningJourneySection", "RuangBelajarSection", "SimulasiUjianSection", "RecentWorksSection", "ArenaHomeSection", "PremiumValueCard", "SecondaryLearningInfo"]
  .some((f) => read(`components/student-home/${f}.tsx`).includes("px-btn-gold")));
check("7. AI BC CTA sekunder (ghost)", read("components/student-home/AIBCHomeCard.tsx").includes("px-btn-ghost"));
check("7. Arena CTA sekunder (ghost)", arena.includes("px-btn-ghost"));

// 8 — Mentor insight
check("8. MentorCard memakai konteks My Day yang sama", continueCard.includes("<MentorCard data={mentorData}") && continueCard.includes("focusText={myDay.reasonText}"));
check("8. MentorCard menerima data → TIDAK fetch duplikat", mentorCard.includes("data?: MentorCardData | null") && mentorCard.includes("if (data !== null)"));
check("8. Mentor tidak membuat recommendation engine kedua", mentorCard.includes("focusText") && !mentorCard.includes("getNextAction"));

// 9-10 — SkillRadar
check("9. SkillRadar menerima learner state nyata", skillRadar.includes("LearnerSkillState") && skillRadar.includes("skills?: LearnerSkillState[]"));
check("10. SkillRadar insufficient-data state", skillRadar.includes("Mulai beberapa latihan dulu"));
// P5B sengaja menambah CTA premium/fokus (SKILL_CTA_MAP → jalur-cerdas / murid-premium).
// Yang dilarang tetap: engine rekomendasi KEDUA (next-action) di dalam SkillRadar.
check("10. SkillRadar tanpa engine rekomendasi kedua", !skillRadar.includes("/api/player/next-action") && (skillRadar.includes("SKILL_CTA_MAP") || skillRadar.includes('href="/arena/jalur-cerdas"')));

// 11 — Arena XP/rank
check("11. Arena pakai data nyata (levelProgress.remaining)", arena.includes("levelProgress"));
check("11. Motivasi 'XP lagi menuju'", arena.includes("XP lagi menuju"));

// 12-13 — Premium
check("12. Premium user: badge 'Personalisasi Aktif'", premium.includes("Personalisasi Aktif"));
check("12. Trial ditandai jujur (Masa Uji)", premium.includes("Masa Uji"));
check("13. Free user: nilai halus tanpa paywall CTA", premium.includes("Premium bisa membantu") && premium.includes("Lihat Premium"));

// 14 — Premium authorization (canonical)
check("14. Status premium dibagi dari home-data canonical", homeData.includes('"/api/player/premium/status"') && premium.includes("useHomeData"));
check("14. Tidak ada premium2/isPremium2/studentPremium di student-home", !/premium2|isPremium2|studentPremium/i.test(allStudentHome));
check("14. Tidak ada input plan/quota dari klien", !premium.includes("req.json") && !premium.includes("quota") && !premium.includes('"plan"'));

// 15 — Adaptive session start is server-authoritative (client sends only {action:"start"})
check("15. CTA adaptive POST hanya kirim {action:'start'} (server tentukan skill/difficulty)", (() => {
  const fetchMatch = continueCard.match(/fetch\("\/api\/player\/adaptive-practice"[\s\S]*?action:\s*"start"/);
  return fetchMatch !== null;
})());
check("15. CTA tidak mengirim skill/difficulty/question IDs", !continueCard.includes("targetSkill") && !continueCard.includes("questionIds") && !continueCard.includes("targetDifficulty"));

// 15 — Dashboard summary no duplicate fetch
check("16. /api/murid/dashboard/summary hanya di home-data", (allStudentHome.match(/api\/murid\/dashboard\/summary/g) || []).length === 0 && homeData.includes('"/api/murid/dashboard/summary"'));
check("16. My Day adaptive preview hanya di home-data", (allStudentHome.match(/api\/player\/adaptive-practice\?mode=preview/g) || []).length === 0 && homeData.includes("/api/player/adaptive-practice?mode=preview"));
check("16. /api/player/profile hanya di home-data", (allStudentHome.match(/api\/player\/profile/g) || []).length === 0 && homeData.includes('"/api/player/profile"'));

// 16 — Mobile first
check("16. Grid mobile grid-cols-1", page.includes("grid-cols-1"));
check("16. Container tidak overflow (max-w + truncate)", page.includes("max-w-[1200px]") && allStudentHome.includes("truncate"));

// 21 — AI reliability
check("21. My Day tanpa dependensi LLM (tanpa fetch AI di beranda)", !allStudentHome.includes("/api/ai/"));

console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
if (fail > 0) process.exit(1);
process.exit(0);
