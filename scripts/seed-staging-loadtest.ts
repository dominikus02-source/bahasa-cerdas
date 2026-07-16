/**
 * Staging Load Test Seed
 *
 * Seeds local PostgreSQL staging DB with:
 * - Demo user Prisma records (matching production Supabase auth)
 * - 10 UKBI questions from existing JSON files
 * - PaketKompetensi for load test
 *
 * Usage:
 *   DATABASE_URL="postgresql://user@localhost:5432/bahasacerdas_staging" \
 *   DIRECT_URL="postgresql://user@localhost:5432/bahasacerdas_staging" \
 *   npx tsx scripts/seed-staging-loadtest.ts
 *
 * Safe: upsert-only, never deletes data.
 */

import { PrismaClient } from "@prisma/client"
import * as fs from "fs"
import * as path from "path"

const db = new PrismaClient()
const UKBI_JSON_DIR = "data/question-bank/ukbi"

function mapDifficulty(d: any): string {
  const n = typeof d === "number" ? d : parseInt(d, 10)
  if (n >= 4) return "VERY_HARD"
  if (n >= 3) return "HARD"
  if (n >= 2) return "MEDIUM"
  return "EASY"
}

function mapTingkat(track: string): string {
  if (track?.includes("SD")) return "SD"
  if (track?.includes("SMP")) return "SMP"
  if (track?.includes("SMA")) return "SMA"
  if (track?.includes("GURU")) return "GURU"
  return "UMUM"
}

function mapSeksi(section: string): string {
  return section.toUpperCase().replace(/-/g, "_")
}

async function main() {
  console.log("🧪 Staging Load Test Seed\n")

  const sudah = await db.paketKompetensi.findFirst({ where: { title: "UKBI Load Test Staging" } })
  if (sudah) {
    console.log("✅ Seed already applied — skipping")
    await db.$disconnect()
    process.exit(0)
  }

  // 1. Seed demo users
  console.log("1) Seeding demo users...")
  const demoUsers = [
    {
      supabaseId: "9ba6d3b3-89c0-4e5d-ab0b-b1fa8d494f8f",
      email: "murid@demo.com",
      fullName: "Murid Demo",
      role: "MURID" as const,
    },
    {
      supabaseId: "07b6cbd2-ce6f-48a2-82df-70af21561492",
      email: "guru@demo.com",
      fullName: "Guru Demo",
      role: "GURU" as const,
    },
  ]

  for (const u of demoUsers) {
    await db.user.upsert({
      where: { email: u.email },
      update: { supabaseId: u.supabaseId, fullName: u.fullName },
      create: u,
    })
  }
  console.log(`   Created/updated ${demoUsers.length} users`)

  // 2. Seed UKBI questions from JSON files
  console.log("\n2) Seeding 10 UKBI questions...")
  const guruDir = path.join(UKBI_JSON_DIR, "guru", "merespons-kaidah")
  const files = fs.readdirSync(guruDir).filter((f) => f.endsWith(".json"))

  let seededCount = 0
  for (const file of files) {
    if (seededCount >= 10) break
    const data = JSON.parse(fs.readFileSync(path.join(guruDir, file), "utf-8"))
    for (const q of (data.questions || [])) {
      if (seededCount >= 10) break
      const exists = await db.uKBIQuestion.findUnique({ where: { id: q.id } })
      if (!exists) {
        await db.uKBIQuestion.create({
          data: {
            id: q.id,
            seksi: mapSeksi(q.section) as any,
            text: q.stem,
            passage: q.passage || null,
            type: q.type === "pilihan_ganda" ? "PILIHAN_GANDA" : (q.type?.toUpperCase() ?? "PILIHAN_GANDA"),
            options: q.options || [],
            correctAnswer: q.correctAnswer || "",
            explanation: q.explanation ?? "",
            difficulty: mapDifficulty(q.difficulty) as any,
            cognitive: q.cognitive ?? "PEMAHAMAN",
            domain: q.domain ?? "SOSIAL",
            keywords: q.tags || [],
            isActive: true,
            isVerified: true,
            tingkat: mapTingkat(q.track) as any,
          },
        })
      }
      seededCount++
    }
  }
  console.log(`   Seeded ${seededCount} UKBI questions`)

  if (seededCount < 5) {
    console.error("   ❌ Not enough questions seeded")
    process.exit(1)
  }

  // 3. Create PaketKompetensi
  console.log("\n3) Creating UKBI Load Test Paket...")
  const questions = await db.uKBIQuestion.findMany({ where: { isActive: true }, take: 10 })

  await db.paketKompetensi.create({
    data: {
      title: "UKBI Load Test Staging",
      description: `Load test package — ${questions.length} questions`,
      type: "UKBI_GURU_SIMULASI",
      mode: "SIMULASI",
      duration: 30,
      passingScore: 60,
      sections: [
        { seksi: "MERESPONS_KAIDAH", label: "Merespons Kaidah", count: Math.min(5, questions.length) },
        { seksi: "MEMBACA", label: "Membaca", count: Math.min(3, Math.max(0, questions.length - 5)) },
        { seksi: "MENDENGARKAN", label: "Mendengarkan", count: Math.min(2, Math.max(0, questions.length - 8)) },
      ],
      totalQuestions: questions.length,
      questionPool: questions.map((q) => q.id),
      isActive: true,
    },
  })
  console.log(`   Created UKBI Load Test Staging (${questions.length} questions)`)

  // Summary
  console.log("\n── Summary ──────────────────────────────")
  console.log(`  Users:     ${await db.user.count()}`)
  console.log(`  Questions: ${await db.uKBIQuestion.count()}`)
  console.log(`  Pakets:    ${await db.paketKompetensi.count()}`)
  console.log("")

  await db.$disconnect()
  process.exit(0)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
