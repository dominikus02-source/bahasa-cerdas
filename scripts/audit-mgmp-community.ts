/**
 * Audit MGMP Community System
 *
 * Dry-run, read-only. Reports on community health.
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const db = new PrismaClient();

const groupsJsonPath = path.join(__dirname, "..", "data", "community-groups", "mgmp-groups.json");

async function main() {
  console.log("=== AUDIT MGMP COMMUNITY ===\n");

  // 1. Total communities
  const total = await db.community.count();
  console.log(`1. Total komunitas: ${total}`);

  // 2. By status
  const approved = await db.community.count({ where: { status: "APPROVED" } });
  const pending = await db.community.count({ where: { status: "PENDING" } });
  const rejected = await db.community.count({ where: { status: "REJECTED" } });
  console.log(`2. Approved: ${approved}, Pending: ${pending}, Rejected: ${rejected}`);

  // 3. Public visible
  const publicVisible = await db.community.count({
    where: { isPublic: true, status: "APPROVED" },
  });
  console.log(`3. Public visible (isPublic + APPROVED): ${publicVisible}`);

  // 4. Seeded groups
  const jsonExists = fs.existsSync(groupsJsonPath);
  let seededNames: string[] = [];
  if (jsonExists) {
    const data = JSON.parse(fs.readFileSync(groupsJsonPath, "utf-8"));
    seededNames = data.map((g: any) => g.name);
    console.log(`4. Seeded groups in JSON: ${seededNames.length}`);
  } else {
    console.log("4. No JSON seed file found");
  }

  // 5. Seeded groups present in DB
  let seededPresent = 0;
  let seededHidden = 0;
  if (seededNames.length > 0) {
    for (const name of seededNames) {
      const c = await db.community.findFirst({ where: { name } });
      if (c) {
        seededPresent++;
        if (!c.isPublic || c.status !== "APPROVED") {
          seededHidden++;
        }
      }
    }
    console.log(`5. Seeded groups in DB: ${seededPresent}/${seededNames.length}`);
    console.log(`   Hidden (not public): ${seededHidden}`);
  }

  // 6. Communities without description
  const noDesc = await db.community.count({
    where: { description: null, isPublic: true, status: "APPROVED" },
  });
  console.log(`6. Approved public communities without description: ${noDesc}`);

  // 7. Communities with official claims (exclude "bukan kanal resmi" disclaimer)
  const officialClaims = await db.community.findMany({
    where: {
      isPublic: true,
      status: "APPROVED",
      description: { contains: "resmi", mode: "insensitive" },
      NOT: { description: { contains: "bukan kanal resmi", mode: "insensitive" } },
    },
    select: { id: true, name: true, isVerified: true },
  });
  const fakeOfficial = officialClaims.filter((c) => !c.isVerified);
  console.log(`7. Communities with 'resmi' claim but not verified: ${fakeOfficial.length}`);
  if (fakeOfficial.length > 0) {
    fakeOfficial.forEach((c) => console.log(`   - ${c.name}`));
  }

  // 8. Personal data check
  const withPersonal = await db.community.findMany({
    where: {
      description: {
        contains: "@",
        mode: "insensitive",
      },
    },
    select: { id: true, name: true },
  });
  console.log(`8. Communities with possible email in description: ${withPersonal.length}`);
  if (withPersonal.length > 0) {
    withPersonal.forEach((c) => console.log(`   - ${c.name}`));
  }

  // 9. Check for deleteMany in community routes
  console.log("\n9. Checking for deleteMany in community routes...");
  const routeFiles = [
    "app/api/admin/komunitas/route.ts",
    "app/api/komunitas/[id]/route.ts",
    "app/api/komunitas/[id]/join/route.ts",
  ];
  let deleteManyFound = false;
  for (const rf of routeFiles) {
    const fullPath = path.join(__dirname, "..", rf);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      if (content.includes("deleteMany")) {
        console.log(`   ⚠️  deleteMany found in ${rf}`);
        deleteManyFound = true;
      }
    }
  }
  if (!deleteManyFound) {
    console.log("   ✅ No deleteMany found in community routes");
  }

  // 10. Summary
  console.log("\n=== AUDIT SUMMARY ===");
  if (seededPresent >= seededNames.length * 0.9) {
    console.log("✅ Most seeded groups present in DB");
  } else {
    console.log(`⚠️  Only ${seededPresent}/${seededNames.length} seeded groups found in DB`);
  }
  if (seededHidden === 0) {
    console.log("✅ All seeded groups are public visible");
  } else {
    console.log(`⚠️  ${seededHidden} seeded groups are hidden`);
  }
  if (fakeOfficial.length === 0) {
    console.log("✅ No fake official claims");
  }
  if (withPersonal.length === 0) {
    console.log("✅ No personal data exposed");
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error("Audit failed:", e);
  process.exit(1);
});
