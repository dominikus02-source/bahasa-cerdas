import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BigtInfoPage } from "@/components/bigt/BigtInfoPage"

export const dynamic = "force-dynamic"

export default async function GuruBigtPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser || (dbUser.role !== "GURU" && dbUser.role !== "ADMIN")) redirect("/login")

  return <BigtInfoPage role="guru" />
}
