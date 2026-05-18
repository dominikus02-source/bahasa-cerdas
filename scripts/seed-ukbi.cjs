const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL || 'postgresql://bahasa:***REMOVED-DB-PASSWORD***@***REMOVED-VPS-IP***:5432/bahasacerdas' } } });

const LETTERS = ["A", "B", "C", "D"];

function fixOptions(options) {
  if (!options || !options.length) return options;
  if (typeof options[0] === 'string') {
    return options.map((text, i) => ({ id: LETTERS[i] || String(i), text }));
  }
  return options;
}

function fixCorrectAnswer(correctAnswer, options) {
  if (["A","B","C","D","E"].includes(correctAnswer)) return correctAnswer;
  const idx = parseInt(correctAnswer);
  if (!isNaN(idx) && idx >= 0 && idx < LETTERS.length) {
    return LETTERS[idx];
  }
  return correctAnswer;
}

async function main() {
  console.log('=== Fixing UKBI questions ===');

  // Fix questions with flat string options
  const all = await p.uKBIQuestion.findMany();
  let fixed = 0;
  for (const q of all) {
    const opts = q.options;
    if (typeof opts[0] === 'string') {
      const newOpts = fixOptions(opts);
      const newAnswer = fixCorrectAnswer(q.correctAnswer, newOpts);
      await p.uKBIQuestion.update({
        where: { id: q.id },
        data: { options: newOpts, correctAnswer: newAnswer },
      });
      fixed++;
    }
  }
  console.log(`Fixed ${fixed} UKBI questions (flat options → {id, text} format)`);

  const total = await p.uKBIQuestion.count();
  console.log('Total UKBI:', total);
}
main().catch(e => console.log('Error:', e)).finally(() => p.$disconnect());
