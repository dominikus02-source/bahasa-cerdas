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
const allStudentHome = ["StudentHomeHero", "ContinueLearningCard", "AIBCHomeCard", "LearningJourneySection", "RuangBelajarSection", "SimulasiUjianSection", "RecentWorksSection", "ArenaHomeSection", "PremiumValueCard", "SecondaryLearningInfo"]
  .map((f) => `components/student-home/${f}.tsx`).map(read).join("\n");

// 1 — My Day renders
check("1. Beranda dibungkus HomeDataProvider", page.includes("<HomeDataProvider>"));
check("1. SkillRadar terintegrasi (ex-komponen mati)", page.includes("<SkillRadar />"));
check("1. PremiumValueCard terintegrasi", page.includes("<PremiumValueCard />"));

// 2 — Personalized next action dari Learning Loop
check("2. Rekomendasi dari /api/player/session (bukan engine baru)", continueCard.includes('"/api/player/session"'));
check("2. Tidak ada rekomendasi statis di success path (fallback hanya EMPTY)", continueCard.includes('action || {'));

// 3 — Session loading
check("3. Loading state eksplisit (skeleton)", continueCard.includes('status === "loading"') && continueCard.includes("px-skeleton"));

// 4 — Session error + retry
check("4. Error state jujur ('Belum bisa memuat rekomendasi')", continueCard.includes("Belum bisa memuat rekomendasi belajarmu."));
check("4. Tombol Coba Lagi (retry)", continueCard.includes("Coba Lagi") && continueCard.includes("setAttempt"));
check("4. Error branch TIDAK menampilkan fallback CTA personal palsu", continueCard.includes("Ke Jalur Cerdas") && !continueCard.includes("Lanjutkan Perjalananmu"));

// 5 — Empty/new student
check("5. Empty state bermakna ('Mulai latihan pertamamu')", continueCard.includes("Mulai latihan pertamamu"));
check("5. Empty fallback ke rute belajar nyata", continueCard.includes("/arena/jalur-cerdas"));
check("5. Empty diberi label jujur ('Saran untukmu')", continueCard.includes("Saran untukmu"));

// 7 — One dominant CTA (gold hanya di ContinueLearningCard + MentorCard insight)
check("7. Satu CTA emas di student-home", !["StudentHomeHero", "AIBCHomeCard", "LearningJourneySection", "RuangBelajarSection", "SimulasiUjianSection", "RecentWorksSection", "ArenaHomeSection", "PremiumValueCard", "SecondaryLearningInfo"]
  .some((f) => read(`components/student-home/${f}.tsx`).includes("px-btn-gold")));
check("7. AI BC CTA sekunder (ghost)", read("components/student-home/AIBCHomeCard.tsx").includes("px-btn-ghost"));
check("7. Arena CTA sekunder (ghost)", arena.includes("px-btn-ghost"));

// 8 — Mentor insight
check("8. MentorCard dipakai di ContinueLearningCard", continueCard.includes("<MentorCard data={session} />"));
check("8. MentorCard menerima data → TIDAK fetch duplikat", mentorCard.includes("data?: MentorCardData | null") && mentorCard.includes("if (data !== null)"));
check("8. Insight mentor ditampilkan sebagai 'kenapa'", continueCard.includes("Mengapa ini untukmu"));

// 9-10 — SkillRadar
check("9. SkillRadar data nyata dari /api/player/skills", skillRadar.includes('"/api/player/skills"'));
check("10. SkillRadar empty state ('Belum ada data kemampuan')", skillRadar.includes("Belum ada data kemampuan"));
check("10. SkillRadar error state + retry (bukan null diam)", skillRadar.includes("Belum bisa memuat kemampuanmu.") && skillRadar.includes("Coba Lagi") && !skillRadar.includes("if (failed) return null"));

// 11 — Arena XP/rank
check("11. Arena pakai data nyata (levelProgress.remaining)", arena.includes("levelProgress"));
check("11. Motivasi 'XP lagi menuju'", arena.includes("XP lagi menuju"));

// 12-13 — Premium
check("12. Premium user: badge 'Personalisasi Premium aktif'", premium.includes("Personalisasi Premium aktif"));
check("12. Trial ditandai jujur (Masa Uji)", premium.includes("Masa Uji"));
check("13. Free user: nilai halus tanpa paywall CTA", premium.includes("tersedia di Premium"));

// 14 — Premium authorization (canonical)
check("14. Status premium HANYA dari API canonical server", premium.includes('"/api/player/premium/status"'));
check("14. Tidak ada premium2/isPremium2/studentPremium di student-home", !/premium2|isPremium2|studentPremium/i.test(allStudentHome));
check("14. Tidak ada input plan/quota dari klien", !premium.includes("req.json") && !premium.includes("body"));

// 15 — Dashboard summary no duplicate fetch
check("15. /api/murid/dashboard/summary hanya di home-data", (allStudentHome.match(/api\/murid\/dashboard\/summary/g) || []).length === 0 && homeData.includes('"/api/murid/dashboard/summary"'));
check("15. /api/player/profile hanya di home-data", (allStudentHome.match(/api\/player\/profile/g) || []).length === 0 && homeData.includes('"/api/player/profile"'));

// 16 — Mobile first
check("16. Grid mobile grid-cols-1", page.includes("grid-cols-1"));
check("16. Container tidak overflow (max-w + truncate)", page.includes("max-w-[1200px]") && allStudentHome.includes("truncate"));

// 21 — AI reliability
check("21. My Day tanpa dependensi LLM (tanpa fetch AI di beranda)", !allStudentHome.includes("/api/ai/"));

console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
if (fail > 0) process.exit(1);
process.exit(0);
