/**
 * Safe JALUR level seed — creates JALUR-type LearningLevels from existing PANDUAN data.
 *
 * Since VPS data is lost, this copies PANDUAN levels+units as JALUR type
 * so /arena/jalur-cerdas renders content instead of empty.
 *
 * Safety: No deleteMany, upsert-only, dry-run by default.
 *
 * Usage:
 *   npx tsx scripts/seed-jalur-levels.ts           # dry-run (default)
 *   npx tsx scripts/seed-jalur-levels.ts --execute  # actually seed
 */

import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()
const EXECUTE = process.argv.includes("--execute")
const DRY_RUN = !EXECUTE

async function main() {
  if (DRY_RUN) {
    console.log("🧪 DRY RUN — no writes performed")
    console.log("   Run with --execute to apply\n")
  }

  // 1. Fetch existing PANDUAN levels with units
  const panduanLevels = await db.learningLevel.findMany({
    where: { type: "PANDUAN" },
    orderBy: { level: "asc" },
    include: {
      units: { orderBy: { order: "asc" } },
    },
  })

  console.log(`Found ${panduanLevels.length} PANDUAN levels\n`)

  let created = 0
  let skipped = 0
  let unitsCreated = 0
  let unitsSkipped = 0

  for (const pl of panduanLevels) {
    // Check if JALUR level with same level number exists
    const existing = await db.learningLevel.findUnique({
      where: { type_level: { type: "JALUR", level: pl.level } },
    })

    if (existing) {
      console.log(`  ⏭  Level ${pl.level} "${pl.title}" already exists (id: ${existing.id.slice(0, 8)}...)`)
      skipped++

      // Check units count
      const unitCount = await db.learningUnit.count({ where: { levelId: existing.id, isActive: true } })
      if (unitCount < pl.units.length) {
        console.log(`     ⚠️  Only ${unitCount}/${pl.units.length} units — will add missing`)
        for (const pu of pl.units) {
          const existingUnit = await db.learningUnit.findFirst({
            where: { levelId: existing.id, order: pu.order },
          })
          if (!existingUnit) {
            if (DRY_RUN) {
              console.log(`     📋 Would create unit "${pu.title}" (order ${pu.order})`)
              unitsCreated++
            } else {
              await db.learningUnit.create({
                data: {
                  levelId: existing.id,
                  title: pu.title,
                  subtitle: pu.subtitle,
                  description: pu.description,
                  topik: pu.topik,
                  grade: pu.grade,
                  semester: pu.semester,
                  kd: pu.kd,
                  order: pu.order,
                  color: pu.color,
                  emoji: pu.emoji,
                  icon: pu.icon,
                  content: pu.content,
                  videoUrl: pu.videoUrl,
                  examples: pu.examples,
                  xpReward: pu.xpReward,
                  coinReward: pu.coinReward,
                  isActive: true,
                },
              })
              unitsCreated++
            }
          } else {
            unitsSkipped++
          }
        }
      } else {
        console.log(`     ✅ ${unitCount} units OK`)
      }
      continue
    }

    if (DRY_RUN) {
      console.log(`  📋 Would create JALUR level ${pl.level}: "${pl.title}" with ${pl.units.length} units`)
      created++
      unitsCreated += pl.units.length
      continue
    }

    // Create JALUR level (copy from PANDUAN)
    const newLevel = await db.learningLevel.create({
      data: {
        type: "JALUR",
        level: pl.level,
        title: pl.title.replace("Kelas", "Tingkat"),
        subtitle: pl.subtitle || `Kelas ${pl.title.split(" ")[1]} ${pl.title.includes("Semester") ? pl.title.split("Semester")[1]?.trim() || "" : ""}`,
        description: pl.description,
        color: pl.color,
        emoji: pl.emoji,
        icon: pl.icon,
        order: pl.order,
        xpReward: pl.xpReward,
        coinReward: pl.coinReward,
      },
    })
    created++

    // Copy units
    for (const pu of pl.units) {
      await db.learningUnit.create({
        data: {
          levelId: newLevel.id,
          title: pu.title,
          subtitle: pu.subtitle,
          description: pu.description,
          topik: pu.topik,
          grade: pu.grade,
          semester: pu.semester,
          kd: pu.kd,
          order: pu.order,
          color: pu.color,
          emoji: pu.emoji,
          icon: pu.icon,
          content: pu.content,
          videoUrl: pu.videoUrl,
          examples: pu.examples,
          xpReward: pu.xpReward,
          coinReward: pu.coinReward,
          isActive: true,
        },
      })
      unitsCreated++
    }

    console.log(`  ✅ Created JALUR level ${pl.level}: "${newLevel.title}" with ${pl.units.length} units`)
  }

  console.log()
  console.log("=".repeat(50))
  console.log(`JALUR levels: ${created} created, ${skipped} skipped`)
  console.log(`JALUR units:  ${unitsCreated} created, ${unitsSkipped} skipped`)

  if (DRY_RUN && created + unitsCreated > 0) {
    console.log()
    console.log(`🧪 DRY RUN — run with --execute to create ${created} levels + ${unitsCreated} units`)
  }

  await db.$disconnect()
}

main().catch((e) => {
  console.error("Seed failed:", e)
  process.exit(1)
})
