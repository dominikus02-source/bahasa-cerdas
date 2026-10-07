/**
 * KUIS TEMPUR SOLO 4.0 — shared Phaser world + combat UX regression.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QUESTION_BANK_EXPANDED } from "../lib/game/question-bank";
import { validateAll } from "../lib/game-questions/validator";
import { normalizeBankQuestion } from "../lib/game-questions/normalizer";

const ROOT = join(__dirname, "..");
const solo = readFileSync(join(ROOT, "components/game/KuisTempurSolo.tsx"), "utf8");
const phaser = readFileSync(join(ROOT, "components/game/KuisTempurPhaserWorld.tsx"), "utf8");

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
  } catch (error) {
    failed++;
    console.log(`  ❌ ${name}: ${error instanceof Error ? error.message : error}`);
  }
}

console.log("\n════════════════════════════════════════════");
console.log("  KUIS TEMPUR SOLO 4.0 — Shared Phaser UX");
console.log("════════════════════════════════════════════\n");

console.log("── Runtime & identity ──");
test("1. Solo memakai Phaser renderer yang sama dengan multiplayer", () => solo.includes("KuisTempurPhaserWorld"));
test("2. Solo memakai roster karakter baru", () =>
  solo.includes("KUIS_TEMPUR_PLAYABLE_CHARACTERS") && solo.includes("normalizeKuisTempurCharacterId"));
test("3. picker solo tidak lagi memakai karakter legacy", () =>
  !solo.includes("Master Zelby") && !solo.includes("gambarKarakter") && !solo.includes("KARAKTER.map"));
test("4. world Kampung Kata berasal dari renderer shared", () =>
  phaser.includes("arena_base_01.png") && phaser.includes("buildVillage") && phaser.includes("buildAtmosphere"));

console.log("\n── Session & combat loop ──");
test("5. sesi solo 3 menit", () => solo.includes("SOLO_DURATION = 180"));
test("6. HP pemain dimulai 100", () => solo.includes("hp: 100") && solo.includes("hpMax: 100"));
test("7. ammo cap 6", () => solo.includes("MAX_AMMO = 6") && solo.includes("Math.min(MAX_AMMO, me.ammo + 1)"));
test("8. ada empat monster authored", () => solo.includes('BOT_MONSTER_IDS') && solo.includes('korog-bayangan'));
test("9. bot bergerak dengan AI interval", () => solo.includes("window.setInterval") && solo.includes('entity.kind !== "bot"'));
test("10. bot menyerang pemain dan damage dirender shared", () =>
  solo.includes("damagePlayer(") && solo.includes("hitEvent={hitEvent}") && phaser.includes("playHit"));
test("11. click-to-move memakai callback lokal", () =>
  solo.includes("onMove={handleMove}") && phaser.includes("onMoveRef.current"));
test("12. click target untuk menembak", () =>
  solo.includes("onShoot={handleShoot}") && solo.includes("distance > 560"));
test("13. KO menambah kill + score", () =>
  solo.includes("kills: entity.kills + (ko ? 1 : 0)") && solo.includes("score: entity.score + (ko ? 240 : 25)"));
test("14. bot respawn dan menguat per level", () =>
  solo.includes("respawnBot") && solo.includes("70 + (currentLevel - 1) * 8"));
test("15. level berasal dari KO", () =>
  solo.includes("Math.floor((player?.kills || 0) / 3)"));

console.log("\n── Question system ──");
const bank = QUESTION_BANK_EXPANDED.map((q, i) => normalizeBankQuestion(q, i, "bank"));
const validation = validateAll(bank);
test("16. soal memakai bank tervalidasi", () =>
  solo.includes("QUESTION_BANK_EXPANDED") && validation.every((row) => row.status !== "QUARANTINED"));
test("17. semua soal punya minimum empat opsi", () => bank.every((q) => q.options.length >= 4));
test("18. deck diacak per sesi", () => solo.includes("sort(() => Math.random() - 0.5)") && solo.includes(".pop()"));
test("19. jawaban benar memberi ammo + feedback energi", () =>
  solo.includes('text: "Benar! Peluru +1"') && solo.includes('kuisTempurAudio.play("correct")'));
test("20. timeout soal punya konsekuensi", () =>
  solo.includes("questionTime <= 0") && solo.includes('text: "Waktu habis. Tidak mendapat peluru."'));

console.log("\n── Result, XP & layout ──");
test("21. XP tetap lewat API server", () =>
  solo.includes('"/api/game/xp"') && solo.includes('gameType: "RIMBA_KATA"') && solo.includes("gameSessionId"));
test("22. guard mencegah result/XP ganda", () =>
  solo.includes("if (endingRef.current) return") && solo.includes("endingRef.current = true"));
test("23. result baru punya skor/KO/akurasi/XP", () =>
  solo.includes("MISI SELESAI") && solo.includes("finalStats.kills") && solo.includes("accuracy") && solo.includes("xpEarned"));
test("24. HUD baru berisi HP, AMUNISI, SKOR, WAKTU", () =>
  ["HP", "AMUNISI", "SKOR", "WAKTU"].every((label) => solo.includes(label)));
test("25. soal menjadi combat panel bawah", () =>
  solo.includes("SOAL AMUNISI") && solo.includes("absolute inset-x-0 bottom-0"));
test("26. select screen memakai bahasa game", () =>
  solo.includes("Jawab. Dapat amunisi. Tempur.") && solo.includes("MASUK KAMPUNG KATA") && solo.includes("PILIH KARAKTER"));
test("27. renderer lokal tidak wajib emit socket movement", () =>
  phaser.includes("if (onMoveRef.current)") && phaser.includes("if (onShootRef.current)"));

console.log("\n════════════════════════════════════════════");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("════════════════════════════════════════════\n");
if (failed > 0) process.exit(1);
