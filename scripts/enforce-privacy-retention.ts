/** Run from an approved scheduler/operator context. Dry run by default. */
import { runPrivacyRetentionSweep } from "../lib/compliance/retention";
import { db } from "../lib/db";

async function main() {
  const execute = process.argv.includes("--execute");
  const result = await runPrivacyRetentionSweep({
    execute,
    reviewRef: process.env.PRIVACY_RETENTION_REVIEW_REF,
  });
  console.log(JSON.stringify(result));
}

main()
  .catch(() => {
    console.error("Retention sweep failed; inspect restricted operational logs.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
