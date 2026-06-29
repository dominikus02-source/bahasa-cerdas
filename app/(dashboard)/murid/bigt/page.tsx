import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BigtInfoPage } from "@/components/bigt/BigtInfoPage"

export const dynamic = "force-dynamic"

export default async function MuridBigtPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return <BigtInfoPage role="murid" />
}
