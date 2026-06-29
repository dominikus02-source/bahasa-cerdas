import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

interface ValidationResult {
  levels: { total: number; byType: Record<string, number> }
  units: { total: number; active: number; inactive: number }
  unitsByLevel: { level: string; title: string; count: number; activeCount: number }[]
  progress: { total: number; completed: number; inProgress: number }
  orphanUnits: { id: string; title: string; levelId: string }[]
  noContentUnits: { id: string; title: string; levelId: string }[]
  contentTypes: Record<string, number>
  missingFields: { id: string; title: string; field: string }[]
  summary: string[]
  warnings: string[]
  errors: string[]
}

async function validateLearningContent(): Promise<ValidationResult> {
  const result: ValidationResult = {
    levels: { total: 0, byType: {} },
    units: { total: 0, active: 0, inactive: 0 },
    unitsByLevel: [],
    progress: { total: 0, completed: 0, inProgress: 0 },
    orphanUnits: [],
    noContentUnits: [],
    contentTypes: {},
    missingFields: [],
    summary: [],
    warnings: [],
    errors: [],
  }

  const levels = await db.learningLevel.findMany({
    orderBy: { level: "asc" },
    include: {
      units: { orderBy: { order: "asc" } },
    },
  })

  result.levels.total = levels.length
  for (const l of levels) {
    const t = l.type || "UNKNOWN"
    result.levels.byType[t] = (result.levels.byType[t] || 0) + 1
  }

  const allUnits = levels.flatMap((l) => l.units)
  result.units.total = allUnits.length
  result.units.active = allUnits.filter((u) => u.isActive).length
  result.units.inactive = allUnits.filter((u) => !u.isActive).length

  for (const l of levels) {
    result.unitsByLevel.push({
      level: l.level,
      title: l.title,
      count: l.units.length,
      activeCount: l.units.filter((u) => u.isActive).length,
    })
  }

  const progressRecords = await db.userUnitProgress.findMany()
  result.progress.total = progressRecords.length
  result.progress.completed = progressRecords.filter((p) => p.completed).length
  result.progress.inProgress = progressRecords.filter((p) => !p.completed).length

  for (const l of levels) {
    for (const u of l.units) {
      if (!u.levelId) {
        result.orphanUnits.push({
          id: u.id,
          title: u.title,
          levelId: u.levelId || "MISSING",
        })
      }
    }
  }

  for (const u of allUnits) {
    if (!u.title) {
      result.missingFields.push({
        id: u.id,
        title: u.title || "(untitled)",
        field: "title",
      })
    }
    if (!u.content) {
      result.noContentUnits.push({
        id: u.id,
        title: u.title,
        levelId: u.levelId,
      })
    }
  }

  const contentTypeCounts: Record<string, number> = {}
  for (const u of allUnits) {
    if (u.content) {
      try {
        const parsed =
          typeof u.content === "string" ? JSON.parse(u.content) : u.content
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && item.tipe) {
              contentTypeCounts[item.tipe] =
                (contentTypeCounts[item.tipe] || 0) + 1
            }
          }
        }
      } catch {
        contentTypeCounts["_parseError"] =
          (contentTypeCounts["_parseError"] || 0) + 1
      }
    }
  }
  result.contentTypes = contentTypeCounts

  if (result.levels.total === 0) {
    result.errors.push(
      "No LearningLevel records found - content may not be seeded"
    )
  }
  if (!result.levels.byType["JALUR"] || result.levels.byType["JALUR"] === 0) {
    result.errors.push(
      "No JALUR-type LearningLevel records found - Jalur Cerdas page will render empty"
    )
  }
  if (result.units.active === 0) {
    result.errors.push("No active LearningUnit records found")
  }
  if (result.units.total !== result.units.active) {
    result.warnings.push(
      `${result.units.inactive} unit(s) are inactive (isActive=false)`
    )
  }

  const zeroUnitLevels = result.unitsByLevel.filter((l) => l.activeCount === 0)
  if (zeroUnitLevels.length > 0) {
    result.warnings.push(
      `${zeroUnitLevels.length} level(s) have 0 active units: ${zeroUnitLevels.map((l) => l.level).join(", ")}`
    )
  }

  if (result.orphanUnits.length > 0) {
    result.errors.push(
      `${result.orphanUnits.length} unit(s) have missing levelId`
    )
  }
  if (result.noContentUnits.length > 0) {
    result.warnings.push(
      `${result.noContentUnits.length} unit(s) have no content field`
    )
  }
  if (result.missingFields.length > 0) {
    result.warnings.push(
      `${result.missingFields.length} unit(s) have missing required fields`
    )
  }

  if (result.contentTypes["_parseError"] && result.contentTypes["_parseError"] > 0) {
    result.warnings.push(
      `${result.contentTypes["_parseError"]} unit(s) have unparseable content JSON`
    )
  }

  result.summary.push(`Levels: ${result.levels.total} (${Object.entries(result.levels.byType).map(([k, v]) => `${k}:${v}`).join(", ")})`)
  result.summary.push(`Units: ${result.units.total} total, ${result.units.active} active, ${result.units.inactive} inactive`)
  result.summary.push(`Content types found: ${Object.keys(result.contentTypes).filter(k => k !== "_parseError").join(", ") || "none"}`)
  result.summary.push(`UserUnitProgress: ${result.progress.total} records (${result.progress.completed} completed, ${result.progress.inProgress} in progress)`)

  return result
}

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = !args.includes("--no-dry-run")

  if (isDryRun) {
    console.log("🧪 DRY RUN — no writes performed")
  }

  console.log("🔍 Validating learning content...\n")

  const result = await validateLearningContent()

  console.log("📊 Validasi Konten Pembelajaran")
  console.log("=".repeat(50))
  console.log()

  console.log("✅ Summary:")
  for (const s of result.summary) {
    console.log(`   ${s}`)
  }
  console.log()

  if (result.warnings.length > 0) {
    console.log("⚠️  Warnings:")
    for (const w of result.warnings) {
      console.log(`   - ${w}`)
    }
    console.log()
  }

  if (result.errors.length > 0) {
    console.log("❌ Errors:")
    for (const e of result.errors) {
      console.log(`   - ${e}`)
    }
    console.log()
  }

  console.log("📋 Units per Level:")
  console.log("-".repeat(60))
  for (const l of result.unitsByLevel) {
    const pct = l.count > 0
      ? Math.round((l.activeCount / l.count) * 100)
      : 0
    console.log(
      `  ${String(l.level).padEnd(8)} ${l.title.padEnd(30)} ${l.count} units (${l.activeCount} active, ${pct}%)`
    )
  }
  console.log()

  if (result.noContentUnits.length > 0) {
    console.log("📭 Units without content:")
    for (const u of result.noContentUnits) {
      console.log(`   - ${u.title} (levelId: ${u.levelId})`)
    }
    console.log()
  }

  const totalIssues = result.warnings.length + result.errors.length
  if (totalIssues === 0) {
    console.log("✅ All validations passed!")
  } else {
    console.log(
      `Found ${result.errors.length} error(s) and ${result.warnings.length} warning(s)`
    )
  }

  await db.$disconnect()
  process.exit(result.errors.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error("Validation failed:", e)
  process.exit(1)
})
