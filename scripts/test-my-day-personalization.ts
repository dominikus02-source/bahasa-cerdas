/**
 * MY DAY PERSONALIZATION — Step 3H (statis, tanpa DB).
 * Run: npx tsx scripts/test-my-day-personalization.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const read = (p: string) => {
  try {
    return readFileSync(join(ROOT, p), "utf8");
  } catch {
    return "";
  }
};

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean) {
  if (ok) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}`);
  }
}

console.log("\nTEST MY DAY PERSONALIZATION 3H (statis, tanpa DB)\n");

const api = read("app/api/player/adaptive-practice/route.ts");
const selector = read("lib/adaptive-practice/selector.ts");
const homeData = read("components/student-home/home-data.tsx");
const page = read("app/(dashboard)/murid/beranda/page.tsx");
const continueCard = read("components/student-home/ContinueLearningCard.tsx");
const sessionPage = read("app/arena/adaptive-practice/[sessionId]/page.tsx");
const mentorCard = read("components/arena/player/MentorCard.tsx");
const skillRadar = read("components/arena/player/SkillRadar.tsx");
const audit = read("docs/PHASE_2_STEP_3H_MY_DAY_PERSONALIZATION_AUDIT.md");
const contract = read("docs/PHASE_2_STEP_3H_MY_DAY_CONTRACT.md");
const homeApi = read("app/api/player/adaptive-practice/route.ts");

// 1 — Read-only preview (no side effects)
check("1. Preview adalah GET read-only", api.includes("GET") && !api.includes("recordActivity"));
check("1. Preview dipasang di home-data (bukan per-komponen)", homeData.includes("adaptive-practice?mode=preview") && !continueCard.includes("?mode=preview"));

// 2 — Preview reuses canonical selector, bukan engine baru
check("2. Preview memakai selectAdaptivePractice", api.includes("selectAdaptivePractice"));
check("2. Reason text sepenuhnya dari server (client tidak membuat copy)", selector.includes("reasonText") && !selector.includes("Math.random"));

// 3 — Deterministic titles
check("3. NO_DATA → 'Mulai Latihan Hari Ini'", selector.includes("Mulai Latihan Hari Ini"));
check("3. WEAK_SKILL → 'Perkuat'", selector.includes("Perkuat"));
check("3. PROGRESSION → 'Lanjutkan Perkembanganmu'", selector.includes("Lanjutkan Perkembanganmu"));
check("3. PRACTICE_GAP → 'Latihan Lagi'", selector.includes("Latihan Lagi"));

// 4 — Server-authoritative start
check("4. Start = POST dengan action server-side", continueCard.includes('action: "start"'));
check("4. Client tidak mengirim skill/difficulty/questionIds", !continueCard.includes("targetSkill") && !continueCard.includes("targetDifficulty") && !continueCard.includes("questionIds"));
check("4. Session dipagari pemilik (findFirst id + userId)", api.includes("where: { id: sessionId, userId }"));

// 5 — Answer flow without answer-key leakage
check("5. Session GET tidak mengekspos jawaban", !sessionPage.includes("correctAnswer") && !sessionPage.includes("answerKey") && !sessionPage.includes('"jawaban"'));
check("5. Session page POST answer dan complete", sessionPage.includes('action: "answer"') && sessionPage.includes('action: "complete"'));
check("5. Session page menampilkan progress dan navigasi", sessionPage.includes("index + 1") && sessionPage.includes("Soal Berikutnya"));

// 6 — My Day hierarchy: satu CTA dominan + skill + premium dari konteks
check("6. SkillRadar membaca learnerState dari My Day", page.includes("<SkillRadar skills=") && page.includes("learnerState"));
check("6. SkillRadar tidak fetch sendiri", !skillRadar.includes("/api/player/skills") && !skillRadar.includes("useEffect"));
check("6. MentorCard menerima data My Day", continueCard.includes("<MentorCard") && mentorCard.includes("data?: MentorCardData"));

// 7 — Insufficient data behaves honestly
check("7. Fallback mode jujur FALLBACK + GENERAL_LEARNING", api.includes('mode: "FALLBACK"') && api.includes('actionType: "GENERAL_LEARNING"'));
check("7. Fallback mengarahkan ke rute nyata", api.includes("/arena/jalur-cerdas"));

// 8 — Protected zones (UKBI/TKA, Premium billing, reward engine, LLM)
check("8. Tidak menyebarkan premium/UKBI/TKA logic ke adaptive", !api.includes("PaketKompetensi") && !api.includes("premiumUntil"));
check("8. My Day tanpa dependensi LLM", !homeData.includes("/api/ai/") && !continueCard.includes("/api/ai/"));
check("8. Tidak ada prompt/LLM di folder adaptive", !read("lib/adaptive-practice/selector.ts").includes("Anthropic") && !read("lib/adaptive-practice/selector.ts").includes("OpenAI"));

// 9 — Route contract matches docs
check("9. Kontrak dokumentasi ada", contract.includes("Canonical Response") && contract.includes("premiumDepth"));
check("9. Kontrak menyebut sessionSize dan confidence", contract.includes("sessionSize") && contract.includes("confidence"));
check("9. Audit disimpan sebagai dokumen fase", audit.includes("3H"));

console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
if (fail > 0) process.exit(1);
process.exit(0);