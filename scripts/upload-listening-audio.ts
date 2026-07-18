import { PrismaClient } from "@prisma/client"
import { createClient } from "@supabase/supabase-js"
import { readFileSync, readdirSync, existsSync } from "fs"
import * as path from "path"

const prisma = new PrismaClient()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BUCKET = "audio"
const PREFIX = "ukbi"

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some((b) => b.name === BUCKET)
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (error) throw new Error(`Create bucket failed: ${error.message}`)
    console.log(`Bucket '${BUCKET}' created (public)`)
  } else {
    console.log(`Bucket '${BUCKET}' exists`)
  }
}

async function main() {
  const isExecute = process.argv.includes("--execute")
  if (!isExecute) console.log("DRY-RUN\n")

  const dir = path.join(process.cwd(), "audio-out", "ukbi")
  const files = readdirSync(dir).filter((f) => f.endsWith(".mp3"))
  console.log(`${files.length} MP3 files to upload\n`)

  // Match files to DB questions
  const dbQuestions = await prisma.uKBIQuestion.findMany({
    where: { seksi: "MENDENGARKAN" },
    select: { id: true, audioUrl: true },
  })
  const dbIds = new Set(dbQuestions.map((q) => q.id))

  let matched = 0
  let orphan = 0
  const orphanFiles: string[] = []
  for (const f of files) {
    const qid = f.replace(".mp3", "")
    if (dbIds.has(qid)) matched++
    else {
      orphan++
      orphanFiles.push(qid)
    }
  }
  console.log(`Matched to DB: ${matched} | Orphan (no DB row): ${orphan}`)
  if (orphanFiles.length > 0) console.log(`Orphans: ${orphanFiles.slice(0, 5).join(", ")}...`)

  // DB questions WITHOUT audio file
  const fileIds = new Set(files.map((f) => f.replace(".mp3", "")))
  const noFile = dbQuestions.filter((q) => !fileIds.has(q.id))
  console.log(`DB questions without audio file: ${noFile.length}`)
  if (noFile.length > 0) {
    for (const q of noFile.slice(0, 20)) console.log(`  - ${q.id}`)
  }

  if (!isExecute) {
    console.log("\n(Dry-run — pass --execute to upload)")
    await prisma.$disconnect()
    return
  }

  await ensureBucket()

  let uploaded = 0
  let updated = 0
  let failed = 0

  for (const f of files) {
    const qid = f.replace(".mp3", "")
    if (!dbIds.has(qid)) continue

    const storagePath = `${PREFIX}/${f}`
    const fileData = readFileSync(path.join(dir, f))

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, fileData, {
      contentType: "audio/mpeg",
      upsert: true,
    })
    if (upErr) {
      console.error(`FAIL upload ${qid}: ${upErr.message}`)
      failed++
      continue
    }
    uploaded++

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    await prisma.uKBIQuestion.update({
      where: { id: qid },
      data: { audioUrl: urlData.publicUrl },
    })
    updated++

    if (uploaded % 25 === 0) console.log(`  progress: ${uploaded} uploaded...`)
  }

  console.log(`\nDone: ${uploaded} uploaded, ${updated} DB updated, ${failed} failed`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
