/**
 * Fix Passage Propagation (UKBI + TKA reading questions)
 *
 * PROBLEM: In the question-bank JSON, a reading passage is stored only on the
 * FIRST question of each group; sibling questions have an empty `passage`. The
 * seeders wrote `passage || null` verbatim, so in the DB most reading questions
 * have no passage. Because the simulasi API serves a random subset, sibling
 * questions frequently appear with no "Bacaan" on screen.
 *
 * FIX: The JSON array order IS the authoritative group order, and the DB row
 * `id` equals the JSON `id`. So we forward-fill each question's passage in array
 * order and update the DB row by exact id. Idempotent, and only touches the
 * `passage` field of existing rows.
 *
 * Usage:
 *   npx tsx scripts/fix-passage-propagation.ts            # dry-run (default)
 *   npx tsx scripts/fix-passage-propagation.ts --execute  # apply updates
 */
import { db } from "@/lib/db";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const EXECUTE = process.argv.includes("--execute");
const ROOT = join(process.cwd(), "data", "question-bank");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".json")) out.push(p);
  }
  return out;
}

interface RawQ { id?: string; passage?: string | null; [k: string]: any }

function loadQuestions(file: string): RawQ[] {
  try {
    const d = JSON.parse(readFileSync(file, "utf8"));
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.questions)) return d.questions;
    if (Array.isArray(d.soal)) return d.soal;
    return [];
  } catch {
    return [];
  }
}

async function main() {
  const files = walk(ROOT);
  let ukbiUpdates = 0, tkaUpdates = 0, ukbiChecked = 0, tkaChecked = 0, missing = 0;
  const samples: string[] = [];

  for (const file of files) {
    const isUKBI = file.includes(`${"/"}ukbi${"/"}`) || file.includes("\\ukbi\\");
    const isTKA = file.includes(`${"/"}tka${"/"}`) || file.includes("\\tka\\");
    if (!isUKBI && !isTKA) continue;

    const questions = loadQuestions(file);
    // Forward-fill passage in array order (authoritative group order).
    let last = "";
    for (const q of questions) {
      const own = (q.passage ?? "").toString().trim();
      if (own) last = own;
      const filled = own || last;
      if (!q.id || !filled) continue;

      if (isUKBI) {
        ukbiChecked++;
        const row = await db.uKBIQuestion.findUnique({ where: { id: q.id }, select: { passage: true } });
        if (!row) { missing++; continue; }
        if ((row.passage ?? "").trim() !== filled) {
          if (samples.length < 5) samples.push(`UKBI ${q.id}: "${(row.passage ?? "").slice(0, 20)}" -> "${filled.slice(0, 30)}..."`);
          if (EXECUTE) await db.uKBIQuestion.update({ where: { id: q.id }, data: { passage: filled } });
          ukbiUpdates++;
        }
      } else {
        tkaChecked++;
        const row = await db.tKAQuestion.findUnique({ where: { id: q.id }, select: { passage: true } });
        if (!row) { missing++; continue; }
        if ((row.passage ?? "").trim() !== filled) {
          if (samples.length < 5) samples.push(`TKA ${q.id}: "${(row.passage ?? "").slice(0, 20)}" -> "${filled.slice(0, 30)}..."`);
          if (EXECUTE) await db.tKAQuestion.update({ where: { id: q.id }, data: { passage: filled } });
          tkaUpdates++;
        }
      }
    }
  }

  console.log("\n════════ Passage Propagation ════════");
  console.log(`Mode        : ${EXECUTE ? "EXECUTE (writing)" : "DRY-RUN (no writes)"}`);
  console.log(`Files       : ${files.length}`);
  console.log(`UKBI        : ${ukbiUpdates} to update / ${ukbiChecked} checked`);
  console.log(`TKA         : ${tkaUpdates} to update / ${tkaChecked} checked`);
  console.log(`Not in DB   : ${missing} (id present in JSON but not seeded)`);
  if (samples.length) { console.log("Samples:"); samples.forEach(s => console.log("  " + s)); }
  if (!EXECUTE) console.log("\nRe-run with --execute to apply.");
  console.log("═════════════════════════════════════\n");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
