import { db } from "../lib/db";

interface OptionItem {
  id: string;
  text: string;
}

const DRY_RUN = !process.argv.includes("--execute");

async function main() {
  console.log("🔧 UKBI/TKA STRUCTURAL FIXER (Safe Mode)");
  console.log("=".repeat(60));
  if (DRY_RUN) {
    console.log("🔸 DRY RUN — no changes will be made. Pass --execute to apply fixes.\n");
  } else {
    console.log("⚠️  EXECUTE MODE — changes will be applied.\n");
  }

  let fixCount = 0;

  // ── UKBI: correctAnswer not in options ──
  const ukbiQuestions = await db.uKBIQuestion.findMany({
    select: { id: true, correctAnswer: true, options: true, text: true },
  });

  for (const q of ukbiQuestions) {
    if (!Array.isArray(q.options)) continue;
    const opts = q.options as OptionItem[];
    const validIds = opts.map((o) => o.id);
    if (!validIds.includes(q.correctAnswer)) {
      const firstId = opts[0]?.id;
      fixCount++;
      const preview = q.text.length > 60 ? q.text.slice(0, 60) + "..." : q.text;
      console.log(`   [UKBI] ${q.id.slice(0, 8)}: correctAnswer="${q.correctAnswer}" not in [${validIds.join(",")}]`);
      if (firstId) {
        if (DRY_RUN) {
          console.log(`     → Would set correctAnswer to "${firstId}" (first option)`);
        } else {
          await db.uKBIQuestion.update({ where: { id: q.id }, data: { correctAnswer: firstId } });
          console.log(`     → Fixed: set correctAnswer to "${firstId}"`);
        }
      }
    }
  }

  // ── TKA: correctAnswer not in options ──
  const tkaQuestions = await db.tKAQuestion.findMany({
    select: { id: true, correctAnswer: true, options: true, text: true },
  });

  for (const q of tkaQuestions) {
    if (!Array.isArray(q.options)) continue;
    const opts = q.options as OptionItem[];
    const validIds = opts.map((o) => o.id);
    if (!validIds.includes(q.correctAnswer)) {
      const firstId = opts[0]?.id;
      fixCount++;
      const preview = q.text.length > 60 ? q.text.slice(0, 60) + "..." : q.text;
      console.log(`   [TKA] ${q.id.slice(0, 8)}: correctAnswer="${q.correctAnswer}" not in [${validIds.join(",")}]`);
      if (firstId) {
        if (DRY_RUN) {
          console.log(`     → Would set correctAnswer to "${firstId}" (first option)`);
        } else {
          await db.tKAQuestion.update({ where: { id: q.id }, data: { correctAnswer: firstId } });
          console.log(`     → Fixed: set correctAnswer to "${firstId}"`);
        }
      }
    }
  }

  // ── UKBI: duplicate option IDs → rename ──
  for (const q of ukbiQuestions) {
    if (!Array.isArray(q.options)) continue;
    const opts = JSON.parse(JSON.stringify(q.options)) as OptionItem[];
    const idCount = new Map<string, number>();
    let changed = false;
    for (const o of opts) {
      idCount.set(o.id, (idCount.get(o.id) || 0) + 1);
    }
    const dupeIds = [...idCount.entries()].filter(([, c]) => c > 1).map(([id]) => id);
    if (dupeIds.length === 0) continue;

    // Build a set of used IDs to avoid collisions
    const usedIds = new Set(opts.map((o) => o.id));
    for (const dupeId of dupeIds) {
      const indices = opts.map((o, i) => (o.id === dupeId ? i : -1)).filter((i) => i >= 0);
      // Keep the first occurrence, rename the rest
      for (let k = 1; k < indices.length; k++) {
        let newId = `${dupeId}_${k}`;
        while (usedIds.has(newId)) newId += "_";
        usedIds.add(newId);
        opts[indices[k]].id = newId;
        changed = true;
        fixCount++;
        console.log(`   [UKBI] ${q.id.slice(0, 8)}: renamed option ${dupeId} → ${newId} at index ${indices[k]}`);
      }
    }
    if (changed && !DRY_RUN) {
      await db.uKBIQuestion.update({ where: { id: q.id }, data: { options: opts } });
      console.log(`     → Fixed: options updated`);
    }
  }

  // ── TKA: duplicate option IDs → rename ──
  for (const q of tkaQuestions) {
    if (!Array.isArray(q.options)) continue;
    const opts = JSON.parse(JSON.stringify(q.options)) as OptionItem[];
    const idCount = new Map<string, number>();
    let changed = false;
    for (const o of opts) {
      idCount.set(o.id, (idCount.get(o.id) || 0) + 1);
    }
    const dupeIds = [...idCount.entries()].filter(([, c]) => c > 1).map(([id]) => id);
    if (dupeIds.length === 0) continue;

    const usedIds = new Set(opts.map((o) => o.id));
    for (const dupeId of dupeIds) {
      const indices = opts.map((o, i) => (o.id === dupeId ? i : -1)).filter((i) => i >= 0);
      for (let k = 1; k < indices.length; k++) {
        let newId = `${dupeId}_${k}`;
        while (usedIds.has(newId)) newId += "_";
        usedIds.add(newId);
        opts[indices[k]].id = newId;
        changed = true;
        fixCount++;
        console.log(`   [TKA] ${q.id.slice(0, 8)}: renamed option ${dupeId} → ${newId} at index ${indices[k]}`);
      }
    }
    if (changed && !DRY_RUN) {
      await db.tKAQuestion.update({ where: { id: q.id }, data: { options: opts } });
      console.log(`     → Fixed: options updated`);
    }
  }

  // ── TKA: weight = 0 → set to 1.0 ──
  const zeroWeight = DRY_RUN
    ? await db.tKAQuestion.count({ where: { weight: 0 } })
    : 0;
  if (!DRY_RUN) {
    const result = await db.tKAQuestion.updateMany({ where: { weight: 0 }, data: { weight: 1.0 } });
    if (result.count > 0) {
      fixCount += result.count;
      console.log(`   [TKA] Fixed ${result.count} questions with weight=0 → 1.0`);
    }
  } else {
    if (zeroWeight > 0) {
      fixCount += zeroWeight;
      console.log(`   [TKA] Would fix ${zeroWeight} questions with weight=0 → 1.0`);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  if (fixCount === 0) {
    console.log("✨ No issues found — nothing to fix.\n");
  } else {
    console.log(`🔧 ${fixCount} issue(s) ${DRY_RUN ? "detected (dry run)" : "fixed"}.\n`);
    if (DRY_RUN) {
      console.log("   Pass --execute to apply fixes.\n");
    }
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error("❌ Fixer crashed:", e.message);
  process.exit(1);
});
