import { createClient } from "@supabase/supabase-js"

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let total = 0
  let cursor: string | undefined

  console.log("Mengambil semua user dari Supabase Auth...")

  do {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: cursor ? parseInt(cursor) : 1,
      perPage: 100,
    })

    if (error) {
      console.error("Error listing users:", error.message)
      break
    }

    for (const user of data?.users || []) {
      if (!user.email_confirmed_at) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        )
        if (updateError) {
          console.error(`  Gagal confirm ${user.email}: ${updateError.message}`)
        } else {
          total++
          console.log(`  ✓ ${user.email} — confirmed`)
        }
      }
    }

    cursor = data?.nextPage?.toString()
  } while (cursor)

  console.log(`\nSelesai! ${total} akun berhasil dikonfirmasi.`)
}

main().catch(e => { console.error(e); process.exit(1) })
