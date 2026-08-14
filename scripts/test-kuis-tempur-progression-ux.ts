/**
 * KUIS TEMPUR 3.0 — Level Progression & Combat UX (test suite).
 *
 * Statik (wiring komponen) + murni (engine progresi) + integritas bank soal.
 * Run: npx tsx scripts/test-kuis-tempur-progression-ux.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  lawanBot,
  statDasarBot,
  kurvaPemain,
  komposisiBot,
  type TipeBot,
} from "../lib/game/kuis-tempur-progression";
import { QUESTION_BANK_EXPANDED } from "../lib/game/question-bank";
import { validateAll } from "../lib/game-questions/validator";
import { normalizeBankQuestion } from "../lib/game-questions/normalizer";

const ROOT = join(__dirname, "..");
const komponen = readFileSync(join(ROOT, "components/game/KuisTempurSolo.tsx"), "utf8");

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      passed++;
      console.log(`  ✅ ${name}`);
    } else {
      failed++;
      console.log(`  ❌ ${name}`);
    }
  } catch (e) {
    failed++;
    console.log(`  ❌ ${name}: ${e instanceof Error ? e.message : e}`);
  }
}

console.log("\n════════════════════════════════════════════");
console.log("  KUIS TEMPUR 3.0 — Level Progression & Combat UX");
console.log("════════════════════════════════════════════\n");

/* ── 1–7: initial state & session limits ── */
console.log("── Initial state & session limits ──");
test("1. avatar pemain ada sejak initial state (HUD + arena)", () =>
  komponen.includes('gambarKarakter(karakterku, "happy")') &&
  komponen.includes("avatarHdr") &&
  komponen.includes("kamu = i === 0"));
test("2. initial level = 1", () => komponen.includes('useState(1)') && komponen.includes('const [level, setLevel]'));
test("3. timer sesi diinisialisasi", () => komponen.includes("DURASI = 300") && komponen.includes('useState(DURASI)'));
test("4. durasi maksimal sesi = 5 menit (300 detik)", () => komponen.includes("DURASI = 300"));
test("5. HP diinisialisasi", () => komponen.includes("HP_AWAL = 100") && komponen.includes('useState(HP_AWAL)'));
test("6. HP = 0 langsung game over (tanpa tunggu timer)", () =>
  komponen.includes("HP kamu habis.") &&
  komponen.includes("kalahHp") &&
  komponen.includes("aku.hp <= 0"));
test("7. timer = 0 langsung game over", () =>
  komponen.includes('"Waktu Habis!"') &&
  komponen.includes("sisaWaktu <= 0") &&
  komponen.includes("selesaikan(true, 1)"));

/* ── 8–10: level completion & transition ── */
console.log("\n── Level completion & transition ──");
test("8. level completion overlay ada", () =>
  komponen.includes("LEVEL {level} SELESAI!") && komponen.includes("levelSelesai"));
test("9. transisi level ada (jeda + lanjut otomatis)", () =>
  komponen.includes("LANJUT KE LEVEL") &&
  komponen.includes("naikLevel") &&
  komponen.includes("1600"));
test("10. level naik saat objective tercapai (performa, bukan timer)", () =>
  komponen.includes("dibunuhLevelRef.current >= lawanBot(levelRef.current)") &&
  komponen.includes("setLevel(baru)") &&
  komponen.includes("naikLevel"));

/* ── 11–13: escalation (murni) ── */
console.log("\n── Level escalation (engine murni) ──");
test("11. jumlah musuh meningkat per level", () => {
  const seq = [1, 2, 3, 4, 5, 6, 7, 9, 11].map(lawanBot);
  return seq[0] === 3 && seq.every((v, i) => i === 0 || v >= seq[i - 1]) && seq[seq.length - 1] > seq[0];
});
test("12. statistik musuh meningkat per level (damage & HP)", () => {
  const dmg1 = statDasarBot(1).dmgBot;
  const dmg9 = statDasarBot(9).dmgBot;
  const hp1 = komposisiBot(1, 0, () => 0).hpMax;
  const hp9 = komposisiBot(9, 0, () => 0).hpMax;
  return dmg9 > dmg1 && hp9 > hp1;
});
test("13. distribusi arketipe berubah per level", () => {
  const count = (lvl: number): Record<TipeBot, number> => {
    const out = { ringan: 0, sedang: 0, berat: 0, penembak: 0 } as Record<TipeBot, number>;
    for (let i = 0; i < 60; i++) {
      const t = komposisiBot(lvl, i, () => (i % 10) / 10).tipe;
      out[t]++;
    }
    return out;
  };
  const a = count(1);
  const b = count(25);
  return a.penembak === 0 && b.penembak > 0 && b.berat > a.berat;
});
test("13b. kurva pemain tumbuh (HP & damage) tanpa lonjakan tidak adil", () => {
  const p1 = kurvaPemain(1);
  const p7 = kurvaPemain(7);
  return p7.hpMax > p1.hpMax && p7.hpMax <= 200 && p7.dmgTembak > p1.dmgTembak && p7.dmgTembak <= 50;
});

/* ── 14–18: question system ── */
console.log("\n── Question system ──");
const bankQ = QUESTION_BANK_EXPANDED.map((q, i) => normalizeBankQuestion(q, i, "bank"));
const results = validateAll(bankQ);
test("14. soal dari bank valid yang sudah diaudit", () =>
  komponen.includes("QUESTION_BANK_EXPANDED") &&
  results.every((r) => r.status !== "QUARANTINED"));
test("15. tidak ada soal kosong", () => bankQ.every((q) => q.question.trim().length > 0));
test("16. tidak ada opsi kosong", () => bankQ.every((q) => q.options.length >= 4 && q.options.every((o) => o.trim() !== "")));
test("17. tepat satu jawaban benar (kunci ∈ opsi, opsi unik)", () =>
  bankQ.every((q) => q.options.includes(q.correctAnswer) && new Set(q.options).size === q.options.length));
test("18. shuffle soal tetap aktif (bukan first-N deterministic)", () =>
  komponen.includes("kocok(QUESTION_BANK_EXPANDED)") &&
  komponen.includes("kantongRef.current.pop()"));

/* ── 19–22: XP safety ── */
console.log("\n── XP & gamification safety ──");
test("19. combat level ≠ global player level", () =>
  komponen.includes("levelFromXp(") && komponen.includes("setLevel(") && komponen.includes("Ronde {level}") === false);
test("20. XP tetap server-authoritative (klien hanya kirim skor)", () =>
  komponen.includes("POST") &&
  komponen.includes('"/api/game/xp"') &&
  komponen.includes("score: skor") &&
  komponen.includes("d?.xpEarned"));
test("21. XP idempoten — selesaikan hanya sekali per sesi", () =>
  komponen.includes("if (!jalanRef.current) return") &&
  komponen.includes("jalanRef.current = false"));
test("22. game-over mencegah XP ganda (loop dihentikan)", () =>
  komponen.includes("cancelAnimationFrame(rafRef.current)") &&
  komponen.includes("setFase(\"selesai\")"));

/* ── 23–25: layout & UX ── */
console.log("\n── Layout & UX ──");
test("23. combat arena lebar (tanpa container sempit max-w-md/480px)", () =>
  komponen.includes("max-w-[1280px]") &&
  !komponen.includes('max-w-[480px]'));
test("24. mobile aman (canvas w-full, tombol ≥44px, tanpa horizontal overflow)", () =>
  komponen.includes("h-[60dvh]") &&
  komponen.includes("min-h-[380px]") &&
  komponen.includes("w-full touch-none") &&
  komponen.includes("py-3.5"));
test("25. avatar terlihat di initial state main (arena mulai dengan pemain)", () =>
  komponen.includes("kamu = i === 0") &&
  komponen.includes("gambarKarakter(karakterku, \"happy\")") &&
  komponen.includes('const src = kamu'));

/* ── Summary ── */
console.log("\n════════════════════════════════════════════");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("════════════════════════════════════════════\n");
if (failed > 0) process.exit(1);
