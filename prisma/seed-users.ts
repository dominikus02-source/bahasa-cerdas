const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function seed() {
  const existing = await db.user.count();
  if (existing > 2) {
    console.log("Users already seeded (" + existing + ")");
    await db.$disconnect();
    return;
  }

  const g = await db.user.upsert({
    where: { supabaseId: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      supabaseId: "00000000-0000-0000-0000-000000000001",
      email: "guru@demo.com",
      fullName: "Drs. Siti Rahayu, M.Pd.",
      role: "GURU",
      isPremium: true,
      premiumPlan: "PRO",
      isFounder: false,
      xp: 1250,
      level: 5,
      streak: 12,
      league: "SILVER",
    },
  });
  try {
    await db.profile.create({ data: { userId: g.id } });
  } catch (e) {}

  const m = await db.user.upsert({
    where: { supabaseId: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      supabaseId: "00000000-0000-0000-0000-000000000002",
      email: "murid@demo.com",
      fullName: "Ahmad Rizki Pratama",
      role: "MURID",
      isPremium: false,
      premiumPlan: "FREE",
      isFounder: false,
      xp: 480,
      level: 3,
      streak: 5,
      league: "BRONZE",
    },
  });
  try {
    await db.profile.create({ data: { userId: m.id } });
  } catch (e) {}

  const users = await db.user.findMany({ select: { email: true, role: true } });
  console.log("Seeded users:", JSON.stringify(users, null, 2));
  await db.$disconnect();
}
seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
