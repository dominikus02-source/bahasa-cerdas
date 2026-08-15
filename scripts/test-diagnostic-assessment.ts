/**
 * STEP 4E — DIAGNOSTIC ASSESSMENT — test statis (tanpa DB).
 * Run: npm run test:diagnostic-assessment
 *
 * Selaras dengan Part A-P spec STEP 4E:
 *   - Diagnostik = evidence-only, TANPA XP/koin (Part N).
 *   - Klien tidak pernah mengirim kebenaran/skor/evidence (Part O).
 *   - WEAK ≠ UNKNOWN (Part I); placement PROVISIONAL (Part J).
 *   - Adaptive route (4D) TIDAK diubah — regression dijaga oleh
 *     test-adaptive-reward-hardening.
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

console.log("\nTEST DIAGNOSTIC ASSESSMENT 4E (statis, tanpa DB)\n");

const config = read("lib/diagnostic/config.ts");
const selector = read("lib/diagnostic/selector.ts");
const profile = read("lib/diagnostic/profile.ts");
const diagTypes = read("lib/diagnostic/types.ts");
const route = read("app/api/player/diagnostic/route.ts");
const ui = read("app/arena/diagnostic/[sessionId]/page.tsx");
const homeData = read("components/student-home/home-data.tsx");
const card = read("components/student-home/ContinueLearningCard.tsx");
const adaptiveRoute = read("app/api/player/adaptive-practice/route.ts");

// 1 — Konfigurasi & ukuran sesi (Part D)
check("1. Reason code DIAGNOSTIC terpusat di config", config.includes('DIAGNOSTIC_REASON_CODE = "DIAGNOSTIC"'));
check("1. Ukuran sesi 8–12 (default 10)", config.includes("DIAGNOSTIC_ALLOWED_SIZES = [8, 10, 12]") && config.includes("DIAGNOSTIC_DEFAULT_SIZE = 10"));
check("1. Durasi sesi 30 menit", config.includes("DIAGNOSTIC_SESSION_MINUTES = 30"));

// 2 — Skill yang diuji (Part D 4E/Part B 4E.1: prioritas 5 kemampuan;
// LISTENING hanya via komposisi target dengan fallback jujur — bukan prioritas)
const skillTokens = ['"READING"', '"GRAMMAR"', '"VOCABULARY"', '"LITERATURE"', '"WRITING"'];
const priorityBlock = /DIAGNOSTIC_SKILL_PRIORITY = \[[^\]]*\]/.exec(config)?.[0] ?? "";
check(
  "2. Prioritas skill 5 kemampuan, tanpa LISTENING/SPEAKING (4E.1)",
  skillTokens.every((token) => priorityBlock.includes(token)) &&
    !priorityBlock.includes("LISTENING") &&
    !priorityBlock.includes("SPEAKING")
);
check("2. Komposisi target 10 butir = R2 G2 V2 L1 W2 + LISTENING 1 (Part B)", config.includes('{ skill: "WRITING", count: 2 }') && config.includes('{ skill: "LISTENING", count: 1 }') && config.includes('{ skill: "READING", count: 2 }'));
check("2. SPEAKING tidak pernah direquest (slot masa depan)", !config.includes('{ skill: "SPEAKING"'));

// 3 — Placement bands (Part J: L1–L4/L5–L8/L9–L12)
check("3. Band DASAR L1–L4, MENENGAH L5–L8, TINGGI L9–L12", config.includes("minLevel: 1, maxLevel: 4") && config.includes("minLevel: 5, maxLevel: 8") && config.includes("minLevel: 9, maxLevel: 12"));

// 4 — Selector pure & jujur
check("4. Selector murni (tanpa import DB)", !selector.includes("from \"@/lib/db\"") && !selector.includes("prisma"));
check("4. Pool < 8 butir → null (fallback jujur, tanpa fabrikasi)", selector.includes("DIAGNOSTIC_MIN_ITEMS") && selector.includes("return null"));
check("4. Seleksi deterministik (tie-break id)", selector.includes("id.localeCompare") || selector.includes("sort("));

// 5 — Anti-duplikasi & variasi
check("5. Tanpa duplikasi questionId", selector.includes("selected.some((item) => item.id === candidate.id)"));
check("5. Spread kesulitan via siklus EASY→MEDIUM→HARD", selector.includes("DIAGNOSTIC_DIFFICULTY_CYCLE"));

// 6 — Novelty (anti-pengulangan soal baru)
check("6. Kandidat belum terlihat didahulukan, yang baru dilihat dilarang", selector.includes("candidate.seenAt && seen === 2") && (selector.includes("unseen") || selector.includes("seenRank")));

// 7 — Profil: WEAK ≠ INSUFFICIENT_EVIDENCE (Part I)
check("7. Akurasi null → INSUFFICIENT_EVIDENCE, bukan WEAK", profile.includes('if (attempts === 0 || accuracy === null) return "INSUFFICIENT_EVIDENCE"'));
check("7. Placement selalu PROVISIONAL dari satu sesi saja", profile.includes("provisional: true"));

// 8 — Route: auth wajib
check("8. Route mewajibkan sesi (getUser guard)", route.includes("const user = await getUser()") && route.includes("Unauthorized"));

// 9 — Part O: klien tidak pernah mengirim authority
const clientForbidden = ["req.body.correctAnswer", "body.correctAnswer", "body.score", "body.xp", "body.coin", "body.skillDelta", "body.evidenceCount", "body.assessmentResult"];
check("9. Klien tidak bisa mengirim kebenaran/skor/XP/koin", !clientForbidden.some((token) => route.includes(token)));

// 10 — Jawaban divalidasi server-side
check("10. Jawaban dicocokkan ke correctAnswer di sisi server", route.includes("String(answer) === String(question.correctAnswer)"));

// 11 — Evidence idempoten via upsertLearningEvidence
check("11. Evidence memakai upsertLearningEvidence (composite unique)", route.includes("upsertLearningEvidence"));

// 12 — Sesi selalu di-scope ke user
check("12. Semua akses sesi dibatasi userId", route.includes("where: { id: sessionId, userId }"));

// 13 — Sesi DIAGNOSTIC dipisah tegas dari sesi adaptive
check("13. Payload/answer/complete menolak sesi non-DIAGNOSTIC", (route.match(/reasonCode !== DIAGNOSTIC_REASON_CODE/g) || []).length >= 2);

// 14 — Part N: tanpa reward (TANPA XP/koin)
check("14. Route diagnostik TIDAK memanggil awardXp", !route.includes("awardXp"));
check("14. Route diagnostik TIDAK memanggil addCoin/awardCoins", !route.includes("addCoin") && !route.includes("awardCoins") && !route.includes("spendCoins"));

// 15 — Rate limit start (konvensi 4D)
check("15. Start di-rate-limit via rateLimitRoute", route.includes("rateLimitRoute(req, DIAGNOSTIC_RATE_LIMIT)") && route.includes("bca-diagnostic-start"));

// 16 — Part G/K: payload tanpa answer key
check("16. GET payload tidak memilih correctAnswer", route.includes("select: { kodeSoal: true, text: true, options: true, type: true }"));

// 17 — Preview: NO EVIDENCE → DIAGNOSTIC; ada bukti → GENERAL_LEARNING
check("17. Preview NO_EVIDENCE → actionType DIAGNOSTIC 'Kenali Kemampuanmu'", route.includes('actionType: "DIAGNOSTIC"') && route.includes('actionTitle: "Kenali Kemampuanmu"'));
check("17. Preview dengan bukti → GENERAL_LEARNING jujur", route.includes('actionType: "GENERAL_LEARNING"'));

// 18 — Sesi dikembalikan IN_PROGRESS → COMPLETED (state change only)
check("18. Complete = transisi status, tanpa counter klien", route.includes('data: { status: "COMPLETED", completedAt: new Date() }') && route.includes("reasonCode: DIAGNOSTIC_REASON_CODE"));

// 19 — UI: halaman sesi + panel hasil band per-skill
check("19. Halaman /arena/diagnostic/[sessionId] ada", ui.includes("Kenali Kemampuanmu") && ui.includes("Tes Awal"));
check("19. Panel hasil menampilkan band L+PROVISIONAL & kategori per-skill", ui.includes("L{band.minLevel}") && ui.includes("Sementara") && ui.includes("Rincian per kemampuan"));
check("19. Kata-kata jujur: hasil sementara, bukan level final", ui.includes("bersifat sementara"));

// 20 — Home-data + card: union DIAGNOSTIC dan branch card
check("20. union MyDayResponse menyertakan DIAGNOSTIC", homeData.includes('actionType: "ADAPTIVE_PRACTICE" | "DIAGNOSTIC" | "GENERAL_LEARNING"'));
check("20. home-data mem-fetch preview diagnostic di home-data (bukan komponen)", homeData.includes("/api/player/diagnostic?mode=preview"));
check("20. Card branch DIAGNOSTIC (Mulai Tes Awal) → POST start", card.includes("isDiagnostic") && card.includes('fetch("/api/player/diagnostic"') && card.includes('action: "start"'));
check("20. Card tidak menaruh adaptive preview di komponen", !card.includes("adaptive-practice?mode=preview"));
check("20. Adaptive route 4D TIDAK diubah (2 call awardXp nyata + rate limit)", (adaptiveRoute.match(/await awardXp\(/g) || []).length === 2 && adaptiveRoute.includes("rateLimitRoute(req, ADAPTIVE_START_RATE_LIMIT)"));

// 21 — 4E.1: seleksi berkomposisi + fallback jujur diharapkan EXPLICIT (Part Q)
check("21. Seleksi mengembalikan composition (summarizeComposition)", selector.includes("export function summarizeComposition") && route.includes("summarizeComposition("));
check("21. Hasil seleksi null bila pool < MIN (tanpa fabrikasi)", selector.includes("if (candidates.length === 0 || candidates.length < DIAGNOSTIC_MIN_ITEMS) return null"));
check("21. Fallback jujur: MISSING_CORPUS / DIFFICULTY_UNAVAILABLE / SEE_AGAIN", selector.includes('"MISSING_CORPUS"') && selector.includes('"DIFFICULTY_UNAVAILABLE"') && selector.includes('"SEE_AGAIN"'));
check("21. Start payload membawa composition + fallbackReason", route.includes("composition: selection.composition") && route.includes("fallbackReason: selection.fallbackReason"));

// 22 — 4E.1: profil dari DETAIL EVIDENCE sesi (jalur kanonik), bukan learner-state saja
check("22. Profil kanonik computeProfileFromEvidence + withUntestedSkills", profile.includes("export function computeProfileFromEvidence") && profile.includes("export function withUntestedSkills"));
check("22. Route complete/GET memakai buildSessionProfile dari LearningEvidence", route.includes("async function buildSessionProfile") && route.includes("loadSessionEvidence") && !route.includes("computeDiagnosticProfile("));
check("22. Skill tanpa bukti di-cover sebagai 'belum terukur' (bukan WEAK)", profile.includes("withUntestedSkills") && profile.includes('"Belum terukur"'));

// 23 — 4E.1: confidence + rekomendasi di profil
check("23. Tangga confidence INSUFFICIENT → PROVISIONAL → PROFILE_CONFIDENT", profile.includes("DIAGNOSTIC_CONFIDENCE.INSUFFICIENT_EVIDENCE") && profile.includes("DIAGNOSTIC_CONFIDENCE.PROFILE_CONFIDENT"));
check("23. Rekomendasi per skill rule-based (WEAK→EASY, STRONG→HARD)", profile.includes('if (category === "WEAK") return "EASY"') && profile.includes('if (category === "STRONG") return "HARD"'));

// 24 — 4E.1: UI menampilkan insight, confidence, dan fallbackReason jujur
check("24. UI menampilkan insightText (Kesimpulan untukmu)", ui.includes("Kesimpulan untukmu") && ui.includes("insightText"));
check("24. UI menampilkan fallbackReason (catatan komposisi jujur)", ui.includes("fallbackReason") && ui.includes("amber-50"));
check("24. UI minimal tetap: L{band.minLevel} + Sementara + Rincian per kemampuan + bersifat sementara", ui.includes("L{band.minLevel}") && ui.includes("Sementara") && ui.includes("Rincian per kemampuan") && ui.includes("bersifat sementara"));

console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
if (fail > 0) process.exit(1);
process.exit(0);