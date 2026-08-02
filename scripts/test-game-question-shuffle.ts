/**
 * Sprint 7 — Tes pengacakan opsi jawaban game + distribusi bank soal.
 * Tanpa DB: murni logika (lib/game/shuffle-options + lib/game/question-bank).
 */
import { shuffleOptions, shuffleKatastraQuestion } from "../lib/game/shuffle-options";
import { QUESTION_BANK } from "../lib/game/question-bank";

let pass = 0;
let fail = 0;
function ok(cond: boolean, name: string) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
}

console.log("\n1. shuffleOptions — permutasi benar");
{
  const opsi = ["A", "B", "C", "D"];
  for (let jawaban = 0; jawaban < 4; jawaban++) {
    const { opsi: o, jawaban: j } = shuffleOptions(opsi, jawaban);
    ok(o.length === 4, `opsi tetap 4 (jawaban=${jawaban})`);
    ok(new Set(o).size === 4, `opsi tetap unik (jawaban=${jawaban})`);
    ok(o[j] === opsi[jawaban], `jawaban lama "${opsi[jawaban]}" ada di index baru ${j} (jawaban=${jawaban})`);
  }
}

console.log("\n2. shuffleOptions — kasus tepi");
{
  ok(shuffleOptions(["A"], 0).jawaban === 0, "satu opsi → jawaban tetap 0");
  const out = shuffleOptions(["A", "B", "C", "D"], 9);
  ok(out.jawaban === 9, "jawaban di luar range tidak diubah");
  const t = shuffleOptions(["A", "B"], 0);
  ok(t.opsi.includes("A") && t.opsi.includes("B"), "dua opsi tetap utuh");
}

console.log("\n3. shuffleKatastraQuestion — bentuk katastra");
{
  const q = shuffleKatastraQuestion({ text: "x", options: ["A", "B", "C"], correct: 1, type: "a" });
  ok(q.options.length === 3, "options tetap 3");
  ok(q.correct >= 0 && q.correct < 3, `correct di-remap ke index valid (${q.correct})`);
  ok(q.options[q.correct] === "B", "jawaban benar menunjuk teks yang sama");
  ok(q.text === "x" && q.type === "a", "field lain tidak berubah");
}

console.log("\n4. Bank soal — semua jawaban valid");
{
  const bad = QUESTION_BANK.filter(q => q.jawaban < 0 || q.jawaban >= q.opsi.length);
  ok(bad.length === 0, `semua jawaban dalam range (0 invalid dari ${QUESTION_BANK.length})`);
  const dupText = QUESTION_BANK.filter(q => new Set(q.opsi.map(o => o.trim().toLowerCase())).size !== q.opsi.length);
  ok(dupText.length === 0, `tidak ada opsi duplikat (${dupText.length} melanggar)`);
}

console.log("\n5. Bank soal — jawaban tidak terkonsentrasi di satu posisi");
{
  const counts = [0, 0, 0, 0];
  for (const q of QUESTION_BANK) counts[q.jawaban] = (counts[q.jawaban] || 0) + 1;
  const total = QUESTION_BANK.length;
  const pct = counts.map(c => Math.round((c / total) * 100));
  ok(Math.max(...pct) < 50, `tidak ada posisi >50% (distribusi: index0=${pct[0]}%, index1=${pct[1]}%, index2=${pct[2]}%, index3=${pct[3]}%)`);
  ok(counts[1] < total * 0.4, `jawaban index 1 tidak dominan (${counts[1]}/${total})`);
}

console.log("\n6. Bank soal — soal unik");
{
  const seen = new Set<string>();
  let dup = 0;
  for (const q of QUESTION_BANK) {
    const key = q.soal.trim().toLowerCase();
    if (seen.has(key)) dup++;
    seen.add(key);
  }
  ok(dup === 0, `0 soal duplikat di dalam bank (${QUESTION_BANK.length} soal)`);
}

console.log(`\nHasil: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
process.exit(0);
