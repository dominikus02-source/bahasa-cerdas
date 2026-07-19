/**
 * Buka Premium 2 Bulan — Set all GURU users to PRO for 2 months
 *
 * Usage:
 *   npx tsx scripts/buka-premium-2-bulan.ts              # dry-run
 *   npx tsx scripts/buka-premium-2-bulan.ts --execute     # apply
 *
 * What it does:
 *   - Sets isPremium=true, premiumPlan="PRO", premiumUntil=now+2months
 *   - Creates/updates AiCreditLedger for each user
 *   - Preserves founder/admin status (already premium)
 *   - Skips MURID (already have unlimited access)
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const EXECUTE = process.argv.includes("--execute");

const PREMIUM_UNTIL = new Date();
PREMIUM_UNTIL.setMonth(PREMIUM_UNTIL.getMonth() + 2);

async function main() {
  console.log("=== BUKA PREMIUM 2 BULAN ===");
  console.log(`Mode: ${EXECUTE ? "🔴 EXECUTE" : "🟡 DRY-RUN"}`);
  console.log(`Premium until: ${PREMIUM_UNTIL.toISOString().slice(0, 10)}\n`);

  const allUsers = await db.user.findMany({
    where: { role: "GURU", isFounder: false },
    select: { id: true, email: true, isPremium: true, premiumPlan: true, premiumUntil: true },
  });

  console.log(`Total GURU users to process: ${allUsers.length}\n`);

  let updated = 0;
  let skipped = 0;

  for (const u of allUsers) {
    // Skip if already premium with later expiry
    if (
      u.isPremium &&
      u.premiumPlan === "PRO" &&
      u.premiumUntil &&
      u.premiumUntil >= PREMIUM_UNTIL
    ) {
      console.log(`  ⏭️  ${u.email} — already PRO until ${u.premiumUntil.toISOString().slice(0, 10)}`);
      skipped++;
      continue;
    }

    console.log(`  ${EXECUTE ? "✅" : "🟡"} ${u.email} — ${u.isPremium ? "FREE→PRO" : "FREE→PRO"}`);
    if (EXECUTE) {
      await db.user.update({
        where: { id: u.id },
        data: {
          isPremium: true,
          premiumPlan: "PRO",
          premiumUntil: PREMIUM_UNTIL,
        },
      });

      // Sync AiCreditLedger for current month
      const period = new Date().toISOString().slice(0, 7);
      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      await db.aiCreditLedger.upsert({
        where: { userId_period_plan: { userId: u.id, period, plan: "GURU_PRO" } },
        update: { creditsTotal: 500, endsAt: endOfMonth },
        create: {
          userId: u.id,
          period,
          plan: "GURU_PRO",
          creditsTotal: 500,
          creditsUsed: 0,
          creditsReserved: 0,
          source: "monthly",
          startsAt: new Date(),
          endsAt: endOfMonth,
        },
      });
    }
    updated++;
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (already PRO): ${skipped}`);

  if (!EXECUTE) {
    console.log(`\n🟡 Dry-run — pass --execute to apply`);
  } else {
    console.log(`\n✅ All GURU users now PRO until ${PREMIUM_UNTIL.toISOString().slice(0, 10)}`);
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
