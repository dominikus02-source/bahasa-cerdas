/**
 * TEST — TTS-specific eligibility contract.
 *
 * TTS tidak boleh menerima semua soal yang "valid" untuk kuis umum.
 */
import { evaluateTtsCandidate, filterTtsWords } from "../lib/game/tts/eligibility";
import { TTS_BANK } from "../lib/game/tts/word-bank";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      console.log("  ✅ " + name);
      passed++;
    } else {
      console.log("  ❌ " + name);
      failed++;
    }
  } catch (error) {
    console.log("  ❌ " + name + " — " + (error instanceof Error ? error.message : String(error)));
    failed++;
  }
}

console.log("\n📋 TEST — TTS ELIGIBILITY");
console.log("=".repeat(60));

test("jawaban satu kata bersih → APPROVED", () => {
  const r = evaluateTtsCandidate({
    answer: "FONOLOGI",
    clue: "Cabang ilmu bahasa yang mempelajari sistem bunyi bahasa.",
    type: "PILIHAN_GANDA",
    difficulty: "MEDIUM",
    themeKey: "kelas-kata",
  });
  return r.status === "APPROVED" && r.score >= 80 && r.answer === "FONOLOGI";
});

test("jawaban multi-kata → REJECTED", () => {
  return evaluateTtsCandidate({
    answer: "MEDIA KOMUNIKASI",
    clue: "Sarana yang digunakan untuk menyampaikan pesan.",
  }).status === "REJECTED";
});

test("stem PG mentah → REJECTED", () => {
  return evaluateTtsCandidate({
    answer: "FONOLOGI",
    clue: "Manakah pernyataan yang paling tepat mengenai fonologi?",
    type: "PILIHAN_GANDA",
  }).status === "REJECTED";
});

test("clue berdasarkan bacaan → REJECTED", () => {
  return evaluateTtsCandidate({
    answer: "AMANAT",
    clue: "Berdasarkan teks, pesan moral yang disampaikan penulis adalah ...",
  }).status === "REJECTED";
});

test("jawaban bocor di clue → REJECTED", () => {
  return evaluateTtsCandidate({
    answer: "FONOLOGI",
    clue: "FONOLOGI adalah cabang ilmu bahasa.",
  }).status === "REJECTED";
});

test("clue terlalu panjang → tidak masuk gameplay", () => {
  return evaluateTtsCandidate({
    answer: "KARIER",
    clue: "Kata ini digunakan dalam pembahasan yang sangat panjang dan membutuhkan konteks tambahan sehingga tidak cocok sebagai petunjuk singkat permainan teka-teki silang.",
  }).status !== "APPROVED";
});

test("clue definisi singkat → APPROVED", () => {
  const r = evaluateTtsCandidate({
    answer: "KARIER",
    clue: "Perkembangan dan kemajuan dalam pekerjaan atau profesi.",
    difficulty: "MEDIUM",
  });
  return r.status === "APPROVED";
});

const localWords = TTS_BANK.flatMap((theme) =>
  theme.words.map((word) => ({ ...word, themeKey: theme.key }))
);

test("bank TTS lokal tetap memiliki pool layak", () => {
  const approved = localWords.filter((w) =>
    evaluateTtsCandidate({ answer: w.answer, clue: w.clue, themeKey: w.themeKey }).status === "APPROVED"
  );
  console.log("     approved lokal: " + approved.length);
  return approved.length >= 100;
});

test("filterTtsWords membuang duplikat jawaban", () => {
  const sample = [
    { answer: "KATA", clue: "Satuan bahasa yang memiliki makna." },
    { answer: "KATA", clue: "Satuan bahasa yang dapat berdiri sendiri." },
  ];
  return filterTtsWords(sample).length === 1;
});

console.log("\n" + "=".repeat(60));
console.log("📊 RESULT: " + passed + " passed, " + failed + " failed (" + (passed + failed) + " total)");
if (failed > 0) process.exit(1);
console.log("✅ ALL TTS ELIGIBILITY TESTS PASSED\n");
