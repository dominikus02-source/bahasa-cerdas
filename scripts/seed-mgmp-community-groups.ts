/**
 * Seed MGMP Community Groups
 *
 * Dry-run default. Execute with --execute.
 * Upsert-only by name. No delete/truncate/drop.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

interface GroupItem {
  name: string;
  slug: string;
  description: string;
  type: string;
  region: string | null;
  province: string | null;
  city: string | null;
  isPublic: boolean;
  isVerified: boolean;
  status: string;
}

async function main() {
  const isExecute = process.argv.includes("--execute");
  const groups: GroupItem[] = require("../data/community-groups/mgmp-groups.json");

  console.log("=== SEED MGMP COMMUNITY GROUPS ===\n");
  console.log(`Mode: ${isExecute ? "EXECUTE" : "DRY-RUN"}`);
  console.log(`Source groups: ${groups.length}\n`);

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  let needsReview: string[] = [];

  for (const g of groups) {
    const existing = await db.community.findFirst({ where: { name: g.name } });

    if (existing) {
      if (existing.isVerified) {
        skipped++;
        needsReview.push(`${g.name} — sudah ada dan terverifikasi, tidak diubah`);
        continue;
      }

      const same =
        existing.description === g.description &&
        existing.type === g.type &&
        existing.region === g.region &&
        existing.province === g.province &&
        existing.city === g.city &&
        existing.isPublic === g.isPublic &&
        existing.isVerified === g.isVerified &&
        existing.status === g.status;

      if (same) {
        unchanged++;
        continue;
      }

      if (isExecute) {
        await db.community.update({
          where: { id: existing.id },
          data: {
            description: g.description,
            type: g.type as any,
            region: g.region,
            province: g.province,
            city: g.city,
            isPublic: g.isPublic,
            isVerified: g.isVerified,
            status: g.status as any,
          },
        });
        updated++;
      } else {
        updated++;
      }
    } else {
      if (isExecute) {
        await db.community.create({
          data: {
            name: g.name,
            description: g.description,
            type: g.type as any,
            region: g.region,
            province: g.province,
            city: g.city,
            isPublic: g.isPublic,
            isVerified: g.isVerified,
            status: g.status as any,
          },
        });
        inserted++;
      } else {
        inserted++;
      }
    }
  }

  console.log("=== SUMMARY ===");
  console.log(`  Total source:     ${groups.length}`);
  console.log(`  Inserted:         ${inserted}`);
  console.log(`  Updated:          ${updated}`);
  console.log(`  Unchanged:        ${unchanged}`);
  console.log(`  Skipped (verified): ${skipped}`);
  console.log(`  Needs review:     ${needsReview.length}`);
  if (needsReview.length > 0) {
    console.log("\n  Needs review details:");
    for (const r of needsReview) {
      console.log(`    - ${r}`);
    }
  }
  console.log(`\n  ${isExecute ? "Database seeded successfully." : "Dry-run complete. Use --execute to apply."}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
