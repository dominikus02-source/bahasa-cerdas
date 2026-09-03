#!/usr/bin/env npx tsx
// ════════════════════════════════════════════════════════════════════
// MANUAL QA ENTRY POINT — DailyBusinessSnapshot generator (Phase 9.2)
//
// Usage (REQUIRES an explicit business date — never defaults to today):
//   npx tsx scripts/generate-snapshot.ts --date 2026-09-01
//
// The date is interpreted as a WIB calendar day (Asia/Jakarta).
// Running the same date twice is idempotent: the existing snapshot is
// returned unchanged (no second row, no mutation).
//
// This is a developer-controlled script. It is NOT wired to cron, NOT part
// of the build, and NOT executed automatically anywhere.
// ════════════════════════════════════════════════════════════════════

import { generateDailyBusinessSnapshot } from "../lib/admin/historical-snapshot";

function usage(): never {
  console.error(
    "Usage: npx tsx scripts/generate-snapshot.ts --date YYYY-MM-DD\n" +
      "  --date: WIB calendar day to snapshot (explicit, required — no default)."
  );
  process.exit(1);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dateIdx = args.indexOf("--date");
  if (dateIdx === -1 || !args[dateIdx + 1]) usage();

  const raw = args[dateIdx + 1];
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) {
    console.error(`Invalid --date format: "${raw}". Expected YYYY-MM-DD.`);
    process.exit(1);
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const businessDate = new Date(Date.UTC(year, month - 1, day)); // UTC midnight carrying the WIB label
  if (Number.isNaN(businessDate.getTime())) usage();

  console.log(`Generating DailyBusinessSnapshot for WIB day ${raw} …`);
  try {
    const row = await generateDailyBusinessSnapshot(businessDate);
    console.log("✅ Snapshot committed (or already existed — returned unchanged):");
    console.log(JSON.stringify(row, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("❌ Snapshot generation failed — NO row written (atomic):");
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

void main();
