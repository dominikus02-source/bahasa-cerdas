import { db } from "../lib/db"

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error("Usage: npx tsx scripts/make-founder.ts <email>")
    process.exit(1)
  }

  const user = await db.user.update({
    where: { email },
    data: { isFounder: true },
  })

  console.log(`✅ ${user.fullName} (${user.email}) is now a founder — can access Arena`)
  await db.$disconnect()
}

main()
