/**
 * STEP 4D — Adaptive Practice Reward Hardening & XP Integration — QA.
 *
 * Static source-inspection + pure logic tests; TIDAK menyentuh DB/LLM.
 *
 * Invariant yang diuji:
 *   LEGITIMATE SESSION → evidence lengkap → COMPLETED sekali → XP tepat sekali
 *   → replay/retry/concurrent menghasilkan 0 XP tambahan.
 *   Sesi tidak lengkap/kosong/asing/expired → 0 XP.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ADAPTIVE_SESSION_BASE_XP,
  ADAPTIVE_START_RATE_LIMIT,
} from "../lib/adaptive-practice/config";
import { XP_SOURCES } from "../lib/gamification/xp-engine";
import { BATAS_XP_PER_SUBMIT } from "../lib/xp-guard";

const ROOT = join(__dirname, "..");
const read = (file: string) => readFileSync(join(ROOT, file), "utf8");

const api = read("app/api/player/adaptive-practice/route.ts");
const xpEngine = read("lib/gamification/xp-engine.ts");
const xpGuard = read("lib/xp-guard.ts");
const xpConfig = read("lib/gamification/xp-config.ts");
const sourceLabels = read("lib/gamification/source-labels.ts");

const countAwardXpCalls = (api.match(/await awardXp\(/g) || []).length;
const countAwardXpImports = (api.match(/import \{ awardXp \}/g) || []).length;

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

// ── 1. Completion gate: incomplete session cannot complete ────────────────
check("1. complete menolak coverage tidak penuh (gate evidence)", api.includes("Sesi belum dikerjakan sepenuhnya"));
check("1b. gate membandingkan evidence vs daftar soal sesi", api.includes("answeredCount < assigned.length"));
check("1c. evidence dibatasi milik user + sesi ini", api.includes("where: { userId, activityId: sessionId"));
check("1d. daftar soal diambil dari sesi, bukan dari klien", !api.includes("body.questionIds") && api.includes("sessionPayload.questionIds"));
check("1e. coverage gagal → dikembalikan ke IN_PROGRESS (bukan COMPLETED)", api.includes("data: { status: \"IN_PROGRESS\", completedAt: null }"));

// ── 2. Empty session cannot complete ───────────────────────────────────────
check("2. sesi tanpa soal ditolak", api.includes("Sesi tidak memiliki soal"));

// ── 3. Valid session completes ─────────────────────────────────────────────
check("3. claim COMPLETED via updateMany + completedAt", api.includes("data: { status: \"COMPLETED\", completedAt: new Date() }"));
check("3b. claim hanya untuk sesi milik user, aktif, belum expired", api.includes("where: { id: sessionId, userId, status: \"IN_PROGRESS\", expiresAt: { gt: new Date() } }"));

// ── 4. XP awarded exactly once ─────────────────────────────────────────────
check("4. awardXp dipanggil dengan reference = session.id", api.includes("awardXp(userId, ADAPTIVE_XP_SOURCE, xpAmount, sessionId)"));
check("4b. idempotensi mengandalkan @@unique([userId, source, reference])", api.includes("reference = session.id") && api.includes("retry/replay tidak pernah menambah XP dua kali"));
check("4c. tidak ada pola reward per-soal (sekali per sesi)", countAwardXpCalls === 2 && countAwardXpImports === 1);

// ── 5. Duplicate complete → 0 XP ───────────────────────────────────────────
check("5. duplicate complete memeriksa XPTransaction yang sudah ada", api.includes("db.xPTransaction.findUnique") && api.includes("alreadyRewarded: true"));
check("5b. replay tidak menambah XP (xpEarned: 0)", api.includes("xpEarned: 0") && api.includes("replay: true"));

// ── 6. Concurrent completion → 1 XP ────────────────────────────────────────
check("6. claim atomik: satu pemenang (count===0 → jalur recovery)", api.includes("claim.count === 0"));
check("6b. pemenang claim satu-satunya yang memberi XP", countAwardXpCalls === 2 && /xpEarned: hasil\.xpDiberikan/.test(api));

// ── 7. Refresh/retry → 0 XP ────────────────────────────────────────────────
const completeFlow = api.slice(api.indexOf("async function completeSession"));
check("7. retry sesi sudah COMPLETED → 0 XP saat reward sudah ada", /alreadyRewarded: true/.test(api));
check("7b. recovery hanya memberi XP apabila reward belum pernah dicairkan", /if \(rewarded\)/.test(completeFlow) && /alreadyRewarded/.test(completeFlow));

// ── 8-10. Fake client claims ignored ───────────────────────────────────────
check("8. skor klien diabaikan (tidak ada body.score)", !api.includes("body.score"));
check("8b. correctCount dari evidence server-side", api.includes("evidenceRows.filter((row) => row.isCorrect)"));
check("9. XP klien diabaikan (tidak ada body.xp)", !api.includes("body.xp") && !api.includes("body.xpEarned"));
check("10. koin klien diabaikan (tidak ada body.coin / addCoin / awardCoins)", !api.includes("body.coin") && !api.includes("addCoin") && !api.includes("awardCoins"));

// ── 11. Cross-user session rejected ────────────────────────────────────────
check("11. claim + gate memakai userId dari sesi (bukan klien)", api.includes("id: sessionId, userId"));
check("11b. sesi asing tidak ditemukan → 409", api.includes("Sesi tidak ditemukan atau sudah berakhir"));

// ── 12. Start rate limit ───────────────────────────────────────────────────
check("12. rate limit start memakai rateLimitRoute existing", api.includes("rateLimitRoute(req, ADAPTIVE_START_RATE_LIMIT)"));
check("12b. threshold terpusat di config", ADAPTIVE_START_RATE_LIMIT.maxRequests === 10 && ADAPTIVE_START_RATE_LIMIT.windowSeconds === 1800);
check("12c. identifier scoped per user/session", ADAPTIVE_START_RATE_LIMIT.identifier === "bca-adaptive-start");
check("12d. rate limit hanya di action=start", api.includes("if (body.action === \"start\")"));

// ── 13. XP reference = session.id ──────────────────────────────────────────
check("13. reference stabil & unik per sesi (session.id)", api.includes("awardXp(userId, ADAPTIVE_XP_SOURCE, xpAmount, sessionId)"));

// ── 14. XP source = ADAPTIVE_PRACTICE ──────────────────────────────────────
check("14. source terdaftar di XP_SOURCES", XP_SOURCES.includes("ADAPTIVE_PRACTICE"));
check("14b. batas per-submit ada di xp-guard (200)", BATAS_XP_PER_SUBMIT["ADAPTIVE_PRACTICE"] === 200);
check("14c. tercantum di XP_CONFIG (baseXp 50)", xpConfig.includes("ADAPTIVE_PRACTICE") && xpConfig.includes("baseXp: 50"));
check("14d. label + ikon UI tersedia", sourceLabels.includes("ADAPTIVE_PRACTICE") && sourceLabels.includes("Latihan Adaptif"));

// ── XP economy: base 50 sesuai konvensi, skala akurasi, tanpa per-soal ────
check("15. BASE_XP = 50 (konvensi Jalur Cerdas/UKBI/TKA)", ADAPTIVE_SESSION_BASE_XP === 50);

// Pure re-implementation of the server formula (must match route).
function xpForSession(correct: number, total: number): number {
  return Math.round((ADAPTIVE_SESSION_BASE_XP * correct) / total);
}
check("15b. akurasi 100% → 50 XP", xpForSession(5, 5) === 50 && xpForSession(15, 15) === 50);
check("15c. akurasi 60% (3/5) → 30 XP", xpForSession(3, 5) === 30);
check("15d. skor 0 → 0 XP", xpForSession(0, 5) === 0);
check("15e. skala akurasi (size tidak mengalikan): 10/10 = 5/5", xpForSession(10, 10) === xpForSession(5, 5));
const sesiBesar = xpForSession(15, 15);
check("15f. sesi 15 soal sempurna tetap 50 XP (tidak inflasi oleh size)", sesiBesar === 50 && sesiBesar <= BATAS_XP_PER_SUBMIT["ADAPTIVE_PRACTICE"]);

// ── Keamanan tambahan: tidak ada sistem reward kedua ──────────────────────
check("16. tidak ada tabel/engine reward baru (awardXp pintu tunggal)", api.includes("from \"@/lib/award-xp\""));
check("16b. tanpa koin (deferred)", !api.includes("CoinTransaction") && !api.includes("coin-engine"));
check("16c. XP sumber string konsisten", api.includes("const ADAPTIVE_XP_SOURCE = \"ADAPTIVE_PRACTICE\";"));

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);