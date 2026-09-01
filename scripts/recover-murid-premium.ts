/**
 * Recovery Script — Student Premium Activation Failure
 *
 * FINDS: users with Transaksi(type=MURID_PREMIUM, status=SUCCESS)
 *        but User.isPremium=false (activation was lost, likely during deployment race)
 *
 * FIXES: activates premium for each affected user based on their latest SUCCESS transaction.
 *
 * Safety:
 * - DRY-RUN by default. Use --execute to apply.
 * - Only touches MURID_PREMIUM users (not GURU_PRO).
 * - Stacking logic: if user already has active premium, extends from current expiry.
 * - Idempotent: running twice produces no change.
 *
 * Run: npx tsx scripts/recover-murid-premium.ts
 *       npx tsx scripts/recover-murid-premium.ts --execute
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const isExecute = process.argv.includes("--execute");

async function main() {
  const now = new Date();

  // Find users with at least one SUCCESS MURID_PREMIUM transaction but isPremium=false
  const affected = await db.user.findMany({
    where: {
      role: "MURID",
      isPremium: false,
      transaksi: {
        some: {
          type: "MURID_PREMIUM",
          status: "SUCCESS",
        },
      },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      isPremium: true,
      premiumPlan: true,
      premiumUntil: true,
      transaksi: {
        where: {
          type: "MURID_PREMIUM",
          status: "SUCCESS",
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          reference: true,
          amount: true,
          orderId: true,
          createdAt: true,
          metadata: true,
        },
      },
    },
  });

  console.log(`\n=== Student Premium Recovery ===`);
  console.log(`Affected users: ${affected.length}`);

  if (affected.length === 0) {
    console.log(`\nNo affected users found. All clear.`);
    await db.$disconnect();
    process.exit(0);
  }

  for (const u of affected) {
    const tx = u.transaksi[0];
    const meta = (tx.metadata || {}) as Record<string, any>;
    const planId = meta.planId || tx.reference || "MURID_PREMIUM_MONTHLY";
    const durationDays = planId.includes("YEARLY") ? 365 : 30;

    // Calculate premiumUntil: stack if active, otherwise from now
    let premiumUntil: Date;
    if (u.premiumUntil && u.premiumUntil > now) {
      premiumUntil = new Date(u.premiumUntil.getTime() + durationDays * 24 * 60 * 60 * 1000);
    } else {
      premiumUntil = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    }

    console.log(`\n  User: ${u.fullName} (${u.email})`);
    console.log(`    Transaction: ${tx.orderId} — Rp ${tx.amount.toLocaleString("id-ID")} — ${tx.reference}`);
    console.log(`    Plan: ${planId} — ${durationDays} days`);
    console.log(`    Activate until: ${premiumUntil.toISOString().slice(0, 10)}`);

    if (!isExecute) {
      console.log(`    [DRY-RUN] Would set: isPremium=true, premiumPlan="PRO", premiumUntil=${premiumUntil.toISOString()}`);
      continue;
    }

    await db.user.update({
      where: { id: u.id },
      data: {
        isPremium: true,
        premiumPlan: "PRO",
        premiumUntil,
      },
    });

    console.log(`    ✅ ACTIVATED`);
  }

  if (!isExecute) {
    console.log(`\nDRY-RUN — no changes made. Run with --execute to activate ${affected.length} users.`);
  } else {
    console.log(`\n✅ Recovery complete: ${affected.length} users activated.`);
  }

  await db.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error("Recovery failed:", e);
  await db.$disconnect();
  process.exit(1);
});
