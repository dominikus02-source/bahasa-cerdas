const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const LETTERS = ["A", "B", "C", "D"];

async function main() {
  console.log('=== Fixing TKA UTBK questions ===');

  const all = await p.tKAQuestion.findMany();
  let fixed = 0;
  let fixedFormat = 0;
  for (const q of all) {
    const opts = q.options;
    if (opts && opts.length && typeof opts[0] === 'string') {
      const newOpts = opts.map((text, i) => ({ id: LETTERS[i] || String(i), text }));
      const idx = parseInt(q.correctAnswer);
      const newAnswer = (!isNaN(idx) && idx >= 0 && idx < LETTERS.length) ? LETTERS[idx] : q.correctAnswer;
      await p.tKAQuestion.update({
        where: { id: q.id },
        data: { options: newOpts, correctAnswer: newAnswer },
      });
      fixed++;
    }
  }

  // Also fix TKA questions where correctAnswer is numeric string but options are already objects
  const withNumeric = await p.tKAQuestion.findMany({
    where: { correctAnswer: { in: ["0","1","2","3"] } },
  });
  for (const q of withNumeric) {
    if (fixedFormat++ > 0) continue; // just check
    console.log(`Found ${withNumeric.length} TKA questions with numeric correctAnswer`);
    for (const qq of withNumeric) {
      const newAnswer = LETTERS[parseInt(qq.correctAnswer)] || qq.correctAnswer;
      await p.tKAQuestion.update({
        where: { id: qq.id },
        data: { correctAnswer: newAnswer },
      });
    }
    break; // process once
  }

  console.log(`Fixed ${fixed} TKA questions (flat options → object format)`);
  const total = await p.tKAQuestion.count();
  console.log('Total TKA:', total);
  await p.$disconnect();
}
main().catch(e => console.log('Error:', e));
