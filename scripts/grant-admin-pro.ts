/**
 * Grant admin + permanent Pro to core team members.
 * Run: npx tsx scripts/grant-admin-pro.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const EMAILS = [
  "srphysics04@gmail.com",
  "solehahmadnugraha@yahoo.com",
];

async function main() {
  for (const email of EMAILS) {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`NOT FOUND: ${email}`);
      continue;
    }
    await db.user.update({
      where: { email },
      data: {
        role: "ADMIN",
        isFounder: true,
        premiumPlan: "PRO",
        premiumUntil: new Date("2099-12-31"),
        isPremium: true,
      },
    });
    console.log(`UPDATED: ${email} → ADMIN + PRO forever`);
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
