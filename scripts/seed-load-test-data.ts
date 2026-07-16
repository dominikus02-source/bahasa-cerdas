/**
 * Load Test Data Seeder
 *
 * Creates dummy users (1000 murid, 50 guru), groups, UKBI/TKA pakets
 * for load testing. Safe — never deletes existing data.
 *
 * Usage:
 *   ALLOW_LOAD_TEST_SEED=true npx tsx scripts/seed-load-test-data.ts        # dry-run
 *   ALLOW_LOAD_TEST_SEED=true npx tsx scripts/seed-load-test-data.ts --execute
 *
 * Requirements:
 *   - DATABASE_URL in env
 *   - NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env
 */

if (process.env.ALLOW_LOAD_TEST_SEED !== "true") {
  console.log("Skipping: set ALLOW_LOAD_TEST_SEED=true to run")
  process.exit(0)
}

import { PrismaClient } from "@prisma/client"
import { createClient } from "@supabase/supabase-js"

const db = new PrismaClient()
const EXECUTE = process.argv.includes("--execute")
const DRY_RUN = !EXECUTE

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ── Config ────────────────────────────────────────────────────────────
const COUNT_MURID = 1000
const COUNT_GURU = 50
const COUNT_GROUPS = 10

// ── Helpers ───────────────────────────────────────────────────────────

function pad(i: number, width: number): string {
  return String(i).padStart(width, "0")
}

async function promptContinue(): Promise<boolean> {
  return new Promise((resolve) => {
    process.stdout.write(`\n⚠️  This will seed ${COUNT_MURID + COUNT_GURU} auth + Prisma users. Continue? [y/N] `)
    process.stdin.once("data", (data) => {
      const answer = data.toString().trim().toLowerCase()
      resolve(answer === "y" || answer === "yes")
    })
  })
}

function progress(label: string, current: number, total: number) {
  const pct = ((current / total) * 100).toFixed(0)
  process.stdout.write(`\r  ${label}: ${current}/${total} (${pct}%)`)
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🧪 Load Test Seed ${DRY_RUN ? "(DRY RUN)" : "(EXECUTE)"}`)
  console.log(`   Murid: ${COUNT_MURID}, Guru: ${COUNT_GURU}, Groups: ${COUNT_GROUPS}`)

  if (DRY_RUN) {
    console.log("\n   DRY RUN — set --execute to actually seed\n")
  } else {
    const ok = await promptContinue()
    if (!ok) {
      console.log("   Aborted.\n")
      process.exit(0)
    }
  }

  // ── 1. Create dummy guru auth users + Prisma users ──────────────────
  console.log("\n1) Creating guru users...")
  const guruIds: string[] = []

  for (let i = 1; i <= COUNT_GURU; i++) {
    const email = `loadtest_guru_${pad(i, 3)}@loadtest.bahasacerdas.com`
    const fullName = `Guru Load Test ${pad(i, 3)}`

    if (DRY_RUN) {
      guruIds.push(`dry-run-${i}`)
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: "LoadTest123!",
        email_confirm: true,
        user_metadata: { role: "GURU", full_name: fullName },
      })
      if (error) {
        console.error(`\n  ❌ Failed to create auth user ${email}: ${error.message}`)
        continue
      }
      guruIds.push(data.user.id)
    }

    progress("Guru", i, COUNT_GURU)
  }
  console.log()

  // ── 2. Create dummy murid auth users + Prisma users ─────────────────
  console.log("\n2) Creating murid users...")
  const muridIds: string[] = []

  for (let i = 1; i <= COUNT_MURID; i++) {
    const email = `loadtest_murid_${pad(i, 4)}@loadtest.bahasacerdas.com`
    const fullName = `Murid Load Test ${pad(i, 4)}`

    if (DRY_RUN) {
      muridIds.push(`dry-run-${COUNT_GURU + i}`)
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: "LoadTest123!",
        email_confirm: true,
        user_metadata: { role: "MURID", full_name: fullName },
      })
      if (error) {
        console.error(`\n  ❌ Failed to create auth user ${email}: ${error.message}`)
        continue
      }
      muridIds.push(data.user.id)
    }

    progress("Murid", i, COUNT_MURID)
  }
  console.log()

  // ── 3. Bulk create Prisma User records ──────────────────────────────
  console.log("\n3) Creating Prisma User records...")

  const allSupabaseIds = [...guruIds, ...muridIds]

  if (!DRY_RUN) {
    // Create guru users
    const guruRecords = guruIds.map((supabaseId, i) => ({
      supabaseId,
      email: `loadtest_guru_${pad(i + 1, 3)}@loadtest.bahasacerdas.com`,
      fullName: `Guru Load Test ${pad(i + 1, 3)}`,
      role: "GURU" as const,
    }))

    const muridRecords = muridIds.map((supabaseId, i) => ({
      supabaseId,
      email: `loadtest_murid_${pad(i + 1, 4)}@loadtest.bahasacerdas.com`,
      fullName: `Murid Load Test ${pad(i + 1, 4)}`,
      role: "MURID" as const,
    }))

    const batchSize = 100
    for (let start = 0; start < guruRecords.length; start += batchSize) {
      const batch = guruRecords.slice(start, start + batchSize)
      await db.user.createMany({ data: batch, skipDuplicates: true })
      progress("Guru Prisma", Math.min(start + batchSize, guruRecords.length), guruRecords.length)
    }
    console.log()

    for (let start = 0; start < muridRecords.length; start += batchSize) {
      const batch = muridRecords.slice(start, start + batchSize)
      await db.user.createMany({ data: batch, skipDuplicates: true })
      progress("Murid Prisma", Math.min(start + batchSize, muridRecords.length), muridRecords.length)
    }
    console.log()
  } else {
    console.log(`   Would create ${allSupabaseIds.length} Prisma User records (batch size 100)`)
  }

  // ── 4. Create dummy profiles ────────────────────────────────────────
  console.log("\n4) Creating Profiles...")

  if (!DRY_RUN) {
    // Fetch the actual Prisma user IDs for our load test users
    const guruEmails = guruIds.map((_, i) => `loadtest_guru_${pad(i + 1, 3)}@loadtest.bahasacerdas.com`)
    const muridEmails = muridIds.map((_, i) => `loadtest_murid_${pad(i + 1, 4)}@loadtest.bahasacerdas.com`)
    const allEmails = [...guruEmails, ...muridEmails]

    const users = await db.user.findMany({
      where: { email: { in: allEmails } },
      select: { id: true, email: true, role: true },
    })

    const profileData = users.map((u) => ({
      userId: u.id,
      school: u.role === "GURU" ? "SMP Load Test" : "SD Load Test",
      city: "Jakarta",
      province: "DKI Jakarta",
    }))

    for (let start = 0; start < profileData.length; start += 100) {
      const batch = profileData.slice(start, start + 100)
      await db.profile.createMany({ data: batch, skipDuplicates: true })
    }
    console.log(`   Created ${profileData.length} profiles`)
  } else {
    console.log("   Would create profiles for all users")
  }

  // ── 5. Find/guru as group teacher ───────────────────────────────────
  console.log("\n5) Creating Groups...")

  let teacherId: string | null = null

  if (!DRY_RUN) {
    const firstGuru = await db.user.findFirst({
      where: { email: `loadtest_guru_001@loadtest.bahasacerdas.com` },
      select: { id: true },
    })
    teacherId = firstGuru?.id ?? null
  }

  if (!teacherId && !DRY_RUN) {
    console.log("   ⚠️  No load test guru found in DB — skipping group creation")
  } else {
    const groupNames = [
      "Kelas 7A Load Test",
      "Kelas 7B Load Test",
      "Kelas 8A Load Test",
      "Kelas 8B Load Test",
      "Kelas 9A Load Test",
      "Kelas 9B Load Test",
      "Kelas 10A Load Test",
      "Kelas 10B Load Test",
      "Kelas 11A Load Test",
      "Kelas 11B Load Test",
    ]

    if (DRY_RUN) {
      console.log(`   Would create ${COUNT_GROUPS} groups with teacher loadtest_guru_001`)
    } else {
      const groupData = groupNames.map((name, i) => ({
        name,
        description: `Group for load testing — ${name}`,
        grade: ["7", "7", "8", "8", "9", "9", "10", "10", "11", "11"][i],
        accessCode: `LOAD${pad(i + 1, 3)}`,
        teacherId: teacherId!,
      }))
      await db.group.createMany({ data: groupData, skipDuplicates: true })
      console.log(`   Created ${groupData.length} groups`)
    }
  }

  // ── 6. Distribute murid into groups ─────────────────────────────────
  console.log("\n6) Assigning murid to groups...")

  if (!DRY_RUN && teacherId) {
    const groups = await db.group.findMany({
      where: { teacherId },
      select: { id: true, accessCode: true },
    })

    const muridUsers = await db.user.findMany({
      where: { email: { startsWith: "loadtest_murid_" } },
      select: { id: true },
    })

    if (groups.length > 0 && muridUsers.length > 0) {
      const membersPerGroup = Math.ceil(muridUsers.length / groups.length)
      const memberData: { groupId: string; userId: string; role: string }[] = []

      for (let g = 0; g < groups.length; g++) {
        const start = g * membersPerGroup
        const end = Math.min(start + membersPerGroup, muridUsers.length)
        for (let m = start; m < end; m++) {
          memberData.push({ groupId: groups[g].id, userId: muridUsers[m].id, role: "member" })
        }
      }

      for (let start = 0; start < memberData.length; start += 100) {
        const batch = memberData.slice(start, start + 100)
        await db.groupMember.createMany({ data: batch, skipDuplicates: true })
      }
      console.log(`   Assigned ${memberData.length} members across ${groups.length} groups`)
    } else {
      console.log("   No groups or murid found — skipping")
    }
  } else {
    console.log(`   Would distribute ~${COUNT_MURID} murid across ${COUNT_GROUPS} groups`)
  }

  // ── 7. Create UKBI Paket ────────────────────────────────────────────
  console.log("\n7) Creating UKBI Paket...")

  if (DRY_RUN) {
    console.log("   Would create 'UKBI Practice Load Test' paket with 10 questions")
  } else {
    const existingPaket = await db.paketKompetensi.findFirst({
      where: { title: "UKBI Practice Load Test" },
    })

    if (!existingPaket) {
      const questions = await db.uKBIQuestion.findMany({
        where: { isActive: true },
        take: 10,
        select: { id: true },
      })

      if (questions.length === 0) {
        console.log("   ⚠️  No UKBI questions found — create soal bank first")
      } else {
        await db.paketKompetensi.create({
          data: {
            title: "UKBI Practice Load Test",
            description: "Load test UKBI package — 10 random questions",
            type: "UKBI",
            mode: "SIMULASI",
            duration: 30,
            passingScore: 60,
            sections: JSON.parse(
              JSON.stringify([
                { seksi: "MERESPONS_KAIDAH", label: "Merespons Kaidah", count: 4 },
                { seksi: "MEMBACA", label: "Membaca", count: 3 },
                { seksi: "MENDENGARKAN", label: "Mendengarkan", count: 3 },
              ])
            ),
            totalQuestions: questions.length,
            questionPool: JSON.parse(JSON.stringify(questions.map((q) => q.id))),
          },
        })
        console.log(`   Created UKBI Practice Load Test (${questions.length} questions)`)
      }
    } else {
      console.log("   UKBI Practice Load Test already exists — skipped")
    }
  }

  // ── 8. Create TKA Paket ─────────────────────────────────────────────
  console.log("\n8) Creating TKA Paket...")

  if (DRY_RUN) {
    console.log("   Would create 'TKA Practice Load Test' paket with 10 questions")
  } else {
    const existingTkaPaket = await db.paketKompetensi.findFirst({
      where: { title: "TKA Practice Load Test" },
    })

    if (!existingTkaPaket) {
      const questions = await db.tKAQuestion.findMany({
        where: { isActive: true },
        take: 10,
        select: { id: true },
      })

      if (questions.length === 0) {
        console.log("   ⚠️  No TKA questions found — create soal bank first")
      } else {
        await db.paketKompetensi.create({
          data: {
            title: "TKA Practice Load Test",
            description: "Load test TKA package — 10 random questions",
            type: "TKA_GURU",
            mode: "SIMULASI",
            duration: 30,
            passingScore: 60,
            sections: JSON.parse(JSON.stringify([{ kompetensi: "MEMBACA", label: "Membaca", count: 10 }])),
            totalQuestions: questions.length,
            questionPool: JSON.parse(JSON.stringify(questions.map((q) => q.id))),
          },
        })
        console.log(`   Created TKA Practice Load Test (${questions.length} questions)`)
      }
    } else {
      console.log("   TKA Practice Load Test already exists — skipped")
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────
  console.log("\n\n── Summary ──────────────────────────────")
  console.log(`  Mode: ${DRY_RUN ? "DRY RUN" : "EXECUTED"}`)
  console.log(`  Guru auth users:        ${guruIds.length}`)
  console.log(`  Murid auth users:       ${muridIds.length}`)
  console.log(`  Total Prisma users:     ${allSupabaseIds.length}`)
  console.log(`  Groups:                 ${COUNT_GROUPS}`)
  console.log(`  UKBI Paket:             Created`)
  console.log(`  TKA Paket:              Created`)

  if (DRY_RUN) {
    console.log("\n  To actually seed, run: ALLOW_LOAD_TEST_SEED=true npx tsx scripts/seed-load-test-data.ts --execute")
  }

  console.log("")
  await db.$disconnect()
  process.exit(0)
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
