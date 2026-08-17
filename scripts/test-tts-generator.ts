/**
 * TEST — Generator Teka-Teki Silang + ekonomi (murni, tanpa DB).
 *
 * Memvalidasi:
 *  1. Bank kata: huruf A–Z saja, panjang 3–14, tanpa duplikat lintas tema,
 *     ≥ 16 kata/tema, petunjuk non-kosong, ejaan baku spot-check, 11 tema.
 *  2. Generator: deterministik per seed, berbeda antar seed, semua kata masuk
 *     grid, tidak ada huruf bentrok, nomor unik per sel awal, ukuran grid
 *     dalam batas wajar.
 *  3. Anti-ulang: avoidAnswers dipatuhi selama bank masih cukup.
 *  4. Seed harian: berubah per tanggal, konsisten per tanggal.
 *  5. Ekonomi: nyawa (regen waktu, cap 6, spend), tier pemain (progress
 *     menuju tier berikutnya), rentetan harian (naik/putus/bonus XP).
 *
 * Jalankan: npm run test:tts-generator
 */
import { TTS_BANK, mixedBank, bankForLevel } from "../lib/game/tts/word-bank";
import { TTS_LEVELS, levelConfig } from "../lib/game/tts/levels";
import { buildPuzzle } from "../lib/game/tts/generator";
import { dailySeed, hashString, mulberry32 } from "../lib/game/tts/seed";
import {
  HEARTS_MAX, HEART_REGEN_MS, freshHearts, regenHearts, spendHeart, nextHeartInMs,
  PLAYER_TIERS, tierFor, bumpStreak, streakXpBonus, todayLocal, yesterdayLocal,
} from "../lib/game/tts/economy";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.log(`  ❌ ${name}`);
      failed++;
    }
  } catch (e: any) {
    console.log(`  ❌ ${name} — ${e.message}`);
    failed++;
  }
}

function keyOf(p: { row: number; col: number }) {
  return `${p.row},${p.col}`;
}

function validateGrid(p: ReturnType<typeof buildPuzzle>): string[] {
  const errors: string[] = [];
  // Sel → huruf yang mengisi (untuk deteksi bentrok).
  const letterAt = new Map<string, string>();
  // Sel → jumlah kata (untuk deteksi perpotongan).
  const wordCountAt = new Map<string, number>();
  const starts = new Map<string, number>();

  const bump = (k: string) => wordCountAt.set(k, (wordCountAt.get(k) || 0) + 1);

  for (const w of p.words) {
    if (w.answer.length === 0) errors.push("kata kosong");
    for (let i = 0; i < w.answer.length; i++) {
      const r = w.dir === "A" ? w.row : w.row + i;
      const c = w.dir === "A" ? w.col + i : w.col;
      if (r < 0 || c < 0 || r >= p.rows || c >= p.cols) errors.push(`${w.answer} keluar grid`);
      const k = keyOf({ row: r, col: c });
      const ex = letterAt.get(k);
      if (ex !== undefined && ex !== w.answer[i]) errors.push(`huruf bentrok di sel ${k}`);
      letterAt.set(k, w.answer[i]);
      bump(k);
    }
    const sk = keyOf({ row: w.row, col: w.col });
    if (starts.has(sk)) {
      if (starts.get(sk) !== w.number) errors.push(`nomor awal beda di ${sk}`);
    } else {
      starts.set(sk, w.number);
    }
  }

  // Semua kata harus punya ≥ 1 perpotongan (kecuali puzzle sangat kecil).
  if (p.words.length > 1) {
    for (const w of p.words) {
      let crosses = 0;
      for (let i = 0; i < w.answer.length; i++) {
        const r = w.dir === "A" ? w.row : w.row + i;
        const c = w.dir === "A" ? w.col + i : w.col;
        if ((wordCountAt.get(keyOf({ row: r, col: c })) || 0) > 1) crosses++;
      }
      if (crosses === 0) errors.push(`${w.answer} tanpa perpotongan`);
    }
  }

  // Nomor harus urut 1..n tanpa lompatan.
  const uniq = [...new Set(p.words.map((w) => w.number))].sort((a, b) => a - b);
  for (let i = 0; i < uniq.length; i++) {
    if (uniq[i] !== i + 1) {
      errors.push("nomor tidak urut");
      break;
    }
  }

  return errors;
}

function main() {
  console.log("\n📋 TEST — GENERATOR TEKA-TEKI SILANG");
  console.log("=".repeat(60));

  // ── 1. Bank kata ──
  console.log("\n── 1. Bank Kata (kurasi KBBI) ──");
  const allAnswers = new Set<string>();
  const dupAnswers: string[] = [];
  let bankErrors = 0;
  for (const b of TTS_BANK) {
    test(`tema "${b.title}" punya ≥ 16 kata`, () => b.words.length >= 16);
    for (const w of b.words) {
      if (!/^[A-Z]{3,14}$/.test(w.answer)) {
        bankErrors++;
        console.log(`    ⚠ jawaban invalid: "${w.answer}" (${b.key})`);
      }
      if (w.clue.trim().length === 0) bankErrors++;
      if (allAnswers.has(w.answer)) dupAnswers.push(w.answer);
      allAnswers.add(w.answer);
    }
  }
  test("semua jawaban A–Z, 3–14 huruf, tanpa spasi/tanda baca", () => bankErrors === 0);
  test("tidak ada jawaban duplikat lintas tema", () => dupAnswers.length === 0);
  test("total kata ≥ 280", () => allAnswers.size >= 280);
  test("ada 11 tema + Ujian Akhir (12 level)", () => TTS_BANK.length === 11 && TTS_LEVELS.length === 12);
  test("setiap tema ≥ 16 kata (bank cukup untuk variasi antar main)", () => TTS_BANK.every((b) => b.words.length >= 16));
  const bakuSpot: Array<[string, string]> = [
    ["KARIER", "karir"], ["RISIKO", "resiko"], ["NASIHAT", "nasehat"],
    ["IZIN", "ijin"], ["CABAI", "cabe"], ["ANTRE", "antri"],
    ["KONKRET", "konkrit"], ["HAKIKAT", "hakekat"], ["JUMAT", "jum'at"],
    ["RAPOR", "rapot"], ["ATLET", "athlet"], ["METODE", "metoda"],
  ];
  test(
    "ejaan baku spot-check (karier, risiko, nasihat, izin, cabai, antre, konkret, hakikat, jumat, rapor, atlet, metode)",
    () => bakuSpot.every(([baku]) => allAnswers.has(baku))
  );
  test("Ujian Akhir (level 12) memakai campuran semua tema", () => mixedBank().length > TTS_BANK[0].words.length && mixedBank().length >= 280);
  test("level 1–11 bertema, level 12 Ujian Akhir", () => {
    return TTS_LEVELS.slice(0, 11).every((l) => l.title === TTS_BANK[l.level - 1].title)
      && levelConfig(12).title === "Ujian Akhir"
      && levelConfig(12).mascot === "alby";
  });

  // ── 2. Generator ──
  console.log("\n── 2. Generator (deterministik, valid, bervariasi) ──");
  for (const cfg of TTS_LEVELS) {
    const p1 = buildPuzzle({ level: cfg.level, seed: 12345 });
    const p2 = buildPuzzle({ level: cfg.level, seed: 12345 });
    const errs = validateGrid(p1);
    test(
      `L${cfg.level} deterministik (seed sama → sama)`,
      () => JSON.stringify(p1.words) === JSON.stringify(p2.words)
    );
    test(
      `L${cfg.level} grid valid (${p1.rows}×${p1.cols}, ${p1.words.length} kata)`,
      () => errs.length === 0 && p1.words.length >= cfg.minWords
    );
    test(
      `L${cfg.level} judul/maskot sesuai level`,
      () => p1.title === cfg.title && p1.mascot === cfg.mascot
    );
    if (errs.length > 0) console.log(`    ⚠ ${errs.join("; ")}`);
  }
  const pA = buildPuzzle({ level: 5, seed: 1 });
  const pB = buildPuzzle({ level: 5, seed: 2 });
  const pC = buildPuzzle({ level: 5, seed: 3 });
  test(
    "seed berbeda → kata berbeda (variasi antar main)",
    () => {
      const a = pA.words.map((w) => w.answer).sort().join(",");
      const b = pB.words.map((w) => w.answer).sort().join(",");
      const c = pC.words.map((w) => w.answer).sort().join(",");
      return a !== b && a !== c && b !== c;
    }
  );
  test("level 12 (Ujian Akhir) campuran & valid", () => {
    const p = buildPuzzle({ level: 12, seed: 777 });
    return p.title === "Ujian Akhir" && validateGrid(p).length === 0 && p.words.length >= levelConfig(12).minWords;
  });

  // ── 3. Anti-ulang ──
  console.log("\n── 3. Anti-ulang (avoidAnswers) ──");
  const firstFive = buildPuzzle({ level: 4, seed: 99 }).words.slice(0, 5).map((w) => w.answer);
  const pAvoid = buildPuzzle({ level: 4, seed: 999, avoidAnswers: firstFive });
  test("jawaban yang dihindari tidak muncul (bank cukup)", () => {
    const answers = new Set(pAvoid.words.map((w) => w.answer));
    return firstFive.every((a) => !answers.has(a));
  });
  const tinyPool = buildPuzzle({ level: 1, seed: 5, avoidAnswers: bankForLevel(1).map((w) => w.answer) });
  test("bank habis → tetap menghasilkan puzzle valid (fallback jujur)", () => {
    return tinyPool.words.length >= 4 && validateGrid(tinyPool).length === 0;
  });

  // ── 4. Seed harian ──
  console.log("\n── 4. Seed Harian ──");
  test("dailySeed berbeda per tanggal", () => dailySeed(3, "2026-08-17") !== dailySeed(3, "2026-08-18"));
  test("dailySeed konsisten per tanggal & level", () => dailySeed(3, "2026-08-17") === dailySeed(3, "2026-08-17"));
  test("dailySeed berbeda per level", () => dailySeed(2, "2026-08-17") !== dailySeed(3, "2026-08-17"));
  test("hashString deterministik", () => hashString("abc") === hashString("abc") && hashString("abc") !== hashString("abd"));
  test("mulberry32 deterministik & dalam [0,1)", () => {
    const r1 = mulberry32(42); const r2 = mulberry32(42);
    const a = [r1(), r1(), r1()]; const b = [r2(), r2(), r2()];
    return a.every((v, i) => v === b[i]) && a.every((v) => v >= 0 && v < 1);
  });

  // ── 5. Ekonomi: nyawa ──
  console.log("\n── 5. Ekonomi: Nyawa (regen) ──");
  const t0 = 1_000_000_000_000;
  test("HEARTS_MAX = 6 & freshHearts penuh", () => HEARTS_MAX === 6 && freshHearts(t0).hearts === 6);
  test("regen: 1 nyawa per 8 menit (cap 6)", () => {
    const s = { hearts: 2, updatedAt: t0 };
    const r1 = regenHearts(s, t0 + HEART_REGEN_MS);
    const r2 = regenHearts(s, t0 + HEART_REGEN_MS * 3);
    const r3 = regenHearts({ hearts: 4, updatedAt: t0 }, t0 + HEART_REGEN_MS * 99);
    return r1.hearts === 3 && r2.hearts === 5 && r3.hearts === 6 && HEART_REGEN_MS === 8 * 60 * 1000;
  });
  test("regen: belum genap 8 menit → tidak bertambah", () => {
    const s = { hearts: 3, updatedAt: t0 };
    return regenHearts(s, t0 + HEART_REGEN_MS - 1000).hearts === 3;
  });
  test("spendHeart: -1, tidak di bawah 0, updatedAt diperbarui", () => {
    const s = { hearts: 1, updatedAt: t0 };
    const spent = spendHeart(s, t0 + 5000);
    const zero = spendHeart({ hearts: 0, updatedAt: t0 }, t0);
    return spent.hearts === 0 && spent.updatedAt === t0 + 5000 && zero.hearts === 0;
  });
  test("nextHeartInMs: 0 saat penuh, ≤ 8 menit saat kurang", () => {
    const full = nextHeartInMs({ hearts: HEARTS_MAX, updatedAt: t0 }, t0);
    const half = nextHeartInMs({ hearts: 3, updatedAt: t0 }, t0 + 60_000);
    return full === 0 && half > 0 && half <= HEART_REGEN_MS;
  });
  test("pemain yang lama pergi otomatis dapat nyawa penuh", () => {
    const s = { hearts: 1, updatedAt: t0 };
    return regenHearts(s, t0 + 3 * 60 * 60 * 1000).hearts === HEARTS_MAX;
  });

  // ── 6. Ekonomi: tier pemain ──
  console.log("\n── 6. Ekonomi: Tier Pemain ──");
  test("tier naik sesuai XP lokal (Pemula → Legenda)", () => {
    return tierFor(0).tier.name === "Pemula Kata"
      && tierFor(250).tier.name === "Pengeja"
      && tierFor(600).tier.name === "Perangkai Kata"
      && tierFor(1200).tier.name === "Maestro Kata"
      && tierFor(2000).tier.name === "Legenda Bahasa";
  });
  test("threshold tier seimbang dengan XP per main v3 (Pengeja ≈ 1–2 main L12)", () => {
    // cap XP L12 = 240; Pengeja 250 ≈ 1-2 main penuh — progres terasa, tidak instan.
    return PLAYER_TIERS[1].min === 250 && PLAYER_TIERS[4].min === 2000;
  });
  test("tier tertinggi tidak punya next, progress = 1", () => {
    const top = tierFor(99999);
    return top.next === null && top.progress === 1;
  });
  test("progress 0..1 menuju tier berikutnya", () => {
    const p = tierFor(125); // antara Pemula (0) dan Pengeja (250)
    return Math.abs(p.progress - 0.5) < 0.001 && p.next?.name === "Pengeja";
  });
  test("urutan tier naik dan minimal 4 tier", () => {
    return PLAYER_TIERS.length >= 4
      && PLAYER_TIERS.every((t, i) => i === 0 || t.min > PLAYER_TIERS[i - 1].min);
  });

  // ── 7. Ekonomi: rentetan harian ──
  console.log("\n── 7. Ekonomi: Rentetan Harian ──");
  const d1 = "2026-08-17";
  const d2 = "2026-08-18";
  test("bumpStreak: hari sama → tidak berubah; hari berurutan → +1; bolong → reset 1", () => {
    const s = { lastDate: d1, streak: 3 };
    const same = bumpStreak(s, new Date("2026-08-17T10:00:00"));
    const next = bumpStreak(s, new Date("2026-08-18T10:00:00"));
    const gap = bumpStreak(s, new Date("2026-08-20T10:00:00"));
    return same.streak === 3 && next.streak === 4 && gap.streak === 1 && gap.lastDate === "2026-08-20";
  });
  test("todayLocal/yesterdayLocal konsisten & berurutan", () => {
    const t = new Date("2026-08-17T12:00:00");
    return todayLocal(t) === d1 && yesterdayLocal(t) === "2026-08-16";
  });
  test("streakXpBonus: 0 untuk < 2 hari, naik +3/hari, cap 10 hari (maks +30)", () => {
    return streakXpBonus(1) === 0 && streakXpBonus(2) === 6
      && streakXpBonus(10) === 30 && streakXpBonus(20) === 30;
  });

  // ── Summary ──
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  if (failed > 0) process.exit(1);
  console.log("✅ ALL TTS GENERATOR TESTS PASSED\n");
}

main();
