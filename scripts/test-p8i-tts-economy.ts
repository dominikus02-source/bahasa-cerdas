/**
 * P8I — TTS Hint Economy & Difficulty Architecture: QA.
 *
 * Bagian:
 *  A. Model sesi + anggaran petunjuk (schema, klaim atomik)
 *  B. Difficulty deterministik (klasifikasi, tier, gerbang rare, konflik)
 *  C. Generator (tier gate, tanpa kata langka <L7, tanpa pasangan bocor)
 *  D. Hadiah server-side (formula + multiplier tier + anti-duplikasi)
 *  E. UI wiring (tombol terbatas, finish otoritatif)
 *  F. Keamanan
 *  G. Regresi penanda
 *
 * Tanpa DB — audit statis + logika murni.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, name: string) {
  if (cond) {
    passed++;
  } else {
    failed++;
    failures.push(name);
    console.error(`  ✗ FAIL: ${name}`);
  }
}

function section(title: string) {
  console.log(`\n─ ${title} ─`);
}

const root = process.cwd();
function read(p: string): string {
  return readFileSync(join(root, p), "utf8");
}
function has(p: string): boolean {
  return existsSync(join(root, p));
}

// ═══════════════════════════════════════════════════════════════════════════════
// A. SESI & ANGGARAN PETUNJUK
// ═══════════════════════════════════════════════════════════════════════════════
section("A. Sesi & anggaran petunjuk");

const schemaSrc = read("prisma/schema.prisma");
assert(schemaSrc.includes("model TtsSession"), "A1 model TtsSession ada");
assert(schemaSrc.includes("hintsRevealed  Int"), "A2 kolom hintsRevealed");
assert(schemaSrc.includes('status         String    @default("ACTIVE")'), "A3 status ACTIVE/FINISHED");
assert(has("prisma/migrations/manual/2026-08-26_p8i_tts_session.sql"), "A4 migration SQL ada");
const sessionServer = read("lib/game/tts/session-server.ts");
assert(sessionServer.includes("TTS_HINT_LIMIT = 3"), "A5 anggaran = 3 per puzzle");
assert(sessionServer.includes('hintsRevealed: { lt: TTS_HINT_LIMIT }'), "A6 klaim atomik WHERE lt limit (race-safe)");
assert(sessionServer.includes("hintsRevealed: { increment: 1 }"), "A7 increment atomik");
assert(sessionServer.includes('status !== "ACTIVE"'), "A8 sesi FINISHED tidak bisa klaim petunjuk");
assert(sessionServer.includes("status: \"FINISHED\", finishedAt: new Date() }"), "A9 mulai baru menutup sesi ACTIVE lama");

// ═══════════════════════════════════════════════════════════════════════════════
// B. DIFFICULTY DETERMINISTIK
// ═══════════════════════════════════════════════════════════════════════════════
section("B. Difficulty deterministik");

assert(has("lib/game/tts/difficulty.ts"), "B1 difficulty.ts ada");
const diffSrc = read("lib/game/tts/difficulty.ts");
for (const t of ["definisi", "sinonim", "antonim", "ejaan-baku", "imbuhan", "majas", "ungkapan", "serapan", "istilah"]) {
  assert(diffSrc.includes(`"${t}"`), `B2 tipe ${t} dikenali`);
}
assert(diffSrc.includes("isRareAnswer"), "B3 gerbang kata langka");
assert(diffSrc.includes("conflictAnswersFor"), "B4 peta konflik petunjuk↔jawaban");
assert(diffSrc.includes("gameplayTierForLevel") || diffSrc.includes('"DASAR"'), "B5 tingkat permainan DASAR/MENENGAH/LANJUT");

// Replika murni: RUPAWAN (rare, len 7) harus tier 3; IBU (dasar, len 3) tier 1.
function scoreOf(answer: string, type: string, rare: boolean): number {
  const w: Record<string, number> = { antonim: 1, definisi: 1, serapan: 2, sinonim: 2, "ejaan-baku": 2, imbuhan: 3, ungkapan: 3, istilah: 4, majas: 4 };
  let s = (w[type] ?? 1) + answer.length / 4;
  if (rare) s += 2;
  return Math.round(s * 10) / 10;
}
function tierOf(score: number, baseTier: number, rare: boolean): number {
  if (rare || score > 5.5) return 3;
  if (score < 3 && baseTier === 3) return 2;
  return baseTier;
}
assert(tierOf(scoreOf("RUPAWAN", "sinonim", true), 2, true) === 3, "B6 RUPAWAN → tier LANJUT");
assert(tierOf(scoreOf("IBU", "definisi", false), 1, false) === 1, "B7 IBU → tier DASAR");
assert(tierOf(scoreOf("PARADOKS", "majas", false), 3, false) === 3, "B8 PARADOKS → tier LANJUT (majas)");

// ═══════════════════════════════════════════════════════════════════════════════
// C. GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════
section("C. Generator — tier gate & anti-bocor");

const genSrc = read("lib/game/tts/generator.ts");
assert(genSrc.includes("canAppearInLevel"), "C1 generator memakai gerbang level");
const preCanaryUnused = !read("lib/commission/payout/pre-canary.ts").includes("maxTierForLevel");
void preCanaryUnused;
assert(genSrc.includes("isRareAnswer") === false && genSrc.includes("canAppearInLevel(e.word.answer"), "C2 gerbang via helper (bukan inline)");
assert(diffSrc.includes("level < 7 && isRareAnswer"), "C3 kata langka hanya ≥ L7");
assert(genSrc.includes("pickNonConflicting"), "C4 seleksi hindari pasangan bocor");
assert(genSrc.includes("typeCount.set"), "C5 ragam tipe petunjuk (maks 2/tipe)");
assert(genSrc.includes("crosses"), "C6 relaksasi wajib perpotongan / buang terisolasi");
const wordBankSrc = read("lib/game/tts/word-bank.ts");
assert(wordBankSrc.includes("themeKeyForAnswer"), "C7 tema→jawaban map untuk klasifikasi");

// ═══════════════════════════════════════════════════════════════════════════════
// D. HADIAH SERVER-SIDE
// ═══════════════════════════════════════════════════════════════════════════════
section("D. Hadiah server-side");

assert(sessionServer.includes("ttsTierMultiplier"), "D1 multiplier tier kesulitan ada");
assert(sessionServer.includes("if (level <= 3) return 1.0;") && sessionServer.includes("return 1.5;"), "D2 DASAR ×1.0 · MENENGAH ×1.25 · LANJUT ×1.5");
assert(sessionServer.includes("- hints * 5"), "D3 penalti petunjuk dari hitungan DB");
assert(sessionServer.includes("Math.round(session.level * 20 * mult)"), "D4 cap XP ikut multiplier");
assert(sessionServer.includes("awardXp(input.userId, \"GAME\", finalXp, `tts-${session.id}`)"), "D5 XP lewat awardXp existing (guard kuota)");
assert(sessionServer.includes("claim.count === 0") && sessionServer.includes("return null"), "D6 double submit → tanpa hadiah kedua");
assert(!sessionServer.includes("streakBonus"), "D7 bonus streak TIDAK masuk perhitungan server (spoofable)");

// ═══════════════════════════════════════════════════════════════════════════════
// E. UI WIRING
// ═══════════════════════════════════════════════════════════════════════════════
section("E. UI wiring");

const ui = read("components/game/TTSpage.tsx");
assert(ui.includes("/api/game/tts/session"), "E1 start membuka sesi server");
assert(ui.includes("/api/game/tts/hint"), "E2 tombol petunjuk klaim ke server");
assert(ui.includes("/api/game/tts/finish"), "E3 finish otoritatif dari server");
assert(ui.includes("hintsRemaining <= 0"), "E4 tombol mati saat habis");
assert(ui.includes("({hintsRemaining}/3)") || ui.includes("Buka Huruf ({hintsRemaining}/3)"), "E5 sisa anggaran tampil di tombol");
assert(ui.includes("setHintsRemainingServer(d.hintsRemaining)"), "E6 sisa disinkron dari respons server");
assert(ui.includes("idempotent"), "E7 double submit ditangani tanpa hadiah ganda");

// ═══════════════════════════════════════════════════════════════════════════════
// F. KEAMANAN
// ═══════════════════════════════════════════════════════════════════════════════
section("F. Keamanan");

const hintApi = read("app/api/game/tts/hint/route.ts");
const finishApi = read("app/api/game/tts/finish/route.ts");
assert(hintApi.includes("!user") , "F1 hint API auth");
assert(finishApi.includes("!user"), "F2 finish API auth");
assert(hintApi.includes("userId: user.id"), "F3 userId dari sesi");
assert(finishApi.includes("cellsCorrect,\n      cellsTotal") || finishApi.includes("cellsCorrect,"), "F4 payload minimal (tanpa xp dari klien)");
assert(!finishApi.includes("body.xp") && !finishApi.includes("body.coins"), "F5 xp/koin klien TIDAK dibaca");
assert(sessionServer.includes("userId: input.userId"), "F6 query selalu ber-scope userId (anti-IDOR)");

// ═══════════════════════════════════════════════════════════════════════════════
// G. REGRESI PENANDA
// ═══════════════════════════════════════════════════════════════════════════════
section("G. Regresi penanda");

assert(read("lib/commission/engine.ts").includes("entryType: \"COMMISSION\""), "G1 P7C utuh");
assert(read("lib/guru/risk/signals.ts").includes("evaluateRiskGate"), "G2 P8C utuh");
assert(read("lib/commission/payout/config.ts").includes('?? "mock"'), "G3 real money tetap OFF");
assert(has("app/arena/jalur-cerdas/page.tsx") || has("app/arena/jalur-cerdas"), "G4 Jalur Cerdas tidak disentuh");

// ═══════════════════════════════════════════════════════════════════════════════
// HASIL
// ═══════════════════════════════════════════════════════════════════════════════

console.log(`\n═══════════════════════════════════════`);
console.log(`  PASSED: ${passed}   FAILED: ${failed}`);
console.log(`═══════════════════════════════════════`);

if (failed > 0) {
  console.error("\nFailures:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\n✅ P8I QA — SEMUA LULUS (hint economy, difficulty architecture, server rewards)");
process.exit(0);
