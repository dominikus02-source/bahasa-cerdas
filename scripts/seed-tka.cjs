/**
 * ⚠️ LEGACY — DO NOT RUN for new TKA bank production.
 * This was used to fix flat option strings from the original seed-kompetensi era.
 * New TKA questions should be seeded via JSON source files in data/question-bank/tka/.
 * Kept for reference only — do not rerun without explicit approval.
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const LETTERS = ["A", "B", "C", "D"];

async function main() {
  console.log('=== Fixing TKA questions ===');

  const all = await p.tKAQuestion.findMany();
  let fixed = 0;
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
  console.log(`Fixed ${fixed} TKA questions`);

  const total = await p.tKAQuestion.count();
  console.log('Total TKA:', total);
  await p.$disconnect();
}
main().catch(e => console.log('Error:', e));
