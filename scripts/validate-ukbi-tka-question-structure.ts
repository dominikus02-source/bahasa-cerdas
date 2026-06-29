import { db } from "../lib/db";

interface CheckResult {
  name: string;
  pass: boolean;
  detail?: string;
}

interface OptionItem {
  id: string;
  text: string;
}

function validateOptions(options: unknown, label: string): CheckResult[] {
  const results: CheckResult[] = [];
  if (!Array.isArray(options)) {
    results.push({ name: `${label}: options is array`, pass: false, detail: `type=${typeof options}` });
    return results;
  }
  results.push({ name: `${label}: options is array`, pass: true, detail: `count=${options.length}` });

  const ids = options.map((o, i) => {
    const opt = o as OptionItem;
    if (!opt || typeof opt !== "object") {
      results.push({ name: `${label}: option[${i}] is object`, pass: false, detail: `type=${typeof o}` });
      return null;
    }
    return opt.id;
  });

  const nonNullIds = ids.filter((x): x is string => x !== null);
  const uniqueIds = new Set(nonNullIds);
  const dupes = nonNullIds.length !== uniqueIds.size;
  const dupeDetails = nonNullIds.filter((id, idx) => nonNullIds.indexOf(id) !== idx);
  results.push({
    name: `${label}: option IDs unique`,
    pass: !dupes,
    detail: dupes ? `duplicates: ${[...new Set(dupeDetails)].join(", ")}` : `all ${nonNullIds.length} unique`,
  });

  const texts = options.map((o, i) => {
    const opt = o as OptionItem;
    if (!opt || typeof opt !== "object") return null;
    if (typeof opt.text !== "string") {
      results.push({ name: `${label}: option[${i}].text is string`, pass: false, detail: `type=${typeof opt.text}` });
      return null;
    }
    return opt.text;
  });

  const nonNullTexts = texts.filter((x): x is string => x !== null);
  const uniqueTexts = new Set(nonNullTexts);
  if (nonNullTexts.length !== uniqueTexts.size) {
    const seen = new Map<string, number[]>();
    nonNullTexts.forEach((t, idx) => {
      if (!seen.has(t)) seen.set(t, []);
      seen.get(t)!.push(idx);
    });
    const dupeTexts = [...seen.entries()].filter(([, indices]) => indices.length > 1);
    results.push({
      name: `${label}: option texts unique`,
      pass: false,
      detail: dupeTexts.map(([t, idx]) => `"${t.slice(0, 50)}" at indices ${idx.join(",")}`).join("; "),
    });
  } else {
    results.push({ name: `${label}: option texts unique`, pass: true, detail: `all ${nonNullTexts.length} unique` });
  }

  return results;
}

async function validateUKBI(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const count = await db.uKBIQuestion.count();
  results.push({ name: "UKBI: total questions", pass: count >= 50, detail: `count=${count}` });

  const questions = await db.uKBIQuestion.findMany({
    select: { id: true, text: true, options: true, correctAnswer: true, seksi: true, difficulty: true, isActive: true, isVerified: true, type: true },
  });

  let noText = 0, noOptions = 0, noCorrect = 0, invalidCorrect = 0, inactive = 0;
  for (const q of questions) {
    if (!q.text || q.text.trim() === "") noText++;
    if (q.type !== "CONSTRUCTED" && (!Array.isArray(q.options) || (q.options as OptionItem[]).length === 0)) noOptions++;
    if (q.type !== "CONSTRUCTED" && (!q.correctAnswer || q.correctAnswer.trim() === "")) noCorrect++;
    if (q.correctAnswer && Array.isArray(q.options)) {
      const validIds = (q.options as OptionItem[]).map((o) => o.id);
      if (!validIds.includes(q.correctAnswer)) invalidCorrect++;
    }
    if (!q.isActive) inactive++;
  }
  results.push({ name: "UKBI: no empty text", pass: noText === 0, detail: `empty=${noText}` });
  results.push({ name: "UKBI: no empty options", pass: noOptions === 0, detail: `empty=${noOptions}` });
  results.push({ name: "UKBI: no empty correctAnswer", pass: noCorrect === 0, detail: `empty=${noCorrect}` });
  results.push({ name: "UKBI: correctAnswer in options", pass: invalidCorrect === 0, detail: `invalid=${invalidCorrect}` });
  results.push({ name: "UKBI: all active", pass: inactive === 0, detail: `inactive=${inactive}` });

  const sections = await db.uKBIQuestion.groupBy({ by: ["seksi"], _count: true });
  const seksiNames = sections.map((s) => s.seksi);
  results.push({ name: "UKBI: all seksi values valid", pass: seksiNames.every((s) => ["MENDENGARKAN", "MERESPONS_KAIDAH", "MEMBACA", "MENULIS", "BERBICARA"].includes(s)), detail: seksiNames.join(", ") });

  const difficulties = await db.uKBIQuestion.groupBy({ by: ["difficulty"], _count: true });
  const diffNames = difficulties.map((d) => d.difficulty);
  results.push({ name: "UKBI: all difficulty values valid", pass: diffNames.every((d) => ["EASY", "MEDIUM", "HARD", "VERY_HARD"].includes(d)), detail: diffNames.join(", ") });

  const allOptions = questions.filter((q) => Array.isArray(q.options) && (q.options as OptionItem[]).length > 0);
  for (const q of allOptions) {
    const opts = q.options as OptionItem[];
    const optsResults = validateOptions(opts, `UKBI:${q.id.slice(0, 8)}`);
    results.push(...optsResults);
  }

  return results;
}

async function validateTKA(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const count = await db.tKAQuestion.count();
  results.push({ name: "TKA: total questions", pass: count >= 50, detail: `count=${count}` });

  const questions = await db.tKAQuestion.findMany({
    select: { id: true, text: true, options: true, correctAnswer: true, kompetensi: true, difficulty: true, isActive: true, isVerified: true, weight: true },
  });

  let noText = 0, noOptions = 0, noCorrect = 0, invalidCorrect = 0, invalidWeight = 0, inactive = 0;
  for (const q of questions) {
    if (!q.text || q.text.trim() === "") noText++;
    if (q.type !== "CONSTRUCTED" && (!Array.isArray(q.options) || (q.options as OptionItem[]).length === 0)) noOptions++;
    if (!q.correctAnswer || q.correctAnswer.trim() === "") noCorrect++;
    if (q.correctAnswer && Array.isArray(q.options)) {
      const validIds = (q.options as OptionItem[]).map((o) => o.id);
      if (!validIds.includes(q.correctAnswer)) invalidCorrect++;
    }
    if (q.weight <= 0) invalidWeight++;
    if (!q.isActive) inactive++;
  }
  results.push({ name: "TKA: no empty text", pass: noText === 0, detail: `empty=${noText}` });
  results.push({ name: "TKA: no empty options", pass: noOptions === 0, detail: `empty=${noOptions}` });
  results.push({ name: "TKA: no empty correctAnswer", pass: noCorrect === 0, detail: `empty=${noCorrect}` });
  results.push({ name: "TKA: correctAnswer in options", pass: invalidCorrect === 0, detail: `invalid=${invalidCorrect}` });
  results.push({ name: "TKA: weight > 0", pass: invalidWeight === 0, detail: `invalid=${invalidWeight}` });
  results.push({ name: "TKA: all active", pass: inactive === 0, detail: `inactive=${inactive}` });

  const kompetensis = await db.tKAQuestion.groupBy({ by: ["kompetensi"], _count: true });
  const kompetensiNames = kompetensis.map((k) => k.kompetensi);
  results.push({ name: "TKA: all kompetensi values valid", pass: kompetensiNames.every((k) => ["PEDAGOGIK", "PROFESIONAL", "SOSIAL", "KEPRIBADIAN", "LITERASI_MEMBACA", "TATA_BAHASA", "SASTRA", "MENULIS"].includes(k)), detail: kompetensiNames.join(", ") });

  const difficulties = await db.tKAQuestion.groupBy({ by: ["difficulty"], _count: true });
  const diffNames = difficulties.map((d) => d.difficulty);
  results.push({ name: "TKA: all difficulty values valid", pass: diffNames.every((d) => ["EASY", "MEDIUM", "HARD", "VERY_HARD"].includes(d)), detail: diffNames.join(", ") });

  const allOptions = questions.filter((q) => Array.isArray(q.options) && (q.options as OptionItem[]).length > 0);
  for (const q of allOptions) {
    const opts = q.options as OptionItem[];
    const optsResults = validateOptions(opts, `TKA:${q.id.slice(0, 8)}`);
    results.push(...optsResults);
  }

  return results;
}

async function validatePaket(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const count = await db.paketKompetensi.count();
  results.push({ name: "Paket: total pakets", pass: count > 0, detail: `count=${count}` });

  const pakets = await db.paketKompetensi.findMany({
    select: { id: true, title: true, type: true, totalQuestions: true, duration: true, isActive: true, sectionsData: true, questionPool: true },
  });

  for (const p of pakets) {
    const tag = `Paket:${p.id.slice(0, 8)}`;
    results.push({ name: `${tag}: isActive`, pass: p.isActive, detail: `type=${p.type}` });
    results.push({ name: `${tag}: totalQuestions > 0`, pass: p.totalQuestions > 0, detail: `total=${p.totalQuestions}` });
    results.push({ name: `${tag}: duration > 0`, pass: p.duration > 0, detail: `duration=${p.duration}` });

    if (["UKBI", "UKBI_SIMULASI", "UKBI_LATIHAN"].includes(p.type)) {
      if (p.sectionsData && Array.isArray(p.sectionsData)) {
        for (const [si, section] of p.sectionsData.entries()) {
          const sec = section as { questionPool?: string[] };
          if (sec.questionPool && Array.isArray(sec.questionPool)) {
            for (const qid of sec.questionPool) {
              const exists = await db.uKBIQuestion.findUnique({ where: { id: qid }, select: { id: true } });
              results.push({
                name: `${tag}: section[${si}] references exist in UKBIQuestion`,
                pass: !!exists,
                detail: exists ? `qid=${qid.slice(0, 8)}` : `ORPHAN qid=${qid.slice(0, 8)}`,
              });
            }
          }
        }
      }
    }

    if (["TKA_GURU", "TKA_SISWA", "TKA"].includes(p.type)) {
      if (p.sectionsData && Array.isArray(p.sectionsData)) {
        for (const [si, section] of p.sectionsData.entries()) {
          const sec = section as { questionPool?: string[] };
          if (sec.questionPool && Array.isArray(sec.questionPool)) {
            for (const qid of sec.questionPool) {
              const exists = await db.tKAQuestion.findUnique({ where: { id: qid }, select: { id: true } });
              results.push({
                name: `${tag}: section[${si}] references exist in TKAQuestion`,
                pass: !!exists,
                detail: exists ? `qid=${qid.slice(0, 8)}` : `ORPHAN qid=${qid.slice(0, 8)}`,
              });
            }
          }
        }
      }
    }
  }

  return results;
}

function printResults(results: CheckResult[]): { total: number; passed: number; failed: number } {
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed (${results.length} total)`);
  if (failed > 0) {
    console.log("\n❌ FAILED CHECKS:");
    for (const r of results.filter((r) => !r.pass)) {
      console.log(`   [FAIL] ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
    }
  }
  return { total: results.length, passed, failed };
}

async function main() {
  console.log("🔍 UKBI/TKA QUESTION STRUCTURAL VALIDATOR");
  console.log("=".repeat(60));
  console.log("Read-only. No database mutations.\n");

  const allResults: CheckResult[] = [];

  console.log("── UKBI Question Structure ──");
  const ukbiResults = await validateUKBI();
  allResults.push(...ukbiResults);
  const ukbiSummary = printResults(ukbiResults);
  console.log(`   UKBI checks: ${ukbiSummary.passed}/${ukbiSummary.total} passed`);

  console.log("\n── TKA Question Structure ──");
  const tkaResults = await validateTKA();
  allResults.push(...tkaResults);
  const tkaSummary = printResults(tkaResults);
  console.log(`   TKA checks: ${tkaSummary.passed}/${tkaSummary.total} passed`);

  console.log("\n── PaketKompetensi References ──");
  const paketResults = await validatePaket();
  allResults.push(...paketResults);
  const paketSummary = printResults(paketResults);
  console.log(`   Paket checks: ${paketSummary.passed}/${paketSummary.total} passed`);

  const grandSummary = printResults(allResults);
  console.log(`\n${"=".repeat(60)}`);

  if (grandSummary.failed > 0) {
    console.log("❌ VALIDATION FAILED — fatal errors found\n");
    process.exit(1);
  }
  console.log("✅ ALL STRUCTURAL CHECKS PASSED\n");

  await db.$disconnect();
}

main().catch((e) => {
  console.error("❌ Validator crashed:", e.message);
  process.exit(1);
});
