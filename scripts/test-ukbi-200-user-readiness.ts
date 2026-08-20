/**
 * Test: UKBI 200-User Production Readiness (Phase 22)
 *
 * Locking assertions for every finding of the 23-phase readiness audit
 * (docs/UKBI_200_USER_READINESS_REPORT.md). Deterministic — static source
 * assertions + pure logic. No DB, no network.
 *
 * Run: npm run test:ukbi-200-user-readiness
 */

import fs from "fs";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

function read(path: string): string {
  return fs.readFileSync(path, "utf-8");
}

const ROUTE = "app/api/kompetensi/[paketId]/route.ts";
const SUBMIT = "app/api/kompetensi/[paketId]/submit/route.ts";
const HASIL = "app/api/kompetensi/[paketId]/hasil/route.ts";
const RATE_LIMIT = "lib/rate-limit.ts";
const SECURITY = "lib/security.ts";
const POOL = "lib/question-bank/session-pool.ts";
const RANDOM = "lib/question-bank/randomization.ts";
const XP = "lib/award-xp.ts";
const PAGE = "app/(dashboard)/kompetisi/[paketId]/page.tsx";
const AI_CONC = "lib/ai-concurrency.ts";
const USAGE = "lib/premium-economy/usage.ts";

console.log("=".repeat(64));
console.log("  TEST: UKBI 200-USER PRODUCTION READINESS");
console.log("=".repeat(64));

// ── A. RATE LIMIT (Phases 2–4) ──
console.log("\n── A. RATE LIMIT ──");
const rl = read(RATE_LIMIT);
const sec = read(SECURITY);
assert(rl.includes("getClientKey(req)"), "rateLimitRoute = session-scoped (getClientKey)");
assert(sec.includes('key: `sess|${hashToBucket(authCookie)}`'), "auth cookie → bucket sess|<hash>");
assert(sec.includes('key: `ip|${ip}`'), "anonymous → bucket ip|<ip>");
const sub = read(SUBMIT);
assert(sub.includes('identifier: "simulation-submit"') && sub.includes("maxRequests: 30") && sub.includes("windowSeconds: 60"), "submit: 30/60s per SESI");
assert(sub.includes("rateLimitRoute(req, {"), "submit rate-limit DIJALANKAN sebelum auth (guard abuse)");
const route = read(ROUTE);
assert(!route.includes("rateLimitRoute"), "GET/PATCH tanpa rate limit (sengaja — snapshot replay murah)");

// ── B. KUOTA SIMULASI ATOMIC (Phase 5) ──
console.log("\n── B. KUOTA SIMULASI ──");
const usage = read(USAGE);
assert(usage.includes("updateMany") && usage.includes("used < limit") && usage.includes("P2002"), "konsumsi kuota atomic (updateMany WHERE used < limit + P2002)");
assert(usage.includes("consumeUsageTx"), "consumeUsageTx ada (dipakai dalam transaksi route)");
assert(route.includes("consumeUsageGuarded(tx, dbUser.id, \"SIMULATION\""), "kuota dikonsumsi DI DALAM transaksi session (rollback menyertakan kuota)");
assert(route.includes("FeatureLimitError"), "FeatureLimitError ditangkap → 403 used/limit");
assert(route.includes("skipDuplicates: true"), "createMany skipDuplicates → double-click aman (1 konsumsi)");
assert(route.includes("updateMany") && route.includes("OR:"), "retry reset via updateMany ber-predikat status (1 request menang)");

// ── C. WRITE PATH (Phase 6) ──
console.log("\n── C. WRITE PATH ──");
assert(sub.includes("db.$transaction(writeOps)"), "submit memakai BATCHED $transaction([...]) (satu round trip, hemat koneksi pooler)");
assert(sub.includes("db.testAnswer.deleteMany({ where: { sessionId: session.id } })"), "jawaban lama dihapus scoped sessionId (bukan user)");
assert(sub.includes("db.testAnswer.createMany({ data: answerRows })"), "insert jawaban batch (1 query, bukan per-soal)");
assert(sub.includes("db.progresKompetensi.create({"), "progres dibuat dalam transaksi yang sama");

// ── D. IDEMPOTENSI & DOUBLE-SUBMIT (Phase 9) ──
console.log("\n── D. IDEMPOTENSI ──");
assert(sub.includes("isSameAttempt"), "guard double-POST: isSameAttempt (finishedAt >= startedAt sesi)");
assert(sub.includes("alreadyScored: true"), "double-POST mengembalikan alreadyScored (bukan attempt baru)");
assert(sub.includes('error?.code === "P2002"') && sub.includes("attemptNumber"), "P2002 (race unique progres) ditangkap");
assert(sub.includes('", paketId)'), "FIX 2026-08-20: recovery P2002 memakai paketId yang benar (bukan '')");
assert(sub.includes("EMPTY_ANSWERS"), "guard jawaban kosong (EMPTY_ANSWERS 400) — cegah attempt 0-skor tersimpan");

// ── E. SNAPSHOT IMMUTABILITY (Phase 7) ──
console.log("\n── E. SNAPSHOT ──");
assert(route.includes("replayable") && route.includes("storedSnapshot!.clientSections"), "replay dari snapshot tersimpan (soal immutable selama attempt)");
assert(route.includes("questionSnapshot: Prisma.DbNull"), "retry membersihkan snapshot (build ulang yang segar)");
assert(route.includes("allSnapshots.push"), "snapshot server-side dibangun (kunci untuk scoring)");
assert(route.includes("version: \"1.1\""), "snapshot versioned 1.1 (clientSections)");

// ── F. ANTI-REPEAT & RANDOMISASI (Phase 8) ──
console.log("\n── F. RANDOMISASI ──");
const pool = read(POOL);
assert(pool.includes("excludeRecentForSection"), "anti-repeat: excludeRecentForSection ada");
assert(pool.includes("Level 1") && pool.includes("Level 2") && pool.includes("Level 3"), "anti-repeat tiered fallback (3 tingkat)");
assert(pool.includes("sampleSectionQuestions"), "sampling seeded per sesi ada");
assert(pool.includes("sanitizeListeningQuestions"), "sanitasi MENDENGARKAN ada (strip passage/transcript)");
assert(read(RANDOM).includes("fisherYatesShuffle"), "shuffle seeded ada");

// ── G. NO LEAKAGE (Phase 7) ──
console.log("\n── G. NO LEAKAGE ──");
assert(/const UKBI_SELECT = \{[^}]*correctAnswer/.test(route) === false, "UKBI_SELECT tanpa correctAnswer");
assert(/const TKA_SELECT = \{[^}]*correctAnswer/.test(route) === false, "TKA_SELECT tanpa correctAnswer");
assert(route.includes("UKBI_SNAPSHOT_SELECT") && route.includes("correctAnswer: true"), "kunci jawaban HANYA di snapshot server-side");
assert(route.includes("sanitizeConstructedPool"), "sanitasi soal konstruktif ada (strip rubric/scoringMode/sampleExpectedResponse)");
assert(route.includes("q.options = { instruction: o.instruction ?? null, constraints: o.constraints ?? null }"), "soal konstruktif ke client = instruction+constraints saja");
assert(route.includes("getOrSet"), "cache paket via getOrSet (answer-free)");
assert(route.includes("JANGAN pernah cache hasil kosong"), "pool kosong tidak pernah di-cache");
assert(read(HASIL).includes("progresKompetensi.findFirst"), "hasil = read-only query");

// ── H. AI GRADING (Phase 11) ──
console.log("\n── H. AI GRADING ──");
assert(sub.includes('acquireAiSlot({ pool: "grade-constructed" })'), "AI grading di belakang global concurrency gate (grade-constructed)");
assert(sub.includes("Promise.allSettled"), "grading konstruktif pakai allSettled (satu gagal tak menggagalkan submit)");
assert(sub.includes("pending") && sub.includes("bumpSection(sk).pending += 1"), "jawaban belum dinilai → pending (tidak dihitung 0)");
assert(read(AI_CONC).includes("Redis is unavailable"), "AI gate fail-open bila Redis tidak tersedia");
assert(read(AI_CONC).includes("expired slots"), "slot kedaluwarsa dibersihkan (self-healing)");

// ── I. XP EXACTLY-ONCE (Phase 9) ──
console.log("\n── I. XP ──");
assert(sub.includes('awardXp(dbUser.id, "KOMPETENSI", baseXpGain, paketId)'), "XP via pintu tunggal awardXp, reference = paketId");
const xp = read(XP);
assert(xp.includes("userId_source_reference"), "XP idempoten via unique (userId, source, reference)");
assert(xp.includes("batasiXpSubmit") && xp.includes("terapkanKuotaHarian"), "XP dipangkas per submit + kuota harian");
assert(sub.includes("xpGain") && sub.includes("xpBoosted"), "payload hasil membawa xpEarned server-side");

// ── J. TIMEOUT & CACHE (Phases 5, 12) ──
console.log("\n── J. TIMEOUT & CACHE ──");
assert(route.includes("withQueryTimeout(") && route.includes('"Snapshot fetch timeout"'), "query berat GET dibungkus timeout");
assert(route.includes("POOL_CACHE_VERSION") && route.includes('process.env.SIM_POOL_TTL || 300'), "cache pool versioned + TTL 300 (env override)");
assert(route.includes("Promise.all(") && route.includes("sections.map"), "fetch seksi paralel (Promise.all)");

// ── K. AUTOSAVE CLIENT (Phase 4) ──
console.log("\n── K. AUTOSAVE ──");
const page = read(PAGE);
assert(page.includes("setInterval(save, 30000)"), "autosave PERIODIK 30s (bukan debounce)");
assert(page.includes("visibilitychange"), "autosave on visibilitychange");
assert(page.includes("keepalive: true"), "autosave keepalive (unmount/tab close)");
assert(page.includes('method: "PATCH"'), "autosave = PATCH paket");

// ── L. LOAD TEST ASSETS (Phase 10) ──
console.log("\n── L. LOAD TEST ASSETS ──");
assert(fs.existsSync("loadtest/04-ukbi-200-users.js"), "loadtest/04-ukbi-200-users.js ada (kohort 200 VU)");
assert(fs.existsSync("scripts/seed-staging-loadtest.ts"), "seed-staging-loadtest.ts ada (200 akun + paket staging)");
const lt = read("loadtest/04-ukbi-200-users.js");
assert(lt.includes("target: 200") && lt.includes("ramping-vus"), "scenario kohort 200 VU ramp");
assert(lt.includes("ukbi_rate_limited"), "counter 429 terpasang (0 = target)");
assert(lt.includes("detectLeakage"), "cek kebocoran kunci di semua payload");

// ── SUMMARY ──
console.log("\n" + "=".repeat(64));
console.log(`  RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`);
if (failed === 0) {
  console.log("  ✅ UKBI 200-USER READINESS OK (statis + logika murni)");
} else {
  console.log(`  ❌ ${failed} TESTS FAILED`);
}
console.log("=".repeat(64));
process.exit(failed > 0 ? 1 : 0);
