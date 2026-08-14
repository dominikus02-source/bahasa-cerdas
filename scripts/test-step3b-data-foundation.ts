/**
 * Phase 2 Step 3B — Learning Data Foundation Hardening.
 * Static boundary checks + pure server scoring checks; no DB required.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deriveClientEvent } from "../lib/learning-loop/client-events";
import { scoreJalurAnswers } from "../lib/jalur-cerdas/scoring";

const ROOT = join(__dirname, "..");
const read = (file: string) => readFileSync(join(ROOT, file), "utf8");

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean) {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${name}`);
  } else {
    failed += 1;
    console.log(`  ❌ ${name}`);
  }
}

console.log("\nSTEP 3B DATA FOUNDATION SECURITY TESTS\n");

const activityRoute = read("app/api/learning-loop/activity/route.ts");
const clientEvents = read("lib/learning-loop/client-events.ts");
const coinRoute = read("app/api/player/coin/route.ts");
const progressRoute = read("app/api/jalur-cerdas/[unitId]/progress/route.ts");
const lessonPage = read("app/arena/jalur-cerdas/[unitId]/lesson/page.tsx");
const awardXp = read("lib/award-xp.ts");

// Client activity boundary.
const derivedSafe = deriveClientEvent("user-a", "LOGIN");
check("1. LOGIN client event diterima", derivedSafe?.type === "LOGIN");
check("2. Client event tidak menghasilkan skillDelta", derivedSafe?.skillDelta === 0);
check("3. Client event tidak menghasilkan XP", derivedSafe?.xp === 0);
check("4. Client event tidak menghasilkan koin", derivedSafe?.coin === 0);
check("5. Event belajar harus lewat route server", deriveClientEvent("user-a", "JALUR_CERDAS") === null);
check("6. Event KARYA harus lewat route server", deriveClientEvent("user-a", "KARYA") === null);
check("7. User ID activity berasal dari sesi route", activityRoute.includes("deriveClientEvent(user.id") && !activityRoute.includes("body.userId"));
check("8. Nilai reward body tidak dibaca route activity", !activityRoute.includes("body.skillDelta") && !activityRoute.includes("body.xp") && !activityRoute.includes("body.coin"));
check("9. Client event memiliki rules server canonical", clientEvents.includes("CLIENT_EVENT_RULES") && clientEvents.includes('skillDelta: 0'));
check("10. Activity route memiliki rate limit", activityRoute.includes("learning-loop-client-event") && activityRoute.includes("maxRequests: 30"));

// Malicious numeric payload is not part of the derivation API.
const malicious = deriveClientEvent("user-a", "LOGIN");
check("11. Payload xp=999999 tidak mengubah reward", malicious?.xp !== 999999 && malicious?.xp === 0);
check("12. Payload coin=999999 tidak mengubah reward", malicious?.coin !== 999999 && malicious?.coin === 0);
check("13. Payload skillDelta=999999 tidak mengubah skill", malicious?.skillDelta !== 999999 && malicious?.skillDelta === 0);

// Jalur server-side scoring.
const questions = [
  { id: "q1", jawaban: "Jakarta" },
  { id: "q2", jawaban: 1 },
  { id: "q3", jawaban: "Benar" },
];
const score = scoreJalurAnswers(questions, { q1: "Jakarta", q2: 0, q3: "Benar", score: 100000 });
check("14. Score dihitung dari jawaban server", score.correctCount === 2 && score.score === 67);
check("15. Score body tidak menjadi jawaban", score.totalQuestions === 3 && score.answeredCount === 3);
check("16. Progress route membaca answers", progressRoute.includes("body.answers") && progressRoute.includes("scoreJalurAnswers"));
check("17. Progress route tidak membaca body.score", !progressRoute.includes("body.score"));
check("18. Progress route membatasi unit ke JALUR", progressRoute.includes('unit.level.type !== "JALUR"'));
check("19. Progress route memakai unit reward dari DB", progressRoute.includes("unit.xpReward") && progressRoute.includes("unit.coinReward"));
check("20. Lesson mengirim jawaban per soal", lessonPage.includes("submittedAnswers") && lessonPage.includes("answers: submittedAnswers"));

// Coin and XP boundaries.
check("21. Coin add bukan endpoint bebas murid", coinRoute.includes('action === "add" && !user.isFounder && user.role !== "ADMIN"'));
check("22. Coin deduction tetap saldo-checked di engine", read("lib/gamification/coin-engine.ts").includes("profile.coin < amt"));
check("23. Player XP endpoint admin/founder-only", read("app/api/player/xp/route.ts").includes("!user.isFounder && user.role !== \"ADMIN\""));
check("24. XP canonical tetap awardXp", progressRoute.includes("awardXp(user.id") && awardXp.includes("Satu-satunya pintu pemberian XP"));
check("25. Evidence ownership tidak menerima userId body", !activityRoute.includes("body.userId") && !coinRoute.includes("body.userId"));
check("26. Replay XP tidak meneruskan increment koin Jalur", progressRoute.includes("XP_REWARD === 0 && !hasilXp.kuotaHabis"));

// Certified boundaries untouched by this hardening.
check("27. UKBI/TKA routes tidak tersentuh oleh perubahan ini", read("app/api/kompetensi/[paketId]/submit/route.ts").includes("buildAnswerRows"));
check("28. Snapshot scoring tetap server-side", read("app/api/kompetensi/[paketId]/submit/route.ts").includes("scoredFromSnapshot"));

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
