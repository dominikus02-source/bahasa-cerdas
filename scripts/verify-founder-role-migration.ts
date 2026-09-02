/**
 * POST-MIGRATION VERIFICATION — Founder Role Separation
 *
 * Run AFTER executing the SQL migration in Supabase SQL Editor.
 * Verifies: 3 founders have role=GURU, commission exclusion intact,
 * Obahmamah unchanged, no other users affected.
 *
 * Usage:
 *   npx tsx scripts/verify-founder-role-migration.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FOUNDER_IDS = [
  "cmqxema6a000013z9kefn4jm1", // dominikus.02@gmail.com
  "cmqy1g9v50000zag780ik6mrg", // hdsastra47@gmail.com
  "cmqy1ga9r0003zag7fbmqhsq4", // alexsurya1968@gmail.com
];

const OBAHMAMAH_ID = "cmqxh3uor000dy3w3l1l4m2th";

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  console.log("\n🔍 FOUNDER ROLE MIGRATION — POST-MIGRATION VERIFICATION\n");

  // 1. Founder roles
  console.log("1. FOUNDER ROLES");
  const founders = await prisma.user.findMany({
    where: { id: { in: FOUNDER_IDS } },
    select: { id: true, email: true, role: true, isFounder: true },
  });

  check(`Found ${founders.length}/3 founders`, founders.length === 3);

  for (const f of founders) {
    check(`${f.email}: role=${f.role} (expected GURU)`, f.role === "GURU");
    check(`${f.email}: isFounder=${f.isFounder} (expected true)`, f.isFounder === true);
  }

  // 2. No ADMIN founders
  console.log("\n2. NO ADMIN FOUNDERS");
  const adminFounders = founders.filter((f) => f.role === "ADMIN");
  check(`0 founders with role=ADMIN (found ${adminFounders.length})`, adminFounders.length === 0);

  // 3. Commission exclusion
  console.log("\n3. COMMISSION EXCLUSION");
  for (const f of founders) {
    const eligible = f.role === "GURU" && !f.isFounder;
    check(`${f.email}: eligible=${eligible} (expected false)`, eligible === false);
  }

  // 4. Obahmamah unchanged
  console.log("\n4. OBAHMAMAH (unchanged)");
  const obahmamah = await prisma.user.findUnique({
    where: { id: OBAHMAMAH_ID },
    select: { role: true, isFounder: true },
  });
  if (obahmamah) {
    check(`Obahmamah: role=${obahmamah.role} (expected ADMIN)`, obahmamah.role === "ADMIN");
    check(`Obahmamah: isFounder=${obahmamah.isFounder} (expected false)`, obahmamah.isFounder === false);
  } else {
    check("Obahmamah found", false, "record missing");
  }

  // 5. No other users affected
  console.log("\n5. NO OTHER USERS AFFECTED");
  const founderCount = await prisma.user.count({ where: { isFounder: true } });
  check(`Total isFounder=true users: ${founderCount} (expected 3)`, founderCount === 3);

  // 6. Summary
  console.log("\n" + "─".repeat(50));
  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  console.log("─".repeat(50));

  if (failed > 0) {
    console.log("\n❌ VERIFICATION FAILED — investigate before proceeding.\n");
    process.exit(1);
  } else {
    console.log("\n✅ VERIFICATION PASSED — migration successful.\n");
    process.exit(0);
  }
}

main()
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
